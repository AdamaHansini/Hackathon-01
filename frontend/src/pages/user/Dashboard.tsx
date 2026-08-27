import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/usersApi';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuthStore } from '../../store/useAuthStore';
import { Package, Handshake, CheckCircle2, ShieldCheck, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => usersApi.getDashboard(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark-text">Dashboard</h1>
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
        <h1 className="text-2xl font-bold text-dark-text">Dashboard</h1>
        <ErrorState message={(error as any)?.message} onRetry={refetch} />
      </div>
    );
  }

  const stats = data?.data?.stats;

  const statCards = [
    {
      title: 'Active Posts',
      value: (stats?.activeLostPosts || 0) + (stats?.activeFoundPosts || 0),
      icon: Package,
      link: '/my-posts',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Potential Matches',
      value: stats?.potentialMatches || 0,
      icon: Handshake,
      link: '/matches',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Pending Claims',
      value: stats?.pendingClaims || 0, // Fallback if missing
      icon: CheckCircle2,
      link: '/claims',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'Items Recovered',
      value: user?.recoveredItemsCount || 0,
      icon: RefreshCcw,
      color: 'text-success',
      bgColor: 'bg-success/10'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-muted-text mt-1">Here's an overview of your activity on LostLink.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface border border-taupe-border rounded-lg px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-light-beige">
            <ShieldCheck className="h-5 w-5 text-primary-button" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-text uppercase tracking-wider">Trust Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-dark-text">{user?.trustScore}</span>
              <span className="text-sm text-muted-text">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-surface rounded-xl p-5 border border-taupe-border shadow-sm flex flex-col relative overflow-hidden group">
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

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-dark-text mb-4">Recent Activity</h2>
        {/* We would fetch recent notifications or a dedicated activity feed endpoint here */}
        <div className="bg-surface rounded-xl border border-taupe-border p-8 text-center text-muted-text">
          No recent activity to display.
        </div>
      </div>
    </div>
  );
};
