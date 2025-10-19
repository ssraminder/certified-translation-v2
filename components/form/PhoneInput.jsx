import { useEffect, useRef, useState } from 'react';

// Single-field North America phone input
// Displays and accepts numbers in the form +1 XXX-XXX-XXXX
// Emits E.164 value (+1XXXXXXXXXX) via onChangeE164 when 10 digits are present, otherwise ''
export default function PhoneInput({ label = 'Phone', valueE164 = '', onChangeE164, defaultCountry = 'Canada', disabled = false, required = false, error = '' }) {
  const [digits, setDigits] = useState(''); // 10 national digits only
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);

  // Parse incoming E.164 value (e.g., +14039666211) into digits
  useEffect(() => {
    if (!valueE164) return; // don't clear while typing
    const m = String(valueE164).match(/^\+1(\d{10})$/);
    if (m) setDigits(m[1]);
  }, [valueE164]);

  function toE164Local(d) { return d.length === 10 ? `+1${d}` : ''; }

  function formatDisplay(d) {
    const s = d.slice(0, 10);
    if (s.length === 0) return '';
    if (s.length <= 3) return `+1 ${s}`;
    if (s.length <= 6) return `+1 ${s.slice(0,3)}-${s.slice(3)}`;
    return `+1 ${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6)}`;
  }

  function handleChange(val) {
    const oldDigits = digits;
    const only = String(val || '').replace(/\D+/g, '');
    // If user types a leading 1 or country code, keep the last 10 digits
    const ten = only.length > 10 ? only.slice(-10) : (only.startsWith('1') && only.length === 11 ? only.slice(1) : only);
    const clamped = ten.slice(0, 10);
    setDigits(clamped);
    const e = toE164Local(clamped);
    onChangeE164 && onChangeE164(e);

    // Maintain cursor position based on digit count changes
    if (inputRef.current) {
      setTimeout(() => {
        const newDisplayValue = formatDisplay(clamped);
        const cursorPos = inputRef.current.selectionStart;

        // Calculate digit position in the formatted string
        let digitCount = 0;
        let newPosition = 0;

        for (let i = 0; i < newDisplayValue.length; i++) {
          if (/\d/.test(newDisplayValue[i])) {
            digitCount++;
            if (digitCount <= clamped.length) {
              newPosition = i + 1;
            }
          }
        }

        // If the user just deleted a digit, position cursor right after the last digit
        if (clamped.length < oldDigits.length) {
          inputRef.current.setSelectionRange(newPosition, newPosition);
        } else {
          // If the user added a digit, position cursor after the newly added digit
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  }

  const invalid = touched && required && digits.length !== 10;

  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
      <div className={`mt-1 flex h-12 items-center rounded-lg border ${invalid ? 'border-red-500' : 'border-gray-300'} bg-white overflow-hidden ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}>
        <input
          ref={inputRef}
          type="tel"
          disabled={disabled}
          value={formatDisplay(digits)}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={'+1 ___-___-____'}
          className={`flex-1 h-full px-4 text-base outline-none bg-transparent ${disabled ? 'cursor-not-allowed' : ''}`}
        />
      </div>
      {(invalid || error) && (
        <div className="text-xs text-red-600 mt-1">{error || 'Please enter a 10-digit phone number'}</div>
      )}
    </label>
  );
}
