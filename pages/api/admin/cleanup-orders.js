import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { withPermission } from '../../../lib/withAdminPage';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();

    // Fields to reset to null
    const fieldsToReset = [
      'customer_name',
      'customer_email',
      'customer_phone',
      'service_type',
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
      'billing_address',
      'shipping_address',
      'translation_total',
      'certification_total',
      'delivery_total',
      'shipping_total',
      'subtotal',
      'tax_rate',
      'tax_total',
      'total',
      'discount_amount',
      'discount_type',
      'discount_reason',
    ];

    // Build update object
    const updateData = {};
    fieldsToReset.forEach(field => {
      updateData[field] = null;
    });
    updateData.updated_at = new Date().toISOString();

    // Fetch all orders first to show what's being cleaned
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No orders found to cleanup',
        cleaned: 0,
      });
    }

    // Update all orders
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .gt('id', '');

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: `Successfully reset fields on ${orders.length} orders`,
      cleaned: orders.length,
      orders: orders.map(o => ({ id: o.id, order_number: o.order_number })),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to cleanup orders',
    });
  }
}

export default withPermission('orders', 'edit')(handler);
