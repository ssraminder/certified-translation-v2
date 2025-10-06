import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const { feedback_type, feedback_text, n8n_result, correct_values } = req.body || {};
  if (!feedback_type) return res.status(400).json({ error: 'feedback_type is required' });

  const supabase = getSupabaseServerClient();
  const adminId = req.admin?.id;

  const row = {
    quote_id: quoteId,
    admin_user_id: adminId,
    feedback_type: String(feedback_type),
    feedback_text: feedback_text || null,
    n8n_result: n8n_result || null,
    correct_values: correct_values || null
  };

  const { error } = await supabase.from('hitl_feedback').insert([row]);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit')(handler));
