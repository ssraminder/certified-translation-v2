import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { recalcAndUpsertQuoteResults } from '../../../../../lib/hitlPricing';
import { logActivity } from '../../../../../lib/activityLogger';

function asNumber(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }

async function handler(req, res){
  const { quoteId } = req.query;
  const supabase = getSupabaseServerClient();

  // Lock edits if already sent
  const { data: quote } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if ((quote?.quote_state || '').toLowerCase() === 'sent') return res.status(400).json({ error: 'Quote is locked after sent' });

  if (req.method === 'POST'){
    const {
      filename,
      doc_type,
      billable_pages,
      unit_rate,
      certification_amount,
      certification_type_name,
      source_language,
      target_language,
      unit_rate_override,
      override_reason
    } = req.body || {};

    const insert = {
      quote_id: quoteId,
      filename: filename || null,
      doc_type: doc_type || null,
      billable_pages: asNumber(billable_pages) ?? 1,
      unit_rate: asNumber(unit_rate) ?? 0,
      certification_amount: asNumber(certification_amount) ?? 0,
      certification_type_name: certification_type_name || null,
      source_language: source_language || null,
      target_language: target_language || null,
      unit_rate_override: asNumber(unit_rate_override),
      override_reason: override_reason || null
    };

    const { data, error } = await supabase.from('quote_sub_orders').insert([insert]).select('*').maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    await recalcAndUpsertQuoteResults(quoteId);
    await logActivity({ adminUserId: req.admin?.id, actionType: 'hitl_quote_line_item_created', targetType: 'quote', targetId: quoteId, details: { item_id: data?.id } });

    return res.status(200).json({ success: true, item: data });
  }

  if (req.method === 'PUT'){
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });

    const updates = {};
    if (fields.filename !== undefined) updates.filename = fields.filename;
    if (fields.doc_type !== undefined) updates.doc_type = fields.doc_type;
    if (fields.billable_pages !== undefined) updates.billable_pages = asNumber(fields.billable_pages);
    if (fields.unit_rate !== undefined) updates.unit_rate = asNumber(fields.unit_rate);
    if (fields.certification_amount !== undefined) updates.certification_amount = asNumber(fields.certification_amount);
    if (fields.certification_type_name !== undefined) updates.certification_type_name = fields.certification_type_name;
    if (fields.source_language !== undefined) updates.source_language = fields.source_language;
    if (fields.target_language !== undefined) updates.target_language = fields.target_language;
    if (fields.unit_rate_override !== undefined) updates.unit_rate_override = asNumber(fields.unit_rate_override);
    if (fields.override_reason !== undefined) updates.override_reason = fields.override_reason;

    const { error } = await supabase.from('quote_sub_orders').update(updates).eq('id', id).eq('quote_id', quoteId);
    if (error) return res.status(500).json({ error: error.message });

    await recalcAndUpsertQuoteResults(quoteId);
    await logActivity({ adminUserId: req.admin?.id, actionType: 'hitl_quote_line_item_updated', targetType: 'quote', targetId: quoteId, details: { item_id: id, updates } });

    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE'){
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { error } = await supabase.from('quote_sub_orders').delete().eq('id', id).eq('quote_id', quoteId);
    if (error) return res.status(500).json({ error: error.message });

    await recalcAndUpsertQuoteResults(quoteId);
    await logActivity({ adminUserId: req.admin?.id, actionType: 'hitl_quote_line_item_deleted', targetType: 'quote', targetId: quoteId, details: { item_id: id } });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit_pricing')(handler));
