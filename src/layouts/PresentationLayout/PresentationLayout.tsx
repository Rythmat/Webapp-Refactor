import { ReactNode, Suspense } from 'react';

export const PresentationLayout = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) => {
  return (
    <Suspense fallback={fallback}>
      <div className="flex h-dvh w-full flex-col">
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </Suspense>
  );
};
