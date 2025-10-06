import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { toE164 } from '../../../../lib/formatters/phone';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

function requireBodyString(v){ return typeof v === 'string' ? v.trim() : ''; }

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
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user_id)
    .maybeSingle();
  if (!user) return { status: 401, error: 'User not found' };
  return { supabase, session, user };
}

async function handler(req, res){
  try {
    const auth = await getAuthedUser(req);
    if (auth.status) return res.status(auth.status).json({ error: auth.error });
    const { supabase, user } = auth;

    if (req.method === 'GET') {
      const userId = user.id;
      const [{ count: quotesCount }, { count: ordersCount }] = await Promise.all([
        supabase.from('quote_submissions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      ]);

      const { data: addrRows } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      const addresses = { billing: [], shipping: [] };
      for (const a of addrRows || []) {
        if (a.address_type === 'billing') addresses.billing.push(a);
        else if (a.address_type === 'shipping') addresses.shipping.push(a);
      }

      return res.status(200).json({
        user,
        stats: { quotes: quotesCount || 0, orders: ordersCount || 0 },
        addresses
      });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const first_name = requireBodyString(body.first_name);
      const last_name = requireBodyString(body.last_name);
      const language_preference = requireBodyString(body.language_preference || 'en') || 'en';
      if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name are required' });

      const update = {
        first_name,
        last_name,
        updated_at: new Date().toISOString(),
      };
      if (typeof body.phone === 'string') update.phone = toE164(body.phone) || null;
      if (typeof body.company_name === 'string') update.company_name = body.company_name.trim() || null;
      if (typeof body.business_license === 'string') update.business_license = body.business_license.trim() || null;
      update.language_preference = language_preference;
      if (body.preferences && typeof body.preferences === 'object') update.preferences = body.preferences;

      const { data: updated, error } = await supabase
        .from('users')
        .update(update)
        .eq('id', user.id)
        .select('*')
        .single();
      if (error) throw error;

      return res.status(200).json(updated);
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
