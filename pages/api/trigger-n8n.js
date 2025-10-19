import { withApiBreadcrumbs } from '../../lib/sentry';

function getBaseUrl(req) {
  const hostHeader = req.headers.host;
  if (!hostHeader) return null;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = (() => {
    if (Array.isArray(forwardedProto)) return forwardedProto[0];
    if (typeof forwardedProto === 'string' && forwardedProto.length > 0) {
      return forwardedProto.split(',')[0].trim();
    }
    if (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.')) {
      return 'http';
    }
    return 'https';
  })();
  return `${proto}://${hostHeader}`;
}

import { getSupabaseServerClient } from '../../lib/supabaseServer';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const url = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  console.log('[trigger-n8n] N8N_WEBHOOK_URL:', url ? 'configured' : 'NOT CONFIGURED');

  if (!url) {
    console.warn('[trigger-n8n] No webhook URL configured, skipping');
    return res.status(200).json({ ok: true, message: 'No webhook URL configured' });
  }

  const baseUrl = getBaseUrl(req);
  const callbackUrl = baseUrl ? `${baseUrl}/api/n8n/callback` : null;
  const callbackSecret = process.env.N8N_WEBHOOK_SECRET || null;

  try {
    const originalPayload = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const payload = { ...originalPayload };
    const quoteId = payload.quote_id || payload.quoteId || null;

    console.log('[trigger-n8n] Received webhook trigger for quoteId:', quoteId);

    // Generate fresh signed URLs for each file associated with this quote
    // quote_files now only contains 'translate' documents (reference files are in quote_reference_materials)
    if (quoteId) {
      const supabase = getSupabaseServerClient();
      const BUCKET = 'orders';
      const { data: files, error: filesError } = await supabase
        .from('quote_files')
        .select('file_id, filename, file_url, signed_url, storage_path')
        .eq('quote_id', quoteId);

      if (filesError) {
        console.error('[trigger-n8n] Error fetching files:', filesError);
      } else {
        console.log(`[trigger-n8n] Found ${files?.length || 0} files for quote ${quoteId}`);
      }

      const signedFiles = await Promise.all((files || []).map(async (f) => {
        let url = null; let expiresAt = null;
        try {
          if (f.storage_path) {
            const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 3600);
            if (signed?.signedUrl) { url = signed.signedUrl; expiresAt = new Date(Date.now()+3600*1000).toISOString(); }
          }
        } catch (err) {
          console.warn(`[trigger-n8n] Failed to sign URL for file ${f.file_id}:`, err);
        }
        if (!url) url = f.file_url || f.signed_url || null;
        return { file_id: f.file_id, filename: f.filename, file_url: url, expires_at: expiresAt };
      }));

      if ((signedFiles || []).length) {
        payload.files = signedFiles;
        console.log('[trigger-n8n] Added', signedFiles.length, 'files to payload');
      } else {
        console.warn('[trigger-n8n] No files found to send to webhook');
      }

      payload.batch_mode = payload.batch_mode || 'single';
      payload.replace_existing = Boolean(payload.replace_existing);
    }

    if (callbackUrl) payload.callback_url = callbackUrl;
    if (callbackSecret) payload.callback_secret = callbackSecret;

    console.log('[trigger-n8n] Sending payload to:', url);
    console.log('[trigger-n8n] Payload keys:', Object.keys(payload));

    const webhookRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('[trigger-n8n] N8N response status:', webhookRes.status);
    if (!webhookRes.ok) {
      const responseText = await webhookRes.text();
      console.error('[trigger-n8n] N8N webhook error response:', responseText);
    }
  } catch (error) {
    console.error('[trigger-n8n] Failed to trigger N8N webhook:', error);
  }

  return res.status(202).json({ ok: true });
}

export default withApiBreadcrumbs(handler);
