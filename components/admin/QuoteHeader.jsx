import { useState } from 'react';
import Link from 'next/link';

export default function QuoteHeader({ quote, admin, onLogout, onEdit }) {
  const [editMode, setEditMode] = useState(false);

  const handleEditClick = () => {
    setEditMode(true);
    if (onEdit) {
      onEdit();
    }
  };

  return (
    <div className="bg-white border-b">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
        <Link href="/admin/quotes" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 12.667L3.333 8 8 3.333M12.667 8H3.333"/>
          </svg>
          <span className="text-sm font-medium text-gray-600">Back to Quotes</span>
        </Link>

        <div className="flex items-center gap-3">
          {admin?.role && (
            <div className="hidden sm:flex items-center px-2 py-1 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs font-medium text-gray-900">{admin.role === 'super_admin' ? 'Super Admin' : admin.role}</span>
            </div>
          )}
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 17 16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M11.62 11.333L14.953 8l-3.333-3.333M14.953 8h-8M6.953 14H4.287a1.333 1.333 0 01-1.334-1.333V3.333A1.333 1.333 0 014.287 2h2.666"/>
            </svg>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Quote Details */}
      <div className="px-4 sm:px-6 py-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-normal">Quote Details</h1>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded-lg bg-gray-100">
              <span className="text-xs font-medium text-gray-800 capitalize">{quote?.quote_state || 'draft'}</span>
            </div>
            <button 
              onClick={handleEditClick}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Edit quote details"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 2H3.333c-.353 0-.692.14-.942.39A1.333 1.333 0 002 3.333v9.334c0 .353.14.692.39.942.25.25.59.39.943.39h9.334c.353 0 .692-.14.942-.39.25-.25.39-.59.39-.943V8M12.25 1.75a1.414 1.414 0 112 2L8.24 9.76a2 2 0 01-.568.403l-1.916.56a.333.333 0 01-.408-.408l.56-1.915a2 2 0 01.403-.569l6.01-6.009z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-normal text-gray-800">{quote?.customer_name || '—'}</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {quote?.customer_email || '—'} {quote?.customer_phone && `• ${quote.customer_phone}`}
              </p>
            </div>
          </div>

          {/* Languages */}
          <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base text-gray-600">
            <span>Source: {quote?.source_language || '—'}</span>
            <span>→</span>
            <span>Target: {quote?.target_language || '—'}</span>
          </div>

          {/* Intended Use */}
          <p className="text-sm sm:text-base text-gray-500">
            Intended Use: {quote?.intended_use || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
