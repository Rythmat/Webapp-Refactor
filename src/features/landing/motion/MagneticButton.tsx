import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';

const TONES = {
  brand:
    'bg-brand-base text-grey-darkest shadow-[0_8px_30px_-8px_rgba(255,204,51,0.55)] hover:bg-brand-light',
  light: 'bg-white text-black hover:bg-white/90',
  ghost:
    'border border-white/15 bg-white/[0.04] text-white backdrop-blur-md hover:border-white/30 hover:bg-white/[0.08]',
} as const;

const SIZES = {
  sm: 'h-9 px-4 text-[15px]',
  md: 'h-11 px-6 text-base',
  lg: 'h-[3.25rem] px-8 text-base sm:text-lg',
} as const;

/**
 * Tactile CTA: drifts toward the pointer (spring, max `strength` px), sweeps a
 * shine across on hover and presses in on tap. Renders a router `Link` for
 * internal paths, an `<a>` for external/mailto hrefs, or a `<button>` when only
 * `onClick` is given. Static under `prefers-reduced-motion`.
 */
export const MagneticButton = ({
  to,
  onClick,
  children,
  tone = 'brand',
  size = 'md',
  strength = 6,
  className,
  ariaLabel,
}: {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  strength?: number;
  className?: string;
  ariaLabel?: string;
}) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const cls = cn(
    'landing-shine inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101012]',
    '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5',
    TONES[tone],
    SIZES[size],
    className,
  );

  let inner: ReactNode;
  if (to && to.startsWith('/')) {
    inner = (
      <Link to={to} className={cls} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </Link>
    );
  } else if (to) {
    inner = (
      <a href={to} className={cls} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </a>
    );
  } else {
    inner = (
      <button
        type="button"
        className={cls}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.span
      ref={ref}
      className="inline-flex"
      style={reduce ? undefined : { x, y }}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
    >
      {inner}
    </motion.span>
  );
};
