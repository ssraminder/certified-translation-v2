import { withPermission } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function parseIntSafe(v, d){ const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }

async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const supabase = getSupabaseServerClient();

  const {
    admin_id = '',
    action_type = '',
    target_type = '',
    target_id = '',
    ip_address = '',
    start_date = '',
    end_date = '',
    page = '1',
    limit = '50'
  } = req.query || {};

  const pageNum = Math.max(1, parseIntSafe(page, 1));
  const pageSize = Math.min(200, Math.max(1, parseIntSafe(limit, 50)));
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  let base = supabase.from('admin_activity_log').select('*', { count: 'exact' });

  if (admin_id) base = base.eq('admin_user_id', admin_id);
  if (action_type) base = base.eq('action_type', action_type);
  if (target_type) base = base.eq('target_type', target_type);
  if (target_id) base = base.ilike('target_id', `%${String(target_id).trim()}%`);
  if (ip_address) base = base.ilike('ip_address', `%${String(ip_address).trim()}%`);
  if (start_date) base = base.gte('created_at', new Date(start_date).toISOString());
  if (end_date) base = base.lte('created_at', new Date(end_date).toISOString());

  base = base.order('created_at', { ascending: false }).range(from, to);

  const { data: rows = [], error, count } = await base;
  if (error) return res.status(500).json({ error: 'Failed to fetch logs' });

  const adminIds = Array.from(new Set(rows.map(r => r.admin_user_id).filter(Boolean)));
  let adminMap = {};
  if (adminIds.length){
    const { data: admins = [] } = await supabase
      .from('admin_users')
      .select('id, first_name, last_name, email, role')
      .in('id', adminIds);
    adminMap = Object.fromEntries((admins || []).map(a => [a.id, a]));
  }

  const logs = rows.map(r => {
    const a = adminMap[r.admin_user_id];
    const fullName = a ? ((a.first_name && a.last_name) ? `${a.first_name} ${a.last_name}` : (a.first_name || a.last_name || a.email)) : null;
    return {
      id: r.id,
      admin_user_id: r.admin_user_id,
      admin_name: fullName || 'Admin',
      admin_role: a?.role || null,
      action_type: r.action_type,
      target_type: r.target_type,
      target_id: r.target_id,
      details: r.details || null,
      ip_address: r.ip_address || null,
      created_at: r.created_at
    };
  });

  return res.status(200).json({ logs, total: count || 0, page: pageNum, total_pages: Math.max(1, Math.ceil((count || 0)/pageSize)) });
}

export default withPermission('logs', 'view')(handler);
