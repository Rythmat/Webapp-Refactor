import { Logo } from '@/components/Logo';
import { cn } from '@/components/utilities';

/**
 * A pulsing logo with a status line. `overlay` covers the whole screen and puts
 * the logo exactly where `FullScreenLoading` does, so going from the auth
 * loader to "Signing you in…" shows no jump.
 */
export const AuthStatus = ({
  label,
  overlay = false,
}: {
  label: string;
  overlay?: boolean;
}) => (
  <div
    className={cn(
      'flex items-center justify-center',
      overlay ? 'fixed inset-0 z-50 bg-[#101012]' : 'py-16',
    )}
  >
    <div className="relative">
      <Logo className="size-14 animate-pulse" />
      <p
        role="status"
        className="absolute left-1/2 top-full mt-4 -translate-x-1/2 whitespace-nowrap text-sm text-white/55"
      >
        {label}
      </p>
    </div>
  </div>
);
