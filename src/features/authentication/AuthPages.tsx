import { Navigate } from 'react-router';
import { AuthRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { AuthPage } from '@/contexts/AuthContext';
import { AuthLayout } from '@/layouts/AuthLayout';
import { SignInPage } from './SignInPage';
import { StudentRegistrationPage } from './StudentRegistrationPage';
import { TeacherRegistrationPage } from './TeacherRegistrationPage';

export const authPages = () => {
  return {
    path: AuthRoutes.root.definition,
    element: (
      <AppContext>
        <AuthPage>
          <AuthLayout />
        </AuthPage>
      </AppContext>
    ),
    children: [
      {
        path: AuthRoutes.signIn.definition,
        element: <SignInPage />,
      },
      {
        path: AuthRoutes.signUpAsStudent.definition,
        element: <StudentRegistrationPage />,
      },
      {
        path: AuthRoutes.signUpAsTeacher.definition,
        element: <TeacherRegistrationPage />,
      },
      {
        index: true,
        path: '*',
        element: <Navigate to={AuthRoutes.signIn()} />,
      },
    ],
  };
};
