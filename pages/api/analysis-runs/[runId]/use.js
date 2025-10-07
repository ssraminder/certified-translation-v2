import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../lib/quoteTotals';

export default async function handler(req, res){
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ error: 'Method Not Allowed' }); }
  const { runId } = req.query;
  const { confirmed } = req.body || {};
  if (!runId) return res.status(400).json({ error: 'run_id required' });
  if (!confirmed) return res.status(400).json({ error: 'confirmed=true required' });
  const supabase = getSupabaseServerClient();

  const { data: run, error: runErr } = await supabase.from('analysis_runs').select('id, quote_id').eq('id', runId).maybeSingle();
  if (runErr) return res.status(500).json({ error: runErr.message });
  if (!run) return res.status(404).json({ error: 'Run not found' });

  // Mark run active and submission active_run_id
  const now = new Date().toISOString();
  const { error: updRunErr } = await supabase.from('analysis_runs').update({ is_active: true, status: 'completed', updated_at: now }).eq('id', runId);
  if (updRunErr) return res.status(500).json({ error: updRunErr.message });
  await supabase.from('quote_submissions').update({ active_run_id: runId, updated_at: now }).eq('quote_id', run.quote_id);

  const totals = await recalcAndUpsertUnifiedQuoteResults(run.quote_id, runId);
  return res.status(200).json({ ok: true, totals, run_id: runId });
}
