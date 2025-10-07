import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const quoteId = req.query.quote;
  if (!quoteId) return res.status(400).json({ error: 'Missing quote id' });

  try {
    const supabase = getSupabaseServerClient();

    const { data: lastRun } = await supabase
      .from('analysis_runs')
      .select('version')
      .eq('quote_id', quoteId)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = (Array.isArray(lastRun) && lastRun[0]?.version ? Number(lastRun[0].version) : 0) + 1;

    const runInsert = {
      quote_id: quoteId,
      run_type: 'auto',
      version: nextVersion,
      status: 'requested',
      is_active: false,
      discarded: false
    };

    const { data: runRow, error: runErr } = await supabase
      .from('analysis_runs')
      .insert([runInsert])
      .select('id, version')
      .maybeSingle();
    if (runErr) return res.status(500).json({ error: runErr.message });

    return res.status(200).json({ run_id: runRow?.id || null, version: runRow?.version || nextVersion });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
