/**
 * Regions & Cities tab — two surfaces behind a segmented control:
 *  • Regions → `globe:region:<id>` (flies to the region's guided tour)
 *  • Cities  → `globe:city:<id>`   (flies to the city's guided tour)
 * Each pick also embeds a globe preview (region: city markers + hub arcs;
 * city: a single marker).
 */
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PickerResultList } from './PickerResultList';
import {
  cityGlobeEmbed,
  cityItems,
  regionGlobeEmbed,
  regionItems,
  searchItems,
  type PickableItem,
  type PickedTile,
  type SlideMediaEmbed,
} from './catalog';

interface RegionsCitiesTabProps {
  onSelect: (tile: PickedTile, embed?: SlideMediaEmbed) => void;
}

type Surface = 'regions' | 'cities';

const SURFACES: { id: Surface; label: string }[] = [
  { id: 'regions', label: 'Regions' },
  { id: 'cities', label: 'Cities' },
];

const idFromRef = (ref: string): string => ref.split(':').slice(2).join(':');

export const RegionsCitiesTab = ({ onSelect }: RegionsCitiesTabProps) => {
  const [surface, setSurface] = useState<Surface>('regions');
  const [query, setQuery] = useState('');

  const items = useMemo<PickableItem[]>(
    () => (surface === 'regions' ? regionItems() : cityItems()),
    [surface],
  );
  const results = useMemo(() => searchItems(items, query), [items, query]);

  const pick = (item: PickableItem) => {
    const id = idFromRef(item.ref);
    const embed =
      surface === 'regions' ? regionGlobeEmbed(id) : cityGlobeEmbed(id);
    onSelect(
      { module: item.module, activityRef: item.ref, label: { en: item.title } },
      embed,
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex gap-1 px-5 pb-3 pt-1">
        {SURFACES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSurface(s.id);
              setQuery('');
            }}
            className={
              'rounded-full px-3 py-1 text-xs transition-colors ' +
              (surface === s.id
                ? 'bg-[#7ecfcf] text-black'
                : 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white')
            }
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 border-b border-white/10 px-5 pb-3">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            surface === 'regions'
              ? 'Search a region…'
              : 'Search a city, country, or genre…'
          }
          className="w-full bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>
      <PickerResultList
        items={results}
        onPick={pick}
        emptyText={`No ${surface} match “${query}”.`}
      />
    </div>
  );
};
