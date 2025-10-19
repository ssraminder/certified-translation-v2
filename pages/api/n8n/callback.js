import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { invokeHitlForQuote, HITL_REASONS } from '../../../lib/hitlManagement';

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

function normalizeStatus(incoming) {
  if (!incoming || typeof incoming !== 'string') return 'pending';
  const lower = incoming.toLowerCase().trim();
  if (lower === 'completed' || lower === 'ready' || lower === 'done') return 'analysis_complete';
  if (lower === 'processing' || lower === 'in_progress') return 'processing';
  if (lower === 'pending' || lower === 'requested') return 'pending';
  if (lower === 'error' || lower === 'failed') return 'error';
  if (lower === 'discarded') return 'discarded';
  return incoming;
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

  const { quote_id, quoteId, status } = req.body || {};
  const effectiveQuoteId = quote_id || quoteId;
  const normalizedStatus = normalizeStatus(status);

  if (!effectiveQuoteId) {
    return res.status(400).json({ error: 'quote_id is required' });
  }

  try {
    const supabase = getSupabaseServerClient();

    const { error: updateSubErr } = await supabase
      .from('quote_submissions')
      .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
      .eq('quote_id', effectiveQuoteId);

    if (updateSubErr) {
      console.error('[n8n/callback] Failed to update quote_submissions:', updateSubErr);
      return res.status(500).json({ error: 'Failed to update status', details: updateSubErr.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[n8n/callback] Exception:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default handler;
