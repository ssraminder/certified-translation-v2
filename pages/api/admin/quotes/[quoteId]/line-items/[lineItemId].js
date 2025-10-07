import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../../lib/activityLog';

async function handler(req, res){
  if (req.method !== 'DELETE'){
    res.setHeader('Allow','DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const supabase = getSupabaseServerClient();
  const { quoteId, lineItemId } = req.query;

  const { error } = await supabase.from('quote_sub_orders').delete().eq('id', lineItemId).eq('quote_id', quoteId);
  if (error) return res.status(500).json({ error: error.message });

  const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
  await logAdminActivity({ action: 'quote_line_item_deleted', actor_id: req.admin?.id || null, target_id: quoteId, details: { line_item_id: lineItemId } });
  return res.status(200).json({ success: true, totals });
}

import { withPermission } from '../../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
export default withPermission('quotes','edit')(handler);
