import crypto from 'crypto';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { withApiBreadcrumbs } from '../../../../lib/sentry';

function normalizeEmail(email){
  return String(email || '').trim().toLowerCase().slice(0, 255);
}

function setSessionCookie(res, token){
  const isProd = process.env.NODE_ENV === 'production';
  const cookie = `session_token=${token}; Max-Age=${30*24*60*60}; Path=/; HttpOnly; SameSite=Lax${isProd?'; Secure':''}`;
  res.setHeader('Set-Cookie', cookie);
}

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email, code, user_type } = req.body || {};
    const type = (user_type === 'admin') ? 'admin' : 'customer';
    const norm = normalizeEmail(email);
    if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!/^[0-9]{6}$/.test(String(code || ''))) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    const supabase = getSupabaseServerClient();

    const { data: otp } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', norm)
      .eq('user_type', type)
      .eq('code', String(code))
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    if ((otp.attempts || 0) >= (otp.max_attempts || 3)) {
      return res.status(429).json({ error: 'Too many failed attempts' });
    }

    const nowIso = new Date().toISOString();
    await supabase.from('otp_codes').update({ used_at: nowIso }).eq('id', otp.id);

    let user = null;
    if (type === 'admin') {
      const { data } = await supabase.from('admin_users').select('id, email, first_name, last_name, role').ilike('email', norm).maybeSingle();
      user = data;
      if (!user) return res.status(404).json({ error: 'No account found' });
      await supabase.from('admin_users').update({ last_login_at: nowIso, email_verified: true, updated_at: nowIso }).eq('id', user.id);
    } else {
      const { data } = await supabase.from('users').select('id, email, first_name, last_name').ilike('email', norm).maybeSingle();
      user = data;
      if (!user) return res.status(404).json({ error: 'No account found' });
      await supabase.from('users').update({ last_login_at: nowIso, email_verified: true, email_verified_at: nowIso, updated_at: nowIso }).eq('id', user.id);
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30*24*60*60*1000).toISOString();
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    await supabase.from('user_sessions').insert([{ user_id: user.id, user_type: type, session_token: sessionToken, expires_at: expiresAt, ip: ip || null, user_agent: userAgent || null }]);

    setSessionCookie(res, sessionToken);

    return res.status(200).json({ success: true, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, user_type: type, role: user.role || null }, session_token: sessionToken, redirect: type === 'admin' ? '/admin/dashboard' : '/dashboard' });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
