import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

const GST_RATE = 0.05;

function round2(n){ const x = Number(n); return Math.round((Number.isFinite(x)?x:0)*100)/100; }

async function generateOrderNumber(supabase) {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `ORD-${year}-%`)
    .order('order_number', { ascending: false })
    .limit(1);
  if (error) throw error;
  let next = 1;
  const last = Array.isArray(data) && data[0]?.order_number;
  if (last) {
    const m = String(last).match(/ORD-\d{4}-(\d{6})/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `ORD-${year}-${String(next).padStart(6, '0')}`;
}

async function getQuoteTotals(supabase, quote_id){
  let { data, error } = await supabase
    .from('quote_results')
    .select('quote_id, subtotal, tax, total, shipping_total, converted_to_order_id')
    .eq('quote_id', quote_id)
    .maybeSingle();
  if (error) throw error;

  // If no results exist, trigger calculation (will be saved to DB)
  if (!data) {
    try {
      const { recalcAndUpsertUnifiedQuoteResults } = await import('../../../lib/quoteTotals');
      await recalcAndUpsertUnifiedQuoteResults(quote_id);
      const { data: newData } = await supabase
        .from('quote_results')
        .select('quote_id, subtotal, tax, total, shipping_total, converted_to_order_id')
        .eq('quote_id', quote_id)
        .maybeSingle();
      data = newData || null;
    } catch (calcErr) {
      console.error('[create-from-quote] Failed to auto-calculate results:', calcErr);
    }
  }

  return data || null;
}

async function fetchShippingOptionsSnapshot(supabase, optionIds){
  if (!Array.isArray(optionIds) || optionIds.length === 0) return [];
  const { data, error } = await supabase
    .from('shipping_options')
    .select('id, name, description, price, delivery_time, require_shipping_address, is_active')
    .in('id', optionIds);
  if (error) throw error;
  const active = (data || []).filter(o => o.is_active !== false);
  if (active.length !== optionIds.length) {
    throw new Error('Invalid or inactive shipping options supplied');
  }
  return active;
}

async function getSelectedQuoteShippingOptions(supabase, quote_id){
  const { data, error } = await supabase
    .from('quote_shipping_options')
    .select('shipping_option_id')
    .eq('quote_id', quote_id);
  if (error) throw error;
  return (data || []).map(r => r.shipping_option_id);
}

function normalizeAddress(addr){
  if (!addr) return null;
  const o = { ...addr };
  return {
    full_name: String(o.full_name||'').trim(),
    email: o.email ? String(o.email).trim() : null,
    phone: String(o.phone||'').trim(),
    address_line1: String(o.address_line1||'').trim(),
    address_line2: o.address_line2 ? String(o.address_line2).trim() : null,
    city: String(o.city||'').trim(),
    province_state: String(o.province_state||'').trim(),
    postal_code: String(o.postal_code||'').trim(),
    country: String(o.country||'Canada').trim() || 'Canada'
  };
}

async function handler(req, res){
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const supabase = getSupabaseServerClient();

    const { quote_id, billing_address, shipping_address, shipping_option_ids, user_id } = req.body || {};
    if (!quote_id) return res.status(400).json({ error: 'quote_id is required' });

    const quote = await getQuoteTotals(supabase, quote_id);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    if (quote.converted_to_order_id) {
      const existing = await getOrderWithDetails(supabase, quote.converted_to_order_id);
      return res.status(200).json({ order: existing, message: 'Quote already converted to order' });
    }

    let selectedIds = Array.isArray(shipping_option_ids) ? shipping_option_ids : null;
    if (!selectedIds || selectedIds.length === 0) {
      selectedIds = await getSelectedQuoteShippingOptions(supabase, quote_id);
    }
    if (!selectedIds || selectedIds.length === 0) {
      return res.status(400).json({ error: 'No shipping options selected for quote' });
    }

    const shippingOptions = await fetchShippingOptionsSnapshot(supabase, selectedIds);
    const shipping_total = round2(shippingOptions.reduce((sum, o) => sum + Number(o.price||0), 0));

    const baseSubtotal = Number(quote.subtotal || 0);
    const subtotal = round2(baseSubtotal + shipping_total);
    const tax_rate = GST_RATE;
    const tax_total = round2(subtotal * tax_rate);
    const total = round2(subtotal + tax_total);

    const order_number = await generateOrderNumber(supabase);

    const billAddr = normalizeAddress(billing_address);
    const shipAddrInput = normalizeAddress(shipping_address);

    const orderInsert = {
      quote_id,
      user_id: user_id || null,
      order_number,
      status: 'pending_payment',
      payment_status: 'pending',
      translation_total: round2(baseSubtotal),
      certification_total: 0,
      delivery_total: 0,
      shipping_total,
      subtotal,
      tax_rate,
      tax_total,
      total,
      currency: 'CAD',
      customer_email: billAddr?.email || '',
      customer_phone: billAddr?.phone || null,
      is_guest: !user_id,
    };
    const { data: orderRows, error: orderErr } = await supabase
      .from('orders')
      .insert([orderInsert])
      .select('*')
      .single();
    if (orderErr) throw orderErr;
    const order = orderRows;

    let billingAddressId = null;
    if (billAddr) {
      const { data: bRow, error: bErr } = await supabase
        .from('addresses')
        .insert([{ ...billAddr, type: 'billing', quote_id, order_id: order.id }])
        .select('id')
        .single();
      if (bErr) throw bErr;
      billingAddressId = bRow?.id || null;
    } else {
      throw new Error('billing_address is required');
    }

    let shippingAddressId = null;
    if (shipAddrInput) {
      const { data: sRow, error: sErr } = await supabase
        .from('addresses')
        .insert([{ ...shipAddrInput, type: 'shipping', quote_id, order_id: order.id }])
        .select('id')
        .single();
      if (sErr) throw sErr;
      shippingAddressId = sRow?.id || null;
    } else {
      if (shippingOptions.some(o => o.require_shipping_address)) {
        throw new Error('shipping_address is required for selected shipping options');
      }
      shippingAddressId = billingAddressId;
    }

    const { error: updErr } = await supabase
      .from('orders')
      .update({ billing_address_id: billingAddressId, shipping_address_id: shippingAddressId })
      .eq('id', order.id);
    if (updErr) throw updErr;

    if (shippingOptions.length) {
      const rows = shippingOptions.map(o => ({
        order_id: order.id,
        shipping_option_id: o.id,
        name: o.name,
        description: o.description || null,
        price: Number(o.price || 0),
        delivery_time: o.delivery_time || null,
        require_shipping_address: !!o.require_shipping_address,
      }));
      const { error: shipErr } = await supabase.from('order_shipping_options').insert(rows);
      if (shipErr) throw shipErr;
    }

    await supabase
      .from('quote_files')
      .update({ order_id: order.id })
      .eq('quote_id', quote_id);

    await supabase
      .from('quote_results')
      .update({ converted_to_order_id: order.id, converted_at: new Date().toISOString() })
      .eq('quote_id', quote_id);

    await supabase
      .from('quote_submissions')
      .update({ quote_state: 'converted', updated_at: new Date().toISOString() })
      .eq('quote_id', quote_id);

    await supabase.from('order_status_history').insert([
      {
        order_id: order.id,
        from_status: null,
        to_status: 'pending_payment',
        changed_by_type: 'system',
        notes: 'Order created from quote'
      }
    ]);

    const full = await getOrderWithDetails(supabase, order.id);

    return res.status(201).json({ success: true, order: full });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

async function getOrderWithDetails(supabase, orderId){
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const [billing, shipping, shippingOptions, files] = await Promise.all([
    supabase.from('addresses').select('*').eq('id', order.billing_address_id).maybeSingle(),
    supabase.from('addresses').select('*').eq('id', order.shipping_address_id).maybeSingle(),
    supabase.from('order_shipping_options').select('*').eq('order_id', orderId),
    supabase.from('quote_files').select('*').eq('order_id', orderId)
  ]);

  return {
    ...order,
    billing_address: billing.data || null,
    shipping_address: shipping.data || null,
    shipping_options: shippingOptions.data || [],
    documents: files.data || []
  };
}

export { getOrderWithDetails };
export default withApiBreadcrumbs(handler);
