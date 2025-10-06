import { getSupabaseServerClient } from './supabaseServer';

export async function logAdminActivity({ action, actor_id, actor_name, target_id, target_name, details }){
  try {
    const supabase = getSupabaseServerClient();
    const row = {
      action,
      actor_id,
      actor_name,
      target_id,
      target_name,
      details: details ? JSON.stringify(details) : null,
      created_at: new Date().toISOString(),
      entity_type: 'admin_user'
    };
    // Prefer table `admin_activity_logs`; fallback `activity_logs` if exists
    const { error } = await supabase.from('admin_activity_logs').insert([row]);
    if (error) {
      await supabase.from('activity_logs').insert([row]);
    }
  } catch (_) {
    // Non-fatal
  }
}
