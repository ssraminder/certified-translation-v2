import React from 'react';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

const SIZE_MAP = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]'
};

export default function LoadingSpinner({ size = 'md', className = '', label = 'Loading…' }) {
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  return (
    <span
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={classNames('inline-block align-middle text-current', className)}
    >
      <span
        className={classNames(
          'block rounded-full border-current border-t-transparent animate-spin',
          sizeClasses
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
