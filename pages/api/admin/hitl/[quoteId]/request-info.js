import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { sendHitlRequestInfoEmail } from '../../../../../lib/email';

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message is required' });

  const supabase = getSupabaseServerClient();

  const { data: quote } = await supabase
    .from('quote_submissions')
    .select('quote_id, quote_number, name, email')
    .eq('quote_id', quoteId)
    .maybeSingle();
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const { error: updErr } = await supabase
    .from('quote_submissions')
    .update({ hitl_user_message: message, quote_state: 'awaiting_customer_response' })
    .eq('quote_id', quoteId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  try {
    await sendHitlRequestInfoEmail({ email: quote.email, first_name: quote.name, quote_number: quote.quote_number || quote.quote_id, message });
  } catch {}

  return res.status(200).json({ success: true });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit')(handler));
