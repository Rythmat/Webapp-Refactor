import { useCallback } from 'react';
import { useStore } from '@/daw/store';

// ── Constants ────────────────────────────────────────────────────────────

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

// ── Component ────────────────────────────────────────────────────────────

export function RootNoteSelector() {
  const rootNote = useStore((s) => s.rootNote);
  const setRootNote = useStore((s) => s.setRootNote);

  const handleClick = useCallback(
    (index: number) => () => {
      setRootNote(index);
    },
    [setRootNote],
  );

  return (
    <div className="flex flex-col gap-1">
      <span
        className="mb-0.5 text-xs font-medium"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Root Note
      </span>
      <div className="grid grid-cols-6 gap-1">
        {NOTE_NAMES.map((name, i) => {
          const isActive = rootNote === i;
          return (
            <button
              key={name}
              onClick={handleClick(i)}
              className="h-7 cursor-pointer rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: isActive
                  ? 'var(--color-accent)'
                  : 'var(--color-surface-2)',
                color: isActive ? '#fff' : 'var(--color-text-dim)',
                border: 'none',
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
