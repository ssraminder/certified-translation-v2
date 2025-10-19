import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../lib/quoteTotals';
import { toE164 } from '../../../../../lib/formatters/phone';

async function handler(req, res){
  const { quoteId } = req.query;
  const supabase = getSupabaseServerClient();

  if (req.method === 'PUT'){
    try{
      const body = req.body || {};
      const update = {};
      if (typeof body.name === 'string') update.name = body.name.trim();
      if (typeof body.email === 'string') update.email = body.email.trim().toLowerCase();
      if ('phone' in body) update.phone = body.phone ? (toE164(body.phone) || null) : null;
      if (typeof body.source_lang === 'string' || body.source_lang === null) update.source_lang = body.source_lang || null;
      if (typeof body.target_lang === 'string' || body.target_lang === null) update.target_lang = body.target_lang || null;
      if (typeof body.intended_use === 'string' || body.intended_use === null) update.intended_use = body.intended_use || null;
      const { data: updated, error: upErr } = await supabase.from('quote_submissions').update(update).eq('quote_id', quoteId).select('*, quote_results(*)').maybeSingle();
      if (upErr) return res.status(500).json({ error: upErr.message });
      if (!updated) return res.status(404).json({ error: 'Quote not found' });
      const can_edit = !['accepted','converted'].includes(String(updated.quote_state||'').toLowerCase());
      const totals = updated?.quote_results ? {
        translation_subtotal: updated?.quote_results?.results_json?.pricing?.translation ?? null,
        certification_subtotal: (updated?.quote_results?.results_json?.pricing?.certifications ?? updated?.quote_results?.results_json?.pricing?.certification) ?? null,
        adjustments_total: ((updated?.quote_results?.results_json?.pricing?.additional_items || 0) + (updated?.quote_results?.results_json?.pricing?.discounts_or_surcharges || 0)) ?? 0,
        subtotal: updated.quote_results.subtotal,
        tax: updated.quote_results.tax,
        total: updated.quote_results.total
      } : null;
      return res.status(200).json({
        quote: {
          id: updated.quote_id,
          order_id: updated.quote_number || updated.quote_id,
          quote_number: updated.quote_number || updated.quote_id,
          quote_state: updated.quote_state,
          customer_name: updated.name,
          customer_email: updated.email,
          customer_phone: updated.phone || null,
          customer_type: updated.ordering_type || null,
          customer_company_name: updated.company_name || null,
          customer_designation: updated.designation || null,
          customer_frequency: updated.frequency || null,
          source_language: updated.source_lang,
          target_language: updated.target_lang,
          intended_use: updated.intended_use,
          delivery_speed: updated.delivery_speed || 'standard',
          delivery_date: updated.delivery_date || null,
          can_edit
        },
        totals
      });
    } catch(e){
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data: q } = await supabase
    .from('quote_submissions')
    .select('*, quote_results(*)')
    .eq('quote_id', quoteId)
    .maybeSingle();
  if (!q) return res.status(404).json({ error: 'Quote not found' });

  const itemsQuery = supabase.from('quote_sub_orders').select('*').eq('quote_id', quoteId).eq('source', 'manual').order('id');

  // Fetch items and other collections
  const [ { data: items }, { data: adjustments }, { data: files }, { data: refMaterials }, { data: certs }, { data: resultsRows } ] = await Promise.all([
    itemsQuery,
    supabase.from('quote_adjustments').select('*').eq('quote_id', quoteId).order('display_order'),
    supabase.from('quote_files').select('*').eq('quote_id', quoteId),
    supabase.from('quote_reference_materials').select('*').eq('quote_id', quoteId),
    supabase.from('quote_certifications').select('*').eq('quote_id', quoteId).order('display_order'),
    supabase.from('quote_results').select('*').eq('quote_id', quoteId).order('updated_at', { ascending: false })
  ]);

  const BUCKET = 'orders';
  const documents = await Promise.all((files||[]).map(async (f) => {
    let url = f.file_url || null;
    if (!url && f.storage_path){
      try { const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 3600); if (signed?.signedUrl) url = signed.signedUrl; } catch {}
    }
    if (!url && f.signed_url) url = f.signed_url;
    return {
      id: f.id,
      file_id: f.file_id,
      filename: f.filename,
      file_url: url,
      bytes: f.bytes || 0,
      content_type: f.content_type || null,
      doc_type: f.doc_type || null,
      file_purpose: f.file_purpose || 'translate',
      analyzed: !!f.analyzed,
      analysis_requested_at: f.analysis_requested_at || null
    };
  }));

  // Get the most recent results, or trigger calculation if none exist
  let results = null;
  if (Array.isArray(resultsRows)){
    results = resultsRows[0] || null;
  }

  // If no results exist and there are line items or adjustments, calculate and save
  if (!results && (Array.isArray(items) && items.length > 0 || Array.isArray(adjustments) && adjustments.length > 0 || Array.isArray(certs) && certs.length > 0)){
    try {
      const { recalcAndUpsertUnifiedQuoteResults } = await import('../../../../../lib/quoteTotals');
      await recalcAndUpsertUnifiedQuoteResults(quoteId);
      const { data: newResults } = await supabase.from('quote_results').select('*').eq('quote_id', quoteId).maybeSingle();
      results = newResults || null;
    } catch (calcErr) {
      console.error('[admin/quotes] Failed to auto-calculate results:', calcErr);
    }
  }

  const can_edit = !['accepted','converted'].includes(String(q.quote_state||'').toLowerCase());

  const line_items = (items||[]).map(it => ({
    id: it.id,
    filename: it.filename,
    doc_type: it.doc_type,
    billable_pages: it.billable_pages,
    unit_rate: it.unit_rate,
    unit_rate_override: it.unit_rate_override,
    override_reason: it.override_reason,
    certification_type_name: it.certification_type_name,
    certification_amount: it.certification_amount,
    line_total: it.line_total,
    source_language: it.source_language,
    target_language: it.target_language,
    total_pages: it.total_pages || null,
    per_page_wordcount: it.per_page_wordcount || null,
    per_page_billable: it.per_page_billable || null,
    source: it.source || null
  }));

  const totals = results ? {
    translation_subtotal: results?.results_json?.pricing?.translation ?? null,
    certification_subtotal: (results?.results_json?.pricing?.certifications ?? results?.results_json?.pricing?.certification) ?? null,
    adjustments_total: ((results?.results_json?.pricing?.additional_items || 0) + (results?.results_json?.pricing?.discounts_or_surcharges || 0)) ?? 0,
    subtotal: results.subtotal,
    tax: results.tax,
    total: results.total
  } : null;

  return res.status(200).json({
    quote: {
      id: q.quote_id,
      order_id: q.quote_number || q.quote_id,
      quote_number: q.quote_number || q.quote_id,
      quote_state: q.quote_state,
      customer_name: q.name,
      customer_email: q.email,
      customer_phone: q.phone || null,
      customer_type: q.ordering_type || null,
      customer_company_name: q.company_name || null,
      customer_designation: q.designation || null,
      customer_frequency: q.frequency || null,
      source_language: q.source_lang,
      target_language: q.target_lang,
      intended_use: q.intended_use,
      delivery_speed: q.delivery_speed || 'standard',
      delivery_date: q.delivery_date || null,
      can_edit
    },
    line_items,
    ocr_analysis: q.n8n_analysis_result || null,
    adjustments: adjustments || [],
    documents,
    certifications: certs || [],
    totals
  });
}

export default withPermission('quotes','view')(handler);
