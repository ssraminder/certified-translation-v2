function simpleEscape(str) {
  return String(str || '').replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

export function generateQuoteReadyHTML({
  logoUrl,
  companyName,
  companyEmail,
  companyPhone,
  businessHours,
  firstName,
  quoteNumber,
  estimatedDelivery,
  quoteExpires,
  languages,
  documentCount,
  pageCount,
  certifications,
  lineItems,
  subtotal,
  tax,
  total,
  viewQuoteUrl,
  upcomingHoliday
}) {
  const currency = 'CAD';
  
  const lineItemsHTML = (lineItems || []).map(item => `
    <tr>
      <td style="padding:12px; border-bottom:1px solid #e6ecf1; text-align:left;">
        <strong style="color:#111;">${simpleEscape(item.description || item.filename || 'Document')}</strong>
        <br><small style="color:#666;">${simpleEscape(item.pages || '')} pages • ${simpleEscape(item.languages || '')}</small>
      </td>
      <td style="padding:12px; border-bottom:1px solid #e6ecf1; text-align:right; color:#666;">
        $${Number(item.total || 0).toFixed(2)} ${currency}
      </td>
    </tr>
  `).join('');

  const businessHoursHTML = businessHours ? businessHours.map(h => `
    <p style="margin:4px 0; color:#666; font-size:14px;">
      <strong>${h.day}:</strong> ${h.closed ? 'Closed' : `${h.opening} - ${h.closing}`}
    </p>
  `).join('') : '';

  const upcomingHolidayHTML = upcomingHoliday ? `
    <div style="background:#fff3cd; border-left:4px solid #ffc107; padding:12px 16px; margin:16px 0; border-radius:4px;">
      <p style="margin:0; color:#856404; font-size:14px;">
        <strong>Note:</strong> ${simpleEscape(upcomingHoliday.name)} on ${upcomingHoliday.date} may affect delivery timeline.
      </p>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote is Ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; line-height:1.6; color:#333; background:#f6f9fc; margin:0; padding:0;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <!-- Header -->
    <div style="background:#fff; border-radius:10px; border:1px solid #e6ecf1; overflow:hidden;">
      
      <!-- Logo Section -->
      ${logoUrl ? `
      <div style="background:linear-gradient(135deg, #00a8cc 0%, #008ba3 100%); padding:20px; text-align:center;">
        <img src="${logoUrl}" alt="${simpleEscape(companyName || 'Company Logo')}" style="max-height:50px; width:auto; margin:0 auto;" />
      </div>
      ` : `
      <div style="background:linear-gradient(135deg, #00a8cc 0%, #008ba3 100%); padding:20px; text-align:center;">
        <h1 style="margin:0; color:#fff; font-size:24px; font-weight:700;">${simpleEscape(companyName || 'Cethos Translation Services')}</h1>
      </div>
      `}

      <!-- Content -->
      <div style="padding:28px;">
        <h1 style="margin:0 0 8px; color:#111; font-size:28px; font-weight:700;">Your Quote is Ready</h1>
        <p style="margin:8px 0 20px; color:#666; font-size:16px;">Hi ${simpleEscape(firstName || 'there')},</p>
        
        <p style="color:#555; margin:16px 0;">Your quote has been prepared and is ready for review. Below you'll find the complete quote details and next steps.</p>

        <!-- Quote Summary -->
        <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:20px 0;">
          <h2 style="margin:0 0 12px; color:#111; font-size:16px; font-weight:600;">Quote Summary</h2>
          <table style="width:100%; font-size:14px;">
            <tr>
              <td style="padding:6px 0; color:#666;"><strong>Quote Number:</strong></td>
              <td style="padding:6px 0; text-align:right; color:#00a8cc; font-weight:600;">${simpleEscape(quoteNumber || '')}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#666;"><strong>Languages:</strong></td>
              <td style="padding:6px 0; text-align:right;">${simpleEscape(languages || '')}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#666;"><strong>Documents:</strong></td>
              <td style="padding:6px 0; text-align:right;">${documentCount || 0} document(s)</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#666;"><strong>Total Pages:</strong></td>
              <td style="padding:6px 0; text-align:right;">${pageCount || 0} page(s)</td>
            </tr>
            ${certifications ? `
            <tr>
              <td style="padding:6px 0; color:#666;"><strong>Certification:</strong></td>
              <td style="padding:6px 0; text-align:right;">${simpleEscape(certifications)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding:6px 0; color:#666;"><strong>Estimated Delivery:</strong></td>
              <td style="padding:6px 0; text-align:right; color:#008ba3; font-weight:600;">${simpleEscape(estimatedDelivery || '')}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#666;"><strong>Quote Expires:</strong></td>
              <td style="padding:6px 0; text-align:right; color:#d9534f;">${simpleEscape(quoteExpires || '')}</td>
            </tr>
          </table>
        </div>

        <!-- Line Items / Pricing -->
        <div style="margin:20px 0;">
          <h2 style="margin:0 0 12px; color:#111; font-size:16px; font-weight:600;">Pricing Breakdown</h2>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            ${lineItemsHTML}
            <tr>
              <td style="padding:12px; text-align:left; font-weight:600; color:#111;">Subtotal</td>
              <td style="padding:12px; text-align:right; font-weight:600; color:#111;">$${Number(subtotal || 0).toFixed(2)} ${currency}</td>
            </tr>
            <tr>
              <td style="padding:12px; text-align:left; color:#666;">Tax (5% GST)</td>
              <td style="padding:12px; text-align:right; color:#666;">$${Number(tax || 0).toFixed(2)} ${currency}</td>
            </tr>
            <tr style="background:#f8f9fa; border-top:2px solid #00a8cc;">
              <td style="padding:16px 12px; text-align:left; font-weight:700; color:#111; font-size:16px;">Total</td>
              <td style="padding:16px 12px; text-align:right; font-weight:700; color:#00a8cc; font-size:16px;">$${Number(total || 0).toFixed(2)} ${currency}</td>
            </tr>
          </table>
        </div>

        <!-- Holiday Notice -->
        ${upcomingHolidayHTML}

        <!-- Next Steps -->
        <div style="background:#f0f8ff; border-radius:8px; padding:16px; margin:20px 0; border-left:4px solid #00a8cc;">
          <h3 style="margin:0 0 12px; color:#00a8cc; font-weight:600; font-size:14px;">What Happens Next</h3>
          <ol style="margin:0; padding-left:20px; color:#555; font-size:14px;">
            <li style="margin:6px 0;">Review your complete quote details by clicking the button below</li>
            <li style="margin:6px 0;">Proceed to checkout when you're ready</li>
            <li style="margin:6px 0;">Our team will begin working on your translation immediately after payment confirmation</li>
            <li style="margin:6px 0;">You can reach out to us anytime if you have questions</li>
          </ol>
        </div>

        <!-- View Quote Button -->
        <div style="text-align:center; margin:28px 0;">
          <a href="${viewQuoteUrl}" style="display:inline-block; background:#00a8cc; color:#fff; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:700; font-size:16px; text-transform:uppercase; letter-spacing:0.5px;">View Quote</a>
        </div>

        <!-- Contact Information -->
        <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:20px 0;">
          <h3 style="margin:0 0 12px; color:#111; font-weight:600; font-size:14px;">Need Help?</h3>
          <p style="margin:8px 0; font-size:14px; color:#555;">
            <strong>Email:</strong> <a href="mailto:${companyEmail}" style="color:#00a8cc; text-decoration:none;">${simpleEscape(companyEmail)}</a>
          </p>
          <p style="margin:8px 0; font-size:14px; color:#555;">
            <strong>Phone:</strong> <a href="tel:${companyPhone}" style="color:#00a8cc; text-decoration:none;">${simpleEscape(companyPhone)}</a>
          </p>
          ${businessHoursHTML ? `
          <p style="margin:12px 0 0; font-size:14px; color:#555;"><strong>Business Hours:</strong></p>
          ${businessHoursHTML}
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center; margin-top:24px; padding-top:16px; border-top:1px solid #e6ecf1;">
      <p style="margin:8px 0; font-size:12px; color:#999;">© ${new Date().getFullYear()} ${simpleEscape(companyName || 'Cethos Translation Services')}. All rights reserved.</p>
      <p style="margin:4px 0; font-size:12px; color:#999;">This is a transactional email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>`;
}

export function generateQuoteReadyText({
  firstName,
  quoteNumber,
  estimatedDelivery,
  quoteExpires,
  languages,
  documentCount,
  pageCount,
  certifications,
  subtotal,
  tax,
  total,
  viewQuoteUrl,
  companyEmail,
  companyPhone
}) {
  const currency = 'CAD';
  
  return `
Your Quote is Ready

Hi ${firstName || 'there'},

Your quote has been prepared and is ready for review. Below you'll find the complete quote details and next steps.

Quote Summary
- Quote Number: ${quoteNumber || ''}
- Languages: ${languages || ''}
- Documents: ${documentCount || 0}
- Total Pages: ${pageCount || 0}
- ${certifications ? `Certification: ${certifications}` : ''}
- Estimated Delivery: ${estimatedDelivery || ''}
- Quote Expires: ${quoteExpires || ''}

Pricing
- Subtotal: $${Number(subtotal || 0).toFixed(2)} ${currency}
- Tax (5% GST): $${Number(tax || 0).toFixed(2)} ${currency}
- Total: $${Number(total || 0).toFixed(2)} ${currency}

What Happens Next
1. Review your complete quote details by clicking the link below
2. Proceed to checkout when you're ready
3. Our team will begin working on your translation immediately after payment confirmation
4. You can reach out to us anytime if you have questions

View Quote: ${viewQuoteUrl}

Need Help?
Email: ${companyEmail}
Phone: ${companyPhone}

---
© ${new Date().getFullYear()} Cethos Translation Services. All rights reserved.
This is a transactional email. Please do not reply to this message.
  `.trim();
}
