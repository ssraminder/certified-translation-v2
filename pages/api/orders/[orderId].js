import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { getOrderWithDetails } from './create-from-quote';

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
