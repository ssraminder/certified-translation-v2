import { useState } from 'react';

export default function SendMagicLinkModal({ open, onClose, quoteId, customerEmail, customerName }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [magicLink, setMagicLink] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const generateAndCopyLink = async () => {
    try {
      setLoading(true);
      setError(null);
      setCopied(false);

      const response = await fetch('/api/admin/quotes/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          recipient_email: customerEmail
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate magic link');
      }

      setMagicLink(data.viewQuoteUrl);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (magicLink) {
      navigator.clipboard.writeText(magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Share Magic Link</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Generate and share a magic login link with <strong>{customerName}</strong> ({customerEmail})
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && !magicLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">Link sent successfully! Email has been sent to {customerEmail}</p>
            </div>
          )}

          {magicLink && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-2 font-medium">Magic Link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={magicLink}
                    className="flex-1 text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-600"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  ✓ Email sent with this link to {customerEmail}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            Close
          </button>
          {!magicLink && (
            <button
              onClick={generateAndCopyLink}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
            >
              {loading ? 'Generating...' : 'Generate & Send Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
