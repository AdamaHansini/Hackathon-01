import React from 'react';
import { cn } from '../../utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-dark-text">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm text-dark-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-button disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error ? 'border-error focus-visible:ring-error' : 'border-taupe-border',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
