import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId, fileId, tableType } = req.body;
    const docId = fileId || req.body.docId;

    if (!orderId || !docId) {
      return res.status(400).json({ error: 'Missing orderId or docId' });
    }

    const supabase = getSupabaseServerClient();
    const BUCKET = 'orders';
    const table = tableType === 'reference' ? 'quote_reference_materials' : 'quote_files';

    // Fetch the file record
    const query = supabase
      .from(table)
      .select('id, storage_path, filename')
      .eq('id', docId);

    if (table === 'quote_files') {
      query.eq('order_id', orderId);
    }

    const { data: file, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!file.storage_path) {
      return res.status(400).json({ error: 'File storage path not available' });
    }

    // Generate a new signed URL
    let signedUrl = null;
    try {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

      if (signError) {
        console.error('Failed to create signed URL:', signError);
        return res.status(500).json({ error: 'Failed to generate download link' });
      }

      if (signed?.signedUrl) {
        signedUrl = signed.signedUrl;
      }
    } catch (err) {
      console.error('Error generating signed URL:', err);
      return res.status(500).json({ error: 'Failed to generate download link' });
    }

    if (!signedUrl) {
      return res.status(500).json({ error: 'Failed to generate download link' });
    }

    // Update the file record with the new signed URL
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    await supabase
      .from('quote_files')
      .update({
        signed_url: signedUrl,
        file_url: signedUrl,
        file_url_expires_at: expiresAt
      })
      .eq('id', docId);

    return res.status(200).json({
      success: true,
      file: {
        id: file.id,
        filename: file.filename,
        file_url: signedUrl,
        expires_at: expiresAt
      }
    });
  } catch (err) {
    console.error('Error refreshing signed URL:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

export default handler;
