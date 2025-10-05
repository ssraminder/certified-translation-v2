import * as brevo from '@getbrevo/brevo';
import { getSupabaseServerClient } from './supabaseServer';

const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || process.env.BREVO_FROM || 'info@cethos.com';
const FROM_NAME = process.env.BREVO_FROM_NAME || 'Cethos Translations';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cethos-v5.netlify.app';

// Initialize Brevo client once per runtime
const apiInstance = new brevo.TransactionalEmailsApi();
if (process.env.BREVO_API_KEY) {
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  );
}

function getRecipient(order) {
  const email = order?.customer_email || order?.billing_address?.email;
  const name = order?.billing_address?.full_name || 'Customer';
  return { email, name };
}

function simpleEscape(str) {
  return String(str || '').replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

export async function sendOrderConfirmationEmail(order) {
  const to = getRecipient(order);
  if (!to.email) return { success: false, error: new Error('Missing recipient email') };
  const subject = `Order Confirmation - ${order.order_number || order.id}`;

  const htmlContent = generateOrderConfirmationHTML(order);
  const textContent = generateOrderConfirmationText(order);

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email: to.email, name: to.name }];
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME };
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;
  sendSmtpEmail.tags = ['order-confirmation', 'transactional'];

  try {
    const resp = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = resp?.messageId || resp?.response?.body?.messageId || null;
    await logEmailSent({
      order_id: order.id,
      email_type: 'order_confirmation',
      recipient: to.email,
      provider_id: messageId,
      status: 'sent'
    });
    return { success: true, messageId };
  } catch (error) {
    await logEmailSent({ order_id: order.id, email_type: 'order_confirmation', recipient: to.email, status: 'failed', error_message: error.message });
    return { success: false, error };
  }
}

export async function sendPaymentFailedEmail(order, errorMessage) {
  const to = getRecipient(order);
  if (!to.email) return { success: false, error: new Error('Missing recipient email') };
  const subject = `Payment Issue - Order ${order.order_number || order.id}`;

  const htmlContent = generatePaymentFailedHTML(order, errorMessage);
  const textContent = generatePaymentFailedText(order, errorMessage);

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email: to.email, name: to.name }];
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME };
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;
  sendSmtpEmail.tags = ['payment-failed', 'transactional'];

  try {
    const resp = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = resp?.messageId || resp?.response?.body?.messageId || null;
    await logEmailSent({ order_id: order.id, email_type: 'payment_failed', recipient: to.email, provider_id: messageId, status: 'sent' });
    return { success: true, messageId };
  } catch (error) {
    await logEmailSent({ order_id: order.id, email_type: 'payment_failed', recipient: to.email, status: 'failed', error_message: error.message });
    return { success: false, error };
  }
}

export async function sendOrderStatusUpdateEmail(order, newStatus) {
  const to = getRecipient(order);
  if (!to.email) return { success: false, error: new Error('Missing recipient email') };
  const subject = `Order Update - ${order.order_number || order.id}`;

  const statusMessages = {
    processing: 'Your order is now being processed',
    in_translation: 'Translation work has begun',
    in_qa: 'Your documents are being reviewed for quality',
    ready_for_delivery: 'Your documents are ready for delivery',
    delivered: 'Your documents have been delivered',
    completed: 'Your order is complete'
  };

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email: to.email, name: to.name }];
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME };
  sendSmtpEmail.htmlContent = generateStatusUpdateHTML(order, newStatus, statusMessages[newStatus] || 'Order update');
  sendSmtpEmail.tags = ['order-status-update', 'transactional'];

  try {
    const resp = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = resp?.messageId || resp?.response?.body?.messageId || null;
    await logEmailSent({ order_id: order.id, email_type: 'status_update', recipient: to.email, provider_id: messageId, status: 'sent', metadata: { new_status: newStatus } });
    return { success: true, messageId };
  } catch (error) {
    await logEmailSent({ order_id: order.id, email_type: 'status_update', recipient: to.email, status: 'failed', error_message: error.message, metadata: { new_status: newStatus } });
    return { success: false, error };
  }
}

// AUTH + ONBOARDING EMAILS
export async function sendMagicLinkEmail({ email, first_name, token }) {
  const url = `${SITE_URL}/auth/verify?token=${encodeURIComponent(token)}`;
  const subject = 'Login to Your Account';
  const html = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; line-height:1.6; color:#111; background:#f6f9fc;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e6ecf1;">
      <h1 style="margin:0 0 10px;color:#111;">Hi ${simpleEscape(first_name||'there')},</h1>
      <p>Click the button below to securely log in to your account.</p>
      <div style="text-align:center;margin:22px 0;">
        <a href="${url}" style="display:inline-block;background:#00B8D4;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Login Now</a>
      </div>
      <p style="color:#555;">This link expires in 24 hours. If you did not request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e6ecf1;margin:18px 0;" />
      <p style="color:#6b7280;font-size:13px;">© ${new Date().getFullYear()} ${simpleEscape(FROM_NAME)}</p>
    </div>
  </div>
</body></html>`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email, name: first_name || 'Customer' }];
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME };
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.tags = ['auth', 'magic-link'];
  await apiInstance.sendTransacEmail(sendSmtpEmail);
}

export async function sendOtpCodeEmail({ email, first_name, code }) {
  const subject = 'Your Login Code';
  const html = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; background:#f6f9fc;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e6ecf1; text-align:center;">
      <h1 style="margin:0 0 8px;color:#111;">Hi ${simpleEscape(first_name||'there')},</h1>
      <p>Use this code to log in. It expires in 10 minutes.</p>
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:48px; letter-spacing:8px; font-weight:800; background:#e6f9fc; color:#00B8D4; padding:14px 16px; border-radius:12px; display:inline-block; margin:16px 0;">${simpleEscape(code)}</div>
      <p style="color:#555">If you didn’t request this, you can ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e6ecf1;margin:18px 0;" />
      <p style="color:#6b7280;font-size:13px;">© ${new Date().getFullYear()} ${simpleEscape(FROM_NAME)}</p>
    </div>
  </div>
</body></html>`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email, name: first_name || 'Customer' }];
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME };
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.tags = ['auth', 'otp'];
  await apiInstance.sendTransacEmail(sendSmtpEmail);
}

export async function sendWelcomeEmail({ email, first_name, quote_number, details_html }) {
  const subject = 'Welcome to Cethos!';
  const html = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; background:#f6f9fc;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e6ecf1;">
      <h1 style="margin:0 0 8px;color:#111;">Welcome, ${simpleEscape(first_name||'there')}!</h1>
      <p>Your account has been created. Your quote number is <strong>${simpleEscape(quote_number||'')}</strong>.</p>
      ${details_html || ''}
      <div style="text-align:center;margin:22px 0;">
        <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#00B8D4;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Open Dashboard</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">© ${new Date().getFullYear()} ${simpleEscape(FROM_NAME)}</p>
    </div>
  </div>
</body></html>`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email, name: first_name || 'Customer' }];
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME };
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.tags = ['welcome'];
  await apiInstance.sendTransacEmail(sendSmtpEmail);
}

export async function sendQuoteSavedEmail({ email, first_name, quote_number, details_html }) {
  const subject = `Quote Saved - ${quote_number || ''}`;
  const html = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; background:#f6f9fc;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e6ecf1;">
      <h1 style="margin:0 0 8px;color:#111;">Quote Saved</h1>
      <p>Hi ${simpleEscape(first_name||'there')}, your quote <strong>${simpleEscape(quote_number||'')}</strong> has been saved.</p>
      ${details_html || ''}
      <div style="text-align:center;margin:22px 0;">
        <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#00B8D4;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">View Quotes</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">© ${new Date().getFullYear()} ${simpleEscape(FROM_NAME)}</p>
    </div>
  </div>
</body></html>`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email, name: first_name || 'Customer' }];
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME };
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.tags = ['quote-saved'];
  await apiInstance.sendTransacEmail(sendSmtpEmail);
}

async function logEmailSent(emailData) {
  try {
    const supabase = getSupabaseServerClient();
    const row = {
      order_id: emailData.order_id || null,
      email_type: emailData.email_type,
      recipient: emailData.recipient,
      provider_id: emailData.provider_id || null,
      status: emailData.status,
      error_message: emailData.error_message || null,
      metadata: emailData.metadata || null,
      sent_at: emailData.status === 'sent' ? new Date().toISOString() : null,
      created_at: new Date().toISOString()
    };
    await supabase.from('email_logs').insert([row]);
  } catch (e) {
    // non-fatal
    console.error('Error logging email:', e.message);
  }
}

function generateOrderConfirmationHTML(order) {
  const deliveryDate = order?.delivery_date ? new Date(order.delivery_date) : null;
  const deliveryDisplay = deliveryDate ? deliveryDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
  const orderDate = order?.created_at ? new Date(order.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-CA');
  const docList = Array.isArray(order?.documents) ? order.documents : [];

  const docsHTML = docList.length
    ? docList.map((d) => `<li>${simpleEscape(d.original_filename || d.filename || 'Document')}</li>`).join('')
    : '<li>No documents found</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height:1.6; color:#333; margin:0; padding:0; background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:8px;padding:28px;">
      <h1 style="margin:0 0 8px 0;color:#111;">Order Confirmed</h1>
      <p style="margin:0 0 16px 0;color:#555;">Thank you for choosing ${simpleEscape(FROM_NAME)}.</p>

      <div style="background:#f8f9fa;border-radius:6px;padding:16px;margin:16px 0;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;">
          <span style="font-weight:600;color:#495057;">Order Number:</span>
          <span>${simpleEscape(order.order_number || order.id)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;">
          <span style="font-weight:600;color:#495057;">Order Date:</span>
          <span>${simpleEscape(orderDate)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
          <span style="font-weight:600;color:#495057;">Expected Delivery:</span>
          <span>${simpleEscape(deliveryDisplay)}</span>
        </div>
      </div>

      <h2 style="margin:16px 0 8px 0;color:#111;font-size:18px;">Documents</h2>
      <ul style="margin:0 0 16px 18px;">${docsHTML}</ul>

      <h2 style="margin:16px 0 8px 0;color:#111;font-size:18px;">Price Summary</h2>
      <div style="background:#f8f9fa;border-radius:6px;padding:16px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>Translation</span><span>$${Number(order.translation_total||0).toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>Certification</span><span>$${Number(order.certification_total||0).toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>Delivery</span><span>$${Number(order.delivery_total||0).toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>Shipping</span><span>$${Number(order.shipping_total||0).toFixed(2)}</span></div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;" />
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>Subtotal</span><span>$${Number(order.subtotal||0).toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>GST (${Number(order.tax_rate||0)*100}%)</span><span>$${Number(order.tax_total||0).toFixed(2)}</span></div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;" />
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;"><span>Total Paid</span><span>$${Number(order.total||0).toFixed(2)} CAD</span></div>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${SITE_URL}/orders/${order.id}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">View Order Details</a>
      </div>

      <div style="text-align:center;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;padding-top:16px;">
        <p>Questions about your order? Email us at <a href="mailto:${FROM_EMAIL}">${FROM_EMAIL}</a></p>
        <p>© ${new Date().getFullYear()} ${simpleEscape(FROM_NAME)}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateOrderConfirmationText(order) {
  const deliveryDate = order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
  return `Order Confirmed\n\nOrder Number: ${order.order_number || order.id}\nOrder Date: ${order?.created_at ? new Date(order.created_at).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA')}\nExpected Delivery: ${deliveryDate}\nTotal Paid: $${Number(order.total||0).toFixed(2)} CAD\n\nView your order: ${SITE_URL}/orders/${order.id}`;
}

function generatePaymentFailedHTML(order, errorMessage) {
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; line-height:1.6; color:#333;">
  <div style="max-width:600px;margin:0 auto;padding:20px;background:#fff;border-radius:8px;">
    <h1 style="margin:0 0 8px 0;color:#111;">Payment Issue</h1>
    <p>We encountered an issue processing your payment for order <strong>${simpleEscape(order.order_number || order.id)}</strong>.</p>
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px;border-radius:4px;">${simpleEscape(errorMessage || 'Payment could not be processed')}</div>
    <p>Please try again or use a different payment method.</p>
    <p><a href="${SITE_URL}/orders/${order.id}/retry-payment" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Retry Payment</a></p>
    <p style="color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;padding-top:12px;">© ${new Date().getFullYear()} ${simpleEscape(FROM_NAME)}</p>
  </div>
</body></html>`;
}

function generatePaymentFailedText(order, errorMessage) {
  return `Payment Issue\n\nWe encountered an issue processing your payment for order ${order.order_number || order.id}.\n\nError: ${errorMessage || 'Payment could not be processed'}\n\nRetry payment: ${SITE_URL}/orders/${order.id}/retry-payment\n\nIf you continue to experience issues, please contact our support team at ${FROM_EMAIL}.`;
}

function generateStatusUpdateHTML(order, newStatus, statusMessage) {
  const deliveryDisplay = order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; line-height:1.6; color:#333;">
  <div style="max-width:600px;margin:0 auto;padding:20px;background:#fff;border-radius:8px;">
    <h1 style="margin:0 0 8px 0;color:#111;">Order Status Update</h1>
    <p>Your order <strong>${simpleEscape(order.order_number || order.id)}</strong> has been updated.</p>
    <div style="display:inline-block;background:#5cb3cc;color:#fff;padding:8px 14px;border-radius:20px;font-weight:600;">${simpleEscape(statusMessage || 'Order update')}</div>
    <p style="margin-top:12px;">Expected delivery: ${simpleEscape(deliveryDisplay)}</p>
    <p><a href="${SITE_URL}/orders/${order.id}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">View Order Details</a></p>
    <p style="color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;padding-top:12px;">© ${new Date().getFullYear()} ${simpleEscape(FROM_NAME)}</p>
  </div>
</body></html>`;
}
