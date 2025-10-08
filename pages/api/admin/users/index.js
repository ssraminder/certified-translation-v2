import crypto from 'crypto';
import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { withAdmin } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { hasPermission } from '../../../../lib/permissions';
import { normalizeEmail, validateUserPayload } from '../../../../lib/validation';
import { toE164 } from '../../../../lib/formatters/phone';
import { logAdminActivity } from '../../../../lib/activityLog';
import { sendMagicLinkEmail } from '../../../../lib/email';

function splitName(full){
  const t = String(full || '').trim().replace(/\s+/g, ' ').split(' ');
  if (t.length === 0) return { first_name: 'Customer', last_name: '' };
  const first_name = t.shift();
  const last_name = t.join(' ');
  return { first_name, last_name };
}

function toInt(v, d){ const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }
const ilike = (v) => `%${String(v || '').trim()}%`;
const digitsOnly = (v) => String(v || '').replace(/\D+/g,'');

async function listUsers(req, res){
  if (!hasPermission(req.admin?.role, 'users', 'view')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const {
    email = '',
    phone = '',
    name = '',
    sort = 'created',
    order = 'desc',
    page = '1',
    limit = '20'
  } = req.query || {};

  const pageNum = Math.max(1, toInt(page, 1));
  const pageSize = Math.min(100, Math.max(1, toInt(limit, 20)));
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  let countQuery = supabase.from('users').select('*', { count: 'exact', head: true });
  let sel = supabase
    .from('users')
    .select('id, email, first_name, last_name, phone, account_type, created_at, last_login_at')
    .range(from, to);

  if (email && String(email).trim()) { countQuery = countQuery.ilike('email', ilike(email)); sel = sel.ilike('email', ilike(email)); }
  if (name && String(name).trim()) { countQuery = countQuery.or(`first_name.ilike.${ilike(name)},last_name.ilike.${ilike(name)}`); sel = sel.or(`first_name.ilike.${ilike(name)},last_name.ilike.${ilike(name)}`); }
  if (phone && String(phone).trim()) {
    const ph = digitsOnly(phone);
    if (ph) { countQuery = countQuery.ilike('phone', ilike(ph)); sel = sel.ilike('phone', ilike(ph)); }
  }

  const { count: total = 0 } = await countQuery;

  const dir = (String(order || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';
  const ord = (c, d) => sel = sel.order(c, { ascending: d === 'asc', nullsFirst: false });
  switch (String(sort)) {
    case 'name':
      ord('last_name', dir); ord('first_name', dir);
      break;
    case 'email':
      ord('email', dir);
      break;
    case 'phone':
      ord('phone', dir);
      break;
    case 'last_login':
      ord('last_login_at', dir);
      break;
    case 'created':
    default:
      ord('created_at', dir);
  }

  const { data: rows = [] } = await sel;
  const users = rows.map(r => ({
    id: r.id,
    email: r.email,
    full_name: (r.first_name && r.last_name) ? `${r.first_name} ${r.last_name}` : (r.first_name || r.last_name || r.email),
    phone: r.phone || null,
    account_type: r.account_type || null,
    created_at: r.created_at || null,
    last_login_at: r.last_login_at || null
  }));

  return res.status(200).json({ users, total: total || 0, page: pageNum, total_pages: Math.max(1, Math.ceil((total || 0)/pageSize)) });
}

async function createUser(req, res){
  if (!hasPermission(req.admin?.role, 'users', 'create')) return res.status(403).json({ error: 'Forbidden' });
  const supabase = getSupabaseServerClient();
  const body = req.body || {};
  const { valid, errors } = validateUserPayload(body);
  if (!valid) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const email = normalizeEmail(body.email);
  const { data: existingAdmin } = await supabase.from('admin_users').select('id').ilike('email', email).maybeSingle();
  if (existingAdmin) return res.status(409).json({ error: 'Email already exists as admin' });
  const { data: existingUser } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
  if (existingUser) return res.status(409).json({ error: 'Email already exists as user' });

  const { first_name, last_name } = splitName(body.full_name);
  const nowIso = new Date().toISOString();
  const insertRow = {
    email,
    first_name: first_name || null,
    last_name: last_name || null,
    phone: body.phone ? (toE164(body.phone) || null) : null,
    account_type: body.ordering_type === 'business' ? 'business' : 'individual',
    company_name: body.ordering_type === 'business' ? (body.company_name || null) : null,
    account_creation_source: 'admin',
    created_at: nowIso,
    updated_at: nowIso
  };

  const { data: created, error } = await supabase.from('users').insert([insertRow]).select('id, email, first_name, last_name').maybeSingle();
  if (error) return res.status(500).json({ error: 'Failed to create user' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24*60*60*1000).toISOString();
  await supabase.from('magic_links').insert([{
    user_id: created.id,
    user_type: 'customer',
    token,
    purpose: 'login',
    expires_at: expiresAt,
    metadata: { redirect_url: '/dashboard' }
  }]);

  sendMagicLinkEmail({ email, first_name: first_name || 'there', token }).catch(()=>{});

  await logAdminActivity({
    action: 'user_created',
    actor_id: req.admin.id,
    actor_name: (req.admin.first_name && req.admin.last_name) ? `${req.admin.first_name} ${req.admin.last_name}` : (req.admin.first_name || req.admin.last_name || req.admin.email),
    target_id: created.id,
    target_name: (created.first_name && created.last_name) ? `${created.first_name} ${created.last_name}` : (created.first_name || created.last_name || created.email),
    details: {
      ordering_type: insertRow.account_type,
      company_name: insertRow.company_name || null,
      designation: insertRow.designation || null,
      frequency: insertRow.frequency || null,
      notes: body.notes || null,
      tags: Array.isArray(body.tags) ? body.tags : (typeof body.tags === 'string' ? body.tags.split(',').map(t=>t.trim()).filter(Boolean) : [])
    }
  });

  return res.status(200).json({ success: true, user: { id: created.id, email: created.email, first_name: created.first_name, last_name: created.last_name } });
}

async function handler(req, res){
  if (req.method === 'GET') return listUsers(req, res);
  if (req.method === 'POST') return createUser(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiBreadcrumbs(withAdmin(handler));
