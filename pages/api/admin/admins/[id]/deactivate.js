import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withAdmin } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { hasPermission } from '../../../../../lib/permissions';
import { logAdminActivity } from '../../../../../lib/activityLog';

async function handler(req, res){
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasPermission(req.admin?.role, 'admins', 'edit')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const id = req.query.id;

  const { data: target } = await supabase.from('admin_users').select('id, email, first_name, last_name, role, is_active').eq('id', id).maybeSingle();
  if (!target) return res.status(404).json({ error: 'Not found' });

  // Self-protection
  if (String(target.id) === String(req.admin.id)) return res.status(400).json({ error: 'You cannot deactivate your own account' });

  // Last super admin protection
  if (target.role === 'super_admin' && target.is_active !== false) {
    const { count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('is_active', true);
    if ((count || 0) <= 1) return res.status(400).json({ error: 'Cannot delete the last Super Admin' });
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('admin_users')
    .update({ is_active: false, updated_at: nowIso })
    .eq('id', id);
  if (error) return res.status(500).json({ error: 'Failed to deactivate admin' });

  // Clear sessions
  await supabase.from('admin_sessions').delete().eq('admin_user_id', id);

  await logAdminActivity({
    action: 'admin_deactivated',
    actor_id: req.admin.id,
    actor_name: (req.admin.first_name && req.admin.last_name) ? `${req.admin.first_name} ${req.admin.last_name}` : (req.admin.first_name || req.admin.last_name || req.admin.email),
    target_id: target.id,
    target_name: (target.first_name && target.last_name) ? `${target.first_name} ${target.last_name}` : (target.first_name || target.last_name || target.email),
  });

  return res.status(200).json({ success: true, message: 'Admin deactivated successfully' });
}

export default withApiBreadcrumbs(withAdmin(handler));
