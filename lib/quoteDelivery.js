export function calculateDeliveryEstimate(businessDays, startDate = new Date()) {
  let current = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return current;
}

export function parseBusinessDays(turnaroundString) {
  const match = turnaroundString?.match(/(\d+)-?(\d+)?/);
  if (match) {
    // Return the maximum of the range
    return parseInt(match[2] || match[1], 10);
  }
  return 5; // Default
}

export function calculateQuoteExpiry(expiryDays, startDate = new Date()) {
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays, 10));
  return expiryDate;
}

export async function calculateDeliveryWithHolidays(supabase, locationId, businessDays, startDate = new Date()) {
  try {
    if (!locationId) {
      // No location specified, use simple business day calculation
      const deliveryDate = calculateDeliveryEstimate(businessDays, startDate);
      return {
        estimatedDeliveryDate: deliveryDate,
        businessDaysRequired: businessDays,
        skippedHolidays: 0
      };
    }

    // Get location holidays
    const { data: holidays, error } = await supabase
      .from('company_holidays')
      .select('holiday_date')
      .eq('location_id', locationId)
      .gte('holiday_date', new Date(startDate).toISOString().split('T')[0]);

    if (error) throw error;

    const holidayDates = new Set(
      (holidays || []).map(h => h.holiday_date)
    );

    // Calculate delivery date, skipping weekends and holidays
    let current = new Date(startDate);
    let daysAdded = 0;
    let skippedHolidays = 0;

    while (daysAdded < businessDays) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      const dateString = current.toISOString().split('T')[0];

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Skip holidays
      if (holidayDates.has(dateString)) {
        skippedHolidays++;
        continue;
      }

      daysAdded++;
    }

    return {
      estimatedDeliveryDate: current,
      businessDaysRequired: businessDays,
      skippedHolidays
    };
  } catch (err) {
    console.error('Error calculating delivery with holidays:', err);
    // Fallback to simple calculation
    const deliveryDate = calculateDeliveryEstimate(businessDays, startDate);
    return {
      estimatedDeliveryDate: deliveryDate,
      businessDaysRequired: businessDays,
      skippedHolidays: 0
    };
  }
}

export async function getSettingValue(supabase, settingKey, defaultValue = null) {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', settingKey)
      .maybeSingle();

    if (error) throw error;
    return data?.setting_value || defaultValue;
  } catch (err) {
    console.error(`Error fetching setting ${settingKey}:`, err);
    return defaultValue;
  }
}
