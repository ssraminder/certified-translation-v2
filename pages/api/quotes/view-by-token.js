import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { withApiBreadcrumbs } from '../../../lib/sentry';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Validate token and get quote_id
    const { data: magicLink, error: linkError } = await supabase
      .from('quote_ready_emails')
      .select('quote_id, magic_link_expires_at, recipient_email')
      .eq('magic_link_token', token)
      .maybeSingle();

    if (linkError) throw linkError;
    if (!magicLink) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    // Check if expired
    const now = new Date().toISOString();
    if (magicLink.magic_link_expires_at < now) {
      return res.status(400).json({ error: 'Link has expired', expired: true, quote_id: magicLink.quote_id });
    }

    // Get full quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quote_submissions')
      .select('*')
      .eq('quote_id', magicLink.quote_id)
      .maybeSingle();

    if (quoteError) throw quoteError;
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Get quote results
    let { data: quoteResults, error: resultsError } = await supabase
      .from('quote_results')
      .select('*')
      .eq('quote_id', magicLink.quote_id)
      .maybeSingle();

    if (resultsError) throw resultsError;

    // If no results exist, trigger calculation (will be saved to DB)
    if (!quoteResults) {
      try {
        const { recalcAndUpsertUnifiedQuoteResults } = await import('../../../lib/quoteTotals');
        await recalcAndUpsertUnifiedQuoteResults(magicLink.quote_id);
        const { data: newResults } = await supabase.from('quote_results').select('*').eq('quote_id', magicLink.quote_id).maybeSingle();
        quoteResults = newResults || null;
      } catch (calcErr) {
        console.error('[quotes/view-by-token] Failed to auto-calculate results:', calcErr);
      }
    }

    // Get quote files
    const { data: files, error: filesError } = await supabase
      .from('quote_files')
      .select('*')
      .eq('quote_id', magicLink.quote_id);

    if (filesError) throw filesError;

    // Get quote line items with details
    const { data: lineItems, error: itemsError } = await supabase
      .from('quote_sub_orders')
      .select('*')
      .eq('quote_id', magicLink.quote_id);

    if (itemsError) throw itemsError;

    // Get quote certifications
    const { data: certifications, error: certError } = await supabase
      .from('quote_certifications')
      .select('*')
      .eq('quote_id', magicLink.quote_id);

    if (certError) throw certError;

    // Get quote adjustments
    const { data: adjustments, error: adjError } = await supabase
      .from('quote_adjustments')
      .select('*')
      .eq('quote_id', magicLink.quote_id);

    if (adjError) throw adjError;

    // Get location business hours if location_id exists
    let businessHours = [];
    if (quoteResults?.location_id) {
      const { data: hours, error: hoursError } = await supabase
        .from('location_business_hours')
        .select('*')
        .eq('location_id', quoteResults.location_id)
        .order('day_of_week');

      if (hoursError) throw hoursError;
      businessHours = hours || [];
    }

    // Check for upcoming holidays
    let upcomingHoliday = null;
    if (quoteResults?.location_id && quoteResults?.quote_expires_at) {
      const today = new Date().toISOString().split('T')[0];
      const { data: holidays } = await supabase
        .from('company_holidays')
        .select('*')
        .eq('location_id', quoteResults.location_id)
        .gte('holiday_date', today)
        .lte('holiday_date', quoteResults.quote_expires_at)
        .order('holiday_date')
        .limit(1);

      if (holidays && holidays.length > 0) {
        upcomingHoliday = holidays[0];
      }
    }

    return res.status(200).json({
      success: true,
      quote,
      quoteResults,
      files: files || [],
      lineItems: lineItems || [],
      certifications: certifications || [],
      adjustments: adjustments || [],
      businessHours,
      upcomingHoliday,
      expiresAt: magicLink.magic_link_expires_at
    });
  } catch (err) {
    console.error('Error fetching quote by token:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch quote' });
  }
}

export default withApiBreadcrumbs(handler);
