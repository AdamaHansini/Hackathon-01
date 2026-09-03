import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { moderatorApi } from '../../api/moderatorApi';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ShieldCheck, AlertTriangle, Users, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ModeratorDashboard: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['moderator-dashboard'],
    queryFn: () => moderatorApi.getDashboard(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark-text">Moderator Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark-text">Moderator Dashboard</h1>
        <ErrorState message={(error as any)?.message} onRetry={refetch} />
      </div>
    );
  }

  const stats = data?.data?.stats || {};

  const statCards = [
    {
      title: 'Pending Reports',
      value: stats.pendingReports || 0,
      icon: AlertTriangle,
      color: 'text-error',
      bgColor: 'bg-error/10',
      link: '/moderator/reports'
    },
    {
      title: 'Posts Under Review',
      value: stats.postsUnderReview || 0,
      icon: FileText,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      link: '/moderator/reports'
    },
    {
      title: 'Suspicious Activity',
      value: stats.suspiciousActivity || 0,
      icon: ShieldCheck,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      link: '/moderator/reports'
    },
    {
      title: 'Resolved Today',
      value: stats.resolvedToday || 0,
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
      link: '/moderator/reports'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Moderator Dashboard</h1>
          <p className="text-muted-text mt-1">Platform overview and moderation queues.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-surface rounded-xl p-5 border border-taupe-border flex flex-col relative overflow-hidden group">
            {card.link ? (
              <Link to={card.link} className="absolute inset-0 z-10" aria-label={`View ${card.title}`} />
            ) : null}
            
            <div className="flex items-center justify-between mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            
            <div className="mt-auto">
              <h3 className="text-3xl font-bold text-dark-text">{card.value}</h3>
              <p className="text-sm font-medium text-muted-text mt-1 group-hover:text-primary-button transition-colors">
                {card.title} {card.link && '→'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-surface rounded-xl border border-taupe-border p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Recent Reports</h2>
          <div className="flex items-center justify-center h-48 text-muted-text bg-light-beige/50 rounded-lg border border-dashed border-taupe-border">
            Recent reports will appear here.
          </div>
        </div>
        
        <div className="bg-surface rounded-xl border border-taupe-border p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Pending Verifications</h2>
          <div className="flex items-center justify-center h-48 text-muted-text bg-light-beige/50 rounded-lg border border-dashed border-taupe-border">
            High-value claims awaiting manual review.
          </div>
        </div>
      </div>
    </div>
  );
};
