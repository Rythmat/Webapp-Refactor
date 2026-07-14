import { Lock, Play } from 'lucide-react';
import { type FC, useMemo } from 'react';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import type { ArcadeGame } from '../arcadeGames';

interface ArcadeHeroProps {
  game: ArcadeGame;
  /** Premium game the current user can't access → CTA drives the upsell. */
  locked: boolean;
  /** Launch (unlocked) or route to the plan page (locked) — decided upstream. */
  onPlay: () => void;
}

/**
 * The Arcade's featured-game spotlight — the "cover art + Play" opener every
 * game hub leads with. The art is an interactive HexWaveBackground (the app's
 * signature hex motif) seeded deterministically from the game, under a
 * legibility wash.
 */
export const ArcadeHero: FC<ArcadeHeroProps> = ({ game, locked, onPlay }) => {
  const tile = useMemo(
    () => generateStudioTileSvg(`arcade:${game.title}`, 1200, 520),
    [game.title],
  );

  // The Jam Room's hex art uses the auth page's hex background palette (its
  // `/login-bg.svg` teal→peach-on-grey field + matching backdrop/threshold)
  // instead of a generated trending-palette tile.
  const isJamRoom = game.route === 'jamLobby';

  return (
    <section
      aria-label={`Featured: ${game.title}`}
      className="group relative isolate flex min-h-[380px] items-end overflow-hidden rounded-3xl border border-white/10 transition-colors hover:border-white/25 md:min-h-[430px]"
    >
      <HexWaveBackground
        src={isJamRoom ? '/login-bg.svg' : tile}
        drain={false}
        ambient
        backgroundColor={isJamRoom ? '#b8b6b6' : '#101012'}
        colorThreshold={isJamRoom ? 0.1 : 0.05}
        brushRadius={110}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />
      {/* Legibility wash — dark to the left/bottom where the copy sits, colour
          glow to the upper-right so the hex art still reads. */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(120% 140% at 82% 12%, rgba(167,139,250,0.28), transparent 55%),' +
            'linear-gradient(90deg, rgba(9,9,12,0.95) 24%, rgba(9,9,12,0.55) 62%, rgba(9,9,12,0.15) 100%),' +
            'linear-gradient(0deg, rgba(9,9,12,0.9), transparent 68%)',
        }}
      />

      {/* The whole tile is the selection box — a full-cover launch button. */}
      <button
        type="button"
        onClick={onPlay}
        aria-label={locked ? `Unlock ${game.title}` : `Play ${game.title}`}
        className="absolute inset-0 z-[2] rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
      />

      {/* Presentational content — pointer-events-none so a click anywhere on the
          tile (not just the pill) triggers the launch button above. */}
      <div className="pointer-events-none relative z-[3] flex max-w-[620px] flex-col gap-4 p-8 md:p-11">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
          Featured · {game.category}
        </span>
        <h1 className="text-balance text-[clamp(38px,5vw,60px)] font-bold leading-[0.98] tracking-tight text-white">
          {game.title}
        </h1>
        <p className="max-w-[46ch] text-[16px] text-white/65">{game.blurb}</p>
        <div className="mt-1">
          <span
            className="inline-flex h-12 items-center gap-2.5 rounded-full px-6 text-[15px] font-bold text-[#06201f] shadow-[0_8px_26px_rgba(126,207,207,0.28)] transition-all group-hover:brightness-105"
            style={{ background: '#7ecfcf' }}
          >
            {locked ? (
              <>
                <Lock className="h-[18px] w-[18px]" /> Unlock {game.title}
              </>
            ) : (
              <>
                <Play className="h-[18px] w-[18px]" fill="currentColor" /> Play
                now
              </>
            )}
          </span>
        </div>
      </div>
    </section>
  );
};
