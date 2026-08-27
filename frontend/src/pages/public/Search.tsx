import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../api/searchApi';
import { PostCard } from '../../components/posts/PostCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../utils/cn';

export const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialQ = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const currentType = searchParams.get('type') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentCity = searchParams.get('city') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 12;

  useEffect(() => {
    if (debouncedSearchTerm !== searchParams.get('q')) {
      updateParams({ q: debouncedSearchTerm, page: '1' });
    }
  }, [debouncedSearchTerm]);

  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params);
  };

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['search-posts', debouncedSearchTerm, currentType, currentCategory, currentCity, page],
    queryFn: () => searchApi.searchPosts({
      q: debouncedSearchTerm,
      type: currentType,
      category: currentCategory,
      city: currentCity,
      page,
      limit,
    }),
  });
  
  const data = queryData as any;

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories = [
    { label: 'All Categories', value: '' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Documents', value: 'Documents' },
    { label: 'Wallet', value: 'Wallet' },
    { label: 'Keys', value: 'Keys' },
    { label: 'Bags', value: 'Bags' },
    { label: 'Jewelry', value: 'Jewelry' },
    { label: 'Clothing', value: 'Clothing' },
    { label: 'Pets', value: 'Pets' },
    { label: 'Other', value: 'Other' },
  ];

  const types = [
    { label: 'All Types', value: '' },
    { label: 'Lost Items', value: 'LOST' },
    { label: 'Found Items', value: 'FOUND' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Filters Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-dark-text mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </h2>
            <div className="space-y-4 bg-surface p-4 rounded-xl border border-taupe-border">
              <Input
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <Select
                options={types}
                value={currentType}
                onChange={(e) => updateParams({ type: e.target.value, page: '1' })}
              />
              <Select
                options={categories}
                value={currentCategory}
                onChange={(e) => updateParams({ category: e.target.value, page: '1' })}
              />
              <Input
                placeholder="City (e.g., Hyderabad)"
                value={currentCity}
                onChange={(e) => updateParams({ city: e.target.value, page: '1' })}
              />
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-dark-text">Explore Items</h1>
            {!isLoading && data?.data?.pagination && (
              <p className="text-sm text-muted-text">
                Showing <span className="font-medium text-dark-text">{data.data.pagination.total}</span> results
              </p>
            )}
          </div>

          {isError ? (
            <ErrorState message={(error as any)?.message} onRetry={refetch} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
              ))}
            </div>
          ) : data?.data?.items && data.data.items.length > 0 ? (
            <>
              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200",
                isFetching ? "opacity-50" : "opacity-100"
              )}>
                {data.data.items.map((post: any) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
              
              {data.data.pagination && (
                <Pagination 
                  page={data.data.pagination.page}
                  totalPages={data.data.pagination.pages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          ) : (
            <EmptyState 
              icon={SearchIcon}
              title="No items found"
              description="Try adjusting your filters or search terms to find what you're looking for."
            />
          )}
        </div>
      </div>
    </div>
  );
};
