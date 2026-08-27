import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  LayoutDashboard, 
  PackageSearch, 
  Handshake, 
  CheckCircle2, 
  Bell, 
  MessageSquare, 
  Settings,
  ShieldCheck,
  Users
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Posts', href: '/my-posts', icon: PackageSearch },
  { name: 'Smart Matches', href: '/matches', icon: Handshake },
  { name: 'Claims', href: '/claims', icon: CheckCircle2 },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/profile', icon: Settings },
];

const moderatorItems: NavItem[] = [
  { name: 'Mod Dashboard', href: '/moderator', icon: ShieldCheck, roles: ['MODERATOR', 'ADMIN'] },
  { name: 'Reports', href: '/moderator/reports', icon: ShieldCheck, roles: ['MODERATOR', 'ADMIN'] },
];

const adminItems: NavItem[] = [
  { name: 'Admin Panel', href: '/admin', icon: Users, roles: ['ADMIN'] },
];

export const Sidebar: React.FC = () => {
  const { role } = useAuthStore();

  const renderLinks = (items: NavItem[]) => {
    return items.filter(item => !item.roles || item.roles.includes(role || '')).map((item) => (
      <NavLink
        key={item.name}
        to={item.href}
        end={item.href === '/dashboard' || item.href === '/moderator' || item.href === '/admin'}
        className={({ isActive }) =>
          cn(
            'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
            isActive
              ? 'bg-soft-nude text-primary-button'
              : 'text-muted-text hover:bg-light-beige hover:text-dark-text'
          )
        }
      >
        <item.icon className={cn('mr-3 flex-shrink-0 h-5 w-5')} aria-hidden="true" />
        {item.name}
      </NavLink>
    ));
  };

  return (
    <div className="flex flex-col w-64 flex-shrink-0 border-r border-taupe-border bg-surface h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex-1 px-3 py-4 space-y-1">
        {renderLinks(navItems)}
        
        {(role === 'MODERATOR' || role === 'ADMIN') && (
          <div className="pt-6 mt-6 border-t border-taupe-border">
            <h3 className="px-3 text-xs font-semibold text-muted-text uppercase tracking-wider mb-2">
              Moderation
            </h3>
            <div className="space-y-1">
              {renderLinks(moderatorItems)}
            </div>
          </div>
        )}

        {role === 'ADMIN' && (
          <div className="pt-6 mt-6 border-t border-taupe-border">
            <h3 className="px-3 text-xs font-semibold text-muted-text uppercase tracking-wider mb-2">
              Administration
            </h3>
            <div className="space-y-1">
              {renderLinks(adminItems)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
