import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-dark-text">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border bg-surface px-3 py-2 text-sm text-dark-text placeholder:text-muted-text focus-visible:outline-none focus-visible:border-primary-button disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error ? 'border-error focus-visible:border-error' : 'border-taupe-border',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
