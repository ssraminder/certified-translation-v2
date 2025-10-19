import { useState, useEffect, useRef } from 'react';
import MessageList from './chat/MessageList';
import MessageInput from './chat/MessageInput';

export default function ChatPanel({ open, order, onClose, onUnreadChange }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const messagesEndRef = useRef(null);
  const autoRefreshIntervalRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`/api/orders/${order.id}/messages`);
      const data = await resp.json();
      setMessages(data.messages || []);
      setLastRefresh(new Date());

      const unread = (data.messages || []).filter(m => !m.read && m.from_customer).length;
      setUnreadCount(unread);
      onUnreadChange(unread);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMessages();
    }
  }, [open, order.id]);

  useEffect(() => {
    if (autoRefresh && open) {
      autoRefreshIntervalRef.current = setInterval(fetchMessages, 60000);
      return () => {
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, open, order.id]);

  const handleSendMessage = async (text, files, isInternal) => {
    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('isInternal', isInternal);
      if (files) {
        files.forEach((file, idx) => {
          formData.append(`file_${idx}`, file);
        });
      }

      const resp = await fetch(`/api/orders/${order.id}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) throw new Error('Failed to send message');
      const data = await resp.json();
      setMessages([...messages, data.message]);
      scrollToBottom();
    } catch (err) {
      alert('Error sending message: ' + err.message);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await fetch(`/api/orders/${order.id}/messages/mark-read`, { method: 'PATCH' });
      setUnreadCount(0);
      onUnreadChange(0);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-40 w-96 h-96 bg-white rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
      style={{
        animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
            {order.customer_name
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase() || 'C'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{order.customer_name || 'Customer'}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <p className="text-xs text-gray-500">Offline</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
              ({unreadCount})
            </span>
          )}

          <button
            onClick={fetchMessages}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh messages"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            No messages yet. Start the conversation with {order.customer_name || 'the customer'}!
          </div>
        ) : (
          <>
            <MessageList messages={messages} onMarkRead={handleMarkAsRead} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={handleSendMessage} customerName={order.customer_name} />

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
