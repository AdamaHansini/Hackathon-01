import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { axiosClient } from './api/axiosClient';
import { SocketProvider } from './components/common/SocketProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { setAuth, clearAuth, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await axiosClient.get('/auth/me');
        if (((response as any).success || response.data?.success) && response.data?.user) {
          setAuth(response.data.user);
        } else {
          clearAuth();
        }
      } catch (error) {
        clearAuth();
      } finally {
        setInitialized();
      }
    };

    initAuth();
  }, [setAuth, clearAuth, setInitialized]);

  // Global unauthorized listener
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [clearAuth]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-taupe-border border-t-primary-button"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <RouterProvider router={router} />
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
