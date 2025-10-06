import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

const BUCKET = 'orders';

function getBaseUrl(req){
  const hostHeader = req.headers.host;
  if (!hostHeader) return null;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : (typeof forwardedProto === 'string' && forwardedProto.length > 0)
      ? forwardedProto.split(',')[0].trim()
      : (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.')) ? 'http' : 'https';
  return `${proto}://${hostHeader}`;
}

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const supabase = getSupabaseServerClient();

  // Use the same webhook and payload format as Step 1
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  if (!webhookUrl) return res.status(400).json({ error: 'NEXT_PUBLIC_N8N_WEBHOOK_URL is not configured' });

  const baseUrl = getBaseUrl(req);
  const callbackUrl = baseUrl ? `${baseUrl}/api/n8n/callback` : null;
  const callbackSecret = process.env.N8N_WEBHOOK_SECRET || null;

  // Build files payload with fresh URLs (prefer public file_url; else generate new signed URL)
  const { data: files } = await supabase
    .from('quote_files')
    .select('filename, file_url, signed_url, storage_path')
    .eq('quote_id', quoteId);

  const filePayload = [];
  if (Array.isArray(files)){
    for (const f of files){
      let url = f.file_url || null;
      if (!url && f.storage_path){
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 3600);
        if (signed?.signedUrl) url = signed.signedUrl;
      }
      if (url) filePayload.push({ filename: f.filename || 'document.pdf', url });
    }
  }

  const body = { quote_id: quoteId, files: filePayload };
  if (callbackUrl) body.callback_url = callbackUrl;
  if (callbackSecret) body.callback_secret = callbackSecret;

  try {
    await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) {
    return res.status(502).json({ error: 'Failed to reach N8N webhook', detail: e.message });
  }

  // Mark request registered; actual analysis saved by n8n -> callback
  const updates = { n8n_status: 'requested', hitl_required: true, hitl_requested_at: new Date().toISOString() };
  const { error: updErr } = await supabase.from('quote_submissions').update(updates).eq('quote_id', quoteId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.status(202).json({ success: true, files: filePayload.length });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit')(handler));
