import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

async function handler(req, res) {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('quote_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.quote_id) {
      return res.status(200).json({
        ocr_rows: [],
        quote_sub_orders: [],
      });
    }

    const [{ data: ocrRows, error: ocrError }, { data: quoteSubOrders, error: subOrdersError }] = await Promise.all([
      supabase
        .from('ocr_analysis')
        .select('quote_id, filename, page_number, raw_wordcount, billable_pages, complexity_multiplier, confidence_score, document_type, principal_holder_name, is_first_page, detected_language, page_confidence_score, text_extraction_confidence, language_detection_confidence, document_classification_confidence, ocr_method, run_id')
        .eq('quote_id', order.quote_id),
      supabase
        .from('quote_sub_orders')
        .select(
          'id, quote_id, filename, doc_type, total_pages, billable_pages, unit_rate, unit_rate_override, line_total, certification_amount, certification_type_name, source_language, target_language, source, created_at'
        )
        .eq('quote_id', order.quote_id),
    ]);

    if (ocrError) {
      throw ocrError;
    }

    if (subOrdersError) {
      throw subOrdersError;
    }

    return res.status(200).json({
      ocr_rows: ocrRows || [],
      quote_sub_orders: quoteSubOrders || [],
    });
  } catch (err) {
    console.error('OCR analysis fetch error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
