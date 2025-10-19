import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { logAdminActivity } from '../../../../../../lib/activityLog';
import formidable from 'formidable';
import fs from 'fs/promises';
import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

function toArray(v){
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string'){
    try { const j = JSON.parse(v); if (Array.isArray(j)) return j; } catch {}
    if (v.includes(',')) return v.split(',').map(s=>s.trim()).filter(Boolean);
    return [v];
  }
  return [v];
}

async function handler(req, res){
  if (req.method !== 'POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { quoteId } = req.query;

    // Enforce stricter edit rules for uploads (draft or under_review)
    const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
    const state = String(q?.quote_state || '').toLowerCase();
    if (!['draft','under_review'].includes(state)){
      return res.status(400).json({ error: 'Uploads allowed only in draft or under_review' });
    }

    const form = formidable({ multiples: true, maxFileSize: 50 * 1024 * 1024 });

    let parsed;
    try { parsed = await new Promise((resolve, reject)=>{ form.parse(req, (err, fields, files)=>{ if (err) reject(err); else resolve({ fields, files }); }); }); }
    catch (e){ return res.status(400).json({ error: 'Invalid form data' }); }

    const fields = parsed.fields || {};
    const filesIn = parsed.files?.files; // expecting field name 'files'
    const purposesRaw = fields.file_purposes || fields.purposes || [];
    const purposes = toArray(purposesRaw).map(p => ['translate','reference','already_translated'].includes(String(p)) ? String(p) : 'translate');

    const filesArr = Array.isArray(filesIn) ? filesIn : (filesIn ? [filesIn] : []);
    if (filesArr.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const BUCKET = 'orders';
    const uploaded = [];

    for (let i=0; i<filesArr.length; i++){
      const f = filesArr[i];
      const purpose = purposes[i] || 'translate';
      const origName = f.originalFilename || 'document';
      const mimetype = f.mimetype || 'application/octet-stream';
      const bytes = f.size || 0;
      const fileBuf = await fs.readFile(f.filepath);

      const fileId = crypto.randomUUID();
      const safeName = origName.replace(/[^a-zA-Z0-9._-]+/g,'_');
      const storagePath = `${quoteId}/${Date.now()}_${fileId}_${safeName}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuf, { contentType: mimetype, upsert: true });
      if (upErr) return res.status(500).json({ error: upErr.message });

      // Generate short-lived signed URL for preview
      let signedUrl = null; let fileUrl = null; let expiresAt = null;
      try {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
        if (signed?.signedUrl){ signedUrl = signed.signedUrl; fileUrl = signed.signedUrl; expiresAt = new Date(Date.now()+3600*1000).toISOString(); }
      } catch {}

      const insert = {
        quote_id: quoteId,
        file_id: fileId,
        filename: origName,
        storage_path: storagePath,
        storage_key: storagePath,
        file_url: fileUrl,
        signed_url: signedUrl,
        bytes,
        content_type: mimetype,
        status: 'uploaded',
        file_url_expires_at: expiresAt,
        file_purpose: purpose,
        analyzed: false,
        analysis_requested_at: null
      };

      const { data: row, error: insErr } = await supabase.from('quote_files').insert([insert]).select('file_id, filename, file_purpose, file_url, analyzed').maybeSingle();
      if (insErr) return res.status(500).json({ error: insErr.message });

      uploaded.push(row);
    }

    await logAdminActivity({ action: 'quote_files_uploaded', actor_id: req.admin?.id || null, target_id: quoteId, details: { count: uploaded.length } });
    return res.status(200).json({ success: true, uploaded_files: uploaded });
  } catch (err) {
    console.error('Error uploading files:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

import { withPermission } from '../../../../../../lib/apiAdmin';
export default withPermission('quotes','edit')(handler);
