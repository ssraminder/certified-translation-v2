function clean(s){ return String(s||'').trim(); }

export function formatPostal(country, value){
  const v = clean(value);
  if (country === 'United States'){
    const digits = v.replace(/\D/g,'').slice(0,9);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0,5)}-${digits.slice(5)}`;
  }
  if (country === 'Canada'){
    const upper = v.toUpperCase().replace(/[^A-Z0-9]/g,'');
    if (upper.length <= 3) return upper;
    return `${upper.slice(0,3)} ${upper.slice(3,6)}`.trim();
  }
  return v;
}

export function isValidPostal(country, value){
  const v = clean(value);
  if (country === 'United States') return /^\d{5}(-\d{4})?$/.test(v);
  if (country === 'Canada') return /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/.test(v);
  return v.length >= 3 && v.length <= 12;
}

export function labelForPostal(country){
  if (country === 'United States') return 'ZIP Code';
  if (country === 'Canada') return 'Postal Code';
  return 'Postal Code';
}

export default { formatPostal, isValidPostal, labelForPostal };
