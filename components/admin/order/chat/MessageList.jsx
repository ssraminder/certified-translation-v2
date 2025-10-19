export default function MessageList({ messages, onMarkRead }) {
  const formatTime = (date) => {
    const now = new Date();
    const msgDate = new Date(date);
    const isSameDay = msgDate.toDateString() === now.toDateString();

    return msgDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  let lastDate = null;

  return (
    <div className="space-y-4">
      {messages.map((message, idx) => {
        const currentDate = formatDate(message.created_at);
        const showDateSeparator = lastDate !== currentDate;
        lastDate = currentDate;

        const isFromCustomer = message.from_customer;
        const isInternal = message.is_internal;

        return (
          <div key={message.id || idx}>
            {showDateSeparator && (
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-gray-300" />
                <p className="text-xs text-gray-500 font-medium">{currentDate}</p>
                <div className="flex-1 h-px bg-gray-300" />
              </div>
            )}

            {message.type === 'system' ? (
              // System Message
              <div className="flex justify-center">
                <div className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">
                  {message.text}
                </div>
              </div>
            ) : isInternal ? (
              // Internal Note (PM Only)
              <div className="flex justify-end">
                <div className="max-w-xs">
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 border-l-4 border-l-yellow-500">
                    <p className="text-xs font-medium text-yellow-900 mb-1">
                      🔒 Internal Note
                    </p>
                    <p className="text-sm text-gray-800">{message.text}</p>
                    <p className="text-xs text-gray-600 mt-2">{formatTime(message.created_at)}</p>
                  </div>
                </div>
              </div>
            ) : isFromCustomer ? (
              // Customer Message (Left)
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                  C
                </div>
                <div className="max-w-xs">
                  <p className="text-xs text-gray-600 font-medium mb-1">Customer</p>
                  <div className="bg-white border border-gray-300 rounded-lg rounded-bl-none p-3">
                    <p className="text-sm text-gray-900">{message.text}</p>
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.files.map((file, fidx) => (
                          <div key={fidx} className="bg-gray-100 rounded p-2 flex items-center justify-between">
                            <span className="text-xs text-gray-700 truncate">📎 {file.name}</span>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(message.created_at)}
                    {message.read && ' ✓✓'}
                  </p>
                </div>
              </div>
            ) : (
              // PM Message (Right)
              <div className="flex items-end gap-2 justify-end">
                <div className="max-w-xs">
                  <p className="text-xs text-gray-600 font-medium mb-1 text-right">You</p>
                  <div className="bg-blue-500 text-white rounded-lg rounded-br-none p-3">
                    <p className="text-sm">{message.text}</p>
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.files.map((file, fidx) => (
                          <div key={fidx} className="bg-blue-600 rounded p-2 flex items-center justify-between">
                            <span className="text-xs text-white truncate">📎 {file.name}</span>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-200 hover:text-white text-xs font-medium"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {formatTime(message.created_at)} ✓✓
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  PM
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
