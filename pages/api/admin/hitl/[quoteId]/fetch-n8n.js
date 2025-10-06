import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const supabase = getSupabaseServerClient();

  const webhookUrl = process.env.N8N_ANALYZE_QUOTE_URL;
  if (!webhookUrl) return res.status(400).json({ error: 'N8N_ANALYZE_QUOTE_URL is not configured' });

  const { data: files } = await supabase
    .from('quote_files')
    .select('filename, file_url, signed_url')
    .eq('quote_id', quoteId);

  const filePayload = (files||[]).map(f => ({ filename: f.filename || 'document.pdf', url: f.file_url || f.signed_url })).filter(f => !!f.url);
  if (filePayload.length === 0) return res.status(400).json({ error: 'No files with accessible URLs found for this quote' });

  const body = { quote_id: quoteId, files: filePayload };
  const headers = { 'Content-Type': 'application/json' };
  const sharedSecret = process.env.N8N_WEBHOOK_SECRET;
  if (sharedSecret) headers['x-webhook-secret'] = sharedSecret;

  let n8nResponse;
  try {
    const fetchRes = await fetch(webhookUrl, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await fetchRes.text();
    try { n8nResponse = JSON.parse(text); } catch { n8nResponse = { success: fetchRes.ok, raw: text }; }
  } catch (e) {
    return res.status(502).json({ error: 'Failed to reach N8N webhook', detail: e.message });
  }

  // Persist result
  const success = !!n8nResponse?.success;
  const updates = { n8n_status: success ? 'ready' : 'error', n8n_analysis_result: n8nResponse?.analysis || n8nResponse || null, hitl_required: true, hitl_requested_at: new Date().toISOString() };
  const { error: updErr } = await supabase.from('quote_submissions').update(updates).eq('quote_id', quoteId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.status(200).json({ success: true, analysis: n8nResponse?.analysis || n8nResponse || null });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit')(handler));
