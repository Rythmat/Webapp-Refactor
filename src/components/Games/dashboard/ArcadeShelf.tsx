import type { LucideIcon } from 'lucide-react';
import type { FC } from 'react';
import { LockedFeatureOverlay } from '@/components/ui/LockedFeatureOverlay';
import { type ArcadeGame, CATEGORY_ICON, isGameFree } from '../arcadeGames';
import { GameCard } from './GameCard';

interface ArcadeShelfProps {
  title: string;
  games: ArcadeGame[];
  isPremium: boolean;
  onLaunch: (game: ArcadeGame) => void;
  /** Header icon override (used by "Jump back in" / "Start here"). */
  eyebrowIcon?: LucideIcon;
  /** Recency timestamps by route (shows "last played" + widens cards). */
  recency?: Record<string, number>;
  /**
   * `'dashboard'` matches the rest of the app's dashboards: a plain-icon +
   * `text-xl md:text-2xl` heading and Genre-card-style portrait tiles. Used by
   * the category shelves. Defaults to `'default'` (the console-row look).
   */
  variant?: 'default' | 'dashboard';
}

/**
 * A horizontal "shelf" of game cards under a section header (icon + title +
 * count) — the console-dashboard row pattern. Premium games the user can't
 * access are wrapped in the shared LockedFeatureOverlay.
 */
export const ArcadeShelf: FC<ArcadeShelfProps> = ({
  title,
  games,
  isPremium,
  onLaunch,
  eyebrowIcon: EyebrowIcon,
  recency,
  variant = 'default',
}) => {
  const Icon =
    EyebrowIcon ?? CATEGORY_ICON[title as keyof typeof CATEGORY_ICON];
  const wide = recency != null;
  const dashboard = variant === 'dashboard';
  const count = (
    <span className="text-sm tabular-nums text-white/40">
      {games.length} {games.length === 1 ? 'game' : 'games'}
    </span>
  );

  return (
    <section aria-label={title} className="flex flex-col gap-4">
      {dashboard ? (
        // Dashboard heading — matches the Home/Learn/Studio sections.
        <div className="flex items-center gap-2 md:gap-3">
          {Icon && <Icon className="h-7 w-7 text-white/85 md:h-8 md:w-8" />}
          <h2 className="text-xl font-medium text-white md:text-2xl">
            {title}
          </h2>
          {count}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-[#7ecfcf]">
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
          <h2 className="text-xl font-semibold tracking-tight text-white md:text-[22px]">
            {title}
          </h2>
          {count}
        </div>
      )}

      <div className="-mx-2 flex snap-x snap-proximity gap-4 overflow-x-auto px-2 pb-2 md:gap-5">
        {games.map((game) => {
          const free = isGameFree(game);
          const locked = !isPremium && !free;
          const card = (
            <GameCard
              game={game}
              showFreeBadge={free && !isPremium}
              locked={locked}
              onLaunch={() => onLaunch(game)}
              wide={wide}
              portrait={dashboard}
              lastPlayedAt={
                recency && game.route ? recency[game.route] : undefined
              }
            />
          );
          return locked ? (
            <LockedFeatureOverlay key={game.title} locked>
              {card}
            </LockedFeatureOverlay>
          ) : (
            <div key={game.title}>{card}</div>
          );
        })}
      </div>
    </section>
  );
};
