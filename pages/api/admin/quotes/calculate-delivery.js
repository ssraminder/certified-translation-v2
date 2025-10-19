import { withPermission } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { enrichQuoteWithDeliveryInfo } from '../../../../lib/quoteEnrichment';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { quote_id, location_id } = req.body;

    if (!quote_id) {
      return res.status(400).json({ error: 'quote_id is required' });
    }

    // Verify quote exists
    const { data: quote, error: quoteError } = await supabase
      .from('quote_submissions')
      .select('quote_id')
      .eq('quote_id', quote_id)
      .maybeSingle();

    if (quoteError) throw quoteError;
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Enrich quote with delivery information
    const result = await enrichQuoteWithDeliveryInfo(supabase, quote_id, location_id);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      quote: result.updated,
      deliveryInfo: result.deliveryInfo
    });
  } catch (err) {
    console.error('Error calculating delivery info:', err);
    return res.status(500).json({ error: err.message || 'Failed to calculate delivery info' });
  }
}

export default withPermission('quotes', 'edit')(handler);
