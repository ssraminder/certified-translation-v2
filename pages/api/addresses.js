import { getSupabaseServerClient } from '../../lib/supabaseServer';
import { withApiBreadcrumbs } from '../../lib/sentry';
import { toE164, isValid as isPhoneValid } from '../../lib/formatters/phone';

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
    if (!isPhoneValid(addr.phone, addr.country)) errors.phone = 'Invalid phone';
  }
  return errors;
}

async function handler(req, res) {
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

    // Normalize phones to E.164
    const normalizedBilling = { ...billing, phone: billing.phone ? (toE164(billing.phone, billing.country) || null) : null };

    // Save billing (replace existing for quote/type)
    await supabase.from('addresses').delete().eq('quote_id', quoteId).eq('type', 'billing');
    const { data: billingData, error: billingErr } = await supabase
      .from('addresses')
      .insert([{ ...normalizedBilling, type: 'billing', quote_id: quoteId }])
      .select('id')
      .single();
    if (billingErr) throw billingErr;

    let shippingId = null;
    if (shipping && Object.keys(shipping).length) {
      const shippingErrors = validateAddress(shipping);
      if (Object.keys(shippingErrors).length) return res.status(400).json({ error: 'Invalid shipping address', details: shippingErrors });
      const normalizedShipping = { ...shipping, phone: shipping.phone ? (toE164(shipping.phone, shipping.country) || null) : null };
      await supabase.from('addresses').delete().eq('quote_id', quoteId).eq('type', 'shipping');
      const { data: shippingData, error: shipErr } = await supabase
        .from('addresses')
        .insert([{ ...normalizedShipping, type: 'shipping', quote_id: quoteId }])
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

export default withApiBreadcrumbs(handler);
