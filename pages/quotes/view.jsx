import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Spinner from '../components/dashboard/Spinner';

export default function QuoteViewPage() {
  const router = useRouter();
  const { token } = router.query;
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expiredQuote, setExpiredQuote] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchQuote();
  }, [token]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quotes/view-by-token?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!data.success) {
        if (data.expired) {
          setExpiredQuote(data.quote_id);
          setError('This quote link has expired.');
        } else {
          setError(data.error || 'Failed to load quote');
        }
        return;
      }

      setQuote(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {error.includes('expired') ? 'Link Expired' : 'Error Loading Quote'}
              </h1>
              <p className="text-gray-600 mb-6">{error}</p>

              {error.includes('expired') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 text-sm mb-4">
                    Your quote link has expired. Please request a new quote link from the admin or contact support.
                  </p>
                  <button
                    onClick={() => router.push('/order/step-1')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Create New Quote
                  </button>
                </div>
              )}

              <p className="text-gray-500 text-sm">
                If you continue to experience issues, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  const quoteData = quote.quote;
  const results = quote.quoteResults;
  const lineItems = quote.lineItems || [];
  const files = quote.files || [];
  const expiresAt = new Date(quote.expiresAt);
  const isExpiring = (expiresAt.getTime() - Date.now()) < (7 * 24 * 60 * 60 * 1000); // Within 7 days

  const languagePair = `${quoteData?.source_lang || ''} → ${quoteData?.target_lang || ''}`;
  const totalPages = lineItems.reduce((sum, item) => sum + (item.billable_pages || 0), 0);

  return (
    <>
      <Head>
        <title>Quote #{quoteData?.quote_number} - Cethos</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Quote #{quoteData?.quote_number}</h1>
            <p className="text-gray-600 text-sm mt-2">
              Created: {new Date(quoteData?.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Expiry Warning */}
        {isExpiring && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-4">
            <div className="max-w-4xl mx-auto">
              <p className="text-yellow-800 text-sm">
                <strong>Expires:</strong> {expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="space-y-6">
            {/* Quote Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">Quote Summary</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-600">Language Pair</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{languagePair}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Documents</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{files.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Pages</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{totalPages}</p>
                </div>
                {quoteData?.certification_type_name && (
                  <div>
                    <p className="text-sm text-gray-600">Certification</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{quoteData.certification_type_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            {files.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-white font-semibold text-lg">Documents</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">{file.filename}</p>
                          <p className="text-sm text-gray-600">{(file.bytes / 1024).toFixed(1)} KB</p>
                        </div>
                        {file.file_url && (
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 font-medium"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Breakdown */}
            {results && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-white font-semibold text-lg">Pricing Breakdown</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start pb-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900">{item.filename}</p>
                          <p className="text-sm text-gray-600">{item.billable_pages || 0} pages • ${item.unit_rate || 0}/page</p>
                        </div>
                        <p className="font-semibold text-gray-900 whitespace-nowrap ml-4">${(item.line_total || 0).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Subtotal</span>
                      <span className="text-gray-900 font-semibold">${Number(results.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Tax (5% GST)</span>
                      <span className="text-gray-900 font-semibold">${Number(results.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-blue-600">${Number(results.total || 0).toFixed(2)} CAD</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Information */}
            {results?.delivery_estimate_text && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-white font-semibold text-lg">Delivery Information</h2>
                </div>
                <div className="p-6">
                  <p className="text-lg text-gray-900 font-semibold">{results.delivery_estimate_text}</p>
                  {results.estimated_delivery_date && (
                    <p className="text-gray-600 mt-2">
                      Estimated: {new Date(results.estimated_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center py-6">
              <button
                onClick={() => router.push('/order/step-1')}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
              >
                Proceed to Payment
              </button>
              <button
                onClick={() => window.print()}
                className="px-8 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold text-lg"
              >
                Print Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
