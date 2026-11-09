import { ArrowLeft } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArtCover } from '@/components/art/ArtCover';
import { MicroLabel } from '@/components/kit';
import { GameRoutes } from '@/constants/routes';
import { artForTitle } from './arcadeGames';
import { StreakStrip } from './scoring/ArcadeStreak';

/**
 * The bar's backdrop: the game's own cover (lib/art, as on its Arcade tile),
 * still, under a wash dark enough for the title and the HUD to read.
 */
export const ArcadeHeaderArt = ({ title }: { title: string }) => {
  const art = artForTitle(title);
  return (
    <>
      <ArtCover
        seed={art.seed}
        kind={art.kind}
        variant={art.variant}
        mode={art.mode}
        palette={art.palette ?? 'white'}
        density="hero"
        aspect={10}
      />
      {/* Darker under the HUD at the sides; the title is big enough to
          read over the art. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(16,16,18,0.9), rgba(16,16,18,0.3) 28%, rgba(16,16,18,0.3) 72%, rgba(16,16,18,0.9)),' +
            'linear-gradient(0deg, rgba(16,16,18,0.45), rgba(16,16,18,0))',
        }}
      />
    </>
  );
};

export interface HeaderStat {
  label: string;
  value: ReactNode;
  /** Tailwind text-colour class for the value (defaults to white). */
  valueClassName?: string;
}

interface ArcadeGameHeaderProps {
  title: string;
  /**
   * Centre sub-row beneath the title — mode toggles, difficulty / tempo
   * steppers, reset, metronome and other HUD chrome controls.
   */
  controls?: ReactNode;
  /** Right-side labelled stat chips (score / streak / lives / accuracy …). */
  stats?: HeaderStat[];
  /** Fully custom right-side content; overrides `stats` when provided. */
  right?: ReactNode;
  /**
   * Custom left-side content. Defaults to a standard "Back to Arcade" button
   * so every arcade game gets the same navigation affordance on the bar.
   */
  left?: ReactNode;
}

/**
 * The shared arcade game header bar — the single source of truth for the
 * `h-28` title bar first built for Major Arcanum, over the game's cover. Every arcade
 * game renders one of these at the top of its window so the chrome is
 * consistent, with the game's HUD controls and status displays held on the bar.
 * Under the bar, the streak strip, when the game's page counts a streak.
 */
export function ArcadeGameHeader({
  title,
  controls,
  stats,
  right,
  left,
}: ArcadeGameHeaderProps) {
  const navigate = useNavigate();
  return (
    <>
      <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden border-b border-white/[0.08] px-8">
        <div className="absolute inset-0 bg-[#101012]">
          <ArcadeHeaderArt title={title} />
        </div>

        <div className="absolute left-8 top-1/2 z-10 -translate-y-1/2">
          {left ?? (
            <button
              onClick={() => navigate(GameRoutes.root())}
              className="flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Arcade
            </button>
          )}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <h1 className="text-5xl font-normal leading-[1.1] tracking-[-0.02em] text-white">
            {title}
          </h1>
          {controls && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {controls}
            </div>
          )}
        </div>

        {right ? (
          <div className="absolute right-8 top-1/2 z-10 -translate-y-1/2">
            {right}
          </div>
        ) : (
          stats &&
          stats.length > 0 && (
            <div className="absolute right-8 top-1/2 z-10 flex -translate-y-1/2 items-center gap-8 rounded-[1.25rem] bg-[#101012]/70 px-6 py-3">
              {stats.map((s, i) => (
                <Fragment key={s.label}>
                  {i > 0 && <div className="h-8 w-px bg-white/10" />}
                  <div className="flex flex-col items-end gap-1.5">
                    <MicroLabel>{s.label}</MicroLabel>
                    <span
                      className={`text-xl font-medium tabular-nums ${
                        s.valueClassName ?? 'text-white'
                      }`}
                    >
                      {s.value}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
          )
        )}
      </div>
      <StreakStrip />
    </>
  );
}
