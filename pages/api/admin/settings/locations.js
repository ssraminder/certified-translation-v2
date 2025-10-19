import { withPermission } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getLocations(req, res);
  } else if (req.method === 'POST') {
    return createLocation(req, res);
  } else if (req.method === 'PATCH') {
    return updateLocation(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getLocations(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: locations, error } = await supabase
      .from('company_locations')
      .select('*')
      .order('is_primary', { ascending: false })
      .order('name');

    if (error) throw error;

    // Get business hours for each location
    const locationsWithHours = await Promise.all(
      (locations || []).map(async (location) => {
        const { data: hours, error: hoursError } = await supabase
          .from('location_business_hours')
          .select('*')
          .eq('location_id', location.id)
          .order('day_of_week');

        if (hoursError) throw hoursError;

        return {
          ...location,
          businessHours: hours || []
        };
      })
    );

    return res.status(200).json({ success: true, locations: locationsWithHours });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch locations' });
  }
}

async function createLocation(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { name, address, city, postal_code, country, timezone, business_hours } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    const { data: location, error } = await supabase
      .from('company_locations')
      .insert([{ name, address, city, postal_code, country, timezone: timezone || 'America/Toronto' }])
      .select()
      .single();

    if (error) throw error;

    // Insert default business hours if provided
    if (Array.isArray(business_hours) && business_hours.length > 0) {
      const hoursWithLocationId = business_hours.map(hour => ({
        ...hour,
        location_id: location.id
      }));

      const { error: hoursError } = await supabase
        .from('location_business_hours')
        .insert(hoursWithLocationId);

      if (hoursError) throw hoursError;
    }

    return res.status(201).json({ success: true, location });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create location' });
  }
}

async function updateLocation(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { location_id, name, address, city, postal_code, country, timezone, business_hours } = req.body;

    if (!location_id) {
      return res.status(400).json({ error: 'location_id is required' });
    }

    const { data: location, error } = await supabase
      .from('company_locations')
      .update({ name, address, city, postal_code, country, timezone, updated_at: new Date().toISOString() })
      .eq('id', location_id)
      .select()
      .single();

    if (error) throw error;

    // Update business hours if provided
    if (Array.isArray(business_hours) && business_hours.length > 0) {
      // Delete existing hours
      await supabase.from('location_business_hours').delete().eq('location_id', location_id);

      // Insert new hours
      const hoursWithLocationId = business_hours.map(hour => ({
        location_id,
        day_of_week: hour.day_of_week,
        is_closed: hour.is_closed,
        opening_time: hour.opening_time,
        closing_time: hour.closing_time
      }));

      const { error: hoursError } = await supabase
        .from('location_business_hours')
        .insert(hoursWithLocationId);

      if (hoursError) throw hoursError;
    }

    return res.status(200).json({ success: true, location });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update location' });
  }
}

export default withPermission('settings', 'edit')(handler);
