import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '../../api/matchesApi';
import { PostCard } from '../../components/posts/PostCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { Handshake, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const SmartMatches: React.FC = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('SUGGESTED');
  const limit = 10;

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['my-matches', page, status],
    queryFn: () => matchesApi.getMatches({ page, limit, status }),
  });
  
  const data = queryData as any;

  const statuses = [
    { label: 'Suggested Matches', value: 'SUGGESTED' },
    { label: 'Dismissed Matches', value: 'DISMISSED' },
    { label: 'All Matches', value: '' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success bg-success/10 border-success/20';
    if (score >= 50) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-muted-text bg-light-beige border-taupe-border';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary-button" />
            Smart Matches
          </h1>
          <p className="text-muted-text mt-1">AI-suggested potential matches for your reported items.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            options={statuses}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-48"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start mb-6">
        <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Important: These are only suggestions.</p>
          <p className="text-blue-800/80">
            The Smart Match system uses AI to find potential matches based on location, time, and description. 
            It does not guarantee ownership. You must still verify claims carefully.
          </p>
        </div>
      </div>

      {isError ? (
        <ErrorState message={(error as any)?.message} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : data?.data?.items && data.data.items.length > 0 ? (
        <>
          <div className={`space-y-6 transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            {data.data.items.map((match: any) => (
              <div key={match._id} className="bg-surface rounded-xl border border-taupe-border overflow-hidden shadow-sm flex flex-col md:flex-row">
                {/* Match Score Strip */}
                <div className="md:w-32 bg-light-beige flex flex-row md:flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-taupe-border">
                  <span className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-0 md:mb-2 mr-3 md:mr-0">Match Score</span>
                  <div className={`flex items-center justify-center h-16 w-16 rounded-full border-4 ${getScoreColor(match.similarityScore)}`}>
                    <span className="text-xl font-bold">{Math.round(match.similarityScore)}%</span>
                  </div>
                </div>

                {/* Match Content */}
                <div className="flex-1 p-0 md:p-6 flex flex-col md:flex-row gap-6">
                  {/* Your Item */}
                  <div className="flex-1 p-4 md:p-0 border-b md:border-b-0 md:border-r border-taupe-border pr-0 md:pr-6">
                    <h3 className="text-sm font-semibold text-muted-text uppercase tracking-wider mb-3">Your Item</h3>
                    <PostCard post={match.post1} />
                  </div>

                  {/* Potential Match */}
                  <div className="flex-1 p-4 md:p-0 pl-0 md:pl-2">
                    <h3 className="text-sm font-semibold text-muted-text uppercase tracking-wider mb-3 flex items-center justify-between">
                      Potential Match
                      {match.status === 'SUGGESTED' && !match.viewedAt && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary-button/10 text-primary-button">New</span>
                      )}
                    </h3>
                    <PostCard post={match.post2} />
                  </div>
                </div>

                {/* Match Actions */}
                <div className="bg-light-beige p-4 flex items-center justify-between md:justify-end gap-3 border-t border-taupe-border md:w-full">
                  {match.status === 'SUGGESTED' ? (
                    <>
                      <Button variant="ghost" size="sm">Dismiss Suggestion</Button>
                      <Link to={`/posts/${match.post2._id}`}>
                        <Button size="sm" className="flex items-center gap-1">
                          View Details & Claim <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <span className="text-sm font-medium flex items-center gap-1.5 text-muted-text">
                      <Check className="h-4 w-4" /> Dismissed
                    </span>
                  )}
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
          icon={Handshake}
          title="No smart matches found"
          description="The AI hasn't found any potential matches for your items yet. We'll notify you if a match is found."
        />
      )}
    </div>
  );
};
