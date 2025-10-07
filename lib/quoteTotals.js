import { getSupabaseServerClient } from './supabaseServer';

function round2(v){ return Math.round(Number(v||0) * 100) / 100; }

export async function recalcAndUpsertUnifiedQuoteResults(quoteId){
  const supabase = getSupabaseServerClient();

  const [ { data: items }, { data: adjustments } ] = await Promise.all([
    supabase
      .from('quote_sub_orders')
      .select('id, billable_pages, unit_rate, unit_rate_override, certification_amount')
      .eq('quote_id', quoteId),
    supabase
      .from('quote_adjustments')
      .select('id, type, discount_type, discount_value, total_amount')
      .eq('quote_id', quoteId)
  ]);

  let translation = 0;
  let certification = 0;
  if (Array.isArray(items)){
    for (const it of items){
      const pages = Number(it?.billable_pages || 0);
      const rate = Number((it?.unit_rate_override ?? it?.unit_rate) || 0);
      const cert = Number(it?.certification_amount || 0);
      translation += pages * rate;
      certification += cert;
    }
  }

  const baseBeforeAdj = translation + certification;

  let additionalItemsTotal = 0;
  let discountsAndSurchargesTotal = 0; // negative for discounts, positive for surcharges

  if (Array.isArray(adjustments)){
    for (const adj of adjustments){
      const t = String(adj?.type || '').toLowerCase();
      const dt = String(adj?.discount_type || '').toLowerCase();
      const val = Number(adj?.discount_value || 0);
      const total = Number(adj?.total_amount || 0);
      if (t === 'additional_item') {
        additionalItemsTotal += total;
      } else if (t === 'discount') {
        if (dt === 'fixed') discountsAndSurchargesTotal -= Math.abs(val);
        else if (dt === 'percentage') discountsAndSurchargesTotal -= (baseBeforeAdj * (val/100));
      } else if (t === 'surcharge') {
        if (dt === 'fixed') discountsAndSurchargesTotal += Math.abs(val);
        else if (dt === 'percentage') discountsAndSurchargesTotal += (baseBeforeAdj * (val/100));
      }
    }
  }

  const subtotal = round2(baseBeforeAdj + additionalItemsTotal + discountsAndSurchargesTotal);
  const taxRate = 0.05; // TODO: load from app_settings if needed
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);

  const upsert = {
    quote_id: quoteId,
    subtotal,
    tax,
    total,
    shipping_total: 0,
    currency: 'CAD',
    results_json: {
      pricing: {
        translation: round2(translation),
        certification: round2(certification),
        additional_items: round2(additionalItemsTotal),
        discounts_or_surcharges: round2(discountsAndSurchargesTotal),
        subtotal,
        tax,
        total,
        taxRate
      }
    }
  };

  const { error } = await supabase.from('quote_results').upsert(upsert, { onConflict: 'quote_id' });
  if (error) throw error;

  return {
    translation: round2(translation),
    certification: round2(certification),
    additional_items: round2(additionalItemsTotal),
    discounts_or_surcharges: round2(discountsAndSurchargesTotal),
    subtotal,
    tax,
    total
  };
}
