import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LissajousMark } from '@/features/landing/motion/LissajousMark';
import { LOGO } from '@/features/landing/motion/lissajous';
import { PRODUCTION_CURVE } from '@/features/landing/sections/heroWords';
import '@/components/ClassroomLayout/dashboard/dashboard.css';
import '@/features/landing/landing.css';

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * The landing's morphing mark, linking home. As in the landing's closing
 * section, it fades up on "Production"'s circle, then morphs into the logo,
 * once. (Under reduced motion it is the static logo.)
 */
const AuthBrand = () => {
  const reduce = useReducedMotion();
  /** 1 once the mark has faded up: its one move, from the circle to the logo. */
  const [cue, setCue] = useState(0);

  return (
    <Link
      to="/"
      aria-label="Music Atlas home"
      className="rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <motion.span
        aria-hidden
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        onAnimationComplete={() => setCue(1)}
        className="block"
      >
        <LissajousMark
          curve={cue ? LOGO : PRODUCTION_CURVE}
          cue={cue}
          className="size-14 sm:size-16"
        />
      </motion.span>
    </Link>
  );
};

/**
 * Shell for every `/auth/*` page (sign-in, the OAuth callback, class and
 * teacher join), in the landing look: the #101012 surface with the landing's
 * morphing mark above the page, in one column.
 *
 * Scales from phones up: below `sm` (520px) the page sits on the surface with
 * no panel chrome, from `sm` it sits in a raised panel. The page scrolls
 * rather than clipping when it's taller than the screen.
 */
export const AuthLayout = () => {
  return (
    <div
      className="dashboard-root landing-root flex min-h-dvh w-full flex-col overflow-x-clip"
      data-tab="home"
    >
      <main className="flex flex-1 flex-col items-center px-4 pb-10 pt-10 sm:justify-center sm:px-6 sm:py-12">
        {/* The mark's shading assumes the flat page colour behind it, so it
            sits above the panel, clear of the panel's shadow (kept tight so
            its blur stops short of the mark). */}
        <AuthBrand />
        <div className="mt-6 w-full max-w-[480px] sm:mt-8 sm:rounded-2xl sm:border sm:border-white/[0.08] sm:bg-[#151518] sm:px-4 sm:py-6 sm:shadow-[0_40px_72px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
