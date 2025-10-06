import { useEffect, useMemo, useState } from 'react';
import { PRIORITY_COUNTRIES, toE164, formatForDisplay, isValid } from '../../lib/formatters/phone';

const ALL_COUNTRIES = [
  'Canada','United States','United Kingdom','Australia','India','Mexico','France','Germany','Spain','Italy','Netherlands','Belgium','Switzerland','Austria','Sweden','Norway','Denmark','Finland','Portugal','Brazil','Argentina','Chile','Colombia','Japan','South Korea','China','Singapore','Hong Kong','Ireland','New Zealand','United Arab Emirates','Saudi Arabia'
];

function flagEmoji(country){
  const map = { 'Canada':'🇨🇦','United States':'🇺🇸','United Kingdom':'🇬🇧','Australia':'🇦🇺','India':'🇮🇳','Mexico':'🇲🇽','France':'🇫🇷','Germany':'🇩🇪' };
  return map[country] || '🌐';
}

export default function PhoneInput({ label='Phone', valueE164='', onChangeE164, defaultCountry='Canada', disabled=false, required=false, error='' }){
  const [country, setCountry] = useState(defaultCountry || 'Canada');
  const [display, setDisplay] = useState('');
  const [e164, setE164] = useState(valueE164 || '');
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const countries = useMemo(()=> Array.from(new Set([...PRIORITY_COUNTRIES, ...ALL_COUNTRIES])), []);

  useEffect(()=>{
    // Sync from external value when provided. Avoid clearing while the user is typing.
    if (valueE164) {
      setE164(valueE164);
      setDisplay(formatForDisplay(valueE164, country));
    } else {
      setE164('');
      if (!focused) {
        setDisplay('');
      }
    }
  }, [valueE164, country, focused]);

  function handleInput(val){
    let v = val.replace(/[^\d+\-()\s]/g,'');
    // Auto-format for US/CA
    if (country === 'Canada' || country === 'United States'){
      const digits = v.replace(/\D/g,'').slice(0,10);
      if (digits.length <= 3) v = digits;
      else if (digits.length <= 6) v = `${digits.slice(0,3)}-${digits.slice(3)}`;
      else v = `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
    }
    setDisplay(v);
    const e = toE164(v, country);
    setE164(e || '');
    onChangeE164 && onChangeE164(e || '');
  }

  const invalid = touched && required && !isValid(e164 || display, country);

  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
      <div className={`mt-1 flex items-stretch ${disabled ? 'opacity-70' : ''}`}>
        <select disabled={disabled} className="rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm" value={country} onChange={e=>{ setCountry(e.target.value); handleInput(display); }}>
          {countries.map(c => (
            <option key={c} value={c}>{flagEmoji(c)} {c}</option>
          ))}
        </select>
        <input disabled={disabled} value={display} onFocus={()=>setFocused(true)} onBlur={()=>{ setFocused(false); setTouched(true); }} onChange={e=>handleInput(e.target.value)} placeholder={country==='Canada'||country==='United States' ? '000-000-0000' : 'Enter phone'} className="flex-1 rounded-r-md border border-l-0 border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
      </div>
      {(invalid || error) && (
        <div className="text-xs text-red-600 mt-1">{error || 'Please enter a valid phone number'}</div>
      )}
    </label>
  );
}
