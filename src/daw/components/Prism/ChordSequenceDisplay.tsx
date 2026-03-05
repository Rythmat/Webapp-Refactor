import { useStore } from '@/daw/store';
import { getChordColor, abbreviateSequence } from '@prism/engine';

// ── Component ────────────────────────────────────────────────────────────

export function ChordSequenceDisplay() {
  const stringSeq = useStore((s) => s.stringSeq);
  const rootNote = useStore((s) => s.rootNote);

  if (stringSeq.length === 0) {
    return (
      <div
        className="flex h-10 items-center justify-center rounded text-xs italic"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          color: 'var(--color-text-dim)',
        }}
      >
        No chords yet
      </div>
    );
  }

  const rootMidi = (rootNote ?? 0) + 48;

  return (
    <div
      className="flex gap-1.5 overflow-x-auto px-0.5 py-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      {stringSeq.map((name, i) => {
        const [r, g, b] = getChordColor(name, rootMidi);
        const abbreviated = abbreviateSequence(name);

        return (
          <div
            key={`${name}-${i}`}
            className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium"
            style={{
              backgroundColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
              color: `rgb(${r}, ${g}, ${b})`,
              border: `1px solid rgba(${r}, ${g}, ${b}, 0.35)`,
            }}
          >
            {abbreviated}
          </div>
        );
      })}
    </div>
  );
}
