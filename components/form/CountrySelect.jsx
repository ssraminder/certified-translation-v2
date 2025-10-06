import { useEffect, useMemo, useState } from 'react';
import { PRIORITY_COUNTRIES } from '../../lib/formatters/phone';

const ALL_COUNTRIES = [
  'Canada','United States','United Kingdom','Australia','India','Mexico','France','Germany','Spain','Italy','Netherlands','Belgium','Switzerland','Austria','Sweden','Norway','Denmark','Finland','Portugal','Brazil','Argentina','Chile','Colombia','Japan','South Korea','China','Singapore','Hong Kong','Ireland','New Zealand','United Arab Emirates','Saudi Arabia'
];

export default function CountrySelect({ label = 'Country', value, onChange, required=false, autoDetect=false }){
  const [search, setSearch] = useState('');
  const countries = useMemo(()=>{
    const base = Array.from(new Set([...PRIORITY_COUNTRIES, ...ALL_COUNTRIES]));
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter(c => c.toLowerCase().includes(q));
  }, [search]);

  useEffect(()=>{
    if (!autoDetect || value) return;
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      const lang = nav?.language || nav?.languages?.[0] || '';
      const m = String(lang).toUpperCase().match(/-([A-Z]{2})$/);
      if (m){
        const cc = m[1];
        const map = { CA: 'Canada', US: 'United States', GB: 'United Kingdom', AU: 'Australia', IN: 'India', MX: 'Mexico', FR: 'France', DE: 'Germany' };
        const detected = map[cc];
        if (detected && countries.includes(detected)) onChange && onChange(detected);
      }
    } catch {}
    if (!value && onChange) onChange('Canada');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
      <div className="mt-1 flex items-stretch gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search country" className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm" value={value||''} onChange={e=>onChange && onChange(e.target.value)}>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </label>
  );
}
