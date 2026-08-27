import React from 'react';
import { cn } from '../../utils/cn';

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-soft-nude text-dark-text border border-taupe-border',
        className
      )}
    >
      {category}
    </span>
  );
};
