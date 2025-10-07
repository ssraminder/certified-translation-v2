import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../lib/activityLog';

export default async function handler(req, res){
  if (req.method !== 'POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = getSupabaseServerClient();
  const { quoteId } = req.query;

  const { file_id, filename, billable_pages, unit_rate, doc_type, source_language, target_language } = req.body || {};

  // Ensure quote is editable
  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())){
    return res.status(400).json({ error: 'Quote is locked' });
  }

  const pages = Number(billable_pages);
  const rate = Number(unit_rate);
  if (!(file_id || filename)) return res.status(400).json({ error: 'file_id or filename required' });
  if (!pages || pages <= 0) return res.status(400).json({ error: 'billable_pages required' });
  if (!rate || rate <= 0) return res.status(400).json({ error: 'unit_rate required' });

  const insert = {
    quote_id: quoteId,
    file_id: file_id || null,
    filename: filename || null,
    doc_type: doc_type || filename || 'Document',
    billable_pages: pages,
    unit_rate: rate,
    unit_rate_override: null,
    override_reason: null,
    source_language: source_language || null,
    target_language: target_language || null,
    certification_amount: 0,
    line_total: (pages * rate),
    source: 'manual'
  };

  const { data: row, error } = await supabase.from('quote_sub_orders').insert([insert]).select('*').maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
  await logAdminActivity({ action: 'quote_line_item_created', actor_id: req.admin?.id || null, target_id: quoteId, details: { line_item_id: row?.id || null, source: 'manual' } });
  return res.status(200).json({ success: true, line_item: row, totals });
}
