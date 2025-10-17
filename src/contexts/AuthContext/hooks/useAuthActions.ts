import { useContext } from 'react';
import { AuthContext } from '../AuthContext';

export const useAuthActions = () => {
  return useContext(AuthContext);
};
