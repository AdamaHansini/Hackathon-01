import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { postsApi } from '../../api/postsApi';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { AlertCircle, Handshake, ShieldCheck, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

export const ManagePost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['manage-post', id],
    queryFn: () => postsApi.getPost(id!),
    enabled: !!id,
  });

  const { data: claimsData } = useQuery({
    queryKey: ['post-claims', id],
    queryFn: () => postsApi.getPostClaims(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.data?.post) {
    return (
      <div className="space-y-6">
        <ErrorState message={(error as any)?.message || 'Post not found'} onRetry={refetch} />
      </div>
    );
  }

  const post = data.data.post;
  const isLost = post.type === 'LOST';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${isLost ? 'border-error/20 bg-error/5 text-error' : 'border-success/20 bg-success/5 text-success'}`}>
              {post.type}
            </span>
            <StatusBadge status={post.status} />
          </div>
          <h1 className="text-2xl font-bold text-dark-text">{post.itemName}</h1>
          <p className="text-sm text-muted-text mt-1">Reported on {format(new Date(post.createdAt), 'MMMM d, yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">Edit Post</Button>
          <Link to={`/posts/${post._id}`}>
            <Button variant="outline" size="sm">View Public Page</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-taupe-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Post Status</h2>
            
            <div className="bg-light-beige rounded-lg p-4 flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shrink-0 border border-taupe-border">
                {post.status === 'ACTIVE' && <RefreshCcw className="h-5 w-5 text-blue-600" />}
                {post.status === 'MATCHED' && <Handshake className="h-5 w-5 text-warning" />}
                {post.status === 'CLAIMED' && <AlertCircle className="h-5 w-5 text-indigo-600" />}
                {post.status === 'VERIFIED' && <ShieldCheck className="h-5 w-5 text-success" />}
              </div>
              
              <div>
                <h3 className="font-semibold text-dark-text mb-1">
                  {post.status === 'ACTIVE' && 'Your post is active'}
                  {post.status === 'MATCHED' && 'Potential matches found'}
                  {post.status === 'CLAIMED' && 'Someone has claimed this item'}
                  {post.status === 'VERIFIED' && 'Claim verified'}
                </h3>
                <p className="text-sm text-muted-text mb-3">
                  {post.status === 'ACTIVE' && 'We are actively looking for matches. You can also review incoming claims manually.'}
                  {post.status === 'MATCHED' && 'Check your smart matches to review suggestions.'}
                  {post.status === 'CLAIMED' && 'Review the claims below and verify ownership.'}
                </p>
                
                {post.status === 'ACTIVE' && (
                  <Link to="/matches">
                    <Button size="sm">View Matches</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface border border-taupe-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Verification Questions</h2>
            <p className="text-sm text-muted-text mb-4">
              {isLost 
                ? 'Add questions that only the true finder would know (e.g., "What color is the case?").'
                : 'Add questions that only the true owner would know (e.g., "What is the lock screen wallpaper?").'}
            </p>
            
            <div className="bg-light-beige border border-dashed border-taupe-border rounded-lg p-8 flex flex-col items-center justify-center text-center">
              <ShieldCheck className="h-8 w-8 text-muted-text/50 mb-3" />
              <p className="text-sm font-medium text-dark-text mb-1">No verification questions added</p>
              <p className="text-xs text-muted-text mb-4">Adding questions helps prevent fraudulent claims.</p>
              <Button variant="secondary" size="sm">Add Question</Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-surface border border-taupe-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Incoming Claims</h2>
            
            {claimsData?.data?.items && claimsData.data.items.length > 0 ? (
              <div className="space-y-3">
                {claimsData.data.items.map((claim: any) => (
                  <div key={claim._id} className="border border-taupe-border rounded-lg p-3 hover:bg-light-beige transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-dark-text">Claim #{claim._id.substring(claim._id.length - 6)}</span>
                      <StatusBadge status={claim.status} />
                    </div>
                    <Link to={`/claims/${claim._id}`}>
                      <Button variant="ghost" size="sm" className="w-full text-xs mt-2">Review Claim</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-text text-sm">
                No claims have been made on this item yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
