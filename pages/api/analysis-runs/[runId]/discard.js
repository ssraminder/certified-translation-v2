import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

export default async function handler(req, res){
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ error: 'Method Not Allowed' }); }
  const { runId } = req.query;
  const { reason } = req.body || {};
  if (!runId) return res.status(400).json({ error: 'run_id required' });
  const supabase = getSupabaseServerClient();

  const { data: run, error: runErr } = await supabase.from('analysis_runs').select('id').eq('id', runId).maybeSingle();
  if (runErr) return res.status(500).json({ error: runErr.message });
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const updates = { discarded: true, status: 'discarded', updated_at: new Date().toISOString(), discard_reason: reason || null };
  const { error: updErr } = await supabase.from('analysis_runs').update(updates).eq('id', runId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.status(200).json({ ok: true, run_id: runId });
}
