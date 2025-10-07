import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

export default async function handler(req, res){
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ error: 'Method Not Allowed' }); }
  const { runId } = req.query;
  if (!runId) return res.status(400).json({ error: 'run_id required' });
  const supabase = getSupabaseServerClient();

  // Fetch run row
  const { data: run, error: runErr } = await supabase.from('analysis_runs').select('id, quote_id, status, is_active, discarded, updated_at').eq('id', runId).maybeSingle();
  if (runErr) return res.status(500).json({ error: runErr.message });
  if (!run) return res.status(404).json({ error: 'Run not found' });

  // Optional: fetch submission n8n_status for display
  let n8n_status = null; let submissionUpdatedAt = null;
  try {
    const { data: sub } = await supabase.from('quote_submissions').select('n8n_status, updated_at').eq('quote_id', run.quote_id).maybeSingle();
    n8n_status = sub?.n8n_status || null; submissionUpdatedAt = sub?.updated_at || null;
  } catch {}

  return res.status(200).json({ status: run.status || null, n8n_status, updated_at: run.updated_at || submissionUpdatedAt || null, is_active: !!run.is_active, discarded: !!run.discarded });
}
