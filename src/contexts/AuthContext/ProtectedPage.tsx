import { Navigate, useLocation } from 'react-router';
import { ErrorBox } from '@/components/ErrorBox';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { Button } from '@/components/ui/button';
import { AdminRoutes, AuthRoutes } from '@/constants/routes';
import { isConsoleRole } from '@/features/admin/consoleRoles';
import { useAuthContext } from './hooks/useAuthContext';

interface ProtectedPageProps {
  children: React.ReactNode;
  /**
   * Gate on the console. Named for the role that had it first; it now admits
   * content editors too, and the routes inside AdminPages narrow further —
   * an editor reaches only the Content tab.
   */
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

  if (adminOnly && !isConsoleRole(role)) {
    return <Navigate replace to={AuthRoutes.root()} />;
  }

  if (teacherOnly && role !== 'teacher') {
    return <Navigate replace to={AuthRoutes.root()} />;
  }

  if (studentOnly && role !== 'student') {
    return <Navigate replace to={AuthRoutes.root()} />;
  }

  // Console users have no business in the student/teacher app — send them home.
  // This covers editors as well as admins; an editor with no branch here would
  // be able to wander into a teacher surface their role does not cover.
  if (!adminOnly && isConsoleRole(role)) {
    return <Navigate replace to={AdminRoutes.root()} />;
  }

  return <>{children}</>;
};
