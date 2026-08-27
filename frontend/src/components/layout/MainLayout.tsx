import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ToastContainer } from '../ui/ToastContainer';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
};
