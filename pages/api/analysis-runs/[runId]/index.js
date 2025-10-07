import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }

export default async function handler(req, res){
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ error: 'Method Not Allowed' }); }
  const { runId } = req.query;
  if (!runId) return res.status(400).json({ error: 'run_id required' });
  const supabase = getSupabaseServerClient();

  const { data: run, error: runErr } = await supabase.from('analysis_runs').select('*').eq('id', runId).maybeSingle();
  if (runErr) return res.status(500).json({ error: runErr.message });
  if (!run) return res.status(404).json({ error: 'Run not found' });

  // Fetch document-level items from quote_sub_orders for this run
  let documents = [];
  try {
    const { data: items } = await supabase
      .from('quote_sub_orders')
      .select('filename, doc_type, total_pages, billable_pages, average_confidence_score, complexity_multiplier, source_language, target_language')
      .eq('quote_id', run.quote_id)
      .eq('run_id', runId)
      .order('id');
    documents = (items||[]).map(it => ({
      filename: it.filename || null,
      document_type: it.doc_type || null,
      language: it.source_language || null,
      pages: num(it.total_pages) || null,
      billable_pages: num(it.billable_pages) || 0,
      confidence_score: num(it.average_confidence_score) || null,
      complexity_multiplier: num(it.complexity_multiplier) || null
    }));
  } catch {}

  const summary = {
    total_documents: documents.length,
    total_pages: documents.reduce((a,b)=> a + (num(b.pages)||0), 0),
    billable_pages: documents.reduce((a,b)=> a + num(b.billable_pages), 0),
    estimated_total: documents.reduce((a,b)=> a + (num(b.billable_pages) * 0 /* unit_rate unavailable here */), 0)
  };

  return res.status(200).json({
    quote_id: run.quote_id,
    run_id: runId,
    status: run.status || null,
    timestamp: run.updated_at || run.created_at || null,
    summary,
    documents,
    run
  });
}
