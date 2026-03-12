import { useAuthContext } from './useAuthContext';

export const useIsAuthenticated = () => {
  const { appUser, isBootstrapLoading } = useAuthContext();

  return Boolean(appUser) && !isBootstrapLoading;
};
