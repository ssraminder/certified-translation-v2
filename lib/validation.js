export const ADMIN_ROLES = ['super_admin','manager','project_manager','associate','accountant','sales'];

export function normalizeEmail(email){
  return (email || '').toString().trim().toLowerCase();
}

export function isValidEmail(email){
  const e = normalizeEmail(email);
  // Simple but solid email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 320;
}

export function isValidRole(role){
  return ADMIN_ROLES.includes((role || '').toString().trim());
}

export function validateAdminPayload({ full_name, email, role, is_active }){
  const errors = {};
  const fn = (full_name || '').toString().trim();
  if (fn.length < 2 || fn.length > 100) errors.full_name = 'Full Name must be between 2 and 100 characters';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
  if (!isValidRole(role)) errors.role = 'Select a valid role';
  if (typeof is_active !== 'undefined' && typeof is_active !== 'boolean') errors.is_active = 'Active status must be true/false';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function isValidOrderingType(ordering_type){
  if (ordering_type == null || ordering_type === '') return true;
  const t = String(ordering_type).trim();
  return t === 'individual' || t === 'business';
}

export function validateUserPayload({ full_name, email, phone, ordering_type, company_name, designation, frequency, tags }){
  const errors = {};
  const fn = (full_name || '').toString().trim();
  if (fn.length < 2 || fn.length > 100) errors.full_name = 'Full Name must be between 2 and 100 characters';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
  if (!isValidOrderingType(ordering_type)) errors.ordering_type = 'Select a valid option';
  if (phone && String(phone).length > 30) errors.phone = 'Phone is too long';
  if (company_name && String(company_name).length > 200) errors.company_name = 'Company name is too long';
  if (designation && String(designation).length > 120) errors.designation = 'Designation is too long';
  if (frequency && String(frequency).length > 60) errors.frequency = 'Frequency is too long';
  if (Array.isArray(tags)) {
    const bad = tags.find(t => typeof t !== 'string' || !t.trim());
    if (bad) errors.tags = 'Tags must be non-empty strings';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
