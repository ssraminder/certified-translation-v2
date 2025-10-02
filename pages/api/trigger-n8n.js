export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const url = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  if (!url) return res.status(200).json({ ok: true });
  try {
    const payload = typeof req.body === 'object' ? req.body : {};
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
  } catch (e) {
    // Intentionally swallow errors; background processing should not block UX
  }
  return res.status(204).end();
}
