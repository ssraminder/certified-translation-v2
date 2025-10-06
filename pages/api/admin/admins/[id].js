import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { withAdmin } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { hasPermission } from '../../../../lib/permissions';
import { validateAdminPayload, normalizeEmail, isValidEmail } from '../../../../lib/validation';
import { logAdminActivity } from '../../../../lib/activityLog';

function displayName(row){
  return (row.first_name && row.last_name) ? `${row.first_name} ${row.last_name}` : (row.first_name || row.last_name || row.email);
}

async function getOne(req, res){
  if (!hasPermission(req.admin?.role, 'admins', 'view')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const id = req.query.id;

  const { data: admin } = await supabase
    .from('admin_users')
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at, last_login_at, created_by_admin_id')
    .eq('id', id)
    .maybeSingle();
  if (!admin) return res.status(404).json({ error: 'Not found' });

  let created_by_name = null;
  if (admin.created_by_admin_id) {
    const { data: creator } = await supabase.from('admin_users').select('id, first_name, last_name, email').eq('id', admin.created_by_admin_id).maybeSingle();
    if (creator) created_by_name = displayName(creator);
  }

  return res.status(200).json({
    id: admin.id,
    email: admin.email,
    full_name: displayName(admin),
    role: admin.role,
    is_active: admin.is_active !== false,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    last_login_at: admin.last_login_at || null,
    created_by_admin_id: admin.created_by_admin_id || null,
    created_by_name
  });
}

async function ensureNotLastSuperAdmin(supabase, targetId){
  const { count } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .eq('is_active', true);
  if ((count || 0) <= 1) {
    // if the only super_admin is the targetId, then it's last
    const { data: target } = await supabase.from('admin_users').select('id, role, is_active').eq('id', targetId).maybeSingle();
    if (target && target.role === 'super_admin' && target.is_active !== false) {
      return { ok: false, error: 'Cannot delete or demote the last Super Admin' };
    }
  }
  return { ok: true };
}

async function updateOne(req, res){
  if (!hasPermission(req.admin?.role, 'admins', 'edit')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const id = req.query.id;

  const { data: target } = await supabase
    .from('admin_users')
    .select('id, email, first_name, last_name, role, is_active')
    .eq('id', id)
    .maybeSingle();
  if (!target) return res.status(404).json({ error: 'Not found' });

  const { full_name, email, role, is_active } = req.body || {};

  const payload = { email: email ?? target.email, full_name: full_name ?? ((target.first_name && target.last_name) ? `${target.first_name} ${target.last_name}` : (target.first_name || target.last_name || target.email)), role: role ?? target.role, is_active: typeof is_active === 'boolean' ? is_active : target.is_active !== false };
  const { valid, errors } = validateAdminPayload(payload);
  if (!valid) return res.status(400).json({ error: 'Validation failed', fields: errors });

  // Self protection rules
  const isSelf = String(target.id) === String(req.admin.id);
  if (isSelf) {
    if (role && role !== target.role) return res.status(400).json({ error: 'You cannot change your own role' });
    if (typeof is_active === 'boolean' && is_active === false) return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  // Last super admin protection if demoting or deactivating a super_admin
  const nextRole = role || target.role;
  const nextActive = typeof is_active === 'boolean' ? is_active : (target.is_active !== false);
  if ((target.role === 'super_admin' && nextRole !== 'super_admin') || (target.role === 'super_admin' && nextActive === false)) {
    const chk = await ensureNotLastSuperAdmin(supabase, target.id);
    if (!chk.ok) return res.status(400).json({ error: 'Cannot delete the last Super Admin' });
  }

  // Email uniqueness if changed
  if (email && normalizeEmail(email) !== normalizeEmail(target.email)) {
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    const norm = normalizeEmail(email);
    const { data: otherAdmin } = await supabase.from('admin_users').select('id').ilike('email', norm).maybeSingle();
    if (otherAdmin && String(otherAdmin.id) !== String(target.id)) return res.status(409).json({ error: 'Email already exists as admin' });
    const { data: existingUser } = await supabase.from('users').select('id').ilike('email', norm).maybeSingle();
    if (existingUser) return res.status(409).json({ error: 'Email already exists as user' });
  }

  const [first_name, ...rest] = (payload.full_name || '').trim().split(/\s+/);
  const last_name = rest.join(' ');
  const nowIso = new Date().toISOString();

  const updates = {
    email: normalizeEmail(payload.email),
    first_name: first_name || null,
    last_name: last_name || null,
    role: payload.role,
    is_active: payload.is_active,
    updated_at: nowIso
  };

  const { data: updated, error } = await supabase
    .from('admin_users')
    .update(updates)
    .eq('id', id)
    .select('id, email, first_name, last_name, role, is_active')
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Failed to update admin' });

  const updatedAdmin = {
    id: updated.id,
    email: updated.email,
    full_name: displayName(updated),
    role: updated.role,
    is_active: updated.is_active !== false
  };

  await logAdminActivity({
    action: 'admin_updated',
    actor_id: req.admin.id,
    actor_name: (req.admin.first_name && req.admin.last_name) ? `${req.admin.first_name} ${req.admin.last_name}` : (req.admin.first_name || req.admin.last_name || req.admin.email),
    target_id: updated.id,
    target_name: updatedAdmin.full_name,
    details: { changed: Object.keys(req.body || {}) }
  });
  if (role && role !== target.role) {
    await logAdminActivity({
      action: 'admin_role_changed',
      actor_id: req.admin.id,
      actor_name: (req.admin.first_name && req.admin.last_name) ? `${req.admin.first_name} ${req.admin.last_name}` : (req.admin.first_name || req.admin.last_name || req.admin.email),
      target_id: updated.id,
      target_name: updatedAdmin.full_name,
      details: { from: target.role, to: role }
    });
  }

  return res.status(200).json({ success: true, admin: updatedAdmin });
}

async function handler(req, res){
  if (req.method === 'GET') return getOne(req, res);
  if (req.method === 'PUT') return updateOne(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiBreadcrumbs(withAdmin(handler));
