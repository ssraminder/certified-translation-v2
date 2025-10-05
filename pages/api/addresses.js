import { getSupabaseServerClient } from '../../lib/supabaseServer';

function sanitizeString(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function validateAddress(addr, { requireEmail = false } = {}) {
  const errors = {};
  const required = ['full_name', 'phone', 'address_line1', 'city', 'province_state', 'postal_code', 'country'];
  if (requireEmail) required.push('email');
  for (const key of required) {
    if (!sanitizeString(addr[key])) errors[key] = 'Required';
  }
  if (addr.email) {
    const emailOk = /.+@.+\..+/.test(addr.email);
    if (!emailOk) errors.email = 'Invalid email';
  }
  if (addr.phone) {
    const phoneOk = /[\d\-\+()\s]{7,}/.test(addr.phone);
    if (!phoneOk) errors.phone = 'Invalid phone';
  }
  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { quoteId, billing, shipping } = req.body || {};
    if (!quoteId) return res.status(400).json({ error: 'quoteId is required' });

    const supabase = getSupabaseServerClient();

    // Validate billing
    const billingErrors = validateAddress(billing, { requireEmail: true });
    if (Object.keys(billingErrors).length) return res.status(400).json({ error: 'Invalid billing address', details: billingErrors });

    // Save billing (replace existing for quote/type)
    await supabase.from('addresses').delete().eq('quote_id', quoteId).eq('type', 'billing');
    const { data: billingData, error: billingErr } = await supabase
      .from('addresses')
      .insert([{ ...billing, type: 'billing', quote_id: quoteId }])
      .select('id')
      .single();
    if (billingErr) throw billingErr;

    let shippingId = null;
    if (shipping && Object.keys(shipping).length) {
      const shippingErrors = validateAddress(shipping);
      if (Object.keys(shippingErrors).length) return res.status(400).json({ error: 'Invalid shipping address', details: shippingErrors });
      await supabase.from('addresses').delete().eq('quote_id', quoteId).eq('type', 'shipping');
      const { data: shippingData, error: shipErr } = await supabase
        .from('addresses')
        .insert([{ ...shipping, type: 'shipping', quote_id: quoteId }])
        .select('id')
        .single();
      if (shipErr) throw shipErr;
      shippingId = shippingData?.id || null;
    } else {
      // If not provided, remove any existing shipping address
      await supabase.from('addresses').delete().eq('quote_id', quoteId).eq('type', 'shipping');
    }

    return res.status(200).json({ billingId: billingData?.id || null, shippingId });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
