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
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'RETURNED':
        return 'bg-primary-button/10 text-primary-button border-primary-button/20';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'REMOVED':
        return 'bg-error/10 text-error border-error/20';
      case 'DISPUTED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'SUGGESTED':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'UNDER_REVIEW':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'APPROVED':
        return 'bg-success/10 text-success border-success/20';
      case 'REJECTED':
        return 'bg-error/10 text-error border-error/20';
      case 'COMPLETED':
        return 'bg-primary-button/10 text-primary-button border-primary-button/20';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
