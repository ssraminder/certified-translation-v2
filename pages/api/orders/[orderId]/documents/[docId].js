import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

async function handler(req, res) {
  const { orderId, docId } = req.query;

  if (!orderId || !docId) {
    return res.status(400).json({ error: 'Missing orderId or docId' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();

    // Get file record to get storage path
    const { data: fileRecord, error: fetchError } = await supabase
      .from('quote_files')
      .select('storage_path, filename')
      .eq('id', docId)
      .eq('order_id', orderId)
      .single();

    if (fetchError || !fileRecord) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from storage
    if (fileRecord.storage_path) {
      const { error: deleteError } = await supabase.storage
        .from('orders')
        .remove([fileRecord.storage_path]);

      if (deleteError) {
        console.error('Storage delete error:', deleteError);
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('quote_files')
      .delete()
      .eq('id', docId)
      .eq('order_id', orderId);

    if (dbError) {
      throw dbError;
    }

    // Log activity
    await supabase.from('order_activity').insert([
      {
        order_id: orderId,
        type: 'document_delete',
        description: `Document deleted: ${fileRecord.filename}`,
        metadata: { filename: fileRecord.filename },
        created_at: new Date().toISOString(),
      },
    ]);

    // Return updated order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    const { data: documents } = await supabase
      .from('quote_files')
      .select('*')
      .eq('order_id', orderId);

    return res.status(200).json({ order: { ...order, documents } });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: err.message || 'Delete failed' });
  }
}

export default handler;
