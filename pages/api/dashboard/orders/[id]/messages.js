import { withApiBreadcrumbs } from '../../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../../lib/supabaseServer';
import { sendNewCustomerMessageEmail } from '../../../../../lib/email';

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [k, ...v] = p.trim().split('=');
    out[k] = decodeURIComponent(v.join('='));
  }
  return out;
}

async function getAuthedUser(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies['session_token'];
  if (!token) return { status: 401, error: 'Unauthorized' };
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data: session } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_token', token)
    .gt('expires_at', nowIso)
    .maybeSingle();
  if (!session || session.user_type !== 'customer') return { status: 401, error: 'Invalid session' };
  return { supabase, userId: session.user_id };
}

async function handler(req, res) {
  try {
    const auth = await getAuthedUser(req);
    if (auth.status) return res.status(auth.status).json({ error: auth.error });
    const { supabase, userId } = auth;

    const { id: orderId } = req.query;

    // Verify the order belongs to this customer
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, user_id, customer_email')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (req.method === 'GET') {
      const { data: messages, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ messages: messages || [] });

    } else if (req.method === 'POST') {
      const { text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Message text is required' });
      }

      const { data: message, error } = await supabase
        .from('order_messages')
        .insert([{
          order_id: orderId,
          text: text.trim(),
          from_customer: true,
          is_internal: false,
          read: false,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Look up customer name for the email notification
      const { data: customer } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .maybeSingle();

      const customerName = customer
        ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email
        : order.customer_email || 'Customer';
      const customerEmail = customer?.email || order.customer_email || '';

      // Send admin notification email (non-blocking)
      sendNewCustomerMessageEmail({
        orderNumber: order.order_number,
        orderId: order.id,
        customerName,
        customerEmail,
        messageText: text.trim(),
      }).catch(err => console.error('Failed to send admin notification:', err));

      return res.status(201).json({ message });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('Customer messages API error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
