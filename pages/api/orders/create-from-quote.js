import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { invokeHitlForQuote, HITL_REASONS } from '../../../lib/hitlManagement';

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

async function getQuoteData(supabase, quote_id){
  const { data: quoteSubmission, error: subError } = await supabase
    .from('quote_submissions')
    .select('*')
    .eq('quote_id', quote_id)
    .maybeSingle();
  if (subError) throw subError;
  if (!quoteSubmission) return { totals: null, quote: null, lineItems: [] };

  const [totalsResult, lineItemsResult] = await Promise.all([
    supabase
      .from('quote_results')
      .select('quote_id, subtotal, tax, total, shipping_total, converted_to_order_id')
      .eq('quote_id', quote_id)
      .maybeSingle(),
    supabase
      .from('quote_sub_orders')
      .select('billable_pages, total_pages, doc_type')
      .eq('quote_id', quote_id)
  ]);

  if (totalsResult.error) throw totalsResult.error;

  let totals = totalsResult.data;

  // If no results exist, trigger calculation (will be saved to DB)
  if (!totals) {
    try {
      const { recalcAndUpsertUnifiedQuoteResults } = await import('../../../lib/quoteTotals');
      await recalcAndUpsertUnifiedQuoteResults(quote_id);
      const { data: newData } = await supabase
        .from('quote_results')
        .select('quote_id, subtotal, tax, total, shipping_total, converted_to_order_id')
        .eq('quote_id', quote_id)
        .maybeSingle();
      totals = newData || null;
    } catch (calcErr) {
      console.error('[create-from-quote] Failed to auto-calculate results:', calcErr);
    }
  }

  const lineItems = lineItemsResult.data || [];
  const totalPages = lineItems.reduce((sum, item) => sum + (item.billable_pages || 0), 0);
  const documentType = lineItems.length > 0 ? (lineItems[0].doc_type || null) : null;

  return { totals: totals || null, quote: quoteSubmission, lineItems, totalPages, documentType };
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

    const { totals: quoteTotals, quote: quoteData, totalPages, documentType } = await getQuoteData(supabase, quote_id);
    if (!quoteTotals) return res.status(404).json({ error: 'Quote not found' });

    if (quoteTotals.converted_to_order_id) {
      const existing = await getOrderWithDetails(supabase, quoteTotals.converted_to_order_id);
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

    const baseSubtotal = Number(quoteTotals.subtotal || 0);
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
      source_language: quoteData?.source_lang || null,
      target_language: quoteData?.target_lang || null,
      document_type: documentType,
      page_count: totalPages > 0 ? totalPages : null,
      word_count: null,
      urgency: quoteData?.delivery_speed || null,
      due_date: quoteData?.delivery_date || null,
      project_status: 'not_started',
      special_instructions: null,
      internal_notes: null,
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
    // Invoke HITL as fallback for any order creation errors
    try {
      const supabase = getSupabaseServerClient();
      const { quote_id } = req.body || {};
      if (quote_id) {
        console.log(`[create-from-quote] Order creation failed, invoking HITL for quote ${quote_id}: ${err.message}`);
        await invokeHitlForQuote(supabase, quote_id, HITL_REASONS.ORDER_CREATION_FALLBACK);
      }
    } catch (hitlErr) {
      console.error('[create-from-quote] Failed to invoke HITL on error:', hitlErr);
    }

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

  const [billing, shipping, shippingOptions, files, userData] = await Promise.all([
    supabase.from('addresses').select('*').eq('id', order.billing_address_id).maybeSingle(),
    supabase.from('addresses').select('*').eq('id', order.shipping_address_id).maybeSingle(),
    supabase.from('order_shipping_options').select('*').eq('order_id', orderId),
    supabase.from('quote_files').select('id, quote_id, order_id, file_id, filename, storage_path, storage_key, file_url, signed_url, bytes, content_type, status, file_url_expires_at, file_purpose, created_at').eq('order_id', orderId),
    order.user_id ? supabase.from('users').select('id, email, first_name, last_name, phone, account_type, company_name, company_registration, business_license, designation, tax_id').eq('id', order.user_id).maybeSingle() : Promise.resolve({ data: null })
  ]);

  // Regenerate signed URLs for files if expired
  const BUCKET = 'orders';
  const filesWithUrls = await Promise.all((files.data || []).map(async (f) => {
    let url = f.file_url || f.signed_url || null;
    // Check if URL is expired or missing
    if ((!url || (f.file_url_expires_at && new Date(f.file_url_expires_at) < new Date())) && f.storage_path) {
      try {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 3600);
        if (signed?.signedUrl) {
          url = signed.signedUrl;
        }
      } catch (err) {
        console.error('Failed to generate signed URL:', err);
      }
    }
    return { ...f, file_url: url };
  }));

  const user = userData?.data;
  const customerType = user?.account_type || (order.is_guest ? 'guest' : 'individual');

  return {
    ...order,
    billing_address: billing.data || null,
    shipping_address: shipping.data || null,
    shipping_options: shippingOptions.data || [],
    documents: filesWithUrls,
    customer_type: customerType,
    company_name: user?.company_name || null,
    company_registration: user?.company_registration || null,
    business_license: user?.business_license || null,
    designation: user?.designation || null,
    tax_id: user?.tax_id || null
  };
}

export { getOrderWithDetails };
export default withApiBreadcrumbs(handler);
