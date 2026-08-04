/**
 * Theory tab — pick a Learn theory lesson: a mode in a key
 * (`learn:<mode>:<key>`, e.g. `learn:ionian:c`). Genre curriculum lessons live
 * in the separate Genre Add-slide template, so this tab is Modes & Keys only.
 */
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PickerResultList } from './PickerResultList';
import {
  learnModeItems,
  searchItems,
  type PickableItem,
  type PickedTile,
} from './catalog';

interface TheoryTabProps {
  onSelect: (tile: PickedTile) => void;
}

export const TheoryTab = ({ onSelect }: TheoryTabProps) => {
  const [query, setQuery] = useState('');
  const items = useMemo(() => learnModeItems(), []);
  const results = useMemo(() => searchItems(items, query), [items, query]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 pb-3 pt-1">
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a key or mode — e.g. “C dorian”, “F#”…"
          className="w-full bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>
      <PickerResultList
        items={results}
        onPick={(item: PickableItem) =>
          onSelect({
            module: item.module,
            activityRef: item.ref,
            label: { en: item.title },
          })
        }
        emptyText={`No lessons match “${query}”.`}
      />
    </div>
  );
};
