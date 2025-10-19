import { useState } from 'react';
import { formatForDisplay as formatPhone } from '../../lib/formatters/phone';

export default function CustomerDetailsCard({ quote, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);

  const customerType = quote?.customer_type || 'individual';
  const isBusinessType = customerType === 'business';
  const customerPhoneDisplay = formatPhone(quote?.customer_phone || '', 'Canada');

  const handleEditClick = () => {
    setIsEditing(true);
    if (onEdit) onEdit();
  };

  return (
    <div className="rounded-xl border bg-white p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Customer Details</h2>
        <button
          onClick={handleEditClick}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Edit customer details"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 2H3.333c-.353 0-.692.14-.942.39A1.333 1.333 0 002 3.333v9.334c0 .353.14.692.39.942.25.25.59.39.943.39h9.334c.353 0 .692-.14.942-.39.25-.25.39-.59.39-.943V8M12.25 1.75a1.414 1.414 0 112 2L8.24 9.76a2 2 0 01-.568.403l-1.916.56a.333.333 0 01-.408-.408l.56-1.915a2 2 0 01.403-.569l6.01-6.009z"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Name</p>
            <p className="text-base text-gray-900 font-medium">{quote?.customer_name || '���'}</p>
          </div>

          {/* Type */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Type</p>
            <p className="text-base text-gray-900 font-medium capitalize">
              {isBusinessType ? 'Business' : 'Individual'}
            </p>
          </div>

          {/* Business Details - Show only if Business type */}
          {isBusinessType && (
            <>
              {quote?.customer_company_name && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Company Name</p>
                  <p className="text-base text-gray-900 font-medium">{quote.customer_company_name}</p>
                </div>
              )}

              {quote?.customer_designation && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Designation</p>
                  <p className="text-base text-gray-900 font-medium">{quote.customer_designation}</p>
                </div>
              )}

              {quote?.customer_frequency && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Frequency</p>
                  <p className="text-base text-gray-900 font-medium capitalize">{quote.customer_frequency}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Email */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Email</p>
            {quote?.customer_email ? (
              <a href={`mailto:${quote.customer_email}`} className="text-base text-blue-600 font-medium hover:underline break-all">
                {quote.customer_email}
              </a>
            ) : (
              <p className="text-base text-gray-900 font-medium">—</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Phone Number</p>
            {customerPhoneDisplay ? (
              <p className="text-base text-gray-900 font-medium">{customerPhoneDisplay}</p>
            ) : (
              <p className="text-base text-gray-900 font-medium">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
