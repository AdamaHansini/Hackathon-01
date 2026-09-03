import React from 'react';
import { cn } from '../../utils/cn';
import { ItemPostStatus } from '../../types';

interface StatusBadgeProps {
  status: ItemPostStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusStyles = (s: string) => {
    switch (s) {
      case 'ACTIVE':
        return 'bg-success/10 text-success border-success/20';
      case 'MATCHED':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'CLAIMED':
      case 'VERIFIED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'RETURNED':
        return 'bg-primary-button/10 text-primary-button border-primary-button/20';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'REMOVED':
        return 'bg-error/10 text-error border-error/20';
      case 'DISPUTED':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'SUGGESTED':
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'UNDER_REVIEW':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'APPROVED':
        return 'bg-success/10 text-success border-success/20';
      case 'REJECTED':
        return 'bg-error/10 text-error border-error/20';
      case 'COMPLETED':
        return 'bg-primary-button/10 text-primary-button border-primary-button/20';
      default:
        return 'bg-surface text-muted-text border-taupe-border';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStatusStyles(status),
        className
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
