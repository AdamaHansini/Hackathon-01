import React from 'react';
import { useToastStore } from '../../store/useToastStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start p-4 rounded-lg shadow-lg border pointer-events-auto transition-all animate-in slide-in-from-right-4',
            toast.type === 'success' && 'bg-success/10 border-success/20 text-success',
            toast.type === 'error' && 'bg-error/10 border-error/20 text-error',
            toast.type === 'info' && 'bg-blue-50 border-blue-100 text-blue-800'
          )}
        >
          <div className="flex-shrink-0 mr-3">
            {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
            {toast.type === 'info' && <Info className="h-5 w-5" />}
          </div>
          <div className="flex-1 text-sm font-medium pt-0.5">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
