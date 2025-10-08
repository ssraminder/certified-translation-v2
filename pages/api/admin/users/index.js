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
    designation: body.ordering_type === 'business' ? (body.designation || null) : null,
    frequency: body.ordering_type === 'business' ? (body.frequency || null) : null,
    account_creation_source: 'admin',
    created_at: nowIso,
    updated_at: nowIso
  };

  const { data: created, error } = await supabase.from('users').insert([insertRow]).select('id, email, first_name, last_name').maybeSingle();
  if (error) return res.status(500).json({ error: 'Failed to create user' });

  // Create magic link for dashboard
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

  // Send magic link email
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
  if (req.method === 'POST') return createUser(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiBreadcrumbs(withAdmin(handler));
