import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { withPermission } from '../../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';

async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { quoteId } = req.query;
  const supabase = getSupabaseServerClient();

  const { data: quote } = await supabase
    .from('quote_submissions')
    .select('*, quote_results(*)')
    .eq('quote_id', quoteId)
    .maybeSingle();
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const [{ data: files }, { data: activity }, { data: assignedAdmin }, { data: subOrders }] = await Promise.all([
    supabase.from('quote_files').select('*').eq('quote_id', quoteId),
    supabase.from('quote_activity_log').select('*').eq('quote_id', quoteId).order('created_at', { ascending: false }).limit(50),
    quote.hitl_assigned_to_admin_id ? supabase.from('admin_users').select('id, first_name, last_name, email').eq('id', quote.hitl_assigned_to_admin_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('quote_sub_orders').select('id, filename, doc_type, billable_pages, unit_rate, unit_rate_override, override_reason, certification_amount, certification_type_name, line_total, total_pages, source_language, target_language').eq('quote_id', quoteId).order('id')
  ]);

  const results = Array.isArray(quote.quote_results) && quote.quote_results.length ? quote.quote_results[0] : null;

  const response = {
    id: quote.quote_id,
    quote_number: quote.quote_number || quote.quote_id,
    customer: { name: quote.name, email: quote.email, phone: quote.phone, company: quote.company_name, country: quote.country_of_issue },
    details: {
      submitted_at: quote.created_at,
      job_id: quote.job_id,
      source_language: quote.source_lang,
      source_code: quote.source_code || null,
      target_language: quote.target_lang,
      target_code: quote.target_code || null,
      intended_use_id: quote.intended_use_id || null,
      intended_use: quote.intended_use,
      certification_type: quote.cert_type_name,
      certification_amount: quote.cert_type_amount || null,
      country: quote.country_of_issue,
      timeline: {
        submitted_at: quote.created_at,
        hitl_requested_at: quote.hitl_requested_at,
        hitl_assigned_at: quote.hitl_assigned_at,
        hitl_assigned_to: assignedAdmin ? ((assignedAdmin.first_name && assignedAdmin.last_name) ? `${assignedAdmin.first_name} ${assignedAdmin.last_name}` : (assignedAdmin.email || assignedAdmin.id)) : null,
        hitl_completed_at: quote.hitl_completed_at,
      }
    },
    documents: (files||[]).map(f => ({ id: f.id, filename: f.filename, content_type: f.content_type, bytes: f.bytes, url: f.file_url || f.signed_url || null })),
    line_items: (subOrders||[]).map(it => ({
      id: it.id,
      filename: it.filename,
      doc_type: it.doc_type,
      billable_pages: it.billable_pages,
      unit_rate: it.unit_rate,
      unit_rate_override: it.unit_rate_override,
      override_reason: it.override_reason,
      certification_amount: it.certification_amount,
      certification_type_name: it.certification_type_name,
      line_total: it.line_total,
      total_pages: it.total_pages,
      source_language: it.source_language,
      target_language: it.target_language,
    })),
    n8n: {
      status: quote.n8n_status || null,
      analysis: quote.n8n_analysis_result || null,
    },
    quote_results: results ? {
      subtotal: results.subtotal,
      tax: results.tax,
      total: results.total,
      shipping_total: results.shipping_total,
      currency: results.currency || 'CAD',
      results_json: results.results_json || null,
    } : null,
    activity_log: activity || [],
    assignment: {
      admin_id: quote.hitl_assigned_to_admin_id || null,
      assigned_at: quote.hitl_assigned_at || null,
    },
    hitl: {
      required: !!quote.hitl_required,
      reason: quote.hitl_reason || null,
      state: quote.quote_state || null,
    }
  };

  return res.status(200).json(response);
}

export default withApiBreadcrumbs(withPermission('hitl_quotes','view')(handler));
