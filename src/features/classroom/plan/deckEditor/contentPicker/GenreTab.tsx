/**
 * Genre tab — one entry per curriculum genre. Selecting a genre emits a
 * `curriculum:<GENRE>:L1` launch tile (the genre's whole-level-1 entry).
 */
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PickerResultList } from './PickerResultList';
import { genreItems, searchItems, type PickedTile } from './catalog';

interface GenreTabProps {
  onSelect: (tile: PickedTile) => void;
}

export const GenreTab = ({ onSelect }: GenreTabProps) => {
  const [query, setQuery] = useState('');
  const items = useMemo(() => genreItems(), []);
  const results = useMemo(() => searchItems(items, query), [items, query]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 pb-3 pt-1">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a genre — e.g. “Jazz”, “Hip Hop”…"
          className="w-full bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>
      <PickerResultList
        items={results}
        onPick={(item) =>
          onSelect({
            module: item.module,
            activityRef: item.ref,
            label: { en: item.title },
          })
        }
        emptyText={`No genres match “${query}”.`}
      />
    </div>
  );
};
