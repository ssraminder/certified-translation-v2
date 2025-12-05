import { toDateInputFormat, toISOString, formatDateForDisplay, normalizeToISOString } from '../dateUtils';

describe('Date Utilities', () => {
  describe('toDateInputFormat', () => {
    it('converts ISO datetime to YYYY-MM-DD format', () => {
      const result = toDateInputFormat('2025-12-04T00:00:00Z');
      expect(result).toBe('2025-12-04');
    });

    it('converts ISO datetime with timezone to YYYY-MM-DD format', () => {
      const result = toDateInputFormat('2025-12-04T00:00:00+00:00');
      expect(result).toBe('2025-12-04');
    });

    it('handles Date objects', () => {
      const date = new Date('2025-12-04');
      const result = toDateInputFormat(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns empty string for null/undefined', () => {
      expect(toDateInputFormat(null)).toBe('');
      expect(toDateInputFormat(undefined)).toBe('');
      expect(toDateInputFormat('')).toBe('');
    });

    it('returns empty string for invalid dates', () => {
      expect(toDateInputFormat('invalid')).toBe('');
    });
  });

  describe('toISOString', () => {
    it('converts YYYY-MM-DD to ISO datetime', () => {
      const result = toISOString('2025-12-04');
      expect(result).toMatch(/^2025-12-04T00:00:00\.000Z$/);
    });

    it('returns null for null/undefined', () => {
      expect(toISOString(null)).toBeNull();
      expect(toISOString(undefined)).toBeNull();
      expect(toISOString('')).toBeNull();
    });

    it('returns null for invalid dates', () => {
      expect(toISOString('invalid')).toBeNull();
    });
  });

  describe('formatDateForDisplay', () => {
    it('formats ISO datetime for display', () => {
      const result = formatDateForDisplay('2025-12-04T00:00:00Z');
      expect(result).toMatch(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s2025$/);
    });

    it('handles Date objects', () => {
      const date = new Date('2025-12-04');
      const result = formatDateForDisplay(date);
      expect(result).toMatch(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s2025$/);
    });

    it('returns — for null/undefined', () => {
      expect(formatDateForDisplay(null)).toBe('—');
      expect(formatDateForDisplay(undefined)).toBe('—');
      expect(formatDateForDisplay('')).toBe('—');
    });

    it('returns — for invalid dates', () => {
      expect(formatDateForDisplay('invalid')).toBe('—');
    });
  });

  describe('normalizeToISOString', () => {
    it('converts YYYY-MM-DD to ISO datetime', () => {
      const result = normalizeToISOString('2025-12-04');
      expect(result).toMatch(/^2025-12-04T00:00:00\.000Z$/);
    });

    it('handles existing ISO datetime strings', () => {
      const result = normalizeToISOString('2025-12-04T12:30:00Z');
      expect(result).toMatch(/^2025-12-04T12:30:00\.000Z$/);
    });

    it('handles Date objects', () => {
      const date = new Date('2025-12-04');
      const result = normalizeToISOString(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('handles timestamps (milliseconds)', () => {
      const timestamp = new Date('2025-12-04').getTime();
      const result = normalizeToISOString(timestamp);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('returns null for null/undefined', () => {
      expect(normalizeToISOString(null)).toBeNull();
      expect(normalizeToISOString(undefined)).toBeNull();
      expect(normalizeToISOString('')).toBeNull();
    });

    it('returns null for invalid dates', () => {
      expect(normalizeToISOString('invalid')).toBeNull();
    });
  });
});
