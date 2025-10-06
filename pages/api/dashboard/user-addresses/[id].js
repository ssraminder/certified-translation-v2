import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { toE164 } from '../../../../lib/formatters/phone';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

async function getAuthedUser(req){
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies['session_token'];
  if (!token) return { status: 401, error: 'Unauthorized' };
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data: session } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_token', token)
    .gt('expires_at', nowIso)
    .maybeSingle();
  if (!session || session.user_type !== 'customer') return { status: 401, error: 'Invalid session' };
  return { supabase, userId: session.user_id };
}

function sanitize(v){ return typeof v === 'string' ? v.trim() : v; }

async function handler(req, res){
  try {
    const auth = await getAuthedUser(req);
    if (auth.status) return res.status(auth.status).json({ error: auth.error });
    const { supabase, userId } = auth;
    const { id } = req.query;

    const { data: existing } = await supabase.from('user_addresses').select('*').eq('id', id).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    if (existing.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (req.method === 'GET') {
      return res.status(200).json(existing);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const update = {};
      const fields = ['full_name','company_name','address_line_1','address_line_2','city','state_province','postal_code','country','phone','is_default'];
      for (const f of fields) if (f in body) update[f] = sanitize(body[f]);
      if ('phone' in update) update.phone = update.phone ? (toE164(update.phone, update.country || existing.country) || null) : null;
      update.updated_at = new Date().toISOString();

      if (update.is_default === true) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('address_type', existing.address_type);
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .update(update)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      if (existing.is_default) {
        const { count } = await supabase
          .from('user_addresses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('address_type', existing.address_type)
          .eq('is_default', true);
        if ((count || 0) === 1) {
          return res.status(400).json({ error: 'Cannot delete the only default address. Set another as default first.' });
        }
      }
      const { error } = await supabase.from('user_addresses').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
