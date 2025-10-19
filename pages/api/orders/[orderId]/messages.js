import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

async function handler(req, res) {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  try {
    const supabase = getSupabaseServerClient();

    if (req.method === 'GET') {
      // Fetch messages for an order
      const { data: messages, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return res.status(200).json({ messages: messages || [] });
    } else if (req.method === 'POST') {
      // Create a new message
      const { text, isInternal, files } = req.body;

      if (!text && (!files || files.length === 0)) {
        return res.status(400).json({ error: 'Message text or files required' });
      }

      const { data: message, error } = await supabase
        .from('order_messages')
        .insert([
          {
            order_id: orderId,
            text,
            is_internal: isInternal || false,
            from_customer: false,
            read: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ message });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err) {
    console.error('Messages API error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
