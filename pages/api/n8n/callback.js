import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

function extractSecret(req) {
  const headerSecret = req.headers['x-webhook-secret']
    || req.headers['x-n8n-secret']
    || req.headers['x-hook-secret'];
  if (headerSecret) return Array.isArray(headerSecret) ? headerSecret[0] : headerSecret;
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

function normaliseStatus(rawStatus) {
  if (typeof rawStatus !== 'string' || rawStatus.trim().length === 0) {
    return 'analysis_complete';
  }
  const value = rawStatus.trim().toLowerCase();
  if (value === 'complete') return 'analysis_complete';
  if (value === 'completed') return 'analysis_complete';
  if (value === 'failed') return 'analysis_failed';
  if (value === 'error') return 'analysis_failed';
  return value;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sharedSecret = process.env.N8N_WEBHOOK_SECRET;
  if (sharedSecret) {
    const receivedSecret = extractSecret(req);
    if (receivedSecret !== sharedSecret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
  }

  const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const quoteId = payload.quote_id || payload.quoteId;
  if (!quoteId) {
    return res.status(400).json({ error: 'quote_id is required' });
  }

  const supabase = getSupabaseServerClient();
  const status = normaliseStatus(payload.status);

  // Update submission status (legacy/global)
  const { error } = await supabase
    .from('quote_submissions')
    .update({ status })
    .eq('quote_id', quoteId);
  if (error) {
    return res.status(500).json({ error: 'Failed to update status' });
  }

  // Update analysis run status if provided
  const runId = payload.run_id || payload.runId || null;
  if (runId) {
    await supabase
      .from('analysis_runs')
      .update({ status })
      .eq('id', runId);
  }

  return res.status(200).json({ ok: true });
}

export default withApiBreadcrumbs(handler);
