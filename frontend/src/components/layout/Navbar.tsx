import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/authApi';
import { Button } from '../ui/Button';
import { Search, Menu, LogOut } from 'lucide-react';
import { toast } from '../../store/useToastStore';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to logout');
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-taupe-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-primary-button">LostLink</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/search" className="text-sm font-medium text-muted-text hover:text-dark-text transition-colors flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              Explore Items
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-4">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
                <Link to="/posts/create">
                  <Button variant="primary" size="sm">Report Item</Button>
                </Link>
                <div className="h-6 w-px bg-taupe-border" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-dark-text">{user?.name}</span>
                  <button onClick={handleLogout} className="text-muted-text hover:text-error transition-colors p-1" aria-label="Logout">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button className="md:hidden p-2 text-dark-text">
                <Menu className="h-6 w-6" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
