import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = 'Something went wrong', 
  message = 'We encountered an error loading this data. Please try again.',
  onRetry 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-error/20 bg-error/5 w-full">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 mb-4">
        <AlertCircle className="h-6 w-6 text-error" />
      </div>
      <h3 className="text-lg font-medium text-error mb-1">{title}</h3>
      <p className="text-sm text-error/80 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
