import { withPermission } from '../../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logActivity } from '../../../../../../lib/activityLogger';

function asNumber(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }

async function handler(req, res){
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const supabase = getSupabaseServerClient();

  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())) return res.status(400).json({ error: 'Quote is locked' });

  const { line_item_id, updates } = req.body || {};
  if (!line_item_id || !updates) return res.status(400).json({ error: 'line_item_id and updates are required' });

  const patch = {};
  if (updates.billable_pages !== undefined) patch.billable_pages = asNumber(updates.billable_pages);
  if (updates.unit_rate !== undefined) patch.unit_rate = asNumber(updates.unit_rate);
  if (updates.unit_rate_override !== undefined) patch.unit_rate_override = asNumber(updates.unit_rate_override);
  if (updates.override_reason !== undefined) patch.override_reason = updates.override_reason || null;
  if (updates.certification_type_name !== undefined) patch.certification_type_name = updates.certification_type_name || null;
  if (updates.certification_amount !== undefined) patch.certification_amount = asNumber(updates.certification_amount);
  if (updates.source_language !== undefined) patch.source_language = updates.source_language || null;
  if (updates.target_language !== undefined) patch.target_language = updates.target_language || null;

  const { error } = await supabase
    .from('quote_sub_orders')
    .update(patch)
    .eq('id', line_item_id)
    .eq('quote_id', quoteId);
  if (error) return res.status(500).json({ error: error.message });

  await supabase
    .from('quote_submissions')
    .update({ last_edited_by: req.admin?.id || null, last_edited_at: new Date().toISOString() })
    .eq('quote_id', quoteId);

  const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
  await logActivity({ adminUserId: req.admin?.id, actionType: 'quote_line_item_updated', targetType: 'quote', targetId: quoteId, details: { line_item_id, updates: patch } });

  const { data: updated } = await supabase.from('quote_sub_orders').select('*').eq('id', line_item_id).maybeSingle();
  return res.status(200).json({ success: true, line_item: updated, totals });
}

export default withPermission('quotes','edit')(handler);
