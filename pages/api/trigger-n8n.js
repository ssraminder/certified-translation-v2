export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const url = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (!url) return res.status(500).json({ error: 'Webhook URL not configured' });
    const payload = await (async () => {
      try { return await req.body; } catch { return null; }
    })();
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return res.status(204).end();
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
}
