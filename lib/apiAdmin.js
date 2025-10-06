import { getSupabaseServerClient } from './supabaseServer';
import { hasPermission } from './permissions';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

export async function getAdminFromRequest(req){
  const cookies = parseCookies(req?.headers?.cookie || '');
  const token = cookies['admin_session_token'];
  if (!token) return null;
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('*')
    .eq('session_token', token)
    .gt('expires_at', nowIso)
    .maybeSingle();
  if (!session) return null;

  const { data: admin } = await supabase
    .from('admin_users')
    .select('id, email, first_name, last_name, role, is_active, status')
    .eq('id', session.admin_user_id)
    .maybeSingle();

  if (!admin || admin.is_active === false || (admin.status && admin.status !== 'active')) return null;
  return { admin, session, supabase };
}

export function forbid(res){
  return res.status(403).json({ error: 'Forbidden', message: "You don't have permission to perform this action" });
}

export function unauthorized(res){
  return res.status(401).json({ error: 'Unauthorized' });
}

export function withAdmin(handler){
  return async function wrapped(req, res){
    const ctx = await getAdminFromRequest(req);
    if (!ctx) return unauthorized(res);
    req.admin = ctx.admin; req.adminSession = ctx.session; req.supabase = ctx.supabase;
    return handler(req, res);
  };
}

export function withPermission(resource, action){
  return function (handler){
    return withAdmin(async function wrapped(req, res){
      const role = req.admin?.role || null;
      if (!hasPermission(role, resource, action)) return forbid(res);
      return handler(req, res);
    });
  };
}
