import { useAuthContext } from './useAuthContext';

export const useIsAuthenticated = () => {
  const { isAuth0Authenticated, isAuth0Loading } = useAuthContext();

  return isAuth0Authenticated && !isAuth0Loading;
};
