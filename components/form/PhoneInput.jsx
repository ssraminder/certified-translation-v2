import { useEffect, useRef, useState } from 'react';
import { parsePhoneNumber, getCountryCallingCode } from 'libphonenumber-js';
import { toE164, formatForDisplay, isValid } from '../../lib/formatters/phone';
import { detectCountryFromIP, COUNTRY_CODE_TO_NAME } from '../../lib/geolocation';

const ALL_COUNTRIES = Object.entries(COUNTRY_CODE_TO_NAME)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function PhoneInput({ 
  label = 'Phone', 
  valueE164 = '', 
  onChangeE164, 
  disabled = false, 
  required = false, 
  error = '',
  onCountryChange
}) {
  const [input, setInput] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Detect country from IP on mount
  useEffect(() => {
    (async () => {
      const detected = await detectCountryFromIP();
      setCountryCode(detected);
      setLoading(false);
    })();
  }, []);

  // Parse incoming E.164 value and extract country
  useEffect(() => {
    if (!valueE164) {
      setInput('');
      return;
    }
    
    try {
      const parsed = parsePhoneNumber(valueE164);
      if (parsed) {
        const nationalNumber = parsed.nationalNumber.toString();
        setInput(nationalNumber);
        if (parsed.country) {
          setCountryCode(parsed.country);
        }
      }
    } catch (e) {
      const digits = String(valueE164).replace(/\D+/g, '');
      setInput(digits);
    }
  }, [valueE164]);

  function handleInputChange(e) {
    const val = String(e.target.value || '').replace(/\D+/g, '');
    setInput(val);
    
    if (val) {
      const e164 = toE164(val, countryCode);
      onChangeE164 && onChangeE164(e164 || '');
    } else {
      onChangeE164 && onChangeE164('');
    }
  }

  function handleCountryChange(code) {
    setCountryCode(code);
    setShowDropdown(false);
    onCountryChange && onCountryChange(code);
    
    if (input) {
      const e164 = toE164(input, code);
      onChangeE164 && onChangeE164(e164 || '');
    }
  }

  function handleBlur() {
    setTouched(true);
    setShowDropdown(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = ALL_COUNTRIES.find(c => c.code === countryCode);
  const isValidNumber = input && isValid(input, countryCode);
  let displayValue = input;

  if (touched && input) {
    const e164 = toE164(input, countryCode);
    if (e164) {
      try {
        const parsed = parsePhoneNumber(e164);
        if (parsed) {
          // Format as national number (without country code, since we show it separately)
          displayValue = parsed.formatNational();
        }
      } catch (e) {
        displayValue = input;
      }
    }
  }
  
  const invalid = touched && required && !isValidNumber;
  
  let callingCode = '1';
  try {
    callingCode = getCountryCallingCode(countryCode) || '1';
  } catch (e) {
    callingCode = '1';
  }

  return (
    <div className="block">
      <label className="block text-sm text-gray-700 mb-1">
        {label}{required && ' *'}
      </label>
      
      <div className="flex gap-2">
        {/* Country Dropdown */}
        <div className="relative w-32" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => !disabled && !loading && setShowDropdown(!showDropdown)}
            className={`w-full h-12 px-3 py-2 border rounded-lg bg-white text-left flex items-center justify-between ${
              invalid ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''} ${loading ? 'bg-gray-50' : ''}`}
          >
            <span className="text-sm font-medium">
              {loading ? '...' : selectedCountry?.code || 'US'}
            </span>
            <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
          
          {showDropdown && !disabled && !loading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {ALL_COUNTRIES.map(country => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountryChange(country.code)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    countryCode === country.code ? 'bg-blue-50 font-semibold' : ''
                  }`}
                >
                  {country.code} - {country.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone Input */}
        <div className={`flex-1 flex h-12 items-center rounded-lg border ${
          invalid ? 'border-red-500' : 'border-gray-300'
        } bg-white overflow-hidden ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}>
          <span className="px-3 text-gray-500 text-sm font-medium">+{callingCode}</span>
          <input
            ref={inputRef}
            type="tel"
            disabled={disabled}
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="Enter phone number"
            className={`flex-1 h-full px-2 text-base outline-none bg-transparent ${disabled ? 'cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      {(invalid || error) && (
        <div className="text-xs text-red-600 mt-1">
          {error || 'Please enter a valid phone number'}
        </div>
      )}
    </div>
  );
}
