import { withPermission } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

async function handler(req, res) {
  if (req.method === 'GET') {
    return getSettings(req, res);
  } else if (req.method === 'PATCH') {
    return updateSetting(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getSettings(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('id, setting_key, setting_value, setting_type, description, updated_at, updated_by_admin_id')
      .order('setting_key');

    if (error) throw error;

    const settings = {};
    const settingsWithMeta = data || [];
    settingsWithMeta.forEach(s => {
      settings[s.setting_key] = {
        value: s.setting_value,
        type: s.setting_type,
        updatedAt: s.updated_at,
        updatedByAdminId: s.updated_by_admin_id
      };
    });

    return res.status(200).json({ success: true, settings, settingsWithMeta });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
}

async function updateSetting(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { setting_key, setting_value, setting_type } = req.body;

    if (!setting_key) {
      return res.status(400).json({ error: 'setting_key is required' });
    }

    const { data, error } = await supabase
      .from('app_settings')
      .update({
        setting_value,
        setting_type: setting_type || 'string',
        updated_at: new Date().toISOString(),
        updated_by_admin_id: req.admin.id
      })
      .eq('setting_key', setting_key)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, setting: data });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update setting' });
  }
}

export default withPermission('settings', 'edit')(handler);
