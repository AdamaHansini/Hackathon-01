import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/usersApi';
import { PostCard } from '../../components/posts/PostCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { PackageSearch, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const MyPosts: React.FC = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const limit = 12;

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['my-posts', page, status],
    queryFn: () => usersApi.getMyPosts({ page, limit, status }),
  });
  
  const data = queryData as any;

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Matched', value: 'MATCHED' },
    { label: 'Claimed', value: 'CLAIMED' },
    { label: 'Verified', value: 'VERIFIED' },
    { label: 'Returned', value: 'RETURNED' },
    { label: 'Expired', value: 'EXPIRED' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">My Posts</h1>
          <p className="text-muted-text mt-1">Manage the items you have reported as lost or found.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            options={statuses}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
          <Link to="/posts/create">
            <Button size="sm" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Report Item
            </Button>
          </Link>
        </div>
      </div>

      {isError ? (
        <ErrorState message={(error as any)?.message} onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      ) : data?.data?.items && data.data.items.length > 0 ? (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            {data.data.items.map((post: any) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
          
          {data.data.pagination && (
            <Pagination 
              page={data.data.pagination.page}
              totalPages={data.data.pagination.pages}
              onPageChange={setPage}
            />
          )}
        </>
      ) : (
        <EmptyState 
          icon={PackageSearch}
          title="No posts found"
          description={status ? `You don't have any posts with the status "${status}".` : "You haven't reported any lost or found items yet."}
          action={
            <Link to="/posts/create" className="mt-4 inline-block">
              <Button variant="outline">Create your first post</Button>
            </Link>
          }
        />
      )}
    </div>
  );
};
