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

  const { data: target } = await supabase.from('admin_users').select('id, email, first_name, last_name, is_active').eq('id', id).maybeSingle();
  if (!target) return res.status(404).json({ error: 'Not found' });

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('admin_users')
    .update({ is_active: true, updated_at: nowIso })
    .eq('id', id)
    .select('id, email, first_name, last_name, role, is_active')
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Failed to activate admin' });

  await logAdminActivity({
    action: 'admin_activated',
    actor_id: req.admin.id,
    actor_name: (req.admin.first_name && req.admin.last_name) ? `${req.admin.first_name} ${req.admin.last_name}` : (req.admin.first_name || req.admin.last_name || req.admin.email),
    target_id: updated.id,
    target_name: (updated.first_name && updated.last_name) ? `${updated.first_name} ${updated.last_name}` : (updated.first_name || updated.last_name || updated.email),
  });

  return res.status(200).json({ success: true, message: 'Admin activated successfully' });
}

export default withApiBreadcrumbs(withAdmin(handler));
