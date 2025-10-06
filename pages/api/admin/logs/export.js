import { withPermission } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function csvEscape(val){
  if (val == null) return '';
  const s = typeof val === 'string' ? val : JSON.stringify(val);
  const needsQuotes = /[",\n]/.test(s);
  let out = s.replace(/"/g, '""');
  return needsQuotes ? `"${out}"` : out;
}

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
    limit = '1000'
  } = req.query || {};

  const maxRows = Math.min(5000, Math.max(1, parseIntSafe(limit, 1000)));

  let base = supabase.from('admin_activity_log').select('*');
  if (admin_id) base = base.eq('admin_user_id', admin_id);
  if (action_type) base = base.eq('action_type', action_type);
  if (target_type) base = base.eq('target_type', target_type);
  if (target_id) base = base.ilike('target_id', `%${String(target_id).trim()}%`);
  if (ip_address) base = base.ilike('ip_address', `%${String(ip_address).trim()}%`);
  if (start_date) base = base.gte('created_at', new Date(start_date).toISOString());
  if (end_date) base = base.lte('created_at', new Date(end_date).toISOString());
  base = base.order('created_at', { ascending: false }).limit(maxRows);

  const { data: rows = [], error } = await base;
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

  const header = ['Timestamp','Admin Name','Admin Role','Action Type','Target Type','Target ID','Details','IP Address'];
  let lines = [header.map(csvEscape).join(',')];
  for (const r of rows){
    const a = adminMap[r.admin_user_id];
    const fullName = a ? ((a.first_name && a.last_name) ? `${a.first_name} ${a.last_name}` : (a.first_name || a.last_name || a.email)) : 'Admin';
    const fields = [
      r.created_at,
      fullName,
      a?.role || '',
      r.action_type || '',
      r.target_type || '',
      r.target_id || '',
      r.details ? JSON.stringify(r.details) : '',
      r.ip_address || ''
    ];
    lines.push(fields.map(csvEscape).join(','));
  }

  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="activity-logs.csv"`);
  res.status(200).send(csv);
}

export default withPermission('logs', 'view')(handler);
