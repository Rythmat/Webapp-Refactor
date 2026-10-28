import { useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { FC } from 'react';
import { CymaticsCover } from '@/components/art/cymatics/CymaticsCover';
import { SpectrumRim } from '@/components/art/light/SpectrumLight';
import { GLOW_VARS } from '@/components/kit/HeroArt';
import {
  GoButton,
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import type { ChladniMode } from '@/lib/art';
import { artForGame, type ArcadeGame } from '../arcadeGames';

/** A game that names no figure (none in the catalog). */
const DEFAULT_MODE = { n: 3, m: 1, sign: 1 } as const;

const relativeTime = (ts: number): string => {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return day === 1 ? 'yesterday' : `${day}d ago`;
};

interface GameCardProps {
  game: ArcadeGame;
  /** Say "Free" — only to free users (every game is unlocked for premium). */
  showFreeBadge: boolean;
  locked: boolean;
  onLaunch: () => void;
  /** "Jump back in": when it was last played, in the corner. */
  lastPlayedAt?: number;
  /** The figures this card morphs through: the page keeps every card's
   *  apart (left out, the game's own and its near resonances). */
  figures?: readonly ChladniMode[];
}

/**
 * A game as the featured Jam Room card is drawn (owner, 2026-10-28: "apply
 * the UI style used by the Jam Room card to the rest of the cards"): the
 * prompt box's card (PROMPT_FRAME + PROMPT_WASH), the game's own Chladni
 * figure in one of the page glow's colours (the page sets --home-glow-a/-b;
 * they ease as the glow eases), that light leaking along its foot, and the prompt box's
 * Go pill to play it. Hovered or focused, its light rims the whole card
 * (the waves keep the glow's colours: owner, 2026-10-28, no rainbow).
 * Its name and a quiet note ("Free", "2h ago") sit at the foot beside the
 * pill; a click anywhere on the card is the pill's. Its locked state is the
 * shelf's (LockedFeatureOverlay round it).
 */
export const GameCard: FC<GameCardProps> = ({
  game,
  showFreeBadge,
  locked,
  onLaunch,
  lastPlayedAt,
  figures,
}) => {
  const reduce = useReducedMotion() ?? false;
  const art = artForGame(game);
  const corner =
    lastPlayedAt != null
      ? relativeTime(lastPlayedAt)
      : showFreeBadge
        ? 'Free'
        : null;
  const open = locked ? undefined : onLaunch;

  return (
    <div
      onClick={open}
      title={game.blurb}
      data-arcade-tile={game.title}
      className={cn(
        PROMPT_FRAME,
        PROMPT_WASH,
        'art-host group isolate aspect-square cursor-pointer overflow-hidden',
      )}
    >
      {/* The figure on its own square, the whole card (a Chladni plate is
          square: owner, 2026-10-28), darkening toward the foot so the name
          and the pill read over it. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Drawn exactly, morphing through its plate's resonances. */}
        <CymaticsCover
          seed={art.seed}
          mode={art.mode ?? DEFAULT_MODE}
          modes={figures}
          // Its figure in one of the glow's two colours, the games
          // alternating; easing as the glow eases.
          color={GLOW_VARS[art.hue]}
          phase={art.phase}
          lineWidth={2}
        />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 via-black/35 to-transparent" />
      </div>
      <SpectrumRim state="on" edge="bottom" colors={GLOW_VARS} />
      {corner && (
        <span className="pointer-events-none absolute left-4 top-3.5 text-xs text-white/45">
          {corner}
        </span>
      )}
      {/* The foot: its name, and the prompt box's Go pill. */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 pl-4">
        <h3 className="min-w-0 truncate text-lg text-[#e8e8f0]">
          {game.title}
        </h3>
        <GoButton
          type="button"
          disabled={false}
          sweep={0}
          reduce={reduce}
          aria-label={`Play ${game.title}`}
          icon={<Play className="size-4" fill="currentColor" />}
          onClick={(event) => {
            // The card hears the click too; the pill's is the one.
            event.stopPropagation();
            open?.();
          }}
        >
          Play
        </GoButton>
      </div>
    </div>
  );
};
