import { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode } from 'libphonenumber-js';

function onlyDigits(s){ return String(s||'').replace(/\D+/g, ''); }

export function toE164(input, countryCode){
  if (!input) return null;

  let s = String(input).trim();
  if (!s) return null;

  // Handle if already in E.164 format
  if (s.startsWith('+')) {
    if (isValidPhoneNumber(s)) {
      try {
        const parsed = parsePhoneNumber(s);
        return parsed.format('E.164');
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // If it starts with 00, convert to +
  if (s.startsWith('00')) {
    s = `+${s.slice(2)}`;
  }

  // Try parsing with country code
  if (countryCode) {
    try {
      const parsed = parsePhoneNumber(s, countryCode.toUpperCase());
      if (parsed && parsed.isValid()) {
        return parsed.format('E.164');
      }
    } catch (e) {
      // Fall through to other approaches
    }
  }

  // Try parsing without country code (if it has + prefix)
  if (s.startsWith('+')) {
    try {
      const parsed = parsePhoneNumber(s);
      if (parsed && parsed.isValid()) {
        return parsed.format('E.164');
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}

export function isValid(input, countryCode){
  if (!input) return false;
  try {
    if (countryCode) {
      return isValidPhoneNumber(String(input).trim(), countryCode.toUpperCase());
    }
    return isValidPhoneNumber(String(input).trim());
  } catch (e) {
    return false;
  }
}

export function formatForDisplay(e164, countryCode){
  if (!e164) return '';
  try {
    const parsed = parsePhoneNumber(e164);
    if (!parsed) return String(e164);

    // Format internationally (with country code and appropriate spacing)
    return parsed.formatInternational();
  } catch (e) {
    return String(e164);
  }
}

export function parseE164(e164){
  if (!e164) return null;
  try {
    const parsed = parsePhoneNumber(e164);
    if (!parsed) return null;
    return {
      callingCode: `+${parsed.countryCallingCode}`,
      national: parsed.nationalNumber.toString(),
      country: parsed.country
    };
  } catch (e) {
    return null;
  }
}

export function getCallingCode(countryCode) {
  if (!countryCode) return null;
  try {
    return getCountryCallingCode(countryCode.toUpperCase());
  } catch (e) {
    return null;
  }
}

export const PRIORITY_COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'India', 'Mexico', 'France', 'Germany'
];

export default { toE164, formatForDisplay, isValid, PRIORITY_COUNTRIES, getCallingCode, parseE164 };
