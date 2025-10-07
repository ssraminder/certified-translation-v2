import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../lib/activityLog';

async function handler(req, res){
  if (req.method !== 'DELETE'){
    res.setHeader('Allow','DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const supabase = getSupabaseServerClient();
  const { quoteId } = req.query;
  const runId = req.query.run_id || req.query.runId || req.body?.run_id || req.body?.runId || null;

  let del = supabase.from('ocr_analysis').delete().eq('quote_id', quoteId);
  if (runId) del = del.eq('run_id', runId);
  const { error } = await del;
  if (error) return res.status(500).json({ error: error.message });

  // Also remove generated line items for that run (if provided)
  if (runId) {
    await supabase.from('quote_sub_orders').delete().eq('quote_id', quoteId).eq('run_id', runId);
  }

  const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
  await logAdminActivity({ action: 'analysis_results_cleared', actor_id: req.admin?.id || null, target_id: quoteId, details: { run_id: runId || null } });
  return res.status(200).json({ success: true, totals });
}

import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
export default withPermission('quotes','edit')(handler);
