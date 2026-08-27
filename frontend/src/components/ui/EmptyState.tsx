import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-taupe-border bg-surface w-full">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-light-beige mb-4">
        <Icon className="h-6 w-6 text-muted-text" />
      </div>
      <h3 className="text-lg font-medium text-dark-text mb-1">{title}</h3>
      <p className="text-sm text-muted-text mb-4 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
