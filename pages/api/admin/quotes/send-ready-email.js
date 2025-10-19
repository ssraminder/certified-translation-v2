import { withPermission } from '../../../../lib/apiAdmin';
import { getSupabaseServerClient } from '../../../../lib/supabaseServer';
import { sendQuoteReadyEmail } from '../../../../lib/email';
import crypto from 'crypto';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { quote_id, recipient_email } = req.body;

    if (!quote_id || !recipient_email) {
      return res.status(400).json({ error: 'quote_id and recipient_email are required' });
    }

    // Get quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quote_submissions')
      .select('quote_id, quote_number, source_lang, target_lang, certification_type_name')
      .eq('quote_id', quote_id)
      .maybeSingle();

    if (quoteError) throw quoteError;
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Get quote results and pricing
    const { data: quoteResults, error: resultsError } = await supabase
      .from('quote_results')
      .select('*')
      .eq('quote_id', quote_id)
      .maybeSingle();

    if (resultsError) throw resultsError;
    if (!quoteResults) return res.status(404).json({ error: 'Quote results not found' });

    // Get line items
    const { data: lineItems, error: itemsError } = await supabase
      .from('quote_sub_orders')
      .select('filename, billable_pages, line_total, unit_rate')
      .eq('quote_id', quote_id);

    if (itemsError) throw itemsError;

    // Get app settings
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value');

    const settings = {};
    (settingsData || []).forEach(s => {
      settings[s.setting_key] = { value: s.setting_value };
    });

    // Get location business hours if location_id exists
    let businessHours = [];
    if (quoteResults.location_id) {
      const { data: hours } = await supabase
        .from('location_business_hours')
        .select('day_of_week, is_closed, opening_time, closing_time')
        .eq('location_id', quoteResults.location_id)
        .order('day_of_week');

      businessHours = (hours || []).map((h, idx) => ({
        day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][h.day_of_week],
        closed: h.is_closed,
        opening: h.opening_time,
        closing: h.closing_time
      }));
    }

    // Get file count and page count
    const { data: files } = await supabase
      .from('quote_files')
      .select('id')
      .eq('quote_id', quote_id);

    const { data: quoteLines } = await supabase
      .from('quote_sub_orders')
      .select('billable_pages')
      .eq('quote_id', quote_id);

    const totalPages = (quoteLines || []).reduce((sum, line) => sum + (line.billable_pages || 0), 0);

    // Check for upcoming holidays
    let upcomingHoliday = null;
    if (quoteResults.location_id && quoteResults.quote_expires_at) {
      const today = new Date().toISOString().split('T')[0];
      const { data: holidays } = await supabase
        .from('company_holidays')
        .select('holiday_name, holiday_date')
        .eq('location_id', quoteResults.location_id)
        .gte('holiday_date', today)
        .lte('holiday_date', quoteResults.quote_expires_at)
        .order('holiday_date')
        .limit(1);

      if (holidays && holidays.length > 0) {
        upcomingHoliday = {
          name: holidays[0].holiday_name,
          date: new Date(holidays[0].holiday_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
      }
    }

    // Generate magic link
    const token = crypto.randomBytes(32).toString('hex');
    const expiryDays = parseInt(settings.magic_link_expiry_days?.value || '30', 10);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    // Check for existing unexpired link
    const { data: existingLink } = await supabase
      .from('quote_ready_emails')
      .select('magic_link_token')
      .eq('quote_id', quote_id)
      .gt('magic_link_expires_at', new Date().toISOString())
      .maybeSingle();

    let finalToken = token;
    if (existingLink) {
      finalToken = existingLink.magic_link_token;
    } else {
      // Insert new magic link
      const { error: insertError } = await supabase
        .from('quote_ready_emails')
        .insert([{
          quote_id,
          recipient_email,
          magic_link_token: token,
          magic_link_expires_at: expiresAt,
          created_by_admin_id: req.admin.id
        }]);

      if (insertError) throw insertError;
    }

    // Get site URL from env
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cethos-v5.netlify.app';
    const viewQuoteUrl = `${siteUrl}/quotes/view?token=${encodeURIComponent(finalToken)}`;

    // Prepare quote data for email
    const quoteEmailData = {
      quote_id,
      languages: `${quote.source_lang} to ${quote.target_lang}`,
      document_count: files?.length || 0,
      page_count: totalPages,
      certification_type: quote.certification_type_name || '',
      lineItems: (lineItems || []).map(item => ({
        description: item.filename,
        pages: item.billable_pages,
        total: item.line_total
      })),
      subtotal: quoteResults.subtotal,
      tax: quoteResults.tax,
      total: quoteResults.total,
      estimated_delivery_date: quoteResults.delivery_estimate_text,
      quote_expires_at: quoteResults.quote_expires_at,
      businessHours,
      upcomingHoliday
    };

    // Send email
    const emailResult = await sendQuoteReadyEmail({
      email: recipient_email,
      first_name: quote.customer_first_name || 'Customer',
      quote_number: quote.quote_number,
      quoteData: quoteEmailData,
      viewQuoteUrl,
      settings
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error?.message || 'Failed to send email');
    }

    // Log activity
    await supabase.from('quote_activity_log').insert([{
      quote_id,
      event_type: 'quote_ready_email_sent',
      metadata: { recipient_email, token: finalToken },
      actor_type: 'admin',
      actor_id: req.admin.id,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null
    }]);

    return res.status(200).json({
      success: true,
      message: 'Quote ready email sent',
      token: finalToken,
      expiresAt,
      viewQuoteUrl
    });
  } catch (err) {
    console.error('Error sending quote ready email:', err);
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
}

export default withPermission('quotes', 'edit')(handler);
