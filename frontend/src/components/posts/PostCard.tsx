import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ItemPost } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { CategoryBadge } from '../ui/CategoryBadge';

interface PostCardProps {
  post: ItemPost;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const isLost = post.type === 'LOST';
  const typeStyles = isLost 
    ? 'border-error/20 bg-error/5 text-error' 
    : 'border-success/20 bg-success/5 text-success';

  return (
    <Link 
      to={`/posts/${post._id}`}
      className="group block overflow-hidden rounded-xl bg-surface border border-taupe-border shadow-sm hover:shadow-md transition-all hover:border-primary-button/30"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-light-beige">
        {post.images && post.images.length > 0 ? (
          <img 
            src={post.images[0].url} 
            alt={post.itemName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-muted-text/50">No image</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${typeStyles}`}>
            {post.type}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <StatusBadge status={post.status} />
        </div>
      </div>
      
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-dark-text line-clamp-1 group-hover:text-primary-button transition-colors">
            {post.itemName}
          </h3>
          <CategoryBadge category={post.category} className="shrink-0" />
        </div>
        
        <p className="text-sm text-muted-text line-clamp-2 mb-4">
          {post.publicDescription}
        </p>
        
        <div className="space-y-2 text-xs font-medium text-muted-text">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary-button/70" />
            <span className="line-clamp-1">{post.locationName || post.city}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary-button/70" />
              <span>{format(new Date(post.lostOrFoundDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary-button/70" />
              <span>{post.lostOrFoundTime}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
