import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { RoleRoute } from '../components/layout/RoleRoute';
import { Landing } from '../pages/public/Landing';
import { Search } from '../pages/public/Search';
import { PublicPostDetails } from '../pages/public/PublicPostDetails';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { Dashboard } from '../pages/user/Dashboard';
import { CreatePost } from '../pages/user/CreatePost';
import { MyPosts } from '../pages/user/MyPosts';
import { ManagePost } from '../pages/user/ManagePost';
import { SmartMatches } from '../pages/user/SmartMatches';
import { Claims } from '../pages/user/Claims';
import { ClaimPost } from '../pages/user/ClaimPost';
import { Messages } from '../pages/user/Messages';
import { Notifications } from '../pages/user/Notifications';
import { ProfileSettings } from '../pages/user/ProfileSettings';
import { ModeratorDashboard } from '../pages/moderator/ModeratorDashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Landing />,
      },
      {
        path: 'search',
        element: <Search />,
      },
      {
        path: 'posts/:id',
        element: <PublicPostDetails />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'forgot-password',
        element: <div className="p-8">Forgot Password Placeholder</div>,
      },
      {
        path: 'reset-password/:token',
        element: <div className="p-8">Reset Password Placeholder</div>,
      },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'my-posts',
        element: <MyPosts />,
      },
      {
        path: 'my-posts/:id',
        element: <ManagePost />,
      },
      {
        path: 'posts/create',
        element: <CreatePost />,
      },
      {
        path: 'posts/:id/claim',
        element: <ClaimPost />,
      },
      {
        path: 'matches',
        element: <SmartMatches />,
      },
      {
        path: 'claims',
        element: <Claims />,
      },
      {
        path: 'messages',
        element: <Messages />,
      },
      {
        path: 'notifications',
        element: <Notifications />,
      },
      {
        path: 'profile',
        element: <ProfileSettings />,
      },
      // Moderator Routes
      {
        path: 'moderator',
        element: (
          <RoleRoute allowedRoles={['MODERATOR', 'ADMIN']}>
            <ModeratorDashboard />
          </RoleRoute>
        ),
      },
      {
        path: 'moderator/reports',
        element: (
          <RoleRoute allowedRoles={['MODERATOR', 'ADMIN']}>
            <div>Moderator Reports Placeholder</div>
          </RoleRoute>
        ),
      },
      // Admin Routes
      {
        path: 'admin',
        element: (
          <RoleRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </RoleRoute>
        ),
      },
    ],
  },
]);

