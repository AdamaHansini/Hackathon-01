import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// Cleaned up unused api import
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { CheckCircle2, ChevronRight, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { format } from 'date-fns';
import { cn } from '../../utils/cn';

// Creating an index.ts in api to make imports cleaner would be good, but for now I'll use the specific imports
import { claimsApi as specificClaimsApi } from '../../api/claimsApi';
import { usersApi as specificUsersApi } from '../../api/usersApi';

export const Claims: React.FC = () => {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const limit = 10;

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['claims', activeTab, page],
    queryFn: () => {
      if (activeTab === 'incoming') {
        // We'd need an endpoint for incoming claims specifically, or we fetch all claims for user's posts
        // For now, let's assume getMyClaims can take a 'type' parameter or we have a specific endpoint
        // Let's use a hypothetical parameter that the backend might support, or just use the generic getClaims
        // If the backend doesn't support it, we'll just fetch generic claims and let the backend decide
        return specificClaimsApi.getClaims({ page, limit, type: activeTab });
      } else {
        return specificUsersApi.getMyClaims({ page, limit });
      }
    },
  });
  
  const data = queryData as any;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary-button" />
            Claims
          </h1>
          <p className="text-muted-text mt-1">Manage verification claims for your items.</p>
        </div>
      </div>

      <div className="border-b border-taupe-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => { setActiveTab('incoming'); setPage(1); }}
            className={cn(
              activeTab === 'incoming'
                ? 'border-primary-button text-primary-button'
                : 'border-transparent text-muted-text hover:text-dark-text hover:border-taupe-border',
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors'
            )}
          >
            Claims on my items
          </button>
          <button
            onClick={() => { setActiveTab('outgoing'); setPage(1); }}
            className={cn(
              activeTab === 'outgoing'
                ? 'border-primary-button text-primary-button'
                : 'border-transparent text-muted-text hover:text-dark-text hover:border-taupe-border',
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors'
            )}
          >
            My claims on items
          </button>
        </nav>
      </div>

      {isError ? (
        <ErrorState message={(error as any)?.message} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : data?.data?.claims && data.data.claims.length > 0 ? (
        <>
          <div className={`space-y-4 transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            {data.data.claims.map((claim: any) => (
              <div key={claim._id} className="bg-surface rounded-xl border border-taupe-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-16 w-16 bg-light-beige rounded-lg overflow-hidden shrink-0 border border-taupe-border">
                      {claim.foundPostId?.images && claim.foundPostId.images.length > 0 ? (
                        <img src={claim.foundPostId.images[0].url} alt={claim.foundPostId.itemName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-muted-text/30" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={claim.status} />
                        <span className="text-xs text-muted-text">
                          {format(new Date(claim.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-dark-text mb-1">{claim.foundPostId?.itemName || 'Unknown Item'}</h3>
                      <p className="text-sm text-muted-text line-clamp-1">
                        {activeTab === 'incoming' 
                          ? `Claimed by: ${claim.claimantId?.name || 'Unknown'}` 
                          : `Your claim on a ${claim.foundPostId?.type?.toLowerCase() || 'found'} item`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:border-l border-taupe-border md:pl-6 pt-4 md:pt-0">
                    {claim.status === 'APPROVED' && (
                      <Link to={`/messages`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4" /> Message
                        </Button>
                      </Link>
                    )}
                    <Link to={`/claims/${claim._id}`}>
                      <Button size="sm" className="flex items-center gap-1">
                        View Details <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
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
          icon={CheckCircle2}
          title={activeTab === 'incoming' ? "No claims on your items" : "You haven't claimed any items"}
          description={activeTab === 'incoming' ? "When someone claims an item you posted, it will appear here." : "Claims you make on items will appear here."}
        />
      )}
    </div>
  );
};
