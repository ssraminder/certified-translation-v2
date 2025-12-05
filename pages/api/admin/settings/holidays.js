import { withPermission } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { normalizeToISOString } from '../../../../lib/dateUtils';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getHolidays(req, res);
  } else if (req.method === 'POST') {
    return createHoliday(req, res);
  } else if (req.method === 'PATCH') {
    return updateHoliday(req, res);
  } else if (req.method === 'DELETE') {
    return deleteHoliday(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getHolidays(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { location_id, upcoming_only } = req.query;

    let query = supabase.from('company_holidays').select('*');

    if (location_id) {
      query = query.eq('location_id', location_id);
    }

    if (upcoming_only === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('holiday_date', today);
    }

    const { data, error } = await query.order('holiday_date');

    if (error) throw error;

    return res.status(200).json({ success: true, holidays: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch holidays' });
  }
}

async function createHoliday(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      location_id,
      holiday_name,
      holiday_date,
      description,
      is_closed,
      opening_time,
      closing_time,
      is_recurring,
      recurring_month,
      recurring_day
    } = req.body;

    if (!location_id || !holiday_name || !holiday_date) {
      return res.status(400).json({ error: 'location_id, holiday_name, and holiday_date are required' });
    }

    const { data: holiday, error } = await supabase
      .from('company_holidays')
      .insert([{
        location_id,
        holiday_name,
        holiday_date,
        description,
        is_closed: is_closed !== false,
        opening_time: is_closed === false ? opening_time : null,
        closing_time: is_closed === false ? closing_time : null,
        is_recurring: is_recurring === true,
        recurring_month: is_recurring === true ? recurring_month : null,
        recurring_day: is_recurring === true ? recurring_day : null,
        created_by_admin_id: req.admin.id
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, holiday });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create holiday' });
  }
}

async function updateHoliday(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      holiday_id,
      holiday_name,
      description,
      is_closed,
      opening_time,
      closing_time,
      is_recurring,
      recurring_month,
      recurring_day
    } = req.body;

    if (!holiday_id) {
      return res.status(400).json({ error: 'holiday_id is required' });
    }

    const { data: holiday, error } = await supabase
      .from('company_holidays')
      .update({
        holiday_name,
        description,
        is_closed: is_closed !== false,
        opening_time: is_closed === false ? opening_time : null,
        closing_time: is_closed === false ? closing_time : null,
        is_recurring: is_recurring === true,
        recurring_month: is_recurring === true ? recurring_month : null,
        recurring_day: is_recurring === true ? recurring_day : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', holiday_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, holiday });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update holiday' });
  }
}

async function deleteHoliday(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { holiday_id } = req.body;

    if (!holiday_id) {
      return res.status(400).json({ error: 'holiday_id is required' });
    }

    const { error } = await supabase
      .from('company_holidays')
      .delete()
      .eq('id', holiday_id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Holiday deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to delete holiday' });
  }
}

export default withPermission('settings', 'edit')(handler);
