import { Navigate, useLocation } from 'react-router';
import { ErrorBox } from '@/components/ErrorBox';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { Button } from '@/components/ui/button';
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
  const {
    appUser,
    isBootstrapLoading,
    isAuth0Loading,
    isAuth0Authenticated,
    role,
    error,
    signOut,
  } = useAuthContext();
  const location = useLocation();

  // Never make unauthenticated decisions until the SDK has finished restoring auth state.
  if (isAuth0Loading || isBootstrapLoading) {
    return <FullScreenLoading />;
  }

  if (!isAuth0Authenticated) {
    return (
      <Navigate
        replace
        to={AuthRoutes.signIn(undefined, {
          continue: location.pathname,
        })}
      />
    );
  }

  if (!appUser) {
    if (error) {
      return (
        <div className="mx-auto flex min-h-[50vh] max-w-lg items-center p-6">
          <div className="w-full space-y-4">
            <ErrorBox message={error} />
            <Button
              onClick={() => void signOut()}
              type="button"
              variant="outline"
            >
              Sign out
            </Button>
          </div>
        </div>
      );
    }

    return <FullScreenLoading />;
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
