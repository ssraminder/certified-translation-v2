import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function parseCookies(cookieHeader) {
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts) { const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'GET') return handleGetQuote(req, res, id);
  if (req.method === 'DELETE') return handleDeleteQuote(req, res, id);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetQuote(req, res, quoteId) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies['session_token'];
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session) return res.status(401).json({ error: 'Invalid session' });

    const { data: quote, error } = await supabase
      .from('quote_submissions')
      .select(`*, quote_results(*)`)
      .eq('quote_id', quoteId)
      .eq('user_id', session.user_id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    const { data: quoteFiles } = await supabase
      .from('quote_files')
      .select('*')
      .eq('quote_id', quoteId);

    const { data: activityLog } = await supabase
      .from('quote_activity_log')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: subOrders } = await supabase
      .from('quote_sub_orders')
      .select('*')
      .eq('quote_id', quoteId);

    let daysUntilExpiry = null;
    if (quote.expires_at) {
      const now = new Date();
      const expiryDate = new Date(quote.expires_at);
      const diffTime = expiryDate - now;
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    let lineItems = [];
    let pricing = null;

    // Build line items from sub-orders first; fallback to results_json if needed
    if (Array.isArray(subOrders) && subOrders.length > 0) {
      lineItems = subOrders.map((so) => ({
        id: so.id,
        description: `${so.doc_type || 'Document'} - ${so.filename || 'Document'}`,
        pages: so.billable_pages,
        unit_rate: so.unit_rate,
        line_total: so.line_total,
        certification: so.certification_amount || 0,
        filename: so.filename,
        doc_type: so.doc_type,
        certification_type_name: so.certification_type_name,
        total_pages: so.total_pages,
        source_language: so.source_language,
        target_language: so.target_language,
      }));
    } else if (Array.isArray(quote.quote_results) && quote.quote_results.length > 0) {
      const resultsJson = quote.quote_results[0]?.results_json || null;
      if (Array.isArray(resultsJson?.lineItems)) {
        lineItems = resultsJson.lineItems;
      } else if (Array.isArray(resultsJson?.sub_orders)) {
        lineItems = resultsJson.sub_orders;
      }
    }

    // Build pricing if we have stored totals or snapshot
    if (Array.isArray(quote.quote_results) && quote.quote_results.length > 0) {
      const resultsJson = quote.quote_results[0]?.results_json || null;
      pricing = {
        subtotal: quote.quote_results[0].subtotal ?? (resultsJson?.pricing?.subtotal ?? null),
        tax: quote.quote_results[0].tax ?? (resultsJson?.pricing?.tax ?? null),
        taxRate: resultsJson?.pricing?.taxRate ?? 0,
        total: quote.quote_results[0].total ?? (resultsJson?.pricing?.total ?? null),
        shipping: quote.quote_results[0].shipping_total ?? 0,
      };
    }

    let lastCompletedStep = quote.last_completed_step || 1;
    if (!quote.last_completed_step) {
      const pct = Number(quote.completion_percentage || 0);
      if (pct >= 75) lastCompletedStep = 4;
      else if (pct >= 50) lastCompletedStep = 3;
      else if (pct >= 25) lastCompletedStep = 2;
    }

    const hasPricing = !!pricing;
    const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0;

    const enhancedQuote = {
      id: quote.quote_id,
      quote_number: quote.quote_number,
      quote_state: quote.quote_state,
      source_language: quote.source_lang,
      target_language: quote.target_lang,
      name: quote.name,
      email: quote.email,
      phone: quote.phone,
      company_name: quote.company_name,
      ordering_type: quote.ordering_type,
      intended_use: quote.intended_use,
      intended_use_id: quote.intended_use_id,
      intended_use_name: quote.intended_use,
      country_of_issue: quote.country_of_issue,
      certification_type_code: quote.cert_type_code,
      certification_type_name: quote.cert_type_name,
      hitl_required: quote.hitl_required,
      hitl_reason: quote.hitl_reason,
      hitl_requested_at: quote.hitl_requested_at,
      hitl_assigned_to: quote.hitl_assigned_to,
      hitl_assigned_at: quote.hitl_assigned_at,
      hitl_completed_at: quote.hitl_completed_at,
      hitl_estimated_completion: quote.hitl_estimated_completion,
      hitl_notes: quote.hitl_notes,
      hitl_user_message: quote.hitl_user_message,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      expires_at: quote.expires_at,
      sent_at: quote.sent_at,
      converted_at: quote.converted_at,
      last_accessed_at: quote.last_accessed_at,
      completion_percentage: quote.completion_percentage,
      last_completed_step: lastCompletedStep,
      currency: (Array.isArray(quote.quote_results) && quote.quote_results[0]?.currency) || 'CAD',
      quote_results: (hasPricing || hasLineItems) ? { line_items: lineItems, pricing } : null,
      documents: (quoteFiles || []).map((file) => ({
        id: file.id,
        original_filename: file.filename,
        file_url: file.file_url || file.signed_url,
        file_size: file.bytes,
        content_type: file.content_type,
        uploaded_at: file.uploaded_at,
      })),
      activity_log: activityLog || [],
      days_until_expiry: daysUntilExpiry,
      order_id: (Array.isArray(quote.quote_results) && quote.quote_results[0]?.converted_to_order_id) || null,
      delivery_option: quote.delivery_option,
      delivery_date: quote.delivery_date,
    };

    return res.status(200).json(enhancedQuote);
  } catch (err) {
    console.error('Quote detail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDeleteQuote(req, res, quoteId) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies['session_token'];
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session) return res.status(401).json({ error: 'Invalid session' });

    const { data: quote } = await supabase
      .from('quote_submissions')
      .select('quote_id, user_id')
      .eq('quote_id', quoteId)
      .eq('user_id', session.user_id)
      .maybeSingle();

    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    const { error: updErr } = await supabase
      .from('quote_submissions')
      .update({ archived_at: new Date().toISOString(), quote_state: 'archived' })
      .eq('quote_id', quoteId);

    if (updErr) return res.status(500).json({ error: updErr.message });

    await supabase
      .from('quote_activity_log')
      .insert({ quote_id: quoteId, event_type: 'deleted', actor_type: 'user', actor_id: session.user_id });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete quote error:', err);
    return res.status(500).json({ error: 'Failed to delete quote' });
  }
}

export default withApiBreadcrumbs(handler);
