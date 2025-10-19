import { isValid as isPhoneValid } from './formatters/phone';

// Validation functions
export function validateEmail(email) {
  return /.+@.+\..+/.test(String(email || ''));
}

export function validatePhone(phone, country) {
  return isPhoneValid(phone, country);
}

export function validateAddress(address, country = 'Canada') {
  const requiredFields = ['full_name', 'address_line1', 'city', 'province_state', 'postal_code', 'country'];
  return requiredFields.every(field => String(address[field] || '').trim());
}

export function validateBillingAddress(address) {
  if (!validateAddress(address)) return false;
  if (!validateEmail(address.email)) return false;
  if (!validatePhone(address.phone, address.country)) return false;
  return true;
}

// Formatting functions
export function formatCurrency(value) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(round2(value));
}

export function round2(value) {
  const x = Number(value);
  return Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;
}

export function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// Field update helper
export function updateAddressField(setter, key, value) {
  setter(prev => ({ ...prev, [key]: value }));
}

// Constants
export const GST_RATE = 0.05;
export const DEFAULT_COUNTRY = 'Canada';
