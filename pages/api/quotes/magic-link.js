import crypto from 'crypto';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';
import { withApiBreadcrumbs } from '../../../lib/sentry';

async function handler(req, res) {
  if (req.method === 'POST') {
    return generateMagicLink(req, res);
  } else if (req.method === 'GET') {
    return validateMagicLink(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function generateMagicLink(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { quote_id, email } = req.body;

    if (!quote_id || !email) {
      return res.status(400).json({ error: 'quote_id and email are required' });
    }

    // Get quote and expiry settings
    const { data: quote, error: quoteError } = await supabase
      .from('quote_submissions')
      .select('quote_id, email, user_id, quote_number')
      .eq('quote_id', quote_id)
      .maybeSingle();

    if (quoteError) throw quoteError;
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Get magic link expiry setting (default 30 days)
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'magic_link_expiry_days')
      .maybeSingle();

    const expiryDays = parseInt(settings?.setting_value || '30', 10);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    // Check if an unexpired magic link already exists for this quote
    const { data: existingLink } = await supabase
      .from('quote_ready_emails')
      .select('magic_link_token, magic_link_expires_at')
      .eq('quote_id', quote_id)
      .gt('magic_link_expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingLink) {
      // Return existing link if not expired
      return res.status(200).json({
        success: true,
        token: existingLink.magic_link_token,
        expiresAt: existingLink.magic_link_expires_at,
        isNew: false
      });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');

    // Store in quote_ready_emails table
    const { data: emailRecord, error: insertError } = await supabase
      .from('quote_ready_emails')
      .insert([{
        quote_id,
        recipient_email: email,
        magic_link_token: token,
        magic_link_expires_at: expiresAt
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(201).json({
      success: true,
      token,
      expiresAt,
      isNew: true
    });
  } catch (err) {
    console.error('Error generating magic link:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate magic link' });
  }
}

async function validateMagicLink(req, res) {
  try {
    const supabase = getSupabaseServerClient();
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find the magic link
    const { data: magicLink, error: linkError } = await supabase
      .from('quote_ready_emails')
      .select('quote_id, magic_link_expires_at, recipient_email')
      .eq('magic_link_token', token)
      .maybeSingle();

    if (linkError) throw linkError;
    if (!magicLink) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    // Check if expired
    const now = new Date().toISOString();
    if (magicLink.magic_link_expires_at < now) {
      return res.status(400).json({ error: 'Link has expired', expired: true });
    }

    // Get quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quote_submissions')
      .select('quote_id, quote_number, email, user_id')
      .eq('quote_id', magicLink.quote_id)
      .maybeSingle();

    if (quoteError) throw quoteError;
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Mark link as clicked
    await supabase
      .from('quote_ready_emails')
      .update({ clicked_link_at: now })
      .eq('magic_link_token', token);

    return res.status(200).json({
      success: true,
      quote_id: magicLink.quote_id,
      quote_number: quote.quote_number,
      email: magicLink.recipient_email,
      user_id: quote.user_id
    });
  } catch (err) {
    console.error('Error validating magic link:', err);
    return res.status(500).json({ error: err.message || 'Failed to validate link' });
  }
}

export default withApiBreadcrumbs(handler);
