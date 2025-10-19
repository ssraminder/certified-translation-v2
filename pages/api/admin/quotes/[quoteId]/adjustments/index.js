import { withPermission } from '../../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logActivity } from '../../../../../../lib/activityLogger';

function asNumber(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { quoteId } = req.query;
    const supabase = getSupabaseServerClient();

  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())) return res.status(400).json({ error: 'Quote is locked' });

  const body = req.body || {};
  console.log('API adjustments.body', body);
  const type = String(body.type || '').toLowerCase();
  const description = body.description || '';
  const is_taxable = body.is_taxable !== undefined ? !!body.is_taxable : true;

  let insert = { quote_id: quoteId, type, description, is_taxable };
  let total_amount = 0;

  if (type === 'additional_item'){
    const quantity = asNumber(body.quantity) ?? 1;
    const unit_amount = asNumber(body.unit_amount) ?? 0;
    total_amount = (quantity * unit_amount);
    insert = { ...insert, quantity, unit_amount, total_amount };
  } else if (type === 'discount' || type === 'surcharge'){
    const discount_type = String(body.discount_type || '').toLowerCase();
    const discount_value = asNumber(body.discount_value) ?? 0;
    insert = { ...insert, discount_type, discount_value, total_amount: 0 };
  } else {
    return res.status(400).json({ error: 'Invalid type' });
  }

    console.log('API adjustments.insert', insert);
    const { data, error } = await supabase.from('quote_adjustments').insert([insert]).select('*').maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    await supabase
      .from('quote_submissions')
      .update({ last_edited_by: req.admin?.id || null, last_edited_at: new Date().toISOString() })
      .eq('quote_id', quoteId);

    const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
    await logActivity({ adminUserId: req.admin?.id, actionType: 'quote_adjustment_added', targetType: 'quote', targetId: quoteId, details: { adjustment_id: data?.id, type } });

    return res.status(200).json({ success: true, adjustment: data, totals });
  } catch (err) {
    console.error('Error creating adjustment:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

export default withPermission('quotes','edit')(handler);
