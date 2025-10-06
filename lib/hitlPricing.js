import { getSupabaseServerClient } from './supabaseServer';

const GST_RATE = 0.05;

function round2(v){ return Math.round(Number(v||0)*100)/100; }

export async function recalcAndUpsertQuoteResults(quoteId){
  const supabase = getSupabaseServerClient();

  const [{ data: settings }, { data: items } ] = await Promise.all([
    supabase.from('app_settings').select('base_rate, rush_percent').limit(1).maybeSingle(),
    supabase.from('quote_sub_orders').select('id, billable_pages, unit_rate, unit_rate_override, certification_amount').eq('quote_id', quoteId)
  ]);

  const baseRate = Number(settings?.base_rate || 80);

  let translation = 0;
  let certification = 0;

  if (Array.isArray(items) && items.length > 0){
    for (const it of items){
      const pages = Number(it?.billable_pages || 0);
      const rate = Number((it?.unit_rate_override ?? it?.unit_rate) || 0);
      const cert = Number(it?.certification_amount || 0);
      translation += pages * rate;
      certification += cert;
    }
  }

  const subtotal = round2(translation + certification);
  const tax = round2(subtotal * GST_RATE);
  const total = round2(subtotal + tax);

  const upsert = {
    quote_id: quoteId,
    subtotal,
    tax,
    total,
    shipping_total: 0,
    currency: 'CAD',
    results_json: {
      analysis: 'hitl_manual',
      pricing: { translation: round2(translation), certification: round2(certification), subtotal, tax, total, taxRate: GST_RATE }
    }
  };

  const { error } = await supabase.from('quote_results').upsert(upsert, { onConflict: 'quote_id' });
  if (error) throw error;

  return { translation: round2(translation), certification: round2(certification), subtotal, tax, total };
}
