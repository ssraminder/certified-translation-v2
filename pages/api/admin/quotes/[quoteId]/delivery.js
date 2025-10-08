import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../lib/quoteTotals';

async function handler(req, res){
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const { delivery_speed } = req.body || {};

  const supabase = getSupabaseServerClient();
  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())) return res.status(400).json({ error: 'Quote is locked' });

  const speed = (delivery_speed || 'standard').toString();
  const now = new Date();
  const estimate = new Date(now.getTime() + (speed === 'rush' ? 2 : 5) * 24 * 60 * 60 * 1000);

  let updateError = null;
  try {
    const { error } = await supabase
      .from('quote_submissions')
      .update({ delivery_speed: speed, delivery_date: estimate.toISOString(), last_edited_by: req.admin?.id || null, last_edited_at: new Date().toISOString() })
      .eq('quote_id', quoteId);
    if (error) updateError = error;
  } catch (e) { updateError = e; }

  if (updateError) {
    try {
      await supabase
        .from('quote_submissions')
        .update({ last_edited_by: req.admin?.id || null, last_edited_at: new Date().toISOString() })
        .eq('quote_id', quoteId);
    } catch (_) {}
  }

  const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
  return res.status(200).json({ success: true, delivery_date: estimate.toISOString(), totals, note: updateError ? 'delivery fields not stored (missing columns)' : undefined });
}

export default withPermission('quotes','edit')(handler);
