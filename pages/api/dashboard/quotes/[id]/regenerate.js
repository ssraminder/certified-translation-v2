import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

function parseCookies(cookieHeader) {
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts) { const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { id } = req.query;
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies['session_token'];
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session) return res.status(401).json({ error: 'Invalid session' });

    const { data: quote } = await supabase
      .from('quote_submissions')
      .select('*')
      .eq('quote_id', id)
      .eq('user_id', session.user_id)
      .maybeSingle();

    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    if (quote.quote_state !== 'expired') return res.status(400).json({ error: 'Quote is not expired' });

    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + 14);

    const { error: updateError } = await supabase
      .from('quote_submissions')
      .update({ quote_state: 'open', expires_at: newExpiryDate.toISOString(), updated_at: new Date().toISOString() })
      .eq('quote_id', id);

    if (updateError) return res.status(500).json({ error: updateError.message });

    await supabase
      .from('quote_activity_log')
      .insert({
        quote_id: id,
        event_type: 'regenerated',
        from_state: 'expired',
        to_state: 'open',
        actor_type: 'user',
        actor_id: session.user_id,
      });

    return res.status(200).json({ success: true, expires_at: newExpiryDate.toISOString() });
  } catch (err) {
    console.error('Regenerate quote error:', err);
    return res.status(500).json({ error: 'Failed to regenerate quote' });
  }
}

export default withApiBreadcrumbs(handler);
