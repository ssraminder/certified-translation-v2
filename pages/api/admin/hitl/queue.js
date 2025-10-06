import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { withPermission } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function parseIntParam(v, def = 1){ const n = Number.parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : def; }
function parseStr(v, allowed, def){ const s = String(v||'').toLowerCase(); return allowed.includes(s) ? s : def; }

async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const supabase = getSupabaseServerClient();

  const status = parseStr(req.query.status, ['pending','in_progress','completed','all'], 'pending');
  const assigned = parseStr(req.query.assigned, ['all','unassigned','me','others'], 'all');
  const sort = parseStr(req.query.sort, ['newest','oldest','value','pages'], 'newest');
  const page = parseIntParam(req.query.page, 1);
  const pageSize = Math.min(parseIntParam(req.query.pageSize, 20), 100);

  const meId = req.admin?.id || null;

  let base = supabase
    .from('quote_submissions')
    .select(`quote_id, quote_number, name, email, created_at, source_lang, target_lang, hitl_required, hitl_reason, hitl_assigned_to_admin_id, hitl_assigned_at, hitl_completed_at, quote_state, tier_name, language_tier_multiplier`)
    .eq('hitl_required', true);

  // Status filter
  if (status === 'pending') {
    base = base.is('hitl_completed_at', null).is('hitl_assigned_to_admin_id', null);
  } else if (status === 'in_progress') {
    base = base.is('hitl_completed_at', null).not('hitl_assigned_to_admin_id', 'is', null);
  } else if (status === 'completed') {
    base = base.not('hitl_completed_at', 'is', null);
  }

  // Assigned filter
  if (assigned === 'unassigned') base = base.is('hitl_assigned_to_admin_id', null);
  if (assigned === 'me' && meId) base = base.eq('hitl_assigned_to_admin_id', meId);
  if (assigned === 'others' && meId) base = base.neq('hitl_assigned_to_admin_id', meId);

  // Sort
  if (sort === 'newest') base = base.order('created_at', { ascending: false });
  if (sort === 'oldest') base = base.order('created_at', { ascending: true });
  // value and pages sorts can be added after enriching with aggregates; default to newest for now

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let { data: rows, error } = await base.range(from, to);
  if (error) return res.status(500).json({ error: error.message });
  rows = rows || [];

  // Fetch document counts for current page
  const ids = rows.map(r => r.quote_id);
  let countsMap = {};
  if (ids.length) {
    const { data: docCounts } = await supabase
      .from('quote_files')
      .select('quote_id, count:quote_id', { count: 'exact' })
      .in('quote_id', ids);
    // Supabase doesn't return grouped counts with this simple select; fallback to manual group by
    if (Array.isArray(docCounts)) {
      for (const r of docCounts) {
        countsMap[r.quote_id] = (countsMap[r.quote_id] || 0) + 1;
      }
    } else {
      // If driver returns null, do a grouped query
      const { data: groupRows } = await supabase
        .from('quote_files')
        .select('quote_id')
        .in('quote_id', ids);
      for (const r of groupRows || []) {
        countsMap[r.quote_id] = (countsMap[r.quote_id] || 0) + 1;
      }
    }
  }

  // Summary counts
  const [{ count: pending }, { count: in_progress }, { count: completed }] = await Promise.all([
    supabase.from('quote_submissions').select('*', { count: 'exact', head: true }).eq('hitl_required', true).is('hitl_completed_at', null).is('hitl_assigned_to_admin_id', null),
    supabase.from('quote_submissions').select('*', { count: 'exact', head: true }).eq('hitl_required', true).is('hitl_completed_at', null).not('hitl_assigned_to_admin_id', 'is', null),
    supabase.from('quote_submissions').select('*', { count: 'exact', head: true }).eq('hitl_required', true).not('hitl_completed_at', 'is', null),
  ]);

  const quotes = rows.map(r => ({
    id: r.quote_id,
    quote_number: r.quote_number || r.quote_id,
    customer: { name: r.name, email: r.email },
    submitted_at: r.created_at,
    documents: { count: countsMap[r.quote_id] || 0 },
    languages: { source: r.source_lang, target: r.target_lang },
    reason: r.hitl_reason || null,
    assigned_to_admin_id: r.hitl_assigned_to_admin_id || null,
    status: r.hitl_completed_at ? 'completed' : (r.hitl_assigned_to_admin_id ? 'in_progress' : 'pending'),
  }));

  return res.status(200).json({ quotes, total: quotes.length, pending: pending||0, in_progress: in_progress||0, completed: completed||0 });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','view')(handler));
