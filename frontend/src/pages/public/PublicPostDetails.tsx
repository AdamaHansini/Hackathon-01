import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { postsApi } from '../../api/postsApi';
import { useAuthStore } from '../../store/useAuthStore';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { Button } from '../../components/ui/Button';

export const PublicPostDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getPost(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-4">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.data?.post) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 w-full">
        <ErrorState message={(error as any)?.message || 'Post not found'} onRetry={refetch} />
      </div>
    );
  }

  const post = data.data.post;
  const isOwner = user?._id === (typeof post.userId === 'object' ? (post.userId as any)._id : post.userId);
  const isLost = post.type === 'LOST';

  const handleClaimInitiate = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    // Navigate to claim form
    navigate(`/posts/${id}/claim`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${isLost ? 'border-error/20 bg-error/5 text-error' : 'border-success/20 bg-success/5 text-success'}`}>
            {post.type}
          </span>
          <CategoryBadge category={post.category} />
          <StatusBadge status={post.status} />
        </div>
        
        {isOwner && (
          <Link to={`/my-posts/${post._id}`}>
            <Button variant="secondary" size="sm">Manage Post</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Images */}
        <div className="space-y-4">
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-light-beige border border-taupe-border">
            {post.images && post.images.length > 0 ? (
              <img 
                src={post.images[0].url} 
                alt={post.itemName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-muted-text">
                <span className="mb-2 block">No image provided</span>
              </div>
            )}
          </div>
          {post.images && post.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {post.images.slice(1).map((img, idx) => (
                <div key={idx} className="aspect-square overflow-hidden rounded-lg bg-light-beige border border-taupe-border">
                  <img src={img.url} alt={`${post.itemName} ${idx + 2}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-dark-text mb-4">{post.itemName}</h1>
          
          <div className="prose prose-sm max-w-none text-muted-text mb-8">
            <p className="whitespace-pre-wrap leading-relaxed">{post.publicDescription}</p>
          </div>
          
          <div className="space-y-4 mb-8 bg-surface border border-taupe-border rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wider mb-2">Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-primary-button/70 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-text uppercase tracking-wider font-medium">Location</p>
                  <p className="text-sm text-dark-text font-medium">{post.locationName}</p>
                  <p className="text-xs text-muted-text">{post.city}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 shrink-0 text-primary-button/70 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-text uppercase tracking-wider font-medium">Date</p>
                  <p className="text-sm text-dark-text font-medium">{format(new Date(post.lostOrFoundDate), 'MMMM d, yyyy')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 shrink-0 text-primary-button/70 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-text uppercase tracking-wider font-medium">Time</p>
                  <p className="text-sm text-dark-text font-medium">{post.lostOrFoundTime}</p>
                </div>
              </div>

              {post.color && (
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 shrink-0 rounded-full border border-taupe-border mt-0.5" style={{ backgroundColor: post.color.toLowerCase() }}></div>
                  <div>
                    <p className="text-xs text-muted-text uppercase tracking-wider font-medium">Color</p>
                    <p className="text-sm text-dark-text font-medium">{post.color}</p>
                  </div>
                </div>
              )}
            </div>

            {post.publicCharacteristics && post.publicCharacteristics.length > 0 && (
              <div className="mt-4 pt-4 border-t border-taupe-border">
                <p className="text-xs text-muted-text uppercase tracking-wider font-medium mb-2">Characteristics</p>
                <div className="flex flex-wrap gap-2">
                  {post.publicCharacteristics.map((char, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-light-beige text-xs font-medium text-dark-text">
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-auto">
            {!isOwner && post.status === 'ACTIVE' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">
                      {isLost ? 'Found this item?' : 'Is this your item?'}
                    </h4>
                    <p className="text-xs text-blue-800/80 mb-3 leading-relaxed">
                      {isLost 
                        ? 'Initiate a claim to connect with the owner. You will need to provide proof or answer verification questions to ensure a safe return.'
                        : 'Initiate a claim to verify ownership. The finder has set up verification questions to ensure the item goes to its rightful owner.'}
                    </p>
                    <Button onClick={handleClaimInitiate} className="w-full sm:w-auto">
                      {isLost ? 'I found this' : 'Claim this item'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-text border-t border-taupe-border pt-4">
              <span>Posted {format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
              <button className="flex items-center gap-1 hover:text-dark-text transition-colors">
                <AlertTriangle className="h-3 w-3" /> Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
