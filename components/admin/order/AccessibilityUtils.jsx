/**
 * Accessibility Utilities for Order Details Page
 * 
 * This file provides utilities for keyboard navigation, focus management,
 * and ARIA labels across the order details interface.
 */

export const useKeyboardNavigation = (dependencies = []) => {
  if (typeof window === 'undefined') return {};

  const handleEscapeKey = (callback) => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  };

  const handleEnterKey = (callback) => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        callback();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  };

  return { handleEscapeKey, handleEnterKey };
};

/**
 * ARIA Labels and descriptions for different order statuses
 */
export const ariaLabels = {
  orderCreated: 'Order has been created and is pending processing',
  paymentReceived: 'Payment has been successfully received',
  inProgress: 'Order is currently being processed',
  qualityCheck: 'Order is undergoing quality review',
  delivered: 'Order has been delivered to customer',
  cancelled: 'Order has been cancelled',
  pending: 'Order status is pending',
};

/**
 * Focus management for modals and important elements
 */
export const useFocusManagement = (elementRef, isOpen) => {
  if (typeof window === 'undefined') return;

  if (isOpen && elementRef?.current) {
    elementRef.current.focus();
  }
};

/**
 * Accessibility attributes for form elements
 */
export const getAccessibleAttributes = (fieldName, isRequired = false) => {
  return {
    'aria-label': fieldName,
    'aria-required': isRequired,
    'role': 'textbox',
  };
};

/**
 * Screen reader announcements
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-9999px';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 3000);
};

/**
 * Color contrast validation for accessibility compliance
 * Should meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
 */
export const colorContrast = {
  // Foreground to background contrast ratios
  textOnLight: 4.5, // Min 4.5:1 for AA compliance
  textOnDark: 4.5,
  largeTextOnLight: 3, // Min 3:1 for AA compliance
  largeTextOnDark: 3,
};

/**
 * Keyboard shortcuts for power users
 */
export const keyboardShortcuts = {
  openChat: 'Ctrl+K or Cmd+K',
  saveChanges: 'Ctrl+S or Cmd+S',
  toggleEdit: 'Ctrl+E or Cmd+E',
  focusSearch: 'Ctrl+F or Cmd+F',
  exitModal: 'Escape',
  submitForm: 'Enter',
  newLine: 'Shift+Enter',
};

export default {
  useKeyboardNavigation,
  ariaLabels,
  useFocusManagement,
  getAccessibleAttributes,
  announceToScreenReader,
  keyboardShortcuts,
};
