import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

async function handler(req, res){
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const { admin_user_id } = req.body || {};
  if (!admin_user_id) return res.status(400).json({ error: 'admin_user_id is required' });

  const requester = req.admin; // set by withPermission
  const supabase = getSupabaseServerClient();

  // Fetch target admin for role checks
  const { data: targetAdmin } = await supabase.from('admin_users').select('id, role, is_active, status').eq('id', admin_user_id).maybeSingle();
  if (!targetAdmin || targetAdmin.is_active === false || (targetAdmin.status && targetAdmin.status !== 'active')) {
    return res.status(400).json({ error: 'Invalid target admin' });
  }

  // Role enforcement
  const rrole = (requester?.role || '').toLowerCase();
  if (rrole === 'associate' && admin_user_id !== requester.id) {
    return res.status(403).json({ error: 'Associates can only self-assign' });
  }
  if (rrole === 'project_manager' && admin_user_id !== requester.id) {
    // allow assigning to associates only
    if ((targetAdmin.role || '').toLowerCase() !== 'associate') {
      return res.status(403).json({ error: 'Project managers can assign only to associates or self' });
    }
  }
  // managers and super_admins can assign to anyone

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('quote_submissions')
    .update({ hitl_assigned_to_admin_id: admin_user_id, hitl_assigned_at: now, hitl_required: true, quote_state: 'in_progress' })
    .eq('quote_id', quoteId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.status(200).json({ success: true, assigned_to: admin_user_id, assigned_at: now });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit')(handler));
