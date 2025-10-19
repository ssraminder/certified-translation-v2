import { getSupabaseServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Quote ID is required' });
    }

    const supabase = getSupabaseServerClient();

    const { data: quote, error: quoteError } = await supabase
      .from('quote_submissions')
      .select('*')
      .eq('order_id', id)
      .maybeSingle();

    if (quoteError) {
      console.error('Quote fetch error:', quoteError);
      return res.status(500).json({ error: 'Failed to fetch quote' });
    }

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const { data: lineItems } = await supabase
      .from('line_items')
      .select('*')
      .eq('quote_id', quote.quote_id);

    const { data: adjustments } = await supabase
      .from('adjustments')
      .select('*')
      .eq('quote_id', quote.quote_id);

    const { data: certifications } = await supabase
      .from('certifications')
      .select('*')
      .eq('quote_id', quote.quote_id);

    const { data: totals } = await supabase
      .from('quote_results')
      .select('*')
      .eq('quote_id', quote.quote_id)
      .maybeSingle();

    return res.status(200).json({
      quote_id: quote.quote_id,
      order_id: quote.order_id,
      quote_number: quote.quote_number,
      quote_state: quote.quote_state,
      created_at: quote.created_at,
      delivery_date: quote.delivery_date,
      source_language: quote.source_language,
      target_language: quote.target_language,
      intended_use: quote.intended_use,
      cert_type: quote.certification_type,
      country_of_issue: quote.country_of_issue,
      subtotal: totals?.subtotal || 0,
      discount_total: totals?.discount_total || 0,
      surcharge_total: totals?.surcharge_total || 0,
      tax: totals?.tax || 0,
      total: totals?.total || 0,
      line_items: lineItems || [],
      adjustments: adjustments || [],
      certifications: certifications || [],
    });
  } catch (err) {
    console.error('Quote review error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
