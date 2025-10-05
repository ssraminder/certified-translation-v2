import crypto from 'crypto';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { sendOtpCodeEmail } from '../../../../lib/email';
import { withApiBreadcrumbs } from '../../../../lib/sentry';

function normalizeEmail(email){
  return String(email || '').trim().toLowerCase().slice(0, 255);
}

function generateOtp(){
  const buf = crypto.randomBytes(4).readUInt32BE(0);
  const code = (buf % 900000) + 100000;
  return String(code).padStart(6, '0');
}

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email, user_type } = req.body || {};
    const type = (user_type === 'admin') ? 'admin' : 'customer';
    const norm = normalizeEmail(email);
    if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    const supabase = getSupabaseServerClient();

    let first_name = null; let found = false;
    if (type === 'admin') {
      const { data } = await supabase.from('admin_users').select('first_name').ilike('email', norm).maybeSingle();
      if (data) { first_name = data.first_name || null; found = true; }
    } else {
      const { data } = await supabase.from('users').select('first_name').ilike('email', norm).maybeSingle();
      if (data) { first_name = data.first_name || null; found = true; }
    }
    if (!found) return res.status(404).json({ error: 'No account found' });

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', type)
      .eq('email', norm)
      .gte('created_at', since);
    if ((recentCount || 0) >= 5) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const code = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insErr } = await supabase.from('otp_codes').insert([{
      email: norm,
      code,
      user_type: type,
      purpose: 'login',
      expires_at: expires,
      ip: ip || null,
      user_agent: userAgent || null
    }]);
    if (insErr) throw insErr;

    await sendOtpCodeEmail({ email: norm, first_name, code });

    return res.status(200).json({ success: true, message: '6-digit code sent to your email', expires_in: 600 });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
