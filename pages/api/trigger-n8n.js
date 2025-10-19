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
  if (!url) {
    return res.status(200).json({ ok: true });
  }

  const baseUrl = getBaseUrl(req);
  const callbackUrl = baseUrl ? `${baseUrl}/api/n8n/callback` : null;
  const callbackSecret = process.env.N8N_WEBHOOK_SECRET || null;

  try {
    const originalPayload = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const payload = { ...originalPayload };

    // If a quote_id is present, create a fresh analysis run and generate fresh signed URLs for its files
    const quoteId = payload.quote_id || payload.quoteId || null;
    if (quoteId) {
      const supabase = getSupabaseServerClient();

      // Create a new analysis run version for this quote
      const { data: lastRun, error: versionErr } = await supabase
        .from('analysis_runs')
        .select('version')
        .eq('quote_id', quoteId)
        .order('version', { ascending: false })
        .limit(1);

      if (versionErr) {
        console.error('[trigger-n8n] Error fetching last run version:', versionErr);
      }

      const nextVersion = (Array.isArray(lastRun) && lastRun[0]?.version ? Number(lastRun[0].version) : 0) + 1;
      const runInsert = {
        quote_id: quoteId,
        run_type: 'auto',
        version: nextVersion,
        status: 'requested',
        is_active: false,
        discarded: false
      };
      const { data: runRow, error: insertErr } = await supabase.from('analysis_runs').insert([runInsert]).select('*').maybeSingle();

      if (insertErr) {
        console.error('[trigger-n8n] Error creating analysis_runs record:', insertErr, 'with payload:', runInsert);
      }

      const runId = runRow?.id || null;

      // Generate fresh signed URLs for each file associated with this quote
      const BUCKET = 'orders';
      const { data: files } = await supabase
        .from('quote_files')
        .select('file_id, filename, file_url, signed_url, storage_path')
        .eq('quote_id', quoteId);
      const signedFiles = await Promise.all((files || []).map(async (f) => {
        let url = null; let expiresAt = null;
        try {
          if (f.storage_path) {
            const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 3600);
            if (signed?.signedUrl) { url = signed.signedUrl; expiresAt = new Date(Date.now()+3600*1000).toISOString(); }
          }
        } catch {}
        if (!url) url = f.file_url || f.signed_url || null;
        return { file_id: f.file_id, filename: f.filename, file_url: url, expires_at: expiresAt };
      }));

      if (runId) {
        payload.run_id = runId;
        payload.run_type = (runRow && runRow.run_type) || runInsert.run_type || 'auto';
        payload.version = (runRow && runRow.version != null) ? runRow.version : nextVersion;
        payload.status = (runRow && runRow.status) || 'requested';
        payload.is_active = Boolean((runRow && runRow.is_active) ?? false);
        payload.discarded = Boolean((runRow && runRow.discarded) ?? false);
      }
      if ((signedFiles || []).length) payload.files = signedFiles;
      payload.batch_mode = payload.batch_mode || 'single';
      payload.replace_existing = Boolean(payload.replace_existing);
    }

    if (callbackUrl) payload.callback_url = callbackUrl;
    if (callbackSecret) payload.callback_secret = callbackSecret;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Failed to trigger N8N webhook', error);
  }

  return res.status(202).json({ ok: true });
}

export default withApiBreadcrumbs(handler);
