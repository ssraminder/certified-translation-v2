import crypto from 'crypto';
import { getSupabaseServerClient, hasServiceRoleKey } from '../../../lib/supabaseServer';
import { sendWelcomeEmail, sendQuoteSavedEmail } from '../../../lib/email';

function normalizeEmail(email){
  return String(email || '').trim().toLowerCase().slice(0, 255);
}

function splitName(full){
  const t = String(full || '').trim().replace(/\s+/g, ' ').split(' ');
  if (t.length === 0) return { first_name: 'Customer', last_name: '' };
  const first_name = t.shift();
  const last_name = t.join(' ');
  return { first_name, last_name };
}

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!hasServiceRoleKey()) {
      return res.status(500).json({ error: 'Server misconfigured: missing Supabase service role key' });
    }

    const { quote_id, full_name, email, phone, ordering_type, company_name, designation, frequency } = req.body || {};
    if (!quote_id) return res.status(400).json({ error: 'Missing quote_id' });
    const normEmail = normalizeEmail(email);
    if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) return res.status(400).json({ error: 'Invalid email' });

    const supabase = getSupabaseServerClient();

    const { data: existingUser, error: selErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .ilike('email', normEmail)
      .maybeSingle();
    if (selErr) throw selErr;

    const { first_name, last_name } = splitName(full_name);

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    let userId = null; let userCreated = false;
    if (existingUser) {
      userId = existingUser.id;
      const { error: updUserErr } = await supabase.from('users').update({
        first_name: first_name || existingUser.first_name,
        last_name: last_name || existingUser.last_name,
        phone: phone || null,
        company_name: company_name || null,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
      if (updUserErr) throw updUserErr;
    } else {
      const accountType = ordering_type === 'business' ? 'business' : 'individual';
      const { data: inserted, error: insErr } = await supabase.from('users').insert([
        {
          email: normEmail,
          first_name,
          last_name,
          phone: phone || null,
          company_name: company_name || null,
          account_type: accountType,
          account_creation_source: 'quote_flow',
          first_quote_id: quote_id,
          signup_ip: ip || null,
          signup_user_agent: userAgent || null
        }
      ]).select('id').single();
      if (insErr) throw insErr;
      userId = inserted.id;
      userCreated = true;
    }

    // Update quote_submissions
    const nowIso = new Date().toISOString();
    const updates = {
      user_id: userId,
      user_created_at_step2: userCreated,
      completion_percentage: 50,
      updated_at: nowIso,
      name: full_name,
      email: normEmail,
      phone: phone || null,
      ordering_type: ordering_type || null,
      company_name: ordering_type === 'business' ? (company_name || null) : null,
      designation: ordering_type === 'business' ? (designation || null) : null,
      frequency: ordering_type === 'business' ? (frequency || null) : null
    };
    const { error: updErr } = await supabase
      .from('quote_submissions')
      .update({ ...updates, quote_number: supabase.rpc ? undefined : undefined })
      .eq('quote_id', quote_id);
    if (updErr) throw updErr;

    // Ensure quote_number is set if missing
    const { data: qrow, error: qselErr } = await supabase.from('quote_submissions').select('id, quote_number').eq('quote_id', quote_id).maybeSingle();
    if (qselErr) throw qselErr;
    if (!qrow?.quote_number) {
      const { data: gen, error: rpcErr } = await supabase.rpc('generate_quote_number');
      if (rpcErr) throw rpcErr;
      const quote_number = gen || null;
      if (quote_number) {
        const { error: updNumErr } = await supabase.from('quote_submissions').update({ quote_number }).eq('quote_id', quote_id);
        if (updNumErr) throw updNumErr;
      }
    }

    // Log activity
    const { error: logErr } = await supabase.from('quote_activity_log').insert([
      { quote_id, event_type: 'step_completed', metadata: { step: 2, user_created: userCreated }, actor_type: 'user', actor_id: userId, ip: ip || null, user_agent: userAgent || null }
    ]);
    if (logErr) throw logErr;

    // Fetch final quote number
    const { data: qfinal, error: qfinErr } = await supabase.from('quote_submissions').select('quote_number').eq('quote_id', quote_id).maybeSingle();
    if (qfinErr) throw qfinErr;
    const quote_number = qfinal?.quote_number || '';

    // Emails
    if (userCreated) {
      // Create a magic link token for quick access in welcome email
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24*60*60*1000).toISOString();
      const { error: magicErr } = await supabase.from('magic_links').insert([
        {
          user_id: userId,
          user_type: 'customer',
          token,
          purpose: 'login',
          expires_at: expiresAt,
          metadata: { redirect_url: '/dashboard' }
        }
      ]);
      if (magicErr) throw magicErr;
      const details_html = `<p>You can access your account instantly using the button below, or continue to payment from your quote.</p>
      <div style="text-align:center;margin:18px 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/verify?token=${encodeURIComponent(token)}" style="display:inline-block;background:#00B8D4;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Access Your Account</a></div>
      <p>Your quote number is <strong>${quote_number}</strong>.</p>`;
      await sendWelcomeEmail({ email: normEmail, first_name, quote_number, details_html });
    } else {
      const details_html = `<p>Your quote number is <strong>${quote_number}</strong>. You can view all your quotes from your dashboard.</p>`;
      await sendQuoteSavedEmail({ email: normEmail, first_name, quote_number, details_html });
    }

    return res.status(200).json({ success: true, user_id: userId, user_created: userCreated, quote_number });
  } catch (err) {
    console.error('Error in link-user:', err);
    const message = err?.message || 'Unexpected error';
    return res.status(500).json({ error: message });
  }
}
