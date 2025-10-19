import { getSupabaseServerClient } from './supabaseServer';

export const HITL_REASONS = {
  MANUALLY_REQUESTED: 'Customer requested human review on step-3',
  NO_DOCUMENTS: 'No billable documents found',
  ZERO_TOTAL: 'Automated calculation returned $0',
  BELOW_MINIMUM: 'Order below minimum threshold',
  N8N_FAILURE: 'N8N analysis failed or timed out',
  N8N_TIMEOUT: 'N8N analysis exceeded timeout',
  MISSING_QUOTE_DATA: 'Quote data not found or incomplete',
  ORDER_CREATION_FALLBACK: 'Order created with missing analysis data',
  ANALYSIS_NOT_FOUND: 'Quote analysis results not found',
  API_FAILURE: 'API failure during quote processing',
  UNKNOWN_ERROR: 'Unknown error during quote processing'
};

export async function invokeHitlForQuote(supabase, quoteId, reason) {
  if (!supabase || !quoteId || !reason) return false;
  
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('quote_submissions')
      .update({
        hitl_required: true,
        hitl_reason: reason,
        hitl_invoked_at: now,
        quote_state: 'under_review'
      })
      .eq('quote_id', quoteId);
    
    if (error) {
      console.error('Failed to invoke HITL:', error);
      return false;
    }
    
    console.log(`HITL invoked for quote ${quoteId}: ${reason}`);
    return true;
  } catch (err) {
    console.error('Error invoking HITL:', err);
    return false;
  }
}

export async function requestHitlReview(supabase, quoteId) {
  if (!supabase || !quoteId) return false;
  
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('quote_submissions')
      .update({
        hitl_required: true,
        hitl_reason: HITL_REASONS.MANUALLY_REQUESTED,
        hitl_requested_at: now,
        quote_state: 'under_review'
      })
      .eq('quote_id', quoteId);
    
    if (error) {
      console.error('Failed to request HITL review:', error);
      return false;
    }
    
    console.log(`HITL review requested for quote ${quoteId}`);
    return true;
  } catch (err) {
    console.error('Error requesting HITL review:', err);
    return false;
  }
}

export async function getHitlQuotes(supabase, filters = {}) {
  if (!supabase) return [];
  
  try {
    let query = supabase
      .from('quote_submissions')
      .select(`
        quote_id,
        quote_number,
        created_at,
        customer_first_name,
        customer_email,
        customer_phone,
        company_name,
        ordering_type,
        source_lang,
        target_lang,
        hitl_required,
        hitl_reason,
        hitl_invoked_at,
        hitl_requested_at,
        hitl_assigned_at,
        quote_state
      `)
      .eq('hitl_required', true);
    
    // Filter by status
    if (filters.status) {
      if (filters.status === 'pending') {
        query = query.is('hitl_assigned_at', null);
      } else if (filters.status === 'assigned') {
        query = query.not('hitl_assigned_at', 'is', null);
      }
    }
    
    // Filter by reason type
    if (filters.reasonType) {
      if (filters.reasonType === 'requested') {
        query = query.not('hitl_requested_at', 'is', null);
      } else if (filters.reasonType === 'invoked') {
        query = query.not('hitl_invoked_at', 'is', null);
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching HITL quotes:', err);
    return [];
  }
}

export async function assignHitlQuote(supabase, quoteId, adminId) {
  if (!supabase || !quoteId || !adminId) return false;
  
  try {
    const { error } = await supabase
      .from('quote_submissions')
      .update({
        hitl_assigned_at: new Date().toISOString(),
        hitl_assigned_to: adminId
      })
      .eq('quote_id', quoteId);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error assigning HITL quote:', err);
    return false;
  }
}

export async function completeHitlQuote(supabase, quoteId) {
  if (!supabase || !quoteId) return false;
  
  try {
    const { error } = await supabase
      .from('quote_submissions')
      .update({
        hitl_completed_at: new Date().toISOString(),
        hitl_required: false,
        quote_state: 'ready'
      })
      .eq('quote_id', quoteId);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error completing HITL quote:', err);
    return false;
  }
}
