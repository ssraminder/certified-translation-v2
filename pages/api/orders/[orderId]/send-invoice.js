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
    const { amount, scheduleMode, scheduledDate, includePaymentLink, sendCopyToAdmin } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Missing amount' });
    }

    const supabase = getSupabaseServerClient();

    // Get order details and billing address
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { data: billingAddress } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', order.billing_address_id)
      .single();

    // Send invoice email
    if (scheduleMode === 'now') {
      const subject = `Invoice - Order ${order.order_number}`;
      const customerName = billingAddress?.full_name || 'Valued Customer';
      const html = `
        <h2>Invoice for Order ${order.order_number}</h2>
        <p>Dear ${customerName},</p>
        <p>Amount Due: <strong>$${amount.toFixed(2)}</strong></p>
        ${includePaymentLink ? '<p><a href="#">Pay Now</a></p>' : ''}
      `;

      await sendEmail({
        to: order.customer_email,
        subject,
        html,
      });

      if (sendCopyToAdmin) {
        // Send copy to admin (implementation depends on your email setup)
      }
    }

    // Log activity
    await supabase.from('order_activity').insert([
      {
        order_id: orderId,
        type: 'communication',
        description: `Invoice sent for $${amount.toFixed(2)}`,
        created_at: new Date().toISOString(),
      },
    ]);

    return res.status(200).json({ order, message: 'Invoice sent successfully' });
  } catch (err) {
    console.error('Send invoice error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
