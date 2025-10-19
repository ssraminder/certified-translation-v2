import { withAdmin } from '../../../../lib/apiAdmin';
import { hasPermission } from '../../../../lib/permissions';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { normalizeEmail, isValidEmail } from '../../../../lib/validation';
import { logAdminActivity } from '../../../../lib/activityLog';

function parseQuery(q){
  const page = Math.max(1, Number(q.page || 1));
  const limit = Math.min(100, Math.max(1, Number(q.limit || 20)));
  const search = (q.search || '').toString().trim();
  const status = (q.status || 'all').toString().trim().toLowerCase();
  const startDate = (q.start_date || '').toString().trim() || null;
  const endDate = (q.end_date || '').toString().trim() || null;
  return { page, limit, search, status, startDate, endDate };
}

async function listQuotes(req, res){
  if (!hasPermission(req.admin?.role, 'quotes', 'view')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const { page, limit, search, status, startDate, endDate } = parseQuery(req.query || {});

  let query = supabase
    .from('quote_submissions')
    .select('quote_id, quote_number, quote_state, hitl_required, name, email, source_lang, target_lang, intended_use, created_at, expires_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('quote_state', status);
  if (search) {
    const like = `%${search}%`;
    query = query.or(`quote_number.ilike.${like},name.ilike.${like},email.ilike.${like}`);
  }
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: rows, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const ids = (rows || []).map(r => r.quote_id);
  let totalsMap = {};
  if (ids.length){
    const { data: results } = await supabase.from('quote_results').select('quote_id, total').in('quote_id', ids);
    for (const r of (results||[])) totalsMap[r.quote_id] = r.total;
  }

  const quotes = (rows || []).map(r => ({
    id: r.quote_id,
    order_id: r.quote_number || r.quote_id,
    quote_state: r.quote_state,
    hitl_required: !!r.hitl_required,
    customer_name: r.name || null,
    customer_email: r.email || null,
    source_language: r.source_lang || null,
    target_language: r.target_lang || null,
    intended_use: r.intended_use || null,
    created_at: r.created_at,
    expires_at: r.expires_at || null,
    total: typeof totalsMap[r.quote_id] === 'number' ? totalsMap[r.quote_id] : null
  }));

  const pages = Math.ceil((count || 0)/limit) || 1;
  return res.status(200).json({ quotes, total_count: count || 0, page, pages });
}

async function createQuote(req, res){
  if (!hasPermission(req.admin?.role, 'quotes', 'create')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const body = req.body || {};

  const name = (body.name || '').toString().trim();
  const email = normalizeEmail(body.email || '');
  const source_lang = (body.source_lang || '').toString().trim() || null;
  const target_lang = (body.target_lang || '').toString().trim() || null;
  const intended_use = (body.intended_use || '').toString().trim() || null;

  if (name.length < 2) return res.status(400).json({ error: 'Name is required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });

  const quote_id = global.crypto?.randomUUID ? global.crypto.randomUUID() : require('crypto').randomUUID();
  let quote_number = null;
  try {
    const { data: gen } = await supabase.rpc('generate_quote_number');
    if (gen) quote_number = gen;
  } catch {}
  if (!quote_number){
    const ts = Date.now().toString().slice(-6);
    quote_number = `Q${ts}`;
  }

  const nowIso = new Date().toISOString();
  const insert = {
    quote_id,
    quote_number,
    name,
    email,
    source_lang,
    target_lang,
    intended_use,
    status: 'draft',
    quote_state: 'draft',
    payment_status: 'unpaid',
    created_at: nowIso,
    updated_at: nowIso
  };

  const { error: insErr } = await supabase.from('quote_submissions').insert([insert]);
  if (insErr) return res.status(500).json({ error: insErr.message });

  await logAdminActivity({
    action: 'quote_created',
    actor_id: req.admin.id,
    actor_name: (req.admin.first_name && req.admin.last_name) ? `${req.admin.first_name} ${req.admin.last_name}` : (req.admin.first_name || req.admin.last_name || req.admin.email),
    target_id: quote_id,
    target_name: quote_number,
    details: { name, email, source_lang, target_lang, intended_use }
  });

  return res.status(200).json({ success: true, quote_id, quote_number });
}

async function deleteQuotes(req, res){
  if (!hasPermission(req.admin?.role, 'quotes', 'delete')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const body = req.body || {};
  const quoteIds = Array.isArray(body.quote_ids) ? body.quote_ids : [];

  if (!quoteIds.length) return res.status(400).json({ error: 'No quotes specified' });

  try {
    for (const quoteId of quoteIds) {
      await supabase.from('quote_sub_orders').delete().eq('quote_id', quoteId);
      await supabase.from('quote_files').delete().eq('quote_id', quoteId);
      await supabase.from('quote_adjustments').delete().eq('quote_id', quoteId);
      await supabase.from('quote_certifications').delete().eq('quote_id', quoteId);
      await supabase.from('quote_results').delete().eq('quote_id', quoteId);
      await supabase.from('ocr_analysis').delete().eq('quote_id', quoteId);
    }

    const { error } = await supabase.from('quote_submissions').delete().in('quote_id', quoteIds);
    if (error) throw error;

    for (const quoteId of quoteIds) {
      await logAdminActivity({
        action: 'quote_deleted',
        actor_id: req.admin.id,
        actor_name: (req.admin.first_name && req.admin.last_name) ? `${req.admin.first_name} ${req.admin.last_name}` : (req.admin.first_name || req.admin.last_name || req.admin.email),
        target_id: quoteId,
        details: { deleted_count: 1 }
      });
    }

    return res.status(200).json({ success: true, deleted_count: quoteIds.length });
  } catch (err) {
    console.error('Error deleting quotes:', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete quotes' });
  }
}

async function handler(req, res){
  if (req.method === 'GET') return listQuotes(req, res);
  if (req.method === 'POST') return createQuote(req, res);
  if (req.method === 'DELETE') return deleteQuotes(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdmin(handler);
