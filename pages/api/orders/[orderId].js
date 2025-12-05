import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { getOrderWithDetails } from './create-from-quote';

function roundToCents(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}

async function handleRushAdjustmentForUrgencyChange(supabase, orderId, oldUrgency, newUrgency) {
  if (!newUrgency || !supabase) return;

  if (oldUrgency === newUrgency) return;

  const isRushNew = ['rush', 'express'].includes(String(newUrgency || '').toLowerCase());
  const isRushOld = ['rush', 'express'].includes(String(oldUrgency || '').toLowerCase());

  if (isRushNew === isRushOld) return;

  const { data: order } = await supabase
    .from('orders')
    .select('quote_id, subtotal')
    .eq('id', orderId)
    .maybeSingle();

  if (!order?.quote_id) return;

  const { data: existingRushAdj } = await supabase
    .from('quote_adjustments')
    .select('id')
    .eq('quote_id', order.quote_id)
    .eq('type', 'surcharge')
    .ilike('description', '%rush%')
    .maybeSingle();

  const { data: settings } = await supabase
    .from('app_settings')
    .select('rush_percent')
    .maybeSingle();

  const rushPercent = Number(settings?.rush_percent || 0.30);

  if (isRushNew && !existingRushAdj) {
    const baseSubtotal = Number(order.subtotal || 0);
    const rushAmount = roundToCents(baseSubtotal * rushPercent);
    const rushPercentDisplay = Math.round(rushPercent * 100);

    try {
      await supabase.from('quote_adjustments').insert({
        quote_id: order.quote_id,
        type: 'surcharge',
        description: 'Rush Delivery Fee',
        discount_type: 'fixed',
        discount_value: 0,
        total_amount: rushAmount,
        is_taxable: true,
        notes: `${rushPercentDisplay}% rush fee applied by staff (urgency: ${newUrgency})`
      });
    } catch (err) {
      console.error('Failed to create rush adjustment:', err);
    }
  } else if (!isRushNew && existingRushAdj) {
    try {
      await supabase
        .from('quote_adjustments')
        .delete()
        .eq('id', existingRushAdj.id);
    } catch (err) {
      console.error('Failed to remove rush adjustment:', err);
    }
  }
}

async function handler(req, res) {
  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const supabase = getSupabaseServerClient();

    if (req.method === 'GET') {
      const order = await getOrderWithDetails(supabase, orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json({ order });
    }

    if (req.method === 'PATCH') {
      const updates = req.body;

      // Build updateable fields
      const updateData = {};
      const allowedFields = [
        'translation_total',
        'certification_total',
        'delivery_total',
        'shipping_total',
        'discount_amount',
        'discount_type',
        'discount_reason',
        'source_language',
        'target_language',
        'document_type',
        'page_count',
        'word_count',
        'urgency',
        'due_date',
        'project_status',
        'special_instructions',
        'internal_notes',
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Fetch updated order
      const order = await getOrderWithDetails(supabase, orderId);
      return res.status(200).json({ order });
    }

    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
