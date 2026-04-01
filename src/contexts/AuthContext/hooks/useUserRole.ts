import { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { UserRole } from '../types';

export const useUserRole = (): UserRole | null => {
  const { role } = useContext(AuthContext);
  return role;
};
