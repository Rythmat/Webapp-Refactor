import { ArrowRight } from 'lucide-react';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import type { Cta } from '../content/types';
import { MarketingButton } from './MarketingButton';
import { Reveal } from './Reveal';

/**
 * Product-page hero: copy on the left, a glass "product window" framing the app's
 * interactive hex art on the right (stands in for a real screenshot). Accent-tinted.
 */
export const MarketingHero = ({
  eyebrow,
  headline,
  subtext,
  accent,
  primaryCta,
  secondaryCta,
  artSeed,
}: {
  eyebrow?: string;
  headline: string;
  subtext: string;
  accent: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
  artSeed: string;
}) => {
  const art = generateStudioTileSvg(`feature:${artSeed}`, 800, 500);
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-32 sm:pt-36 md:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px]"
        style={{
          background: `radial-gradient(60% 60% at 30% 0%, ${accent}1f, transparent 70%)`,
        }}
      />
      <div className="relative z-10 grid w-full items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-start gap-6">
          {eyebrow && (
            <Reveal>
              <span
                className="text-xs font-semibold uppercase tracking-[0.16em]"
                style={{ color: accent }}
              >
                {eyebrow}
              </span>
            </Reveal>
          )}
          <Reveal delay={0.05}>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] text-white md:text-5xl lg:text-6xl">
              {headline}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-xl text-lg text-white/70">{subtext}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex flex-wrap items-center gap-3">
              <MarketingButton href={primaryCta.href} className="px-7">
                {primaryCta.label}
                <ArrowRight className="size-4" />
              </MarketingButton>
              {secondaryCta && (
                <MarketingButton href={secondaryCta.href} tone="ghost">
                  {secondaryCta.label}
                </MarketingButton>
              )}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="relative">
          <div className="relative aspect-[8/5] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <HexWaveBackground
              src={art}
              drain={false}
              className="pointer-events-none absolute inset-0 h-full w-full"
              backgroundColor="#0D0B08"
              colorThreshold={0.05}
              brushRadius={90}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%), radial-gradient(120% 80% at 20% 0%, ${accent}22, transparent 60%)`,
              }}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
};
