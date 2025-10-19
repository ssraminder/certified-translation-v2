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

function normalizeRow(input) {
  if (!input || typeof input !== 'object') return null;
  const row = { ...input };
  if (row.page_number != null) {
    const n = Number(row.page_number);
    if (!Number.isNaN(n)) row.page_number = n;
  }
  if (typeof row.filename === 'string') row.filename = row.filename.trim();
  if (typeof row.quote_id === 'string') row.quote_id = row.quote_id.trim();
  row.updated_at = new Date().toISOString();
  return row;
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

  const body = req.body;
  let rows = [];
  if (Array.isArray(body)) rows = body;
  else if (body && typeof body === 'object') {
    if (Array.isArray(body.rows)) rows = body.rows;
    else rows = [body];
  }

  rows = rows.map(normalizeRow).filter(Boolean);

  if (rows.length === 0) {
    return res.status(400).json({ error: 'No rows provided' });
  }

  for (const r of rows) {
    if (!r.quote_id || !r.filename || (r.page_number == null)) {
      return res.status(400).json({ error: 'quote_id, filename, and page_number are required for each row' });
    }
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('ocr_analysis')
      .upsert(rows, { onConflict: 'quote_id,filename,page_number', ignoreDuplicates: false, defaultToNull: false })
      .select('quote_id, filename, page_number');

    if (error) {
      return res.status(500).json({ error: error.message || 'Upsert failed' });
    }

    return res.status(200).json({ ok: true, upserted: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
