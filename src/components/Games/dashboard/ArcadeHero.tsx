import { Lock, Play } from 'lucide-react';
import type { FC } from 'react';
import { CymaticsCover } from '@/components/art/cymatics/CymaticsCover';
import { HeroArt, microLabel } from '@/components/kit';
import { GLOW_VARS } from '@/components/kit/HeroArt';
import type { ChladniMode } from '@/lib/art';
import { artForGame, type ArcadeGame } from '../arcadeGames';

/** Out toward the words on the left (ArtCover's fade at 270°). */
const FADE_LEFT =
  'linear-gradient(270deg, #000 0%, #000 34%, rgba(0,0,0,0.4) 60%, transparent 82%)';

interface ArcadeHeroProps {
  game: ArcadeGame;
  /** Premium game the current user can't access → CTA drives the upsell. */
  locked: boolean;
  /** Launch (unlocked) or route to the plan page (locked) — decided upstream. */
  onPlay: () => void;
  /** The page's glow colours: the card's lines and light wear them. */
  glow?: readonly [string, string];
  /** The figures it morphs through (the page keeps every card's apart). */
  figures?: readonly ChladniMode[];
}

/**
 * The Arcade's featured game: its cover drifting across the banner (the
 * Muzaic player), its name, its line and one white pill. The whole banner
 * plays it.
 */
export const ArcadeHero: FC<ArcadeHeroProps> = ({
  game,
  locked,
  onPlay,
  glow,
  figures,
}) => {
  const art = artForGame(game);
  return (
    <HeroArt
      ariaLabel={`Featured: ${game.title}`}
      eyebrow={microLabel('Featured', game.category)}
      title={game.title}
      blurb={game.blurb}
      glow={glow}
      art={
        // Its figure enlarged across the banner, drawn exactly and morphing,
        // fading out toward the words on the left.
        <CymaticsCover
          seed={art.seed}
          mode={art.mode ?? { n: 5, m: 2, sign: 1 }}
          modes={figures}
          color={glow ? GLOW_VARS[art.hue] : '#F4F4F8'}
          layout="banner"
          lineWidth={2.5}
          phase={art.phase}
          style={{ maskImage: FADE_LEFT, WebkitMaskImage: FADE_LEFT }}
        />
      }
      cta={{
        label: locked ? `Unlock ${game.title}` : `Play ${game.title}`,
        icon: locked ? (
          <Lock className="size-[1.125rem]" />
        ) : (
          <Play className="size-[1.125rem]" fill="currentColor" />
        ),
        onClick: onPlay,
      }}
    />
  );
};
