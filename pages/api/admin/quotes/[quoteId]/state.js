import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { logAdminActivity } from '../../../../lib/activityLog';

const ALLOWED = new Set(['draft','pending','hitl_required','under_review','ready','sent','accepted','expired','converted','abandoned','open','archived']);

function canTransition(from, to){
  const f = String(from||'').toLowerCase();
  const t = String(to||'').toLowerCase();
  if (!ALLOWED.has(t)) return false;
  if (f === t) return true;
  const flow = ['draft','under_review','ready','sent'];
  if (flow.includes(f) && flow.includes(t)){
    const fi = flow.indexOf(f); const ti = flow.indexOf(t);
    // allow forward, and allow ready -> under_review
    return (ti >= fi) || (f==='ready' && t==='under_review');
  }
  // allow other admin-driven changes if meaningful
  const misc = new Set(['pending','hitl_required','accepted','expired','converted','abandoned','open','archived']);
  if (misc.has(t)) return true;
  return false;
}

async function handler(req, res){
  if (req.method !== 'PUT'){
    res.setHeader('Allow','PUT');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = getSupabaseServerClient();
  const { quoteId } = req.query;
  const { new_state } = req.body || {};
  if (!new_state) return res.status(400).json({ error: 'new_state required' });

  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  const from = q?.quote_state || 'draft';
  const to = String(new_state);
  if (!canTransition(from, to)) return res.status(400).json({ error: `Invalid transition ${from} -> ${to}` });

  const updates = {
    quote_state: to,
    state_changed_at: new Date().toISOString(),
    state_changed_by: req.admin?.id || null,
    last_edited_by: req.admin?.id || null,
    last_edited_at: new Date().toISOString()
  };

  const { data: updated, error } = await supabase
    .from('quote_submissions')
    .update(updates)
    .eq('quote_id', quoteId)
    .select('quote_id, quote_state')
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  await logAdminActivity({ action: 'quote_state_changed', actor_id: req.admin?.id || null, target_id: quoteId, details: { from, to } });
  return res.status(200).json({ success: true, quote: { quote_state: updated?.quote_state, can_edit: !['sent','accepted','converted'].includes(String(updated?.quote_state||'').toLowerCase()) } });
}

import { withPermission } from '../../../../lib/apiAdmin';
export default withPermission('quotes','edit')(handler);
