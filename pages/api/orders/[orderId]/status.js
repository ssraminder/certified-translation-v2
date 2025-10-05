import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

const VALID_TRANSITIONS = {
  pending_payment: ['paid', 'payment_failed', 'cancelled'],
  paid: ['processing', 'refunded'],
  processing: ['in_translation'],
  in_translation: ['in_qa'],
  in_qa: ['ready_for_delivery'],
  ready_for_delivery: ['delivered'],
  delivered: ['completed']
};

async function handler(req, res) {
  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { status, payment_status, notes, changed_by_user_id } = req.body || {};
    const supabase = getSupabaseServerClient();

    const { data: current, error: curErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (curErr) throw curErr;
    if (!current) return res.status(404).json({ error: 'Order not found' });

    if (status) {
      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Invalid status transition from ${current.status} to ${status}` });
      }
    }

    const update = { updated_at: new Date().toISOString() };
    if (status) update.status = status;
    if (payment_status) update.payment_status = payment_status;
    if (status === 'paid') update.paid_at = new Date().toISOString();
    if (status === 'processing') update.started_at = new Date().toISOString();
    if (status === 'delivered') update.delivered_at = new Date().toISOString();
    if (status === 'completed') update.completed_at = new Date().toISOString();

    const { error: updErr } = await supabase
      .from('orders')
      .update(update)
      .eq('id', orderId);
    if (updErr) throw updErr;

    if (status) {
      const hist = {
        order_id: orderId,
        from_status: current.status,
        to_status: status,
        changed_by_user_id: changed_by_user_id || null,
        changed_by_type: changed_by_user_id ? 'admin' : 'system',
        notes: notes || null
      };
      await supabase.from('order_status_history').insert([hist]);
    }

    const { data: updated, error: readErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (readErr) throw readErr;

    return res.status(200).json({ success: true, order: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
