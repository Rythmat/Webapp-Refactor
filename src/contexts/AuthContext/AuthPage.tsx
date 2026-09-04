import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { AdminRoutes, ProfileRoutes } from '@/constants/routes';
import { isConsoleRole } from '@/features/admin/consoleRoles';
import { useAuthContext } from './hooks/useAuthContext';

export const AuthPage = ({ children }: { children: React.ReactNode }) => {
  const { role, appUser, isBootstrapLoading } = useAuthContext();
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const isSignupCompletionPath =
    currentPath.startsWith('/auth/join/student') ||
    currentPath.startsWith('/auth/join/teacher');

  useEffect(() => {
    if (isBootstrapLoading || !appUser || isSignupCompletionPath) {
      return;
    }

    // Admins and content editors both live in the console; /console then routes
    // each of them to the landing page their role can actually open.
    if (isConsoleRole(role)) {
      navigate(AdminRoutes.root());
      return;
    }

    if (role === 'teacher' || role === 'student') {
      navigate(ProfileRoutes.root());
    }
  }, [appUser, isBootstrapLoading, isSignupCompletionPath, navigate, role]);

  if (isBootstrapLoading) {
    return <FullScreenLoading />;
  }

  if (!appUser || isSignupCompletionPath) {
    return <>{children}</>;
  }

  return <>{children}</>;
};
