import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { AdminRoutes, ProfileRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

const LandingPage = lazy(() =>
  import('./LandingPage').then(({ LandingPage }) => ({
    default: LandingPage,
  })),
);

/**
 * Root gate. Logged-out visitors see the public landing page; authenticated
 * users are sent to their home surface (same role routing as `WildcardPage`).
 * Mounted at `/`.
 */
export const LandingGate = () => {
  const { role, isBootstrapLoading } = useAuthContext();

  if (isBootstrapLoading) {
    return <FullScreenLoading />;
  }

  if (role === 'admin') {
    return <Navigate to={AdminRoutes.root()} replace />;
  }
  if (role === 'teacher' || role === 'student') {
    return <Navigate to={ProfileRoutes.root()} replace />;
  }

  return (
    <Suspense fallback={<FullScreenLoading />}>
      <LandingPage />
    </Suspense>
  );
};
