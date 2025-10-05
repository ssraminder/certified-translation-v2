import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

async function handler(req, res) {
  const { quote } = req.query;
  if (!quote) return res.status(400).json({ error: 'Missing quote' });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { optionIds } = req.body || {};
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ error: 'At least one shipping option must be selected' });
    }

    const supabase = getSupabaseServerClient();

    const { data: options, error: optErr } = await supabase
      .from('shipping_options')
      .select('id, price, is_active, is_always_selected')
      .in('id', optionIds);
    if (optErr) throw optErr;

    const activeMap = new Map(options.map(o => [o.id, o]));
    for (const id of optionIds) {
      const row = activeMap.get(id);
      if (!row || row.is_active === false) {
        return res.status(400).json({ error: `Invalid or inactive shipping option: ${id}` });
      }
    }

    const hasAlways = options.some(o => o.is_always_selected);
    if (!hasAlways) {
      const { data: alwaysRows } = await supabase
        .from('shipping_options')
        .select('id')
        .eq('is_always_selected', true)
        .limit(1)
        .maybeSingle();
      if (alwaysRows?.id && !optionIds.includes(alwaysRows.id)) optionIds.push(alwaysRows.id);
    }

    await supabase.from('quote_shipping_options').delete().eq('quote_id', quote);
    const rows = optionIds.map(id => ({ quote_id: quote, shipping_option_id: id, price: activeMap.get(id)?.price ?? 0 }));
    const { error: insertErr } = await supabase.from('quote_shipping_options').insert(rows);
    if (insertErr) throw insertErr;

    const shippingTotal = rows.reduce((sum, r) => sum + Number(r.price || 0), 0);
    await supabase
      .from('quote_results')
      .update({ shipping_total: shippingTotal })
      .eq('quote_id', quote);

    return res.status(200).json({ success: true, shippingTotal });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
