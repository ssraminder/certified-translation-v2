import { 
  calculateDeliveryWithHolidays, 
  calculateQuoteExpiry,
  parseBusinessDays,
  getSettingValue
} from './quoteDelivery';

export async function enrichQuoteWithDeliveryInfo(supabase, quoteId, locationId = null) {
  try {
    // Get current quote results
    const { data: quoteResults } = await supabase
      .from('quote_results')
      .select('*')
      .eq('quote_id', quoteId)
      .maybeSingle();

    if (!quoteResults) return null;

    // Get settings
    const turnaroundTime = await getSettingValue(supabase, 'default_turnaround_time', '3-5 business days');
    const expiryDays = await getSettingValue(supabase, 'quote_expiry_days', '30');

    // Parse business days from turnaround time (e.g., "3-5 business days" → 5)
    const businessDays = parseBusinessDays(turnaroundTime);

    // Calculate delivery date with holidays
    const deliveryCalc = await calculateDeliveryWithHolidays(
      supabase,
      locationId,
      businessDays,
      new Date(quoteResults.computed_at || new Date())
    );

    // Calculate expiry date
    const expiryDate = calculateQuoteExpiry(
      expiryDays,
      new Date(quoteResults.computed_at || new Date())
    );

    // Prepare update payload
    const updatePayload = {
      estimated_delivery_date: deliveryCalc.estimatedDeliveryDate.toISOString().split('T')[0],
      delivery_estimate_text: turnaroundTime,
      quote_expires_at: expiryDate.toISOString(),
      location_id: locationId
    };

    // Update quote results
    const { data: updated, error } = await supabase
      .from('quote_results')
      .update(updatePayload)
      .eq('quote_id', quoteId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      updated,
      deliveryInfo: {
        estimatedDeliveryDate: deliveryCalc.estimatedDeliveryDate,
        turnaroundTime,
        expiryDate,
        expiryDays: parseInt(expiryDays, 10),
        skippedHolidays: deliveryCalc.skippedHolidays
      }
    };
  } catch (err) {
    console.error('Error enriching quote with delivery info:', err);
    return {
      success: false,
      error: err.message
    };
  }
}
