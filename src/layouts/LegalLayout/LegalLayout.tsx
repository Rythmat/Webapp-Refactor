import { Suspense } from 'react';
import { Outlet } from 'react-router';

export const LegalLayout = (props: { fallback?: React.ReactNode }) => {
  return (
    <main className="container prose py-8">
      <Suspense fallback={props.fallback}>
        <Outlet />
      </Suspense>
    </main>
  );
};
