import { formatForDisplay as formatPhone } from '../../lib/formatters/phone';

export default function AddressDisplay({ address, showEmail = false, showPhone = false }) {
  if (!address) return null;

  return (
    <div className="text-sm space-y-2">
      <div className="text-base font-normal text-gray-900">{address.full_name}</div>
      
      {showEmail && address.email && (
        <div className="flex items-center gap-2 text-gray-600">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M14.6667 4.66669L8.67266 8.48469C8.46926 8.60283 8.23822 8.66506 8.003 8.66506C7.76777 8.66506 7.53674 8.60283 7.33333 8.48469L1.33333 4.66669M13.3333 2.66669H2.66667C1.93029 2.66669 1.33333 3.26364 1.33333 4.00002V12C1.33333 12.7364 1.93029 13.3334 2.66667 13.3334H13.3333C14.0697 13.3334 14.6667 12.7364 14.6667 12V4.00002C14.6667 3.26364 14.0697 2.66669 13.3333 2.66669Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{address.email}</span>
        </div>
      )}
      
      {showPhone && address.phone && (
        <div className="flex items-center gap-2 text-gray-600">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M9.22133 11.0453C9.35902 11.1085 9.51413 11.123 9.66113 11.0863C9.80812 11.0496 9.93822 10.9639 10.03 10.8433L10.2667 10.5333C10.3909 10.3677 10.5519 10.2333 10.737 10.1407C10.9222 10.0482 11.1263 9.99998 11.3333 9.99998H13.3333C13.687 9.99998 14.0261 10.1405 14.2761 10.3905C14.5262 10.6406 14.6667 10.9797 14.6667 11.3333V13.3333C14.6667 13.6869 14.5262 14.0261 14.2761 14.2761C14.0261 14.5262 13.687 14.6666 13.3333 14.6666C10.1507 14.6666 7.09849 13.4024 4.84805 11.1519C2.59761 8.90149 1.33333 5.84924 1.33333 2.66665C1.33333 2.31302 1.47381 1.97389 1.72386 1.72384C1.9739 1.47379 2.31304 1.33331 2.66667 1.33331H4.66667C5.02029 1.33331 5.35943 1.47379 5.60947 1.72384C5.85952 1.97389 6 2.31302 6 2.66665V4.66665C6 4.87364 5.95181 5.07779 5.85923 5.26293C5.76666 5.44807 5.63226 5.60912 5.46667 5.73331L5.15467 5.96731C5.03228 6.06076 4.94601 6.1937 4.91053 6.34355C4.87504 6.49339 4.89252 6.6509 4.96 6.78931C5.87112 8.63989 7.36961 10.1365 9.22133 11.0453Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{formatPhone(address.phone, address.country)}</span>
        </div>
      )}
      
      <div className="text-gray-600">
        <div>{address.address_line1}</div>
        {address.address_line2 && <div>{address.address_line2}</div>}
        <div>{address.city}, {address.province_state} {address.postal_code}</div>
      </div>
    </div>
  );
}
