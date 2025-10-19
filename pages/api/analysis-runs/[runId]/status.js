import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { runId } = req.query;

  if (!runId) {
    return res.status(400).json({ error: 'runId is required' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data: run, error } = await supabase
      .from('analysis_runs')
      .select('id, status, is_active, discarded, created_at, updated_at')
      .eq('id', runId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to fetch run' });
    }

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    return res.status(200).json({
      status: run.status || 'pending',
      is_active: run.is_active || false,
      discarded: run.discarded || false,
      created_at: run.created_at,
      updated_at: run.updated_at
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
