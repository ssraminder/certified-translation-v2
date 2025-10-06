import { withPermission } from '../../../../lib/apiAdmin';

async function handler(req, res){
  try{
    const supabase = req.supabase;

    const { data: activities } = await supabase
      .from('admin_activity_log')
      .select('id, admin_user_id, action_type, target_type, target_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const ids = Array.from(new Set((activities || []).map(a => a.admin_user_id).filter(Boolean)));
    let nameMap = {};
    if (ids.length) {
      const { data: admins } = await supabase
        .from('admin_users')
        .select('id, first_name, last_name, email')
        .in('id', ids);
      for (const a of admins || []) {
        nameMap[a.id] = (a.first_name && a.last_name) ? `${a.first_name} ${a.last_name}` : (a.first_name || a.last_name || a.email);
      }
    }

    return res.status(200).json({
      activities: (activities || []).map(a => ({
        id: a.id,
        admin_name: nameMap[a.admin_user_id] || 'Admin',
        action: a.action_type,
        target: [a.target_type, a.target_id].filter(Boolean).join(' / '),
        timestamp: a.created_at,
      }))
    });
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

export default withPermission('logs', 'view')(handler);
