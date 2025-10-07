import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const supabase = getSupabaseServerClient();

  const { data: q } = await supabase
    .from('quote_submissions')
    .select('*, quote_results(*)')
    .eq('quote_id', quoteId)
    .maybeSingle();
  if (!q) return res.status(404).json({ error: 'Quote not found' });

  const [ { data: items }, { data: adjustments }, { data: files }, { data: certs } ] = await Promise.all([
    supabase.from('quote_sub_orders').select('*').eq('quote_id', quoteId).order('id'),
    supabase.from('quote_adjustments').select('*').eq('quote_id', quoteId).order('display_order'),
    supabase.from('quote_files').select('*').eq('quote_id', quoteId),
    supabase.from('quote_certifications').select('*').eq('quote_id', quoteId).order('display_order')
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
      doc_type: f.doc_type || null,
      file_purpose: f.file_purpose || 'translate',
      analyzed: !!f.analyzed,
      analysis_requested_at: f.analysis_requested_at || null
    };
  }));

  const results = Array.isArray(q.quote_results) && q.quote_results.length ? q.quote_results[0] : null;
  const can_edit = !['sent','accepted','converted'].includes(String(q.quote_state||'').toLowerCase());

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
    per_page_billable: it.per_page_billable || null
  }));

  const totals = results ? {
    translation_subtotal: results?.results_json?.pricing?.translation ?? null,
    certification_subtotal: results?.results_json?.pricing?.certification ?? null,
    adjustments_total: ((results?.results_json?.pricing?.additional_items || 0) + (results?.results_json?.pricing?.discounts_or_surcharges || 0)) ?? 0,
    subtotal: results.subtotal,
    tax: results.tax,
    total: results.total
  } : null;

  return res.status(200).json({
    quote: {
      id: q.quote_id,
      order_id: q.quote_number || q.quote_id,
      quote_state: q.quote_state,
      customer_name: q.name,
      customer_email: q.email,
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
    totals
  });
}

export default withPermission('quotes','view')(handler);
