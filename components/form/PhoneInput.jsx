import { useEffect, useMemo, useRef, useState } from 'react';
import { PRIORITY_COUNTRIES, toE164, isValid, getCallingCode } from '../../lib/formatters/phone';

const COUNTRY_META = [
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '��🇺' },
  { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'Mexico', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'France', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Germany', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Italy', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Netherlands', code: 'NL', dial: '+31', flag: '🇳🇱' },
  { name: 'Belgium', code: 'BE', dial: '+32', flag: '🇧🇪' },
  { name: 'Switzerland', code: 'CH', dial: '+41', flag: '🇨🇭' },
  { name: 'Austria', code: 'AT', dial: '+43', flag: '🇦🇹' },
  { name: 'Sweden', code: 'SE', dial: '+46', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', dial: '+47', flag: '🇳🇴' },
  { name: 'Denmark', code: 'DK', dial: '+45', flag: '🇩🇰' },
  { name: 'Finland', code: 'FI', dial: '+358', flag: '🇫🇮' },
  { name: 'Portugal', code: 'PT', dial: '+351', flag: '🇵🇹' },
  { name: 'Brazil', code: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Chile', code: 'CL', dial: '+56', flag: '🇨🇱' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'Japan', code: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'South Korea', code: 'KR', dial: '+82', flag: '🇰🇷' },
  { name: 'China', code: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'Singapore', code: 'SG', dial: '+65', flag: '🇸🇬' },
  { name: 'Hong Kong', code: 'HK', dial: '+852', flag: '🇭🇰' },
  { name: 'Ireland', code: 'IE', dial: '+353', flag: '🇮🇪' },
  { name: 'New Zealand', code: 'NZ', dial: '+64', flag: '🇳🇿' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966', flag: '🇸🇦' },
];

function byPriorityThenAlpha(a, b){
  const pa = PRIORITY_COUNTRIES.indexOf(a.name);
  const pb = PRIORITY_COUNTRIES.indexOf(b.name);
  if (pa !== -1 || pb !== -1) return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
  return a.name.localeCompare(b.name);
}

export default function PhoneInput({ label='Phone', valueE164='', onChangeE164, defaultCountry='Canada', disabled=false, required=false, error='' }){
  const [country, setCountry] = useState(defaultCountry || 'Canada');
  const [digits, setDigits] = useState(''); // national digits only
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const options = useMemo(()=> COUNTRY_META.slice().sort(byPriorityThenAlpha), []);
  const selectedMeta = useMemo(()=> options.find(o=>o.name===country) || options[0], [options, country]);
  const isNA = selectedMeta?.dial === '+1';
  const maxLen = isNA ? 10 : 15;
  const minLen = isNA ? 10 : 6;

  useEffect(()=>{
    function onDocClick(e){
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return ()=> document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(()=>{
    if (!valueE164) {
      setDigits('');
      return;
    }
    try {
      const m = String(valueE164).trim().match(/^\+(\d{1,3})(\d{1,14})$/);
      if (!m) { setDigits(''); return; }
      const code = `+${m[1]}`;
      const nat = m[2];
      const matchByCode = options.filter(o=>o.dial===code);
      if (matchByCode.length){
        const prefer = matchByCode.find(o=>o.name===defaultCountry) || matchByCode[0];
        setCountry(prefer.name);
      }
      const natDigits = isNA || code === '+1' ? nat.slice(-10) : nat;
      setDigits(natDigits);
    } catch {
      setDigits('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueE164]);

  useEffect(()=>{
    // On country change: clear input and notify
    setDigits('');
    onChangeE164 && onChangeE164('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  function formatDisplay(ds){
    if (isNA){
      const d = ds.slice(0,10);
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0,3)}-${d.slice(3)}`;
      return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,10)}`;
    }
    return ds;
  }

  function handleInput(val){
    const ds = String(val||'').replace(/\D+/g, '');
    const clamped = ds.slice(0, maxLen);
    setDigits(clamped);
    const e = toE164(clamped, country);
    onChangeE164 && onChangeE164(e || '');
  }

  const isInvalid = touched && required && !(digits.length >= minLen && digits.length <= maxLen && isValid(toE164(digits, country), country));
  const placeholder = isNA ? '416-555-1234' : 'Enter phone number';

  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
      <div className={`mt-1 flex h-12 items-center rounded-lg border ${isInvalid ? 'border-red-500' : (focused ? 'border-cyan-400 shadow-[0_0_0_3px_rgba(0,184,212,0.1)]' : 'border-gray-300')} bg-white overflow-hidden ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} onFocus={()=>setFocused(true)} onBlur={()=>{ setFocused(false); setTouched(true); }}>
        <div className={`relative flex items-center w-[120px] h-full px-3 pr-2 border-r ${disabled ? 'border-gray-300 bg-gray-50' : 'border-gray-300 bg-white'} select-none`} ref={menuRef}>
          <button type="button" disabled={disabled} className="w-full text-left flex items-center justify-between" onClick={()=>setOpen(o=>!o)}>
            <span className="mr-2">{selectedMeta?.flag}</span>
            <span className="mr-auto">{selectedMeta?.dial}</span>
            <span className="ml-2">▼</span>
          </button>
          {open && (
            <div className="absolute z-10 top-full left-0 mt-1 w-64 max-h-64 overflow-auto rounded-md border border-gray-200 bg-white shadow">
              {options.map(opt => (
                <div key={opt.code} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center" onMouseDown={()=>{ setCountry(opt.name); setOpen(false); }}>
                  <span className="mr-2">{opt.flag}</span>
                  <span className="mr-auto">{opt.name}</span>
                  <span className="text-gray-600">({opt.dial})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          type="tel"
          disabled={disabled}
          value={formatDisplay(digits)}
          onChange={e=>handleInput(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 h-full px-4 text-base outline-none bg-transparent ${disabled ? 'cursor-not-allowed' : ''}`}
        />
      </div>
      {(isInvalid || error) && (
        <div className="text-xs text-red-600 mt-1">{error || (isNA ? 'Please enter a 10-digit phone number' : 'Please enter a valid phone number')}</div>
      )}
    </label>
  );
}
