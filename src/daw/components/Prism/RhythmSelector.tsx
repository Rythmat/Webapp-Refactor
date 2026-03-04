import { useCallback, useMemo } from 'react';
import { useStore } from '@/daw/store';
import { rhythmNames, GENRE_MAP } from '@prism/engine';

// ── Helpers ─────────────────────────────────────────────────────────────

/** Build a map of genre -> rhythm names[] by inverting GENRE_MAP. */
function buildGenreGroups(): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const name of rhythmNames()) {
    const genre = GENRE_MAP[name] ?? 'Other';
    const list = groups.get(genre);
    if (list) {
      list.push(name);
    } else {
      groups.set(genre, [name]);
    }
  }
  return groups;
}

// ── Component ────────────────────────────────────────────────────────────

export function RhythmSelector() {
  const rhythmName = useStore((s) => s.rhythmName);
  const setRhythm = useStore((s) => s.setRhythm);

  const genreGroups = useMemo(() => buildGenreGroups(), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRhythm(e.target.value);
    },
    [setRhythm],
  );

  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-xs font-medium mb-0.5"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Rhythm Pattern
      </span>
      <select
        value={rhythmName}
        onChange={handleChange}
        className="h-8 rounded-md px-2 text-sm font-medium cursor-pointer outline-none"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
      >
        {Array.from(genreGroups.entries()).map(([genre, names]) => (
          <optgroup key={genre} label={genre}>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
