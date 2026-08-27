import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="px-2"
        aria-label="Previous Page"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="flex items-center space-x-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          // Show first, last, current, and adjacent pages
          if (
            p === 1 ||
            p === totalPages ||
            (p >= page - 1 && p <= page + 1)
          ) {
            return (
              <Button
                key={p}
                variant={p === page ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(p)}
                className="w-8 h-8 p-0 flex items-center justify-center"
              >
                {p}
              </Button>
            );
          }
          // Show ellipsis
          if (p === page - 2 || p === page + 2) {
            return <span key={p} className="text-muted-text px-1">...</span>;
          }
          return null;
        })}
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="px-2"
        aria-label="Next Page"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
};
