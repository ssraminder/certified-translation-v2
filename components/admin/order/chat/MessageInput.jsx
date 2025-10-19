import { useState, useRef } from 'react';

const quickReplies = [
  'Thank you for your order',
  'Translation in progress',
  'Please review attached document',
  'Would you like rush service?',
  'Order complete',
];

export default function MessageInput({ onSend, customerName }) {
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'application/zip',
      ];
      const maxSize = 25 * 1024 * 1024;
      return validTypes.includes(f.type) && f.size <= maxSize;
    });

    if (validFiles.length === 0) {
      alert('Invalid files. Supported: PDF, DOC, DOCX, JPG, PNG, ZIP (max 25MB)');
      return;
    }

    setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const handleSend = async () => {
    if (!text.trim() && attachedFiles.length === 0) return;

    await onSend(text, attachedFiles, isInternal);

    setText('');
    setAttachedFiles([]);
    setIsInternal(false);
  };

  const handleQuickReply = (reply) => {
    setText(reply);
    setShowQuickReplies(false);
  };

  return (
    <div
      className={`border-t border-gray-200 bg-white ${dragActive ? 'bg-blue-50' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Mode Toggle */}
      <div className="flex gap-2 p-3 border-b border-gray-200">
        <button
          onClick={() => setIsInternal(false)}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            !isInternal
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Customer Message
        </button>
        <button
          onClick={() => setIsInternal(true)}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isInternal
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Internal Note
        </button>
      </div>

      {/* Internal Warning */}
      {isInternal && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-2 text-xs text-yellow-800 font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          This message won't be visible to the customer
        </div>
      )}

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200">
        <button
          title="Bold"
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm font-bold"
        >
          B
        </button>
        <button
          title="Italic"
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm italic"
        >
          I
        </button>
        <button
          title="Link"
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach files"
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded font-bold"
        >
          📎
        </button>
        <button
          onClick={() => setShowQuickReplies(!showQuickReplies)}
          title="Quick replies"
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
        >
          💬
        </button>
      </div>

      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 space-y-1">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickReply(reply)}
              className="block w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 space-y-1">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-white border border-gray-200 rounded px-2 py-1.5 text-xs"
            >
              <span className="truncate">📎 {file.name}</span>
              <button
                onClick={() =>
                  setAttachedFiles(prev => prev.filter((_, i) => i !== idx))
                }
                className="text-red-600 hover:text-red-700 font-bold ml-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={isInternal ? 'Internal note...' : `Message ${customerName || 'customer'}...`}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          rows="3"
          maxLength="5000"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {text.length > 4000 ? `${text.length}/5000` : ''}
          </p>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
            />
            {attachedFiles.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Attach
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!text.trim() && attachedFiles.length === 0}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
