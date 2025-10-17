import { Navigate, useLocation } from 'react-router';
import { AuthRoutes } from '@/constants/routes';
import { useAuthContext } from './hooks/useAuthContext';
import { useIsAuthenticated } from './hooks/useIsAuthenticated';

interface ProtectedPageProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  teacherOnly?: boolean;
  studentOnly?: boolean;
}

export const ProtectedPage = ({
  children,
  adminOnly,
  teacherOnly,
  studentOnly,
}: ProtectedPageProps) => {
  const isAuthenticated = useIsAuthenticated();
  const { role } = useAuthContext();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        to={AuthRoutes.signIn(undefined, {
          continue: location.pathname,
        })}
      />
    );
  }

  if (adminOnly && role !== 'admin') {
    return <Navigate replace to={AuthRoutes.root()} />;
  }

  if (teacherOnly && role !== 'teacher') {
    return <Navigate replace to={AuthRoutes.root()} />;
  }

  if (studentOnly && role !== 'student') {
    return <Navigate replace to={AuthRoutes.root()} />;
  }

  return <>{children}</>;
};
