import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../../lib/activityLog';
import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { withPermission } from '../../../../../../lib/apiAdmin';

function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }

async function handler(req, res){
  const supabase = getSupabaseServerClient();
  const { quoteId } = req.query;

  // Compute run id from query/body
  const providedRunId = req.method === 'GET' ? (req.query.run_id || req.query.runId || null) : (req.body?.run_id || req.body?.runId || null);

  if (req.method === 'GET'){
    // Preview items computed from analysis without inserting
    let query = supabase
      .from('ocr_analysis')
      .select('filename, page_number, run_id')
      .eq('quote_id', quoteId);
    if (providedRunId) query = query.eq('run_id', providedRunId);
    const { data: rows, error: rowsErr } = await query;
    if (rowsErr) return res.status(500).json({ error: rowsErr.message });

    const map = new Map();
    for (const r of (rows||[])){
      const key = r.filename || 'Document';
      const current = map.get(key) || { filename: key, pages: new Set() };
      if (r.page_number != null) current.pages.add(num(r.page_number));
      map.set(key, current);
    }

    let unitRate = 65;
    const { data: existingItems } = await supabase
      .from('quote_sub_orders')
      .select('unit_rate')
      .eq('quote_id', quoteId);
    if (Array.isArray(existingItems) && existingItems.length){
      const rates = existingItems.map(x=> num(x.unit_rate)).filter(Boolean);
      if (rates.length){ unitRate = Math.round((rates.reduce((a,b)=>a+b,0)/rates.length) * 100) / 100; }
    }

    const items = Array.from(map.values()).map(v => ({ filename: v.filename, doc_type: v.filename, billable_pages: v.pages.size || 1, unit_rate: unitRate, certification_amount: 0 }));
    return res.status(200).json({ success: true, items });
  }

  if (req.method !== 'POST'){
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const src = String(req.body?.source || 'auto').toLowerCase();
  const isEdited = (src === 'edited');
  const source = 'n8n';

  // Ensure editable
  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())){
    return res.status(400).json({ error: 'Quote is locked' });
  }

  // Determine run_id to use
  let runId = providedRunId;
  if (!runId) {
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

  // Build inserts: if edited and items provided, use overrides; otherwise compute from analysis rows
  let inserts = [];
  const providedItems = Array.isArray(req.body?.items) ? req.body.items : null;
  if (source === 'edited' && providedItems && providedItems.length){
    inserts = providedItems.map(it => {
      const pages = num(it.billable_pages) || 1;
      const unitRate = num(it.unit_rate) || 65;
      const certAmt = num(it.certification_amount) || 0;
      return {
        quote_id: quoteId,
        filename: it.filename || it.doc_type || 'Document',
        doc_type: it.doc_type || it.filename || 'Document',
        billable_pages: pages,
        unit_rate: unitRate,
        unit_rate_override: null,
        override_reason: 'edited',
        source_language: null,
        target_language: null,
        certification_amount: certAmt,
        line_total: (pages * unitRate) + certAmt,
        source,
        run_id: runId || null
      };
    });
  } else {
    // Load analysis rows (scoped by run when available)
    let query = supabase
      .from('ocr_analysis')
      .select('filename, page_number, run_id')
      .eq('quote_id', quoteId);
    if (runId) query = query.eq('run_id', runId);
    const { data: rows, error: rowsErr } = await query;
    if (rowsErr) return res.status(500).json({ error: rowsErr.message });
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'No analysis rows' });

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

    for (const [_, v] of map.entries()){
      const pages = v.pages.size || 1;
      inserts.push({
        quote_id: quoteId,
        filename: v.filename,
        doc_type: v.filename,
        billable_pages: pages,
        unit_rate: unitRate,
        unit_rate_override: null,
        override_reason: isEdited ? 'edited' : null,
        source_language: null,
        target_language: null,
        certification_amount: 0,
        line_total: pages * unitRate,
        source,
        run_id: runId || null
      });
    }
  }

  if (!inserts.length) return res.status(400).json({ error: 'No inserts computed' });

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

export default withPermission('quotes','edit')(handler);
