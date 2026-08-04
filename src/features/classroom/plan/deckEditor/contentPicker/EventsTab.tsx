/**
 * Events tab — historical music events from the atlas timeline. Selecting an
 * event emits a `globe:event:<id>` launch tile AND embeds a globe preview
 * marker at the event's location. Mounted behind `ContentGate needs={['events']}`
 * so `MUSIC_HISTORY` is hydrated; it is read lazily here (never at module scope).
 */
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { PickerResultList } from './PickerResultList';
import {
  eventGlobeEmbed,
  eventItems,
  searchItems,
  type PickedTile,
  type SlideMediaEmbed,
} from './catalog';

interface EventsTabProps {
  onSelect: (tile: PickedTile, embed?: SlideMediaEmbed) => void;
}

const idFromRef = (ref: string): string => ref.split(':').slice(2).join(':');

export const EventsTab = ({ onSelect }: EventsTabProps) => {
  const [query, setQuery] = useState('');
  const items = useMemo(() => eventItems(MUSIC_HISTORY), []);
  const results = useMemo(() => searchItems(items, query), [items, query]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 pb-3 pt-1">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events — title, city, genre, year…"
          className="w-full bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>
      <PickerResultList
        items={results}
        onPick={(item) => {
          const ev = MUSIC_HISTORY.find((e) => e.id === idFromRef(item.ref));
          onSelect(
            {
              module: item.module,
              activityRef: item.ref,
              label: { en: item.title },
            },
            ev ? eventGlobeEmbed(ev) : undefined,
          );
        }}
        emptyText={`No events match “${query}”.`}
      />
    </div>
  );
};
