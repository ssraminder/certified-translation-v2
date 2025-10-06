import { logActivity } from './activityLogger';

function inferTargetTypeFromAction(action){
  const a = String(action || '').toLowerCase();
  if (a.startsWith('admin_')) return 'admin';
  if (a.startsWith('quote_') || a.includes('hitl')) return 'quote';
  if (a.startsWith('order_') || a.includes('file_uploaded')) return 'order';
  if (a.startsWith('message_') || a.includes('note')) return 'message';
  if (a.includes('settings') || a.startsWith('language_') || a.startsWith('tier_') || a.startsWith('certification_') || a.startsWith('intended_use_') || a.startsWith('email_template_')) return 'settings';
  if (a.startsWith('user_')) return 'user';
  if (a.includes('login') || a.includes('logout') || a.includes('session')) return 'auth';
  return null;
}

export async function logAdminActivity({ action, actor_id, actor_name, target_id, target_name, details }){
  try {
    await logActivity({
      adminUserId: actor_id,
      actionType: action,
      targetType: inferTargetTypeFromAction(action),
      targetId: target_id,
      details: details || null,
      ipAddress: null
    });
  } catch (_){ /* swallow */ }
}
