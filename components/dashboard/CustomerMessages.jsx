import { useState, useEffect, useRef } from 'react';

export default function CustomerMessages({ orderId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setText('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d) => {
    try {
      return new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch { return ''; }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Messages</h3>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <>
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm mb-4">No messages yet. Send a message to our team below.</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.from_customer ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      m.from_customer
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {!m.from_customer && (
                      <div className="text-xs font-medium text-cyan-700 mb-1">Cethos Team</div>
                    )}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className={`text-xs mt-1 ${m.from_customer ? 'text-cyan-100' : 'text-gray-400'}`}>
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm mb-2">{error}</div>
          )}

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              maxLength={5000}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
