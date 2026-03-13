import { Navigate } from 'react-router-dom';
import { FullScreenLoading } from '@/components/FullScreenLoading';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { AdminRoutes, AuthRoutes, ProfileRoutes } from '../constants/routes';

export const WildcardPage = () => {
  const { role, isBootstrapLoading } = useAuthContext();
  const search = window.location.search;
  const callbackParams = new URLSearchParams(search);
  const hasAuth0CallbackParams =
    callbackParams.has('code') && callbackParams.has('state');

  // Keep callback params in-place until Auth0 SDK has a chance to process them.
  if (hasAuth0CallbackParams || isBootstrapLoading) {
    return <FullScreenLoading />;
  }

  if (role === 'admin') {
    return <Navigate to={AdminRoutes.root()} />;
  }

  if (role === 'teacher') {
    return <Navigate to={ProfileRoutes.root()} />;
  }

  if (role === 'student') {
    return <Navigate to={ProfileRoutes.root()} />;
  }

  return <Navigate to={AuthRoutes.root()} />;
};
