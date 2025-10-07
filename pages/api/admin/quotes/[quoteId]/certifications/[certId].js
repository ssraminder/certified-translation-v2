import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../../lib/activityLog';

export default async function handler(req, res){
  if (req.method !== 'DELETE'){
    res.setHeader('Allow','DELETE');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = getSupabaseServerClient();
  const { quoteId, certId } = req.query;

  // Ensure quote is editable
  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())){
    return res.status(400).json({ error: 'Quote is locked' });
  }

  const { error } = await supabase.from('quote_certifications').delete().eq('id', certId).eq('quote_id', quoteId);
  if (error) return res.status(500).json({ error: error.message });

  const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
  await logAdminActivity({ action: 'quote_certification_deleted', actor_id: req.admin?.id || null, target_id: quoteId, details: { cert_id: certId } });
  return res.status(200).json({ success: true, totals });
}
