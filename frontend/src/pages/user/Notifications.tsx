import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notificationsApi';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Bell, Check, Trash2, Handshake, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/cn';

export const Notifications: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 15;
  const queryClient = useQueryClient();

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationsApi.getNotifications({ page, limit }),
  });
  
  const data = queryData as any;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'MATCH_FOUND':
        return <Handshake className="h-5 w-5 text-warning" />;
      case 'CLAIM_CREATED':
      case 'CLAIM_UPDATED':
        return <CheckCircle2 className="h-5 w-5 text-indigo-600" />;
      case 'NEW_MESSAGE':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'SYSTEM_ALERT':
        return <AlertTriangle className="h-5 w-5 text-error" />;
      default:
        return <Bell className="h-5 w-5 text-muted-text" />;
    }
  };

  const handleActionClick = (notification: any) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification._id);
    }
    // Optional: handle routing based on entityId and type
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary-button" />
            Notifications
          </h1>
          <p className="text-muted-text mt-1">Stay updated on your items and claims.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || !data?.data?.items?.some((n: any) => !n.isRead)}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState message={(error as any)?.message} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : data?.data?.items && data.data.items.length > 0 ? (
        <>
          <div className={`bg-surface border border-taupe-border rounded-xl overflow-hidden divide-y divide-taupe-border transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
            {data.data.items.map((notification: any) => (
              <div 
                key={notification._id} 
                className={cn(
                  "p-4 flex items-start gap-4 hover:bg-light-beige/50 transition-colors group cursor-pointer",
                  !notification.isRead ? "bg-soft-nude/30" : ""
                )}
                onClick={() => handleActionClick(notification)}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                  !notification.isRead ? "bg-white border-primary-button/20 shadow-sm" : "bg-light-beige border-taupe-border"
                )}>
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className={cn("text-sm truncate", !notification.isRead ? "font-bold text-dark-text" : "font-medium text-dark-text")}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-muted-text shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={cn("text-sm line-clamp-2", !notification.isRead ? "text-dark-text/90" : "text-muted-text")}>
                    {notification.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!notification.isRead && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notification._id); }}
                      className="p-1.5 text-muted-text hover:text-primary-button rounded-md hover:bg-white transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notification._id); }}
                    className="p-1.5 text-muted-text hover:text-error rounded-md hover:bg-white transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
          icon={Bell}
          title="All caught up!"
          description="You don't have any notifications at the moment."
        />
      )}
    </div>
  );
};
