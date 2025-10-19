import { withPermission } from '../../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logActivity } from '../../../../../../lib/activityLogger';

async function handler(req, res){
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { quoteId, adjustmentId } = req.query;
    const supabase = getSupabaseServerClient();

  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())) return res.status(400).json({ error: 'Quote is locked' });

    const { error } = await supabase.from('quote_adjustments').delete().eq('id', adjustmentId).eq('quote_id', quoteId);
    if (error) return res.status(500).json({ error: error.message });

    const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
    await logActivity({ adminUserId: req.admin?.id, actionType: 'quote_adjustment_deleted', targetType: 'quote', targetId: quoteId, details: { adjustment_id: adjustmentId } });

    return res.status(200).json({ success: true, totals });
  } catch (err) {
    console.error('Error deleting adjustment:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

export default withPermission('quotes','edit')(handler);
