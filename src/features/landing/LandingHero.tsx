import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { AuthRoutes } from '@/constants/routes';

/**
 * Landing hero — a full-bleed, interactive hex background band with an overlaid
 * value prop + primary CTA (reference: BandLab's hero — a plain-language promise,
 * a free/no-download line, and a Sign-Up button). Uses the app's `HexWaveBackground`
 * with the same artwork + settings as the /auth page (`login-bg.svg` on a light
 * `#b8b6b6` field): a light warm-grey honeycomb speckled with pastel hexes that the
 * cursor paints as it moves. Renders static under `prefers-reduced-motion`.
 *
 * `-mx-6 md:-mx-10` cancels LandingHome's horizontal padding so the band goes
 * edge-to-edge; the overlaid content re-applies `px-6 md:px-10` so the copy lines
 * up with the sections below. A dark left scrim keeps the white text legible over
 * the light canvas. `pointer-events-none` on the canvas/scrims is correct — cursor
 * tracking is global, so the hexes stay interactive under the text without blocking it.
 */
export const LandingHero = () => {
  return (
    <section className="relative isolate -mx-6 flex min-h-[clamp(420px,66svh,680px)] items-center overflow-hidden md:-mx-10 md:min-h-[clamp(520px,74svh,880px)]">
      {/* Same hex background as the /auth page (login-bg.svg on #b8b6b6, all defaults). */}
      <HexWaveBackground className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* Left scrim for text legibility. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#101012] via-[#101012]/55 to-transparent"
      />
      {/* Blend the full-bleed band into the dark page below. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-b from-transparent to-[#101012]"
      />

      {/* Copy + CTA */}
      <div className="relative z-[2] w-full px-6 py-16 md:px-10">
        <div className="max-w-2xl">
          <h1 className="text-[clamp(2.5rem,1.5rem_+_4vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-white">
            Learn music by making it.
          </h1>
          <p className="mt-5 max-w-[42ch] text-[clamp(1.125rem,0.9rem_+_1vw,1.5rem)] leading-normal text-white/85">
            The all-in-one place to learn, play, and make music — theory, a full
            browser studio, games and a world of music history. Free to start,
            right in your browser.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-[3.25rem] w-full border-white/60 bg-transparent px-8 text-base font-semibold text-white hover:border-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <Link to={AuthRoutes.signIn()}>
                Start free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
