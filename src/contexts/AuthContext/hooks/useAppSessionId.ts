import { useContext } from 'react';
import { AuthContext } from '../AuthContext';

export const useAppSessionId = () => {
  return useContext(AuthContext).appSessionId;
};
