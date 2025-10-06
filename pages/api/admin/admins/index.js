import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { withAdmin } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { hasPermission } from '../../../../lib/permissions';
import { validateAdminPayload, normalizeEmail } from '../../../../lib/validation';
import { logAdminActivity } from '../../../../lib/activityLog';
import { sendAdminWelcomeEmail } from '../../../../lib/email';

function toBool(v){ if (v === true || v === 'true') return true; if (v === false || v === 'false') return false; return undefined; }

async function listAdmins(req, res){
  if (!hasPermission(req.admin?.role, 'admins', 'view')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const {
    search = '',
    role = '',
    status = 'all',
    sort = 'created',
    order = 'desc',
    page = '1',
    limit = '20'
  } = req.query || {};

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  const ilike = (v) => `%${String(v || '').trim()}%`;
  const filters = [];
  if (search) filters.push(`email.ilike.${ilike(search)},first_name.ilike.${ilike(search)},last_name.ilike.${ilike(search)}`);
  if (role && role !== 'all') filters.push(`role.eq.${role}`);
  const isActive = status === 'active' ? true : status === 'inactive' ? false : undefined;

  // Count total
  let countQuery = supabase.from('admin_users').select('*', { count: 'exact', head: true });
  if (filters.length) countQuery = countQuery.or(filters.join(','));
  if (typeof isActive === 'boolean') countQuery = countQuery.eq('is_active', isActive);
  const { count: total = 0 } = await countQuery;

  // Fetch rows
  let sel = supabase
    .from('admin_users')
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at, last_login_at, created_by_admin_id')
    .range(from, to);
  if (filters.length) sel = sel.or(filters.join(','));
  if (typeof isActive === 'boolean') sel = sel.eq('is_active', isActive);

  // Sorting
  const ord = (c, dir) => sel = sel.order(c, { ascending: dir === 'asc', nullsFirst: false });
  const dir = (String(order || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';
  switch (String(sort)) {
    case 'name':
      ord('last_name', dir); ord('first_name', dir);
      break;
    case 'email':
      ord('email', dir);
      break;
    case 'role':
      ord('role', dir);
      break;
    case 'last_login':
      ord('last_login_at', dir);
      break;
    case 'created':
    default:
      ord('created_at', dir);
  }

  const { data: rows = [] } = await sel;

  // Map created_by names
  const creatorIds = Array.from(new Set(rows.map(r => r.created_by_admin_id).filter(Boolean)));
  let createdMap = {};
  if (creatorIds.length) {
    const { data: creators = [] } = await supabase
      .from('admin_users')
      .select('id, first_name, last_name, email')
      .in('id', creatorIds);
    createdMap = Object.fromEntries(creators.map(c => [c.id, (c.first_name && c.last_name) ? `${c.first_name} ${c.last_name}` : (c.first_name || c.last_name || c.email)]));
  }

  const admins = rows.map(r => ({
    id: r.id,
    email: r.email,
    full_name: (r.first_name && r.last_name) ? `${r.first_name} ${r.last_name}` : (r.first_name || r.last_name || r.email),
    role: r.role,
    is_active: r.is_active !== false,
    created_at: r.created_at,
    last_login_at: r.last_login_at || null,
    created_by_name: createdMap[r.created_by_admin_id] || null
  }));

  return res.status(200).json({ admins, total: total || 0, page: pageNum, total_pages: Math.max(1, Math.ceil((total || 0)/pageSize)) });
}

async function createAdmin(req, res){
  if (!hasPermission(req.admin?.role, 'admins', 'create')) return res.status(403).json({ error: 'Forbidden' });

  const supabase = getSupabaseServerClient();
  const { email, full_name, role, is_active = true } = req.body || {};
  const { valid, errors } = validateAdminPayload({ email, full_name, role, is_active: toBool(is_active) ?? true });
  if (!valid) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const norm = normalizeEmail(email);

  const { data: existingAdmin } = await supabase.from('admin_users').select('id').ilike('email', norm).maybeSingle();
  if (existingAdmin) return res.status(409).json({ error: 'Email already exists as admin' });
  const { data: existingUser } = await supabase.from('users').select('id').ilike('email', norm).maybeSingle();
  if (existingUser) return res.status(409).json({ error: 'Email already exists as user' });

  const [first_name, ...rest] = (full_name || '').trim().split(/\s+/);
  const last_name = rest.join(' ');
  const nowIso = new Date().toISOString();

  const insertRow = {
    email: norm,
    first_name: first_name || null,
    last_name: last_name || null,
    role,
    is_active: toBool(is_active) ?? true,
    created_at: nowIso,
    updated_at: nowIso,
    created_by_admin_id: req.admin.id
  };

  const { data: created, error } = await supabase.from('admin_users').insert([insertRow]).select('id, email, first_name, last_name, role, is_active').maybeSingle();
  if (error) return res.status(500).json({ error: 'Failed to create admin' });

  const createdAdmin = {
    id: created.id,
    email: created.email,
    full_name: (created.first_name && created.last_name) ? `${created.first_name} ${created.last_name}` : (created.first_name || created.last_name || created.email),
    role: created.role,
    is_active: created.is_active !== false
  };

  await logAdminActivity({
    action: 'admin_created',
    actor_id: req.admin.id,
    actor_name: (req.admin.first_name && req.admin.last_name) ? `${req.admin.first_name} ${req.admin.last_name}` : (req.admin.first_name || req.admin.last_name || req.admin.email),
    target_id: created.id,
    target_name: createdAdmin.full_name,
    details: { role }
  });

  // Send welcome email non-blocking
  sendAdminWelcomeEmail({ email: created.email, full_name: createdAdmin.full_name, role }).catch(()=>{});

  return res.status(200).json({ success: true, admin: createdAdmin });
}

async function handler(req, res){
  if (req.method === 'GET') return listAdmins(req, res);
  if (req.method === 'POST') return createAdmin(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiBreadcrumbs(withAdmin(handler));
