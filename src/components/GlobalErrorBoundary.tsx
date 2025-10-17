import { AlertTriangle, Mail, RefreshCw, WifiOff } from 'lucide-react';
import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Button } from './ui/button';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

const handleReload = () => {
  window.location.reload();
};

const handleContactSupport = (error: Error) => {
  const errorDetails = error
    ? `${error.name}: ${error.message}`
    : 'Unknown error';
  const stack = error?.stack || 'No stack trace available';

  const subject = encodeURIComponent('Music Atlas - Error Report');
  const body = encodeURIComponent(
    `Hi,\n\nI encountered an error in the Music Atlas application.\n\nError Details:\n${errorDetails}\n\nStack Trace:\n${stack}\n\nPlease help me resolve this issue.\n\nThanks!`,
  );

  window.location.href = `mailto:aaron@musicatlas.io?subject=${subject}&body=${body}`;
};

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
  const isOnline = useNetworkStatus();

  const onContactSupport = () => handleContactSupport(error);
  const onReload = () => {
    handleReload();
    resetErrorBoundary();
  };

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center bg-black">
      {/* Main content container */}
      <div className="relative z-20 flex animate-fade-in-bottom flex-col items-center justify-center">
        {/* Error card - similar to AuthLayout card styling */}
        <div className="z-10 flex min-w-[440px] flex-col items-center justify-center gap-8 rounded-2xl bg-surface-box p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-white/10">
              <AlertTriangle className="size-6 opacity-80" />
            </div>
            <h1 className="mb-1 text-2xl font-bold">
              Something is out of tune
            </h1>
            <p className="mt-2 max-w-lg text-balance text-muted-foreground">
              The application encountered an unexpected error.
              <br /> Please try reloading the page.
            </p>
          </div>

          {/* Error Details (for development) */}
          {error && import.meta.env.MODE === 'development' && (
            <details className="w-full rounded-lg bg-gray-100 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-gray-700">
                Error Details (Development)
              </summary>
              <pre className="mt-3 whitespace-pre-wrap text-gray-800">
                {error.message}
              </pre>
              {error.stack && (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                  {error.stack}
                </pre>
              )}
            </details>
          )}

          {/* Action Buttons - Side by side */}
          <div className="flex w-full gap-3">
            <Button className="flex-1" onClick={onReload}>
              <RefreshCw className="mr-2 size-4" />
              Reload Page
            </Button>

            <Button
              className="flex-1"
              variant="outline"
              onClick={onContactSupport}
            >
              <Mail className="mr-2 size-4" />
              Contact Support
            </Button>
          </div>
        </div>

        {/* Network Status */}
        {isOnline ? null : (
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm">
            <>
              <WifiOff className="size-4 text-white/60" />
              <span className="font-medium text-white/60">
                No internet connection
              </span>
            </>
          </div>
        )}
        <p className="mt-4 max-w-sm text-balance text-center text-sm text-white/50">
          If the problem persists, please contact our support team for
          assistance.
        </p>
      </div>
    </div>
  );
};

export const GlobalErrorBoundary = ({ children }: GlobalErrorBoundaryProps) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={handleReload}>
      {children}
    </ErrorBoundary>
  );
};
