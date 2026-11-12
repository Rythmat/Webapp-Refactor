/**
 * Arcade tab: every game with a route, by category. A game emits an
 * `arcade:<route>` launch tile that opens it.
 */
import { ARCADE_GAMES } from '@/components/Games/arcadeGames';
import { arcadeRef } from '../../../slides/contentRefs';
import { PickerResultList } from './PickerResultList';
import type { PickableItem, PickedTile } from './catalog';

export const arcadeItems = (): PickableItem[] =>
  ARCADE_GAMES.filter((g) => g.route).map((g) => ({
    key: arcadeRef(g.route!),
    module: 'arcade' as const,
    ref: arcadeRef(g.route!),
    title: g.title,
    subtitle: `${g.category} · ${g.blurb}`,
    keywords: [g.title, g.category],
  }));

export const ArcadeTab = ({
  onSelect,
}: {
  onSelect: (tile: PickedTile) => void;
}) => (
  <div className="flex flex-col pt-1">
    <PickerResultList
      items={arcadeItems()}
      onPick={(item) =>
        onSelect({
          module: 'arcade',
          activityRef: item.ref,
          label: { en: item.title },
        })
      }
      emptyText="No Arcade games."
    />
  </div>
);
