import { useContext } from 'react';
import { AuthContext } from '../AuthContext';

export const useAuthToken = () => {
  return useContext(AuthContext).token;
};
