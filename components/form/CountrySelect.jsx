import { useEffect, useMemo } from 'react';
import { PRIORITY_COUNTRIES } from '../../lib/formatters/phone';

const ALL_COUNTRIES = [
  'Canada','United States','United Kingdom','Australia','India','Mexico','France','Germany','Spain','Italy','Netherlands','Belgium','Switzerland','Austria','Sweden','Norway','Denmark','Finland','Portugal','Brazil','Argentina','Chile','Colombia','Japan','South Korea','China','Singapore','Hong Kong','Ireland','New Zealand','United Arab Emirates','Saudi Arabia'
];

export default function CountrySelect({ label = 'Country', value, onChange, required=false, autoDetect=false }){
  const countries = useMemo(() => Array.from(new Set([...PRIORITY_COUNTRIES, ...ALL_COUNTRIES])), []);

  useEffect(() => {
    let cancelled = false;
    async function detectAndSet(){
      if (value) return; // don't override if already selected
      let detected = null;
      if (autoDetect) {
        try {
          const resp = await fetch('https://ipapi.co/json/');
          if (resp.ok) {
            const j = await resp.json();
            if (j && typeof j.country_name === 'string') detected = j.country_name;
          }
        } catch {}
        if (!detected) {
          try {
            const nav = typeof navigator !== 'undefined' ? navigator : null;
            const lang = nav?.language || nav?.languages?.[0] || '';
            const m = String(lang).toUpperCase().match(/-([A-Z]{2})$/);
            const map = { CA: 'Canada', US: 'United States', GB: 'United Kingdom', AU: 'Australia', IN: 'India', MX: 'Mexico', FR: 'France', DE: 'Germany' };
            const cc = m ? m[1] : null;
            detected = cc ? map[cc] : null;
          } catch {}
        }
      }
      const final = countries.includes(detected || '') ? detected : 'Canada';
      if (!cancelled && !value && onChange) onChange(final);
    }
    detectAndSet();
    return () => { cancelled = true; };
  }, [autoDetect, value, onChange, countries]);

  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
      <select className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={value || ''} onChange={e=>onChange && onChange(e.target.value)}>
        {countries.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
