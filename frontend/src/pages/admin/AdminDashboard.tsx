import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Users, Package, AlertOctagon, TrendingUp } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark-text">Admin Dashboard</h1>
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
        <h1 className="text-2xl font-bold text-dark-text">Admin Dashboard</h1>
        <ErrorState message={(error as any)?.message} onRetry={refetch} />
      </div>
    );
  }

  const stats = data?.data?.stats || {};
  const recentUsers = data?.data?.recentUsers || [];

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Posts',
      value: stats.totalPosts || 0,
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Recovery Rate',
      value: `${stats.recoveryRate || 0}%`,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Suspended Users',
      value: stats.suspendedUsers || 0,
      icon: AlertOctagon,
      color: 'text-error',
      bgColor: 'bg-error/10',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Admin Dashboard</h1>
          <p className="text-muted-text mt-1">Platform-wide statistics and management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-surface rounded-xl p-5 border border-taupe-border shadow-sm flex flex-col relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            
            <div className="mt-auto">
              <h3 className="text-3xl font-bold text-dark-text">{card.value}</h3>
              <p className="text-sm font-medium text-muted-text mt-1">
                {card.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-surface rounded-xl border border-taupe-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-text">Recent Users</h2>
            <button className="text-sm font-medium text-primary-button hover:text-primary-hover">View All</button>
          </div>
          
          {recentUsers.length > 0 ? (
            <div className="divide-y divide-taupe-border">
              {recentUsers.map((user: any) => (
                <div key={user._id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-light-beige flex items-center justify-center text-primary-button font-bold text-xs border border-taupe-border">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-text">{user.name}</p>
                      <p className="text-xs text-muted-text">{user.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-text bg-light-beige/50 rounded-lg border border-dashed border-taupe-border">
              No recent users.
            </div>
          )}
        </div>
        
        <div className="bg-surface rounded-xl border border-taupe-border p-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Platform Health</h2>
          <div className="flex items-center justify-center h-48 text-muted-text bg-light-beige/50 rounded-lg border border-dashed border-taupe-border">
            Analytics charts will appear here.
          </div>
        </div>
      </div>
    </div>
  );
};
