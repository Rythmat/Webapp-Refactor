import { useStore } from '@/daw/store';
import { getChordColor, abbreviateSequence } from '@prism/engine';

// ── Component ────────────────────────────────────────────────────────────

export function ChordSequenceDisplay() {
  const stringSeq = useStore((s) => s.stringSeq);
  const rootNote = useStore((s) => s.rootNote);

  if (stringSeq.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-10 rounded text-xs italic"
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
      className="flex gap-1.5 overflow-x-auto py-1 px-0.5"
      style={{ scrollbarWidth: 'thin' }}
    >
      {stringSeq.map((name, i) => {
        const [r, g, b] = getChordColor(name, rootMidi);
        const abbreviated = abbreviateSequence(name);

        return (
          <div
            key={`${name}-${i}`}
            className="shrink-0 flex items-center justify-center h-8 px-2.5 rounded-full text-xs font-medium whitespace-nowrap"
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
