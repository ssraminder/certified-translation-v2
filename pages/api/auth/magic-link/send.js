import crypto from 'crypto';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { sendMagicLinkEmail } from '../../../../lib/email';
import { withApiBreadcrumbs } from '../../../../lib/sentry';

function normalizeEmail(email){
  return String(email || '').trim().toLowerCase().slice(0, 255);
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

    let user = null; let first_name = null; let userId = null;
    if (type === 'admin') {
      const { data } = await supabase.from('admin_users').select('id, first_name, email').ilike('email', norm).maybeSingle();
      if (data) { user = data; userId = data.id; first_name = data.first_name || null; }
    } else {
      const { data } = await supabase.from('users').select('id, first_name, email').ilike('email', norm).maybeSingle();
      if (data) { user = data; userId = data.id; first_name = data.first_name || null; }
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found' });
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('magic_links')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if ((recentCount || 0) >= 5) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insErr } = await supabase.from('magic_links').insert([{
      user_id: userId,
      user_type: type,
      token,
      purpose: 'login',
      expires_at: expires,
      created_ip: ip || null,
      created_user_agent: userAgent || null
    }]);
    if (insErr) throw insErr;

    await sendMagicLinkEmail({ email: norm, first_name, token });

    return res.status(200).json({ success: true, message: 'Magic link sent to your email' });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
