import { withApiBreadcrumbs } from '../../../../lib/sentry';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';

function parseCookies(cookieHeader){
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts){ const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

async function getAuthedUser(req){
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

async function handler(req, res){
  try {
    const auth = await getAuthedUser(req);
    if (auth.status) return res.status(auth.status).json({ error: auth.error });
    const { supabase, userId } = auth;

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id } = req.query;
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const [quote, documents, billing, shipping] = await Promise.all([
      order.quote_id ? supabase.from('quote_submissions').select('*').eq('quote_id', order.quote_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('quote_files').select('id, quote_id, order_id, file_id, filename, storage_path, storage_key, file_url, signed_url, bytes, content_type, status, file_url_expires_at, file_purpose, created_at').eq('order_id', order.id),
      order.billing_address_id ? supabase.from('addresses').select('*').eq('id', order.billing_address_id).maybeSingle() : Promise.resolve({ data: null }),
      order.shipping_address_id ? supabase.from('addresses').select('*').eq('id', order.shipping_address_id).maybeSingle() : Promise.resolve({ data: null })
    ]);

    // Regenerate signed URLs for files if expired
    const BUCKET = 'orders';
    const filesWithUrls = await Promise.all((documents.data || []).map(async (f) => {
      let url = f.file_url || f.signed_url || null;
      // Check if URL is expired or missing
      if ((!url || (f.file_url_expires_at && new Date(f.file_url_expires_at) < new Date())) && f.storage_path) {
        try {
          const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 3600);
          if (signed?.signedUrl) {
            url = signed.signedUrl;
          }
        } catch (err) {
          console.error('Failed to generate signed URL:', err);
        }
      }
      return { ...f, file_url: url };
    }));

    return res.status(200).json({
      order: {
        ...order,
        quote: quote.data || null,
        documents: filesWithUrls,
        billing_address: billing.data || null,
        shipping_address: shipping.data || null,
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
