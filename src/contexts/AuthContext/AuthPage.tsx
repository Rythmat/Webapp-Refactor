import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminRoutes, ProfileRoutes } from '@/constants/routes';
import { useAuthContext } from './hooks/useAuthContext';

export const AuthPage = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'admin') {
      navigate(AdminRoutes.root());
    }

    if (role === 'teacher') {
      navigate(ProfileRoutes.root());
    }

    if (role === 'student') {
      navigate(ProfileRoutes.root());
    }
  }, [role, navigate]);

  return <>{children}</>;
};
