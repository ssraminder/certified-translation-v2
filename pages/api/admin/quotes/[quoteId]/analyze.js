import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { logAdminActivity } from '../../../../lib/activityLog';

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

export default async function handler(req, res){
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

  const { data: files } = await supabase
    .from('quote_files')
    .select('file_id, filename, file_url')
    .eq('quote_id', quoteId)
    .in('file_id', file_ids);

  const payload = {
    quote_id: quoteId,
    files: (files||[]).map(f => ({ file_id: f.file_id, filename: f.filename, file_url: f.file_url })),
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

  await logAdminActivity({ action: 'quote_analysis_triggered', actor_id: req.admin?.id || null, target_id: quoteId, details: { files_count: (files||[]).length, batch_mode: mode } });
  return res.status(200).json({ success: true, analysis_triggered: true, files_count: (files||[]).length, n8n_webhook_id: null });
}
