import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../../lib/activityLog';

function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }

async function handler(req, res){
  if (req.method !== 'POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const supabase = getSupabaseServerClient();
  const { quoteId } = req.query;
  const src = String(req.body?.source || 'auto').toLowerCase();
  const providedRunId = req.body?.run_id || req.body?.runId || null;
  const source = (src === 'edited') ? 'edited' : 'auto';

  // Ensure editable
  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())){
    return res.status(400).json({ error: 'Quote is locked' });
  }

  // Determine run_id to use
  let runId = providedRunId;
  if (!runId) {
    // Prefer active run, else latest by created_at
    const { data: activeRow } = await supabase
      .from('quote_submissions')
      .select('active_run_id')
      .eq('quote_id', quoteId)
      .maybeSingle();
    runId = activeRow?.active_run_id || null;
    if (!runId) {
      const { data: latestRun } = await supabase
        .from('analysis_runs')
        .select('id')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false })
        .limit(1);
      runId = Array.isArray(latestRun) && latestRun[0]?.id ? latestRun[0].id : null;
    }
  }

  // Load analysis rows (scoped by run when available)
  let query = supabase
    .from('ocr_analysis')
    .select('filename, page_number, run_id')
    .eq('quote_id', quoteId);
  if (runId) query = query.eq('run_id', runId);
  const { data: rows, error: rowsErr } = await query;
  if (rowsErr) return res.status(500).json({ error: rowsErr.message });
  if (!rows || rows.length === 0) return res.status(400).json({ error: 'No analysis rows' });

  // Group by filename and count pages
  const map = new Map();
  for (const r of rows){
    const key = r.filename || 'Document';
    const current = map.get(key) || { filename: key, pages: new Set() };
    if (r.page_number != null) current.pages.add(num(r.page_number));
    map.set(key, current);
  }

  // Determine default unit rate - use existing line item average or fallback to 65
  let unitRate = 65;
  const { data: existingItems } = await supabase
    .from('quote_sub_orders')
    .select('unit_rate')
    .eq('quote_id', quoteId);
  if (Array.isArray(existingItems) && existingItems.length){
    const rates = existingItems.map(x=> num(x.unit_rate)).filter(Boolean);
    if (rates.length){ unitRate = Math.round((rates.reduce((a,b)=>a+b,0)/rates.length) * 100) / 100; }
  }

  const inserts = [];
  for (const [_, v] of map.entries()){
    const pages = v.pages.size || 1;
    inserts.push({
      quote_id: quoteId,
      filename: v.filename,
      doc_type: v.filename,
      billable_pages: pages,
      unit_rate: unitRate,
      unit_rate_override: null,
      override_reason: null,
      source_language: null,
      target_language: null,
      certification_amount: 0,
      line_total: pages * unitRate,
      source,
      run_id: runId || null
    });
  }

  if (inserts.length === 0) return res.status(400).json({ error: 'No inserts computed' });

  const { data: created, error: insErr } = await supabase.from('quote_sub_orders').insert(inserts).select('*');
  if (insErr) return res.status(500).json({ error: insErr.message });

  // Optionally mark this run as active for the quote
  const markActive = !!req.body?.mark_active;
  if (markActive && runId) {
    await supabase.from('quote_submissions').update({ active_run_id: runId }).eq('quote_id', quoteId);
  }

  const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
  await logAdminActivity({ action: 'quote_line_items_from_analysis', actor_id: req.admin?.id || null, target_id: quoteId, details: { count: created?.length || 0, source, run_id: runId || null } });
  return res.status(200).json({ success: true, created: created || [], totals, run_id: runId || null });
}

import { withPermission } from '../../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
export default withPermission('quotes','edit')(handler);
