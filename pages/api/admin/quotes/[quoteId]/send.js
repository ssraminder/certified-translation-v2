import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../lib/quoteTotals';

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { quoteId } = req.query;
    const { message } = req.body || {};
    const supabase = getSupabaseServerClient();

    const { data: quote } = await supabase.from('quote_submissions').select('quote_id, quote_number, name, email, quote_state').eq('quote_id', quoteId).maybeSingle();
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    if (['sent','accepted','converted'].includes(String(quote?.quote_state||'').toLowerCase())) return res.status(400).json({ error: 'Quote is locked' });

    const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);

    const { error } = await supabase
      .from('quote_submissions')
      .update({ quote_state: 'sent', sent_at: new Date().toISOString(), last_edited_by: req.admin?.id || null, last_edited_at: new Date().toISOString() })
      .eq('quote_id', quoteId);
    if (error) return res.status(500).json({ error: error.message });

    try {
      const { sendHitlQuoteReadyEmail } = await import('../../../../../lib/email');
      await sendHitlQuoteReadyEmail({ email: quote?.email, first_name: quote?.name, quote_number: quote?.quote_number || quoteId, pricing: totals, message: message || '' });
    } catch {}

    return res.status(200).json({ success: true, quote_state: 'sent', sent_at: new Date().toISOString() });
  } catch (err) {
    console.error('Error sending quote:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

export default withPermission('quotes','edit')(handler);
