import { logAdminActivity } from '../../../../../lib/activityLog';

async function handler(req, res){
  if (req.method !== 'POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const supabase = getSupabaseServerClient();
  const { quoteId } = req.query;
  const { action, feedback_text } = req.body || {};
  const act = String(action||'').toLowerCase();
  if (!['edit','discard'].includes(act)) return res.status(400).json({ error: 'Invalid action' });
  if (!feedback_text || !String(feedback_text).trim()) return res.status(400).json({ error: 'feedback_text required' });

  const insert = { quote_id: quoteId, action: act, feedback_text: String(feedback_text).trim(), created_by: req.admin?.id || null };
  const { data, error } = await supabase.from('analysis_feedback').insert([insert]).select('*').maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  await logAdminActivity({ action: 'analysis_feedback_recorded', actor_id: req.admin?.id || null, target_id: quoteId, details: { action: act, id: data?.id || null } });
  return res.status(200).json({ success: true, feedback: data });
}

import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
export default withPermission('quotes','edit')(handler);
