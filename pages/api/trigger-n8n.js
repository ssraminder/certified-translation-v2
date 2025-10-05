import { withApiBreadcrumbs } from '../../lib/sentry';

function getBaseUrl(req) {
  const hostHeader = req.headers.host;
  if (!hostHeader) return null;
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = (() => {
    if (Array.isArray(forwardedProto)) return forwardedProto[0];
    if (typeof forwardedProto === 'string' && forwardedProto.length > 0) {
      return forwardedProto.split(',')[0].trim();
    }
    if (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.')) {
      return 'http';
    }
    return 'https';
  })();
  return `${proto}://${hostHeader}`;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const url = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  if (!url) {
    return res.status(200).json({ ok: true });
  }

  const baseUrl = getBaseUrl(req);
  const callbackUrl = baseUrl ? `${baseUrl}/api/n8n/callback` : null;
  const callbackSecret = process.env.N8N_WEBHOOK_SECRET || null;

  try {
    const originalPayload = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const payload = { ...originalPayload };
    if (callbackUrl) payload.callback_url = callbackUrl;
    if (callbackSecret) payload.callback_secret = callbackSecret;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Failed to trigger N8N webhook', error);
  }

  return res.status(202).json({ ok: true });
}

export default withApiBreadcrumbs(handler);
