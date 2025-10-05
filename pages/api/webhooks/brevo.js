import { getSupabaseServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};
    const supabase = getSupabaseServerClient();
    const messageId = event['message-id'] || event.messageId || event.message_id || null;

    if (!messageId) {
      return res.status(200).json({ received: true });
    }

    const updates = {};
    if (event.event === 'opened') {
      updates.status = 'opened';
      updates.opened_at = new Date(event.date || Date.now()).toISOString();
    }
    if (event.event === 'click') {
      updates.clicked_at = new Date(event.date || Date.now()).toISOString();
      updates.metadata = { ...(event.metadata || {}), clicked_link: event.link };
    }
    if (event.event === 'soft_bounce' || event.event === 'hard_bounce') {
      updates.status = 'bounced';
      updates.error_message = event.reason || 'bounce';
    }
    if (event.event === 'spam') {
      updates.status = 'spam';
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('email_logs').update(updates).eq('provider_id', messageId);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
}
