import { useAuthToken } from './useAuthToken';

export const useIsAuthenticated = () => {
  return useAuthToken() !== null;
};
