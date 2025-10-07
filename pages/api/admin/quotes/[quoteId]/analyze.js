import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { logAdminActivity } from '../../../../../lib/activityLog';

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

async function handler(req, res){
  if (req.method !== 'POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = getSupabaseServerClient();
  const { quoteId } = req.query;
  const { file_ids, batch_mode, replace_existing } = req.body || {};
  if (!Array.isArray(file_ids) || file_ids.length === 0){
    return res.status(400).json({ error: 'file_ids required' });
  }
  const mode = (batch_mode === 'batch') ? 'batch' : 'single';

  const BUCKET = 'orders';
  const { data: files } = await supabase
    .from('quote_files')
    .select('file_id, filename, file_url, signed_url, storage_path, file_url_expires_at')
    .eq('quote_id', quoteId)
    .in('file_id', file_ids);

  // Create a new analysis run version for this quote
  const { data: lastRun } = await supabase
    .from('analysis_runs')
    .select('version')
    .eq('quote_id', quoteId)
    .order('version', { ascending: false })
    .limit(1);
  const nextVersion = (Array.isArray(lastRun) && lastRun[0]?.version ? Number(lastRun[0].version) : 0) + 1;
  const runInsert = {
    quote_id: quoteId,
    run_type: 'auto',
    version: nextVersion,
    status: 'requested',
    is_active: false,
    discarded: false
  };
  const { data: runRow, error: runErr } = await supabase.from('analysis_runs').insert([runInsert]).select('*').maybeSingle();
  if (runErr) return res.status(500).json({ error: runErr.message });
  const runId = runRow?.id || null;

  // Generate fresh signed URLs for this run to avoid expired JWTs
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

  const payload = {
    quote_id: quoteId,
    run_id: runId,
    run_type: runRow?.run_type || runInsert.run_type || 'auto',
    version: runRow?.version ?? nextVersion,
    status: runRow?.status || 'requested',
    is_active: Boolean(runRow?.is_active ?? false),
    discarded: Boolean(runRow?.discarded ?? false),
    files: signedFiles,
    batch_mode: mode,
    replace_existing: !!replace_existing
  };

  const baseUrl = getBaseUrl(req);
  if (baseUrl) {
    payload.callback_url = `${baseUrl}/api/n8n/callback`;
  }
  if (process.env.N8N_WEBHOOK_SECRET){
    payload.callback_secret = process.env.N8N_WEBHOOK_SECRET;
  }

  // Forward to central trigger which adds headers safely
  try {
    await fetch(`${baseUrl || ''}/api/trigger-n8n`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // swallow
  }

  // Mark analysis requested timestamp
  const now = new Date().toISOString();
  await supabase
    .from('quote_files')
    .update({ analysis_requested_at: now })
    .eq('quote_id', quoteId)
    .in('file_id', file_ids);

  await logAdminActivity({ action: 'quote_analysis_triggered', actor_id: req.admin?.id || null, target_id: quoteId, details: { files_count: (files||[]).length, batch_mode: mode, run_id: runId, version: nextVersion } });
  return res.status(200).json({ success: true, analysis_triggered: true, files_count: (files||[]).length, run_id: runId });
}

import { withPermission } from '../../../../../lib/apiAdmin';
export default withPermission('quotes','edit')(handler);
