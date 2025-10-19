import { useState } from 'react';

export default function StickyActionBar({ order, onUpdate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const round2 = (n) => {
    const x = Number(n);
    return Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;
  };

  const total = round2(order.total || 0);
  const amountPaid = round2(order.amount_paid || 0);
  const balance = total - amountPaid;

  const balanceText = balance > 0 ? `Balance due: $${balance.toFixed(2)}` : balance < 0 ? `Refund due: $${Math.abs(balance).toFixed(2)}` : 'Paid in full';
  const balanceColor = balance > 0 ? 'text-red-600' : balance < 0 ? 'text-blue-600' : 'text-green-600';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
      <div className="mx-auto max-w-5xl px-8 py-4 flex items-center justify-between">
        {/* Left Side - Order Total */}
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-600">Order Total</p>
            <p className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</p>
          </div>
          <div>
            <p className={`text-sm font-medium ${balanceColor}`}>
              {balanceText}
            </p>
          </div>
        </div>

        {/* Center - Links */}
        <div className="flex items-center gap-6 text-sm">
          <button className="text-gray-600 hover:text-gray-900 font-medium">
            Contact Customer
          </button>
          <button className="text-gray-600 hover:text-gray-900 font-medium">
            Print
          </button>
          <button className="text-gray-600 hover:text-gray-900 font-medium">
            Archive
          </button>
        </div>

        {/* Right Side - Buttons */}
        <div className="flex items-center gap-3">
          {balance > 0 && (
            <>
              <button className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Save Changes
              </button>
              <button className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Invoice
              </button>
            </>
          )}

          {balance < 0 && (
            <>
              <button className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                Process Refund
              </button>
            </>
          )}

          {balance === 0 && (
            <>
              <button className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Download PDF
              </button>
              <button className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
                Mark Complete
              </button>
            </>
          )}

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="More options"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  Print
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  Download PDF
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  Export
                </button>
                <hr className="my-1" />
                <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
