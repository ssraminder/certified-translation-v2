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

function validateAddressInput(body){
  const required = ['address_type','full_name','address_line_1','city','state_province','postal_code','country'];
  const errors = {};
  for (const k of required) { if (!body[k] || String(body[k]).trim() === '') errors[k] = 'Required'; }
  if (body.address_type && !['billing','shipping'].includes(body.address_type)) errors.address_type = 'Invalid';
  return errors;
}

async function handler(req, res){
  try {
    const auth = await getAuthedUser(req);
    if (auth.status) return res.status(auth.status).json({ error: auth.error });
    const { supabase, userId } = auth;

    if (req.method === 'GET') {
      const { type } = req.query || {};
      let q = supabase.from('user_addresses').select('*').eq('user_id', userId);
      if (type && (type === 'billing' || type === 'shipping')) q = q.eq('address_type', type);
      const { data, error } = await q.order('is_default', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const errors = validateAddressInput(body);
      if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });

      const addr = {
        user_id: userId,
        address_type: body.address_type,
        is_default: !!body.is_default,
        full_name: String(body.full_name || '').trim(),
        company_name: body.company_name ? String(body.company_name).trim() : null,
        address_line_1: String(body.address_line_1 || '').trim(),
        address_line_2: body.address_line_2 ? String(body.address_line_2).trim() : null,
        city: String(body.city || '').trim(),
        state_province: String(body.state_province || '').trim(),
        postal_code: String(body.postal_code || '').trim(),
        country: String(body.country || '').trim(),
        phone: body.phone ? (toE164(String(body.phone).trim(), body.country) || null) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (addr.is_default) {
        await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userId).eq('address_type', addr.address_type);
      }

      const { data, error } = await supabase.from('user_addresses').insert([addr]).select('*').single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
