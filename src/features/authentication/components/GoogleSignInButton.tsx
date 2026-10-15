import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { renderGisButton } from '@/auth/google/gis';
import type { GisStatus } from '@/auth/google/useGoogleIdentity';
import { cn } from '@/components/utilities';

/** GIS buttons are 200–400px wide; they're fixed-width, so we measure the column. */
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 320;
/** Re-render only for real resizes, not sub-pixel jitter. */
const RESIZE_STEP = 8;
/** If GIS hasn't drawn its iframe by then, show our own button instead. */
const RENDER_CHECK_MS = 4000;

/** The official four-colour "G" (unmodified, as Google's branding guidelines require). */
const GoogleG = ({ className }: { className?: string }) => (
  <svg aria-hidden className={className} viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * Our own Google button for when GIS is off or failed; it goes straight to
 * Auth0's Google login. Styled per Google's branding guidelines (light theme:
 * white fill, #747775 stroke, #1F1F1F Roboto label), which is why it doesn't
 * use Glacial. The border colour is inline because `.dashboard-root` resets
 * border colours.
 */
const FallbackGoogleButton = ({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex h-10 w-full max-w-[400px] items-center justify-center gap-2.5 rounded-full border bg-white px-3 text-[14px] font-medium leading-5 text-[#1F1F1F] transition-colors hover:bg-[#F2F2F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 disabled:pointer-events-none disabled:opacity-50"
    style={{
      borderColor: '#747775',
      fontFamily: "Roboto, 'Helvetica Neue', Arial, sans-serif",
    }}
  >
    <GoogleG className="size-5" />
    Continue with Google
  </button>
);

/** The official GIS button, sized to the column and re-rendered on resize. */
const GisButton = ({
  disabled,
  onClick,
  onRenderFailed,
}: {
  disabled?: boolean;
  onClick?: () => void;
  onRenderFailed: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  const onClickRef = useRef(onClick);
  const onRenderFailedRef = useRef(onRenderFailed);
  useEffect(() => {
    onClickRef.current = onClick;
    onRenderFailedRef.current = onRenderFailed;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const measured = Math.floor(el.getBoundingClientRect().width);
      const next =
        measured > 0
          ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, measured))
          : DEFAULT_WIDTH;
      setWidth((prev) =>
        prev !== null && Math.abs(prev - next) < RESIZE_STEP ? prev : next,
      );
    };
    measure();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || width === null) return;
    renderGisButton(el, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width,
      locale: 'en',
      click_listener: () => onClickRef.current?.(),
    });
    const timer = window.setTimeout(() => {
      if (!el.querySelector('iframe')) onRenderFailedRef.current();
    }, RENDER_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [width]);

  return (
    <div
      className={cn(
        'h-10 w-full',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {/* GIS draws an iframe here. `color-scheme: normal` keeps the browser
          from painting an opaque backdrop behind it. */}
      <div
        ref={ref}
        data-testid="gis-button"
        className="flex w-full justify-center"
        style={{ colorScheme: 'normal' }}
      />
    </div>
  );
};

/**
 * "Continue with Google": the official GIS button when GIS is ready, a
 * placeholder pill while it loads, and our own branded button (Auth0's Google
 * login) when GIS is off, blocked or fails to draw.
 */
export const GoogleSignInButton = ({
  status,
  disabled,
  onFallbackClick,
  onGisClick,
}: {
  status: GisStatus;
  disabled?: boolean;
  onFallbackClick: () => void;
  /** The official button was pressed (before Google's popup opens). */
  onGisClick?: () => void;
}) => {
  const [renderFailed, setRenderFailed] = useState(false);

  if (status === 'ready' && !renderFailed) {
    return (
      <GisButton
        disabled={disabled}
        onClick={onGisClick}
        onRenderFailed={() => setRenderFailed(true)}
      />
    );
  }
  if (status === 'loading') {
    return (
      <div
        aria-hidden
        className="h-10 w-full max-w-[400px] animate-pulse rounded-full bg-white/[0.06]"
      />
    );
  }
  return <FallbackGoogleButton disabled={disabled} onClick={onFallbackClick} />;
};
