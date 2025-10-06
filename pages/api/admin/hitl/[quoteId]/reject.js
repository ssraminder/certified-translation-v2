import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { sendHitlRejectedEmail } from '../../../../../lib/email';

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const { reason, message } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'reason is required' });

  const supabase = getSupabaseServerClient();

  const { data: quote } = await supabase
    .from('quote_submissions')
    .select('quote_id, quote_number, name, email')
    .eq('quote_id', quoteId)
    .maybeSingle();
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const { error: updErr } = await supabase
    .from('quote_submissions')
    .update({ quote_state: 'rejected', hitl_notes: message || null, hitl_completed_at: new Date().toISOString(), hitl_required: true })
    .eq('quote_id', quoteId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  try {
    await sendHitlRejectedEmail({ email: quote.email, first_name: quote.name, quote_number: quote.quote_number || quote.quote_id, reason, message });
  } catch {}

  return res.status(200).json({ success: true });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit')(handler));
