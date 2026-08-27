import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../../store/useToastStore';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
    // Remove /api from base url to get the root server URL for socket.io
    const SOCKET_URL = API_BASE_URL.replace('/api', '');

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to real-time server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from real-time server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Handle global events
    newSocket.on('notification', (data: any) => {
      toast.info(data?.title || 'New Notification');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    newSocket.on('new_message', () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    newSocket.on('match_found', () => {
      toast.success('A new potential match was found!');
      queryClient.invalidateQueries({ queryKey: ['my-matches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });
    
    newSocket.on('claim_update', () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['post-claims'] });
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('notification');
      newSocket.off('new_message');
      newSocket.off('match_found');
      newSocket.off('claim_update');
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
