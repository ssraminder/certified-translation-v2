import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../../lib/activityLog';

async function handler(req, res){
  try {
    const supabase = getSupabaseServerClient();
    const { quoteId, certId } = req.query;

    // Ensure quote is editable
    const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
    if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())){
      return res.status(400).json({ error: 'Quote is locked' });
    }

    if (req.method === 'DELETE'){
      const { error } = await supabase.from('quote_certifications').delete().eq('id', certId).eq('quote_id', quoteId);
      if (error) return res.status(500).json({ error: error.message });
      const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
      await logAdminActivity({ action: 'quote_certification_deleted', actor_id: req.admin?.id || null, target_id: quoteId, details: { cert_id: certId } });
      return res.status(200).json({ success: true, totals });
    }

    if (req.method === 'PUT'){
      const { cert_type_code, cert_type_name, default_rate, override_rate } = req.body || {};
      const patch = {};
      if (cert_type_code) patch.cert_type_code = cert_type_code;
      if (cert_type_name) patch.cert_type_name = cert_type_name;
      if (default_rate != null) patch.default_rate = Number(default_rate);
      patch.override_rate = (override_rate === null || override_rate === '') ? null : Number(override_rate);
      if (patch.default_rate && (patch.override_rate == null || patch.override_rate <= 0)){
        patch.certification_amount = Number(patch.default_rate);
      }
      if (patch.override_rate && patch.override_rate > 0){
        patch.certification_amount = Number(patch.override_rate);
      }

      const { data: row, error } = await supabase
        .from('quote_certifications')
        .update(patch)
        .eq('id', certId)
        .eq('quote_id', quoteId)
        .select('*')
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });

      const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
      await logAdminActivity({ action: 'quote_certification_updated', actor_id: req.admin?.id || null, target_id: quoteId, details: { cert_id: certId } });
      return res.status(200).json({ success: true, certification: row, totals });
    }

    res.setHeader('Allow','DELETE, PUT');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error handling certification:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

import { withPermission } from '../../../../../../lib/apiAdmin';
export default withPermission('quotes','edit')(handler);
