import {
  ArrowRight,
  Gamepad2,
  Globe,
  GraduationCap,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthRoutes, MarketingRoutes } from '@/constants/routes';
import { Reveal } from '../marketing/components/Reveal';

/**
 * Landing "secondary hero" / product showcase — a WHITE, full-bleed band under
 * the dark hex hero (reference: BandLab's second section: dark hero → diagonal →
 * light section → app in device mockups). Replaces the old "Explore Music Atlas"
 * expand-cards.
 *
 * The browser mockup shows a real Home-dashboard screenshot (`/home-dashboard.webp`);
 * the phone (`PhoneScreen`) shows the rainbow-keyboard-scale GIF.
 */
const MODULES = [
  {
    key: 'studio',
    label: 'Studio',
    blurb: 'Make music in your browser',
    href: MarketingRoutes.studio(),
    accent: '#7ecfcf',
    Icon: SlidersHorizontal,
  },
  {
    key: 'learn',
    label: 'Learn',
    blurb: 'Theory, technique & songs',
    href: MarketingRoutes.learn(),
    accent: '#34d399',
    Icon: GraduationCap,
  },
  {
    key: 'arcade',
    label: 'Arcade',
    blurb: 'Train your ear through play',
    href: MarketingRoutes.arcade(),
    accent: '#a78bfa',
    Icon: Gamepad2,
  },
  {
    key: 'globe',
    label: 'Globe',
    blurb: 'Explore the world of music',
    href: MarketingRoutes.globe(),
    accent: '#60a5fa',
    Icon: Globe,
  },
] as const;

export const LandingShowcase = () => {
  return (
    <section
      className="relative -mx-6 -mt-16 bg-white text-neutral-900 md:-mx-10 md:-mt-24"
      style={{ clipPath: 'polygon(0 7rem, 100% 0, 100% 100%, 0 100%)' }}
    >
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 md:px-10 md:pb-28 md:pt-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            The all-in-one music app
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 md:text-5xl">
            Everything in one place.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
            Theory lessons, a full studio, ear-training games and a world of
            music history — all in one app, right in your browser.
          </p>
          <div className="mt-6">
            <Button
              asChild
              size="lg"
              className="bg-neutral-900 px-7 text-white hover:bg-neutral-800"
            >
              <Link to={AuthRoutes.signIn()}>
                Start free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Reveal>

        {/* Product mockup: browser + floating rainbow keyboard */}
        <Reveal
          delay={0.1}
          className="relative mx-auto mt-12 max-w-4xl md:mt-16"
        >
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-neutral-300" />
                <span className="size-2.5 rounded-full bg-neutral-300" />
                <span className="size-2.5 rounded-full bg-neutral-300" />
              </span>
              <span className="mx-auto rounded-full border border-neutral-200 bg-white px-3 py-0.5 text-[11px] text-neutral-400">
                musicatlas.io
              </span>
              <span className="w-9" aria-hidden />
            </div>
            <img
              src="/home-dashboard.webp"
              alt="The Music Atlas home dashboard"
              width={1624}
              height={1221}
              loading="lazy"
              className="block w-full"
            />
          </div>
          {/* Rainbow keyboard scale GIF — cropped to the keys, floating over the corner. */}
          <img
            src="/rainbow-keyboard-scale.gif"
            alt="A rainbow piano keyboard playing a scale"
            className="absolute -bottom-20 -right-40 hidden aspect-[7/2] w-[64%] max-w-[480px] rounded-md object-cover sm:block"
          />
        </Reveal>

        {/* Keyboard Wizard — to the right of the mockup, risen so its top sits at the
            top of the showcase section (top-0 == the outer container's top edge, which
            is the section top). The page's overflow-x clips the right. */}
        <img
          src="/keyboard-wizard.svg"
          alt="Music Atlas keyboard wizard"
          loading="lazy"
          className="pointer-events-none absolute left-[calc(50%_+_181px)] top-0 z-10 hidden aspect-square w-[800px] lg:block"
        />

        {/* Feature row */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 md:mt-24">
          {MODULES.map((m, i) => (
            <Reveal key={m.key} delay={i * 0.05}>
              <Link
                to={m.href}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-100"
              >
                <span
                  className="grid size-10 place-items-center rounded-xl [&_svg]:size-5"
                  style={{ background: `${m.accent}22`, color: m.accent }}
                >
                  <m.Icon />
                </span>
                <span className="font-semibold text-neutral-900">
                  {m.label}
                </span>
                <span className="text-sm text-neutral-500">{m.blurb}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
