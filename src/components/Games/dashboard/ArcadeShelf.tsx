import type { FC } from 'react';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { cn } from '@/components/utilities';
import type { ChladniMode } from '@/lib/art';
import {
  type ArcadeCategory,
  type ArcadeGame,
  isGameFree,
} from '../arcadeGames';
import { GameCard } from './GameCard';

interface ArcadeShelfProps {
  title: string;
  games: ArcadeGame[];
  isPremium: boolean;
  onLaunch: (game: ArcadeGame) => void;
  /** Recency timestamps by route ("Jump back in": "2h ago" in the corner). */
  recency?: Record<string, number>;
  /** A rule above it, between sections (as Learn's families). */
  divided?: boolean;
  /** The kind of game it holds: the page's glow takes its colours while
   *  it is scrolled to (ArcadeInlet reads `data-arcade-zone`). */
  zone?: ArcadeCategory;
  /** Each card's figures, by `${figureRow}:${title}` (the page's
   *  allocateFigures, so no two cards share one). */
  figures?: ReadonlyMap<string, readonly ChladniMode[]>;
  /** This row's key in `figures`. */
  figureRow?: string;
  className?: string;
}

/**
 * A titled set of games, as a Learn family of tiles (LearnInlet's
 * LearnSection): its name in the tiles' title type, then the tiles in
 * Learn's grid, two across, four from md. Premium games a free player can't
 * open are wrapped in the shared LockedFeatureOverlay: inert, behind their
 * lock.
 */
export const ArcadeShelf: FC<ArcadeShelfProps> = ({
  title,
  games,
  isPremium,
  onLaunch,
  recency,
  divided = false,
  zone,
  figures,
  figureRow = title,
  className,
}) => (
  <section
    aria-label={title}
    data-arcade-zone={zone}
    className={cn(divided && 'border-t border-white/[0.08] pt-4', className)}
  >
    <h2 data-arcade-section={title} className="mb-4 text-lg text-[#e8e8f0]">
      {title}
    </h2>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
      {games.map((game) => {
        const free = isGameFree(game);
        const locked = !isPremium && !free;
        const card = (
          <GameCard
            game={game}
            showFreeBadge={free && !isPremium}
            locked={locked}
            onLaunch={() => onLaunch(game)}
            figures={figures?.get(`${figureRow}:${game.title}`)}
            lastPlayedAt={
              recency && game.route ? recency[game.route] : undefined
            }
          />
        );
        return locked ? (
          <LockedFeatureOverlay key={game.title} locked label={game.title}>
            {card}
          </LockedFeatureOverlay>
        ) : (
          <div key={game.title}>{card}</div>
        );
      })}
    </div>
  </section>
);
