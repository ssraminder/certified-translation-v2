import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../../lib/activityLog';

function isNumericId(id){ return /^[0-9]+$/.test(String(id||'')); }

async function handler(req, res){
  try {
    const supabase = getSupabaseServerClient();
    const { quoteId, fileId } = req.query;

    // Ensure quote is editable
    const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
    if (['accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())){
      return res.status(400).json({ error: 'Quote is locked' });
    }

    // Resolve file by either bigint id or uuid file_id
    const fileMatch = isNumericId(fileId) ? { id: Number(fileId) } : { file_id: fileId };
    const { data: file } = await supabase
      .from('quote_files')
      .select('id, file_id, filename')
      .eq('quote_id', quoteId)
      .match(fileMatch)
      .maybeSingle();
    if (!file){
      return res.status(404).json({ error: 'File not found' });
    }

    if (req.method === 'PUT'){
      const { file_purpose } = req.body || {};
      if (!['translate','reference','already_translated'].includes(String(file_purpose||''))){
        return res.status(400).json({ error: 'Invalid file_purpose' });
      }

      const { data: updated, error } = await supabase
        .from('quote_files')
        .update({ file_purpose })
        .eq('quote_id', quoteId)
        .match(fileMatch)
        .select('*')
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });

      await logAdminActivity({ action: 'quote_file_updated', actor_id: req.admin?.id || null, target_id: quoteId, details: { file_id: file.file_id, file_purpose } });
      return res.status(200).json({ success: true, file: updated });
    }

    if (req.method === 'DELETE'){
      // Delete related line items & certifications first
      const [{ error: liErr, count: liCount }, { error: certErr }] = await Promise.all([
        supabase.from('quote_sub_orders').delete({ count: 'exact' }).eq('quote_id', quoteId).or(`file_id.eq.${file.file_id},filename.eq.${file.filename}`),
        supabase.from('quote_certifications').delete().eq('quote_id', quoteId).or(`applies_to_file_id.eq.${file.file_id},applies_to_filename.eq.${file.filename}`)
      ]);
      if (liErr) return res.status(500).json({ error: liErr.message });
      if (certErr) return res.status(500).json({ error: certErr.message });

      const { error: delErr } = await supabase
        .from('quote_files')
        .delete()
        .eq('quote_id', quoteId)
        .match(fileMatch);
      if (delErr) return res.status(500).json({ error: delErr.message });

      const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
      await logAdminActivity({ action: 'quote_file_deleted', actor_id: req.admin?.id || null, target_id: quoteId, details: { file_id: file.file_id, filename: file.filename, deleted_line_items: liCount || 0 } });
      return res.status(200).json({ success: true, deleted_line_items: liCount || 0, totals });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error handling file:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

import { withPermission } from '../../../../../../lib/apiAdmin';
export default withPermission('quotes','edit')(handler);
