import {
  CHORD_NOTATION_OPTIONS,
  chooseChordNotation,
  useChordNotation,
} from '@/lib/chordNotation';

/** The two a lesson offers; Roman stays on the top rail's switch. */
const OPTIONS = CHORD_NOTATION_OPTIONS.filter(
  (option) => option.value !== 'roman',
);

/**
 * Hybrid | Jazz, beside a lesson's chords: how every chord name on the screen
 * is written — the title, the chords beside it, the symbols over the staff —
 * switched back and forth in place. It is the same preference as the top
 * rail's switch, so the choice holds wherever chords are written, but it
 * leaves that switch hidden until it's turned on in Settings (owner,
 * 2026-10-24).
 */
export function ChordNameSwitch() {
  const notation = useChordNotation();
  return (
    <div
      role="radiogroup"
      aria-label="Chord names"
      data-chord-name-switch
      className="inline-flex h-7 shrink-0 items-center rounded-full align-middle ring-1 ring-inset ring-white/10 max-[639px]:h-9"
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={notation === value}
          title={
            value === 'hybrid'
              ? 'Hybrid chord names: A min9, D dom13'
              : 'Jazz chord symbols: A−9, D13'
          }
          onClick={() => chooseChordNotation(value)}
          className={`inline-flex h-full items-center rounded-full px-3 text-xs font-normal transition-colors duration-150 ${
            notation === value
              ? 'bg-white text-[#101012]'
              : 'text-white/55 hover:text-[#e8e8f0]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
