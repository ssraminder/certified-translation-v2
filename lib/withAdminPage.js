import { getSupabaseServerClient } from './supabaseServer';

function parseCookies(cookieHeader) {
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts) { const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

export async function getServerSideAdmin(ctx) {
  try {
    const { req } = ctx;
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies['admin_session_token'];
    const redirect = {
      redirect: {
        destination: '/login?redirect=' + encodeURIComponent(ctx.resolvedUrl || '/admin'),
        permanent: false,
      }
    };
    if (!token) return redirect;

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session) return redirect;

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, email, first_name, last_name, role, is_active, status, last_login_at')
      .eq('id', session.admin_user_id)
      .maybeSingle();

    if (!admin || admin.is_active === false || (admin.status && admin.status !== 'active')) {
      return redirect;
    }

    return {
      props: {
        initialAdmin: {
          id: admin.id,
          email: admin.email,
          full_name: admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : (admin.first_name || admin.last_name || admin.email),
          role: admin.role || 'associate',
          last_login_at: admin.last_login_at || null,
        }
      }
    };
  } catch {
    return {
      redirect: {
        destination: '/login?redirect=' + encodeURIComponent(ctx.resolvedUrl || '/admin'),
        permanent: false,
      }
    };
  }
}

export function getServerSideAdminWithPermission(resource, action){
  return async function(ctx){
    const base = await getServerSideAdmin(ctx);
    if (!('props' in (base || {}))) return base;
    const role = base.props?.initialAdmin?.role || null;
    const { hasPermission } = await import('./permissions');
    if (!hasPermission(role, resource, action)) {
      return {
        redirect: {
          destination: '/admin/access-denied',
          permanent: false,
        }
      };
    }
    return base;
  };
}

export function withPermission(resource, action){
  return (handler) => async (req, res) => {
    try {
      const cookies = parseCookies(req.headers.cookie || '');
      const token = cookies['admin_session_token'];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const supabase = getSupabaseServerClient();
      const nowIso = new Date().toISOString();

      const { data: session } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('session_token', token)
        .gt('expires_at', nowIso)
        .maybeSingle();

      if (!session) return res.status(401).json({ error: 'Invalid session' });

      const { data: admin } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('id', session.admin_user_id)
        .maybeSingle();

      if (!admin || admin.is_active === false) return res.status(401).json({ error: 'Unauthorized' });

      const { hasPermission: checkPermission } = await import('./permissions');
      if (!checkPermission(admin.role, resource, action)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      req.admin = admin;
      return handler(req, res);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  };
}
