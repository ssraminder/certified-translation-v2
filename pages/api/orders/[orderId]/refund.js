import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { sendEmail } from '../../../../lib/email';

export default async function handler(req, res) {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { amount, reason, notes, notifyCustomer } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ error: 'Missing amount or reason' });
    }

    const supabase = getSupabaseServerClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .eq('id', orderId)
      .select('*')
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get billing address for customer name
    const { data: billingAddress } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', order.billing_address_id)
      .single();

    // Create refund record
    const { data: refund, error: refundError } = await supabase
      .from('order_refunds')
      .insert([
        {
          order_id: orderId,
          amount,
          reason,
          notes,
          status: 'processed',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (refundError) throw refundError;

    // Update order amount paid
    const newAmountPaid = (order.amount_paid || 0) - amount;
    const { error: updateError } = await supabase
      .from('orders')
      .update({ amount_paid: newAmountPaid })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Send notification email if requested
    if (notifyCustomer) {
      const subject = `Refund Processed - Order ${order.order_number}`;
      const customerName = billingAddress?.full_name || 'Valued Customer';
      const html = `
        <h2>Refund Notification</h2>
        <p>Dear ${customerName},</p>
        <p>A refund of <strong>$${amount.toFixed(2)}</strong> has been processed.</p>
        <p>Reason: ${reason}</p>
        <p>The funds will appear in your account within 3-5 business days.</p>
      `;

      await sendEmail({
        to: order.customer_email,
        subject,
        html,
      });
    }

    // Log activity
    await supabase.from('order_activity').insert([
      {
        order_id: orderId,
        type: 'payment',
        description: `Refund processed for $${amount.toFixed(2)}`,
        metadata: { reason, amount },
        created_at: new Date().toISOString(),
      },
    ]);

    // Fetch updated order
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    return res.status(200).json({ order: updatedOrder, refund, message: 'Refund processed successfully' });
  } catch (err) {
    console.error('Refund error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
