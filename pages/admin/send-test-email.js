import { useEffect, useState } from 'react';

export default function SendTestEmail() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const recipient = url.searchParams.get('recipient') || '';
    const orderId = url.searchParams.get('order_id');
    const useLatestPaid = url.searchParams.get('use_latest_paid') === '1';

    async function run() {
      if (!recipient) {
        setStatus('error');
        setMessage('Missing recipient query param');
        return;
      }
      setStatus('sending');
      try {
        const body = orderId ? { order_id: orderId, recipient } : { use_latest_paid: useLatestPaid || true, recipient };
        const resp = await fetch('/api/test/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'Failed');
        setStatus('success');
        setMessage(`Sent (order ${json.order_id})`);
      } catch (e) {
        setStatus('error');
        setMessage(e.message);
      }
    }

    run();
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 20, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h1>Send Test Email</h1>
      <p>Status: <strong>{status}</strong></p>
      {message && <pre style={{ background: '#f8f9fa', padding: 12, borderRadius: 6 }}>{message}</pre>}
      <p>Pass ?recipient=email@example.com&order_id=UUID (or &use_latest_paid=1).</p>
    </main>
  );
}
