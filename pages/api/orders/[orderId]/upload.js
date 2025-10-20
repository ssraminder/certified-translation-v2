import formidable from 'formidable';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = new formidable.IncomingForm({
    maxFileSize: 25 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(400).json({ error: 'Failed to parse form' });
    }

    try {
      const supabase = getSupabaseServerClient();
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (!docType) {
        return res.status(400).json({ error: 'No document type provided' });
      }

      // Read file from temp location
      const fileContent = fs.readFileSync(file.filepath);
      const fileName = file.originalFilename || file.newFilename;
      const fileSize = fs.statSync(file.filepath).size;

      // Upload to Supabase storage
      const storagePath = `orders/${orderId}/${Date.now()}-${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('orders')
        .upload(storagePath, fileContent, {
          contentType: file.mimetype || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get signed URL
      const { data: signedData } = await supabase.storage
        .from('orders')
        .createSignedUrl(storagePath, 3600);

      const fileUrl = signedData?.signedUrl;

      // Save file record to database
      const { data: fileRecord, error: dbError } = await supabase
        .from('quote_files')
        .insert([
          {
            order_id: orderId,
            filename: fileName,
            file_size: fileSize,
            storage_path: storagePath,
            file_url: fileUrl,
            content_type: file.mimetype || 'application/octet-stream',
            file_purpose: docType,
            type: docType,
            bytes: fileSize,
            status: 'uploaded',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Log activity
      await supabase.from('order_activity').insert([
        {
          order_id: orderId,
          type: 'document_upload',
          description: `Document uploaded: ${fileName}`,
          metadata: { filename: fileName, size: fileSize },
          created_at: new Date().toISOString(),
        },
      ]);

      // Clean up temp file
      fs.unlinkSync(file.filepath);

      return res.status(200).json({ success: true, file: fileRecord });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });
}

export default handler;
