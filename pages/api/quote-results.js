import { getSupabaseServerClient } from '../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const quote = req.query.quote;
  if (!quote) return res.status(400).json({ error: 'Missing quote' });
  try {
    const supabase = getSupabaseServerClient();

    // Fetch totals from quote_results
    const { data: totalsRow, error: totalsErr } = await supabase
      .from('quote_results')
      .select('subtotal, tax, total, shipping_total')
      .eq('quote_id', quote)
      .maybeSingle();
    if (totalsErr) throw totalsErr;

    // Fetch contact info from quote_submissions (Step 2)
    const { data: contactRow, error: contactErr } = await supabase
      .from('quote_submissions')
      .select('name, email, phone')
      .eq('quote_id', quote)
      .maybeSingle();
    if (contactErr) throw contactErr;

    const payload = {
      ...(totalsRow || {}),
      contact_name: contactRow?.name || null,
      contact_email: contactRow?.email || null,
      contact_phone: contactRow?.phone || null
    };

    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
