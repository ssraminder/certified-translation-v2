import { useState } from 'react';
import Link from 'next/link';
import { formatForDisplay as formatPhone, toE164 } from '../../lib/formatters/phone';

export default function QuoteHeader({ quote, admin, onLogout, onEdit, onSend, totals }) {
  const [editMode, setEditMode] = useState(false);

  const handleEditClick = () => {
    setEditMode(true);
    if (onEdit) onEdit();
  };

  const createdAt = quote?.created_at ? new Date(quote.created_at) : null;
  const quoteNumber = quote?.quote_number || (quote?.id ? String(quote.id).slice(0, 8) : '—');
  const customerEmail = quote?.customer_email || '';
  const customerPhoneE164 = toE164(quote?.customer_phone || '', quote?.customer_country || 'Canada');
  const customerPhoneDisplay = formatPhone(quote?.customer_phone || '', quote?.customer_country || 'Canada');
  const state = String(quote?.quote_state || 'draft');

  return (
    <div className="bg-white border-b">
      {/* Compact Page Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 gap-3">
        <div className="flex items-center">
          <Link
            href="/admin/quotes"
            aria-label="Back to quotes"
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-600"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 12.667L3.333 8 8 3.333M12.667 8H3.333"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Back to Quotes</span>
          </Link>
          <h1 className="ml-3 text-lg font-semibold text-gray-900">Quote Details</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {admin?.role && (
            <div className="hidden sm:flex items-center px-2 py-1 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs font-medium text-gray-900">{admin.role === 'super_admin' ? 'Super Admin' : admin.role}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 17 16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M11.62 11.333L14.953 8l-3.333-3.333M14.953 8h-8M6.953 14H4.287a1.333 1.333 0 01-1.334-1.333V3.333A1.333 1.333 0 014.287 2h2.666"/>
            </svg>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </header>

      {/* Quote Info Grid */}
      <div className="px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Primary details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Quote</span>
              <span className="text-sm text-gray-800">{quoteNumber}</span>
              {createdAt && (
                <span className="text-sm text-gray-500">• {createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              )}
            </div>
            <div>
              <h2 className="text-base font-medium text-gray-900">{quote?.customer_name || '—'}</h2>
              <p className="text-sm text-gray-700 mt-0.5">
                {customerEmail ? (
                  <a className="hover:underline" href={`mailto:${customerEmail}`}>{customerEmail}</a>
                ) : '—'}
                {customerPhoneDisplay ? (
                  <>
                    <span className="mx-1 text-gray-400">•</span>
                    <a className="hover:underline" href={customerPhoneE164 ? `tel:${customerPhoneE164}` : undefined}>{customerPhoneDisplay}</a>
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span>Source: {quote?.source_language || '—'}</span>
              <span aria-hidden="true">→</span>
              <span>Target: {quote?.target_language || '—'}</span>
            </div>
            <p className="text-sm text-gray-600">Intended Use: {quote?.intended_use || '—'}</p>
          </div>

          {/* Right: Meta + actions */}
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-2">
              <span
                role="status"
                aria-label={`Quote status ${state}`}
                className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200 capitalize"
              >
                {state}
              </span>
              <div className="text-sm text-gray-900 font-medium">
                Total: ${Number(totals?.total || 0).toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditClick}
                className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-600"
                aria-label="Edit quote details"
              >
                Edit
              </button>
              <button
                onClick={onSend}
                disabled={!quote?.can_edit}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-600"
              >
                Send Quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
