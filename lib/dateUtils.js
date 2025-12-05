/**
 * Convert ISO datetime string to YYYY-MM-DD format for HTML date inputs
 * @param {string|Date} dateValue - ISO datetime string or Date object
 * @returns {string} Date in YYYY-MM-DD format, or empty string if invalid
 */
export function toDateInputFormat(dateValue) {
  if (!dateValue) return '';
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error('Error formatting date:', err);
    return '';
  }
}

/**
 * Convert YYYY-MM-DD format (from HTML date input) to ISO string for API
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string|null} ISO datetime string, or null if invalid
 */
export function toISOString(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString + 'T00:00:00Z');
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (err) {
    console.error('Error converting date to ISO:', err);
    return null;
  }
}

/**
 * Format a date for display (e.g., "Dec 4, 2025")
 * @param {string|Date} dateValue - ISO datetime string or Date object
 * @returns {string} Formatted date string
 */
export function formatDateForDisplay(dateValue) {
  if (!dateValue) return '—';
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '—';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (err) {
    console.error('Error formatting date for display:', err);
    return '—';
  }
}

/**
 * Normalize any date format to ISO string
 * Handles: YYYY-MM-DD, ISO datetime, Date objects, timestamps
 * @param {string|Date|number} dateValue - Date in any common format
 * @returns {string|null} ISO datetime string, or null if invalid
 */
export function normalizeToISOString(dateValue) {
  if (!dateValue) return null;
  
  try {
    let date;
    
    if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'string') {
      // Try to parse as YYYY-MM-DD first
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        date = new Date(dateValue + 'T00:00:00Z');
      } else {
        date = new Date(dateValue);
      }
    } else {
      date = dateValue;
    }
    
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (err) {
    console.error('Error normalizing date:', err);
    return null;
  }
}
