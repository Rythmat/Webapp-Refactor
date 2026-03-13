import { ErrorBox } from '@/components/ErrorBox';
import { FullScreenLoading } from '@/components/FullScreenLoading';

export const AuthCallbackPage = () => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const description = params.get('error_description');

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorBox
          message={
            description
              ? `Auth0 callback failed: ${description}`
              : `Auth0 callback failed: ${error}`
          }
        />
      </div>
    );
  }

  // Auth0 React SDK handles code/state exchange; keep this route passive.
  return <FullScreenLoading />;
};
