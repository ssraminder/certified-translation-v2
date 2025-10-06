import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const supabase = getSupabaseServerClient();
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies['admin_session_token'];
    if (token) {
      await supabase.from('admin_sessions').delete().eq('session_token', token);
    }
    const isProd = process.env.NODE_ENV === 'production';
    const cookie = `admin_session_token=; Max-Age=0; Path=/admin; HttpOnly; SameSite=Lax${isProd?'; Secure':''}`;
    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
