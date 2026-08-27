import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-dark-text">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm text-dark-text file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-button disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error ? 'border-error focus-visible:ring-error' : 'border-taupe-border',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
