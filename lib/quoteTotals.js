import { getSupabaseServerClient } from './supabaseServer';

function round2(v){ return Math.round(Number(v||0) * 100) / 100; }

export async function recalcAndUpsertUnifiedQuoteResults(quoteId, runId){
  const supabase = getSupabaseServerClient();

  // Determine effective run id if not provided: active_run_id -> latest quote_sub_orders.run_id (non-null)
  let effectiveRunId = runId || null;
  if (!effectiveRunId){
    try {
      const { data: active } = await supabase
        .from('quote_submissions')
        .select('active_run_id')
        .eq('quote_id', quoteId)
        .maybeSingle();
      effectiveRunId = active?.active_run_id || null;
      if (!effectiveRunId){
        const { data: latestQso } = await supabase
          .from('quote_sub_orders')
          .select('run_id')
          .eq('quote_id', quoteId)
          .not('run_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);
        effectiveRunId = Array.isArray(latestQso) && latestQso[0]?.run_id ? latestQso[0].run_id : null;
      }
    } catch {}
  }

  const itemsQuery = supabase
    .from('quote_sub_orders')
    .select('id, billable_pages, unit_rate, unit_rate_override, certification_amount, run_id')
    .eq('quote_id', quoteId);
  // If no analyzed quotes exist, filter for manual quotes only
  const scopedItemsQuery = effectiveRunId ? itemsQuery.eq('run_id', effectiveRunId) : itemsQuery.eq('source', 'manual');

  const [ { data: items }, { data: adjustments }, { data: certifications } ] = await Promise.all([
    scopedItemsQuery,
    supabase
      .from('quote_adjustments')
      .select('id, type, discount_type, discount_value, total_amount')
      .eq('quote_id', quoteId),
    supabase
      .from('quote_certifications')
      .select('id, certification_amount')
      .eq('quote_id', quoteId)
  ]);

  let translation = 0;
  let certificationFromItems = 0;
  if (Array.isArray(items)){
    for (const it of items){
      const pages = Number(it?.billable_pages || 0);
      const rate = Number((it?.unit_rate_override ?? it?.unit_rate) || 0);
      const cert = Number(it?.certification_amount || 0);
      translation += pages * rate;
      certificationFromItems += cert;
    }
  }

  let certificationFromTable = 0;
  if (Array.isArray(certifications)){
    for (const c of certifications){
      certificationFromTable += Number(c?.certification_amount || 0);
    }
  }
  const certification = certificationFromItems + certificationFromTable;

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
        certifications: round2(certification),
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
