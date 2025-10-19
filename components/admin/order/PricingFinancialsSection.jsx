import { useState } from 'react';
import EditPricingModal from './modals/EditPricingModal';
import SendInvoiceModal from './modals/SendInvoiceModal';
import ProcessRefundModal from './modals/ProcessRefundModal';

export default function PricingFinancialsSection({ order, onUpdate }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const round2 = (n) => {
    const x = Number(n);
    return Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;
  };

  const subtotal = round2(order.subtotal || 0);
  const tax = round2(order.tax_total || 0);
  const total = round2(order.total || 0);
  const amountPaid = round2(order.amount_paid || 0);
  const balance = total - amountPaid;

  const amendments = order.amendments || [];
  const payments = order.payments || [];
  const refunds = order.refunds || [];

  return (
    <>
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Pricing & Financials</h2>
          <p className="text-sm text-gray-600">Complete payment history and balance</p>
        </div>

        {/* Original Order */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Original Order</h3>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-700">Translation</span>
              <span className="text-gray-900 font-medium">${round2(order.translation_total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Certification</span>
              <span className="text-gray-900 font-medium">${round2(order.certification_total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Delivery</span>
              <span className="text-gray-900 font-medium">${round2(order.delivery_total || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Shipping</span>
              <span className="text-gray-900 font-medium">${round2(order.shipping_total || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t border-gray-300 pt-3 mb-3">
            <div className="flex justify-between font-semibold">
              <span className="text-gray-900">Subtotal</span>
              <span className="text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-gray-700">Tax ({(order.tax_rate * 100 || 0).toFixed(0)}%)</span>
            <span className="text-gray-900 font-medium">${tax.toFixed(2)}</span>
          </div>
          <div className="border-t-2 border-b-2 border-gray-400 py-3 flex justify-between font-bold text-lg">
            <span className="text-gray-900">TOTAL</span>
            <span className="text-gray-900">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Amendments */}
        {amendments.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Amendments</h3>
              <button
                onClick={() => setShowEditModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Amendment
              </button>
            </div>
            <div className="space-y-3">
              {amendments.map((amendment, idx) => (
                <div key={idx} className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">Amendment #{idx + 1}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(amendment.date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {amendment.amount >= 0 ? '+' : ''} ${Math.abs(amendment.amount).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{amendment.description || amendment.reason}</p>
                  <p className="text-xs text-gray-600 mb-2">By: {amendment.created_by || 'Admin'}</p>
                  <div className="border-t border-gray-200 pt-2">
                    <p className="text-sm font-medium text-gray-900">
                      New Total: ${(total + amendment.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Original Payment</p>
                <span className="inline-block text-xs bg-green-200 text-green-800 px-2 py-1 rounded mt-1">
                  ✓ PAID
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900">${amountPaid.toFixed(2)}</p>
            </div>
            {payments.length > 0 && (
              <div className="space-y-2 text-sm bg-white rounded p-3">
                {payments.map((payment, idx) => (
                  <div key={idx}>
                    <p className="text-xs text-gray-600">
                      {new Date(payment.date).toLocaleDateString()} • {payment.method}
                    </p>
                    <p className="text-xs text-gray-500">
                      Transaction: <code className="text-gray-600">{payment.transaction_id}</code>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Balance Summary */}
        <div className={`rounded-lg p-6 mb-6 border-l-4 ${
          balance > 0
            ? 'bg-red-50 border-l-red-500'
            : balance < 0
              ? 'bg-blue-50 border-l-blue-500'
              : 'bg-gray-50 border-l-gray-400'
        }`}>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Order Total</span>
              <span className="text-gray-900 font-semibold">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Amount Paid</span>
              <span className="text-gray-900 font-semibold">${amountPaid.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-2 flex justify-between items-center">
              <span className={`font-bold ${balance > 0 ? 'text-red-700' : balance < 0 ? 'text-blue-700' : 'text-gray-700'}`}>
                {balance > 0 ? 'BALANCE DUE' : balance < 0 ? 'REFUND DUE' : 'PAID IN FULL'}
              </span>
              <span className={`text-lg font-bold ${balance > 0 ? 'text-red-700' : balance < 0 ? 'text-blue-700' : 'text-green-700'}`}>
                ${Math.abs(balance).toFixed(2)}
              </span>
            </div>
          </div>

          {balance > 0 && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Send Invoice
            </button>
          )}
          {balance < 0 && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Process Refund
            </button>
          )}
        </div>

        {/* Refund History */}
        {refunds && refunds.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Refund History</h3>
            <div className="space-y-2">
              {refunds.map((refund, idx) => (
                <div key={idx} className="text-sm border-b border-gray-200 pb-2 last:border-b-0">
                  <p className="font-medium text-gray-900">
                    Refund #{idx + 1} - {new Date(refund.date).toLocaleDateString()}
                  </p>
                  <p className="text-gray-700">Amount: ${refund.amount.toFixed(2)}</p>
                  <p className="text-gray-600 text-xs">Reason: {refund.reason}</p>
                  <p className="text-gray-600 text-xs">
                    Status: <span className="text-green-600 font-medium">✓ {refund.status}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Pricing Button */}
        <button
          onClick={() => setShowEditModal(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Edit Pricing
        </button>
      </div>

      {/* Modals */}
      <EditPricingModal
        open={showEditModal}
        order={order}
        onClose={() => setShowEditModal(false)}
        onUpdate={onUpdate}
      />
      <SendInvoiceModal
        open={showInvoiceModal}
        order={order}
        balance={balance}
        onClose={() => setShowInvoiceModal(false)}
        onUpdate={onUpdate}
      />
      <ProcessRefundModal
        open={showRefundModal}
        order={order}
        refundAmount={Math.abs(balance)}
        onClose={() => setShowRefundModal(false)}
        onUpdate={onUpdate}
      />
    </>
  );
}
