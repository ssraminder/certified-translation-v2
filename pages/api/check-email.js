import { withApiBreadcrumbs } from '../../lib/sentry';
import { getSupabaseServerClient } from '../../lib/supabaseServer';

function normalizeEmail(email){
  return String(email || '').trim().toLowerCase().slice(0, 255);
}

async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email } = req.body || {};
    const norm = normalizeEmail(email);
    if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    const supabase = getSupabaseServerClient();

    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .ilike('email', norm)
      .maybeSingle();

    let quote_count = 0;
    if (user) {
      const { count } = await supabase
        .from('quote_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('email', user.email);
      quote_count = count || 0;
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, email, first_name, last_name, role')
      .ilike('email', norm)
      .maybeSingle();

    if (admin) {
      return res.status(200).json({ exists: true, user_type: 'admin', first_name: admin.first_name || null, role: admin.role || null });
    }
    if (user) {
      return res.status(200).json({ exists: true, user_type: 'customer', first_name: user.first_name || null, quote_count });
    }
    return res.status(200).json({ exists: false });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
