const COUNTRY_CALLING_CODES = {
  'Canada': '1',
  'United States': '1',
  'United Kingdom': '44',
  'France': '33',
  'Germany': '49',
  'India': '91',
  'Mexico': '52',
  'Australia': '61',
  'New Zealand': '64',
  'Ireland': '353',
  'Spain': '34',
  'Italy': '39',
  'Netherlands': '31',
  'Belgium': '32',
  'Switzerland': '41',
  'Austria': '43',
  'Sweden': '46',
  'Norway': '47',
  'Denmark': '45',
  'Finland': '358',
  'Portugal': '351',
  'Brazil': '55',
  'Argentina': '54',
  'Chile': '56',
  'Colombia': '57',
  'Japan': '81',
  'South Korea': '82',
  'China': '86',
  'Singapore': '65',
  'Hong Kong': '852',
  'United Arab Emirates': '971',
  'Saudi Arabia': '966'
};

function onlyDigits(s){ return String(s||'').replace(/\D+/g, ''); }

function normalizePlusPrefixed(input){
  const s = String(input||'').trim();
  if (!s.startsWith('+')) return null;
  const digits = onlyDigits(s);
  if (!digits) return null;
  // Enforce E.164 max length 15
  if (digits.length < 6 || digits.length > 15) return null;
  return `+${digits}`;
}

function inferCallingCode(country){
  return COUNTRY_CALLING_CODES[country] || null;
}

export function toE164(input, country){
  if (!input) return null;
  // Convert 00 prefix to +
  let s = String(input).trim();
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  const plus = normalizePlusPrefixed(s);
  if (plus) return plus;
  const digits = onlyDigits(s);
  if (!digits) return null;
  const c = inferCallingCode(country);
  // North America (US/CA)
  if (c === '1') {
    if (digits.length === 10) return `+1${digits}`;
    // Some users may include leading 1
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return null;
  }
  if (c) {
    // General international case: 6-15 national digits
    if (digits.length >= 6 && digits.length <= 12) return `+${c}${digits}`;
    // If user pasted with country code included but without +
    if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
    return null;
  }
  // Fallback: if 10 digits, assume North America
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 6 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function isValid(input, country){
  const e = toE164(input, country);
  return typeof e === 'string' && /^\+\d{6,15}$/.test(e);
}

export function formatForDisplay(e164, country){
  if (!e164) return '';
  const m = String(e164).match(/^\+(\d{1,3})(\d{4,})$/);
  if (!m) return String(e164);
  const code = m[1];
  const rest = m[2];
  if ((country === 'Canada' || country === 'United States' || code === '1') && rest.length >= 10) {
    const d = rest.slice(-10);
    return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,10)}`;
  }
  // Fallback: show with leading +country and space
  return `+${code} ${rest}`;
}

export const PRIORITY_COUNTRIES = [
  'Canada','United States','United Kingdom','Australia','India','Mexico','France','Germany'
];

export function getCallingCode(country){ return inferCallingCode(country); }

export default { toE164, formatForDisplay, isValid, PRIORITY_COUNTRIES, getCallingCode };
