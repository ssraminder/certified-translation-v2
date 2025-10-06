import { getSupabaseServerClient } from './supabaseServer';

function nowIso(){ return new Date().toISOString(); }

function inferTargetType(actionType){
  const a = String(actionType || '').toLowerCase();
  if (a.startsWith('admin_')) return 'admin';
  if (a.startsWith('quote_') || a.includes('hitl')) return 'quote';
  if (a.startsWith('order_') || a.includes('file_uploaded')) return 'order';
  if (a.startsWith('message_') || a.includes('note')) return 'message';
  if (a.includes('settings') || a.startsWith('language_') || a.startsWith('tier_') || a.startsWith('certification_') || a.startsWith('intended_use_') || a.startsWith('email_template_')) return 'settings';
  if (a.startsWith('user_')) return 'user';
  if (a.includes('login') || a.includes('logout') || a.includes('session')) return 'auth';
  return null;
}

export async function logActivity({ adminUserId, actionType, targetType, targetId, details, ipAddress }){
  try {
    if (!adminUserId || !actionType) return { ok: false };
    const supabase = getSupabaseServerClient();

    const row = {
      admin_user_id: adminUserId,
      action_type: String(actionType),
      target_type: targetType || inferTargetType(actionType),
      target_id: targetId || null,
      details: details ?? null,
      ip_address: ipAddress || null,
      created_at: nowIso()
    };

    let { data, error } = await supabase.from('admin_activity_log').insert([row]).select('id').maybeSingle();
    if (error) {
      // Fallbacks for legacy tables if exist
      const legacyRow = {
        action: String(actionType),
        actor_id: adminUserId,
        target_id: targetId || null,
        details: details ? JSON.stringify(details) : null,
        created_at: row.created_at,
        entity_type: targetType || inferTargetType(actionType)
      };
      await supabase.from('admin_activity_logs').insert([legacyRow]);
      return { ok: true, id: null };
    }
    return { ok: true, id: data?.id || null };
  } catch {
    return { ok: false };
  }
}

export async function loginLog(adminId, success, ipAddress){
  return logActivity({ adminUserId: adminId, actionType: success ? 'login' : 'login_failed', targetType: 'auth', targetId: null, details: null, ipAddress });
}

export async function statusChangeLog(adminId, orderId, oldStatus, newStatus, ipAddress){
  return logActivity({ adminUserId: adminId, actionType: 'order_status_changed', targetType: 'order', targetId: orderId, details: { old_status: oldStatus, new_status: newStatus }, ipAddress });
}

export async function fileUploadLog(adminId, orderId, fileType, fileName, ipAddress){
  return logActivity({ adminUserId: adminId, actionType: 'file_uploaded', targetType: 'order', targetId: orderId, details: { file_type: fileType, file_name: fileName }, ipAddress });
}

export async function settingsChangeLog(adminId, settingType, oldValue, newValue, ipAddress){
  return logActivity({ adminUserId: adminId, actionType: `${String(settingType)}_updated`, targetType: 'settings', targetId: null, details: { from: oldValue, to: newValue }, ipAddress });
}
