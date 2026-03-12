import { Navigate, useLocation } from 'react-router';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { AuthRoutes } from '@/constants/routes';
import { useAuthContext } from './hooks/useAuthContext';

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
  const { appUser, isBootstrapLoading, role } = useAuthContext();
  const location = useLocation();

  if (isBootstrapLoading) {
    return <FullScreenLoading />;
  }

  if (!appUser) {
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
