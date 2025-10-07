import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../lib/quoteTotals';

export default async function handler(req, res){
  if (req.method !== 'PATCH') { res.setHeader('Allow','PATCH'); return res.status(405).json({ error: 'Method Not Allowed' }); }
  const { runId, index } = req.query;
  if (!runId) return res.status(400).json({ error: 'run_id required' });
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0) return res.status(400).json({ error: 'valid document_index required' });

  const supabase = getSupabaseServerClient();

  // Get ordered documents (by id) to find target filename/row
  const { data: rows, error } = await supabase
    .from('quote_sub_orders')
    .select('id, quote_id, filename')
    .eq('run_id', runId)
    .order('id');
  if (error) return res.status(500).json({ error: error.message });
  if (!Array.isArray(rows) || rows.length <= idx) return res.status(404).json({ error: 'Document not found' });
  const target = rows[idx];

  // Build patch
  const allowed = ['document_type','doc_type','billable_pages','unit_rate','complexity_multiplier','certification_type_name','certification_amount'];
  const body = req.body || {};
  const patch = {};
  for (const k of allowed){ if (body[k] !== undefined) patch[k === 'document_type' ? 'doc_type' : k] = body[k]; }

  const { error: updErr } = await supabase.from('quote_sub_orders').update(patch).eq('id', target.id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  const totals = await recalcAndUpsertUnifiedQuoteResults(target.quote_id, runId);
  return res.status(200).json({ ok: true, run_id: runId, totals });
}
