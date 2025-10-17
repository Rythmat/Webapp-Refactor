import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { LegalRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { LegalLayout } from '@/layouts/LegalLayout';

const PrivacyPolicyPage = lazy(() =>
  import('./PrivacyPolicyPage').then(({ PrivacyPolicyPage }) => ({
    default: PrivacyPolicyPage,
  })),
);

const TermsOfServicePage = lazy(() =>
  import('./TermsOfServicePage').then(({ TermsOfServicePage }) => ({
    default: TermsOfServicePage,
  })),
);

export const legalPages = () => {
  return {
    // Legal routes
    path: LegalRoutes.root.definition,
    element: (
      <AppContext>
        <LegalLayout fallback={<div>Loading...</div>} />
      </AppContext>
    ),
    children: [
      {
        path: LegalRoutes.privacyPolicy.definition,
        element: <PrivacyPolicyPage />,
      },
      {
        path: LegalRoutes.termsOfService.definition,
        element: <TermsOfServicePage />,
      },
      {
        path: '*',
        element: <Navigate to={LegalRoutes.privacyPolicy()} />,
      },
    ],
  };
};
