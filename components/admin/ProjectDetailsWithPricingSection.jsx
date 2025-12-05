import { useState } from 'react';

function round2(n) {
  const x = Number(n);
  return Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;
}

export default function ProjectDetailsWithPricingSection({
  quote,
  lineItems = [],
  certifications = [],
  adjustments = [],
  computedTotals = {},
  canEdit = false,
  onEditClick = () => {},
  onLineItemClick = () => {},
}) {
  const additionalItems = adjustments.filter(a => a.type === 'additional_item');
  const discounts = adjustments.filter(a => a.type === 'discount');
  const surcharges = adjustments.filter(a => a.type === 'surcharge');

  return (
    <div className="space-y-6">
      {/* Project Details Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
          {canEdit && (
            <button
              onClick={() => onEditClick?.('project')}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              [Edit]
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
          <div>
            <p className="text-sm text-gray-600">Source Language</p>
            <p className="text-base font-medium text-gray-900">{quote?.source_language || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Target Language</p>
            <p className="text-base font-medium text-gray-900">{quote?.target_language || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Document Type</p>
            <p className="text-base font-medium text-gray-900">{quote?.intended_use || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-base font-medium text-gray-900">{quote?.quote_state || 'Not Started'}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">Due Date</p>
          <p className="text-base font-medium text-gray-900">
            {quote?.delivery_date
              ? new Date(quote.delivery_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </p>
        </div>

        {/* Documents/Line Items */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Documents ({lineItems.length})</h3>
          {lineItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr className="text-gray-600 text-xs font-medium">
                    <th className="text-left py-2 px-3">Filename</th>
                    <th className="text-right py-2 px-3">Pages</th>
                    <th className="text-right py-2 px-3">Rate</th>
                    <th className="text-right py-2 px-3">Subtotal</th>
                    {canEdit && <th className="text-center py-2 px-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => {
                    const effectiveRate = item.unit_rate_override ?? item.unit_rate ?? 0;
                    const billablePages = item.billable_pages ?? 0;
                    const lineTotal = round2(effectiveRate * billablePages);
                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 text-gray-900">
                          {item.filename || item.doc_type || 'Document'}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600">{billablePages}</td>
                        <td className="py-3 px-3 text-right text-gray-600">${effectiveRate.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900">
                          ${lineTotal.toFixed(2)}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => onLineItemClick?.(item)}
                              className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No documents</p>
          )}
        </div>

        {/* Pricing Breakdown */}
        <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Translation Subtotal:</span>
            <span className="font-medium text-gray-900">
              ${round2(computedTotals.translation || 0).toFixed(2)}
            </span>
          </div>
          {computedTotals.certification > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Certification:</span>
              <span className="font-medium text-gray-900">
                ${round2(computedTotals.certification || 0).toFixed(2)}
              </span>
            </div>
          )}
          {additionalItems.length > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Additional Items:</span>
              <span className="font-medium text-gray-900">
                ${round2(additionalItems.reduce((s, a) => s + (a.total_amount || 0), 0)).toFixed(2)}
              </span>
            </div>
          )}
          {discounts.length > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-green-700">Discounts:</span>
              <span className="font-medium text-green-700">
                -${round2(discounts.reduce((s, a) => s + (a.total_amount || 0), 0)).toFixed(2)}
              </span>
            </div>
          )}
          {surcharges.length > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-orange-700">Surcharges:</span>
              <span className="font-medium text-orange-700">
                +${round2(surcharges.reduce((s, a) => s + (a.total_amount || 0), 0)).toFixed(2)}
              </span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-medium">Subtotal:</span>
              <span className="font-semibold text-gray-900">
                ${round2(computedTotals.subtotal || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Tax (5%):</span>
              <span className="text-gray-900">
                ${round2(computedTotals.tax || 0).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
              <span className="text-gray-900 font-semibold">TOTAL:</span>
              <span className="text-lg font-bold text-gray-900">
                ${round2(computedTotals.total || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Options Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Delivery Options</h2>
          {canEdit && (
            <button
              onClick={() => onEditClick?.('delivery')}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              [Edit]
            </button>
          )}
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Speed: {quote?.delivery_speed || 'Standard'} (2-3 days)</span>
          <span className="font-medium text-gray-900">Fee: $0.00</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">Rush upgrade available: +30%</p>
      </div>

      {/* Shipping Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Shipping</h2>
          {canEdit && (
            <button
              onClick={() => onEditClick?.('shipping')}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              [Edit]
            </button>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Method: Digital Only</span>
            <span className="font-medium text-gray-900">Fee: $0.00</span>
          </div>
          <div>
            <span className="text-gray-600">Address: N/A</span>
          </div>
        </div>
      </div>

      {/* Payment Details Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Details</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Order Total:</span>
            <span className="font-semibold text-gray-900">
              ${round2(computedTotals.total || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount Paid:</span>
            <span className="font-medium text-gray-900">$0.00</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
            <span className="text-gray-900 font-semibold">Balance Due:</span>
            <span className="text-lg font-bold text-red-600">
              ${round2(computedTotals.total || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
