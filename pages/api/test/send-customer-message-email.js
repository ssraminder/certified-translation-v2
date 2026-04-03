import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { sendNewCustomerMessageEmail } from '../../../lib/email';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipient, order_id } = req.body || {};
    const supabase = getSupabaseServerClient();

    // Find an order to use for the test
    let order;
    if (order_id) {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_email')
        .eq(/^[0-9a-f]{8}-/.test(order_id) ? 'id' : 'order_number', order_id)
        .maybeSingle();
      order = data;
    } else {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_email')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      order = data;
    }

    if (!order) return res.status(404).json({ error: 'No order found' });

    const result = await sendNewCustomerMessageEmail({
      orderNumber: order.order_number,
      orderId: order.id,
      customerName: 'Nanayo Sasagasako',
      customerEmail: 'sasagasako.nanayo@gmail.com',
      messageText: 'Thank you for your drafts. I found some mistakes in all of them. Since they are all the same, I revised one of them. Please check the updated version. Also, my visa was not approved due to the absence of an official seal on the translation certificate. Could you please add your official seal to the document?',
    });

    return res.status(200).json({
      success: true,
      result,
      order_id: order.id,
      order_number: order.order_number,
      sent_to: recipient || 'admin default',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
