import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { withPermission } from '../../../../lib/withAdminPage';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { status = 'pending' } = req.query;

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
        hitl_completed_at,
        quote_state
      `)
      .eq('hitl_required', true)
      .order('created_at', { ascending: false });

    if (status === 'pending') {
      query = query.is('hitl_assigned_at', null);
    } else if (status === 'assigned') {
      query = query.not('hitl_assigned_at', 'is', null).is('hitl_completed_at', null);
    }
    // 'all' uses no additional filter

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      quotes: data || []
    });
  } catch (err) {
    console.error('[admin/hitl/quotes] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch HITL quotes' });
  }
}

export default withPermission('hitl_quotes', 'view')(handler);
