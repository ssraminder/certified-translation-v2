import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

const GST_RATE = 0.05;

function round2(v){ return Math.round(Number(v||0)*100)/100; }

async function handler(req, res){
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const body = req.body || {};
  const {
    billable_pages,
    source_language_id,
    target_language_id,
    custom_language,
    certification_type_id,
    intended_use_id,
    country,
    delivery_option,
    status
  } = body;

  if (!billable_pages || Number(billable_pages) <= 0) return res.status(400).json({ error: 'billable_pages is required and must be > 0' });

  const supabase = getSupabaseServerClient();

  // Fetch base rate and rush percent
  const { data: settings } = await supabase.from('app_settings').select('base_rate, rush_percent').limit(1).maybeSingle();
  const baseRate = Number(settings?.base_rate || 80);
  const rushPercent = Number(settings?.rush_percent || 40);

  // Fetch certification price (if any)
  let certificationAmount = 0;
  if (intended_use_id) {
    const { data: intended } = await supabase.from('intended_uses').select('id, certification_price').eq('id', intended_use_id).maybeSingle();
    if (intended && Number.isFinite(Number(intended.certification_price))) certificationAmount = Number(intended.certification_price);
  }

  const pages = Number(billable_pages);
  const translation = round2(pages * baseRate);
  const certification = round2(certificationAmount);
  const subtotal = round2(translation + certification);
  const tax = round2(subtotal * GST_RATE);
  const total = round2(subtotal + tax);

  const results_json = {
    analysis: 'hitl_manual',
    billable_pages: pages,
    pricing: { translation, certification, subtotal, tax, total, taxRate: GST_RATE },
    delivery: { option: delivery_option || 'standard', rushPercent },
    selections: { source_language_id, target_language_id, custom_language, certification_type_id, intended_use_id, country }
  };

  // Upsert quote_results
  const upsert = {
    quote_id: quoteId,
    subtotal,
    tax,
    total,
    shipping_total: 0,
    currency: 'CAD',
    results_json
  };
  const { error: upErr } = await supabase.from('quote_results').upsert(upsert, { onConflict: 'quote_id' });
  if (upErr) return res.status(500).json({ error: upErr.message });

  // Update quote submission fields
  const updates = {
    country_of_issue: country || null,
    quote_state: status === 'send' ? 'sent' : 'in_progress',
    hitl_required: true,
    updated_at: new Date().toISOString()
  };
  if (custom_language) updates.target_lang = custom_language;
  const { error: updQ } = await supabase.from('quote_submissions').update(updates).eq('quote_id', quoteId);
  if (updQ) return res.status(500).json({ error: updQ.message });

  // If sending to customer, mark completed and email
  if (status === 'send') {
    const { data: quote } = await supabase.from('quote_submissions').select('quote_number, name, email').eq('quote_id', quoteId).maybeSingle();
    const { sendHitlQuoteReadyEmail } = await import('../../../../../lib/email');
    try { await sendHitlQuoteReadyEmail({ email: quote?.email, first_name: quote?.name, quote_number: quote?.quote_number || quoteId, pricing: { translation, certification, subtotal, tax, total } }); } catch {}
    await supabase.from('quote_submissions').update({ hitl_completed_at: new Date().toISOString(), hitl_completed_by_admin_id: req.admin?.id || null }).eq('quote_id', quoteId);
  }

  return res.status(200).json({ success: true, pricing: { translation, certification, subtotal, tax, total } });
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','edit')(handler));
