import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { logActivity } from '../../../../../lib/activityLogger';

async function handler(req, res){
  const { quoteId } = req.query;
  const supabase = getSupabaseServerClient();

  // Lock edits if already sent
  const { data: quote } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if ((quote?.quote_state || '').toLowerCase() === 'sent') return res.status(400).json({ error: 'Quote is locked after sent' });

  if (req.method === 'POST'){
    const { url, filename, signed_url, content_type, bytes } = req.body || {};

    if (!url && !signed_url) return res.status(400).json({ error: 'Provide url or signed_url' });

    const insert = {
      quote_id: quoteId,
      filename: filename || 'document.pdf',
      file_url: url || null,
      signed_url: signed_url || null,
      content_type: content_type || null,
      bytes: Number.isFinite(Number(bytes)) ? Number(bytes) : null
    };

    const { data, error } = await supabase.from('quote_files').insert([insert]).select('*').maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    await logActivity({ adminUserId: req.admin?.id, actionType: 'hitl_quote_document_added', targetType: 'quote', targetId: quoteId, details: { file_id: data?.id } });
    return res.status(200).json({ success: true, document: data });
  }

  if (req.method === 'DELETE'){
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { error } = await supabase.from('quote_files').delete().eq('id', id).eq('quote_id', quoteId);
    if (error) return res.status(500).json({ error: error.message });

    await logActivity({ adminUserId: req.admin?.id, actionType: 'hitl_quote_document_deleted', targetType: 'quote', targetId: quoteId, details: { file_id: id } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit_pricing')(handler));
