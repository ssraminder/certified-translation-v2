import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function QuoteReviewPage() {
  const router = useRouter();
  const { id } = router.query;
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetchQuote();
  }, [id]);

  async function fetchQuote() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/quotes/quote-review?id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to load quote');
      }
      const data = await res.json();
      setQuote(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">Return Home</a>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const subtotal = Number(quote.subtotal || 0);
  const discounts = Number(quote.discount_total || 0);
  const surcharges = Number(quote.surcharge_total || 0);
  const adjustedSubtotal = subtotal - discounts + surcharges;
  const tax = Number(quote.tax || 0);
  const total = Number(quote.total || 0);

  const lineItems = quote.line_items || [];
  const adjustments = quote.adjustments || [];
  const additionalItems = adjustments.filter(a => a.type === 'additional_item');
  const discountAdjustments = adjustments.filter(a => a.type === 'discount');
  const surchargeAdjustments = adjustments.filter(a => a.type === 'surcharge');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quote {quote.quote_number || 'Review'}</h1>
          <p className="text-gray-600 mb-4">Order: {quote.order_id}</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-gray-900">{quote.created_at ? new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
            </div>
            {quote.delivery_date && (
              <div>
                <p className="text-sm text-gray-500">Delivery Date</p>
                <p className="text-gray-900">{new Date(quote.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-gray-900 font-semibold capitalize">{(quote.quote_state || 'draft').replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quote Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {quote.source_language && (
                  <div>
                    <p className="text-gray-600">Languages</p>
                    <p className="text-gray-900 font-medium">{quote.source_language} → {quote.target_language}</p>
                  </div>
                )}
                {quote.intended_use && (
                  <div>
                    <p className="text-gray-600">Intended Use</p>
                    <p className="text-gray-900 font-medium">{quote.intended_use}</p>
                  </div>
                )}
                {quote.cert_type && (
                  <div>
                    <p className="text-gray-600">Certification Type</p>
                    <p className="text-gray-900 font-medium">{quote.cert_type}</p>
                  </div>
                )}
                {quote.country_of_issue && (
                  <div>
                    <p className="text-gray-600">Country of Issue</p>
                    <p className="text-gray-900 font-medium">{quote.country_of_issue}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            {lineItems.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Translation</h2>
                <div className="space-y-3">
                  {lineItems.map((item) => {
                    const rate = Number(item.unit_rate_override || item.unit_rate || 0);
                    const pages = Number(item.billable_pages || 0);
                    const amount = rate * pages;
                    return (
                      <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.filename || item.doc_type || 'Document'}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {pages} pages × ${rate.toFixed(2)}/page
                          </p>
                        </div>
                        <p className="text-gray-900 font-semibold">${amount.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Certifications */}
            {quote.certifications && quote.certifications.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h2>
                <div className="space-y-3">
                  {quote.certifications.map((cert) => {
                    const rate = Number(cert.override_rate || cert.default_rate || 0);
                    return (
                      <div key={cert.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <p className="font-medium text-gray-900">{cert.cert_type_name || 'Certification'}</p>
                        <p className="text-gray-900 font-semibold">${rate.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional Items */}
            {additionalItems.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Items</h2>
                <div className="space-y-3">
                  {additionalItems.map((item) => {
                    const amount = Number(item.total_amount || 0);
                    return (
                      <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                        </div>
                        <p className="text-gray-900 font-semibold">${amount.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
                </div>

                {discountAdjustments.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-gray-600 font-medium mb-2">Discounts</p>
                    {discountAdjustments.map((disc) => (
                      <div key={disc.id} className="flex items-center justify-between text-gray-600 mb-1">
                        <span className="text-sm">• {disc.description}</span>
                        <span className="text-green-600">-${Number(disc.total_amount || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {surchargeAdjustments.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-gray-600 font-medium mb-2">Surcharges</p>
                    {surchargeAdjustments.map((surcharge) => (
                      <div key={surcharge.id} className="flex items-center justify-between text-gray-600 mb-1">
                        <span className="text-sm">• {surcharge.description}</span>
                        <span className="text-orange-600">+${Number(surcharge.total_amount || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  {adjustedSubtotal !== subtotal && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Adjusted Subtotal</span>
                      <span className="text-gray-900 font-medium">${adjustedSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900 font-medium">${tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {quote.quote_state === 'sent' && (
                <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                  Accept Quote
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
