/* eslint-disable react/jsx-sort-props */
import { X } from 'lucide-react';
import type { FC } from 'react';
import { cn } from '@/components/utilities';
import {
  LITERACY_DEGREES,
  type LiteracyDegree,
} from '@/content/musicLiteracy/schemas';
import {
  barTicks,
  degreeLabel,
} from '@/curriculum/engine/musicLiteracy/literacy';
import {
  lengthLabel,
  lengthOf,
  NOTE_LENGTHS,
  type NoteShape,
} from './literacyChips';

/**
 * The Music Literacy editor's small parts: a note's length drawn as a note
 * (or a rest), the degree and length pickers every chip has, and a strip
 * that shows a segment's rhythm against its bars.
 */

export const control =
  'rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#60a5fa]';

/** A syllable's, note's or rest's card in a row of chips. */
export const CHIP =
  'flex w-[8rem] shrink-0 flex-col gap-1 rounded-lg border p-1.5 transition-colors';

// ── Glyphs ─────────────────────────────────────────────────────────────────

const HOLLOW: readonly NoteShape[] = ['whole', 'half'];
const FLAGS: Partial<Record<NoteShape, number>> = { eighth: 1, sixteenth: 2 };

/** A note of a length, drawn: head, stem, flags and dot. */
export const NoteGlyph: FC<{ ticks: number; className?: string }> = ({
  ticks,
  className,
}) => {
  const length = lengthOf(ticks);
  if (!length)
    return (
      <span className={cn('text-[10px] text-white/50', className)}>
        {ticks}
      </span>
    );
  const { shape, dotted } = length;
  const hollow = HOLLOW.includes(shape);
  const flags = FLAGS[shape] ?? 0;
  return (
    <svg
      viewBox="0 0 16 24"
      className={cn('h-5 w-4 shrink-0', className)}
      aria-hidden="true"
    >
      <ellipse
        cx="6"
        cy="18.5"
        rx="4.3"
        ry="3"
        transform="rotate(-20 6 18.5)"
        fill={hollow ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth={hollow ? 1.5 : 0}
      />
      {shape !== 'whole' && (
        <line
          x1="9.8"
          y1="17.5"
          x2="9.8"
          y2="3"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      )}
      {Array.from({ length: flags }, (_, i) => (
        <path
          key={i}
          d={`M9.8 ${3 + i * 4} q4 2.5 3 7`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      ))}
      {dotted && <circle cx="14" cy="18" r="1.3" fill="currentColor" />}
    </svg>
  );
};

/** A rest of a length, drawn after the common shapes. */
export const RestGlyph: FC<{ ticks: number; className?: string }> = ({
  ticks,
  className,
}) => {
  const length = lengthOf(ticks);
  const shape = length?.shape ?? 'quarter';
  return (
    <svg
      viewBox="0 0 16 24"
      className={cn('h-5 w-4 shrink-0', className)}
      aria-hidden="true"
    >
      {shape === 'whole' && (
        <>
          <line x1="2" y1="9" x2="14" y2="9" stroke="currentColor" />
          <rect x="4" y="9" width="8" height="3.5" fill="currentColor" />
        </>
      )}
      {shape === 'half' && (
        <>
          <line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" />
          <rect x="4" y="9.5" width="8" height="3.5" fill="currentColor" />
        </>
      )}
      {shape === 'quarter' && (
        <path
          d="M6.5 3 L10 7.5 L7 11 L10.5 15 Q6 13.5 8 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
      {(shape === 'eighth' || shape === 'sixteenth') && (
        <>
          <circle cx="6" cy="7" r="1.7" fill="currentColor" />
          <path
            d="M6 8.5 Q9 9 11 6.5 L7 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          {shape === 'sixteenth' && (
            <>
              <circle cx="5" cy="12" r="1.7" fill="currentColor" />
              <path
                d="M5 13.5 Q8 14 9.8 11.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </>
          )}
        </>
      )}
      {length?.dotted && <circle cx="14" cy="9" r="1.3" fill="currentColor" />}
    </svg>
  );
};

// ── Pickers ────────────────────────────────────────────────────────────────

const OCTAVE_GROUPS: { octave: number; label: string; mark: string }[] = [
  { octave: 0, label: 'Around the 1', mark: '' },
  { octave: 1, label: 'An octave up', mark: ' ↑' },
  { octave: -1, label: 'An octave down', mark: ' ↓' },
  { octave: 2, label: 'Two octaves up', mark: ' ↑↑' },
  { octave: -2, label: 'Two octaves down', mark: ' ↓↓' },
];

/** "5", "1 ↑", "♭7 ↓": a degree and its octave as a chip shows it. */
export const pitchLabel = (degree: LiteracyDegree, octave: number) =>
  `${degreeLabel(degree)}${OCTAVE_GROUPS.find((g) => g.octave === octave)?.mark ?? ''}`;

/**
 * Which note: the twelve degrees around the lesson's 1, then the same an
 * octave up and down (two octaves only when a note is already there).
 */
export const DegreeSelect: FC<{
  degree: LiteracyDegree;
  octave: number;
  onChange: (degree: LiteracyDegree, octave: number) => void;
  label: string;
}> = ({ degree, octave, onChange, label }) => (
  <select
    aria-label={label}
    title="The note, as a degree of the key (↑ an octave up, ↓ down)"
    value={`${degree}|${octave}`}
    onChange={(e) => {
      const [d, o] = e.target.value.split('|');
      onChange(d as LiteracyDegree, Number(o));
    }}
    className={cn(control, 'w-full font-medium tabular-nums')}
  >
    {OCTAVE_GROUPS.filter(
      (group) => Math.abs(group.octave) < 2 || group.octave === octave,
    ).map((group) => (
      <optgroup key={group.octave} label={group.label}>
        {LITERACY_DEGREES.map((d) => (
          <option key={d} value={`${d}|${group.octave}`}>
            {pitchLabel(d, group.octave)}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
);

/** How long: the eight lengths a teacher writes, and any other a note has. */
export const LengthSelect: FC<{
  ticks: number;
  onChange: (ticks: number) => void;
  label: string;
  rest?: boolean;
}> = ({ ticks, onChange, label, rest }) => (
  <span className="flex items-center gap-1">
    {rest ? (
      <RestGlyph ticks={ticks} className="text-white/60" />
    ) : (
      <NoteGlyph ticks={ticks} className="text-white/80" />
    )}
    <select
      aria-label={label}
      title={rest ? 'How long the rest lasts' : 'How long the note lasts'}
      value={ticks}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(control, 'min-w-0 flex-1')}
    >
      {!lengthOf(ticks) && <option value={ticks}>{lengthLabel(ticks)}</option>}
      {NOTE_LENGTHS.map((length) => (
        <option key={length.ticks} value={length.ticks}>
          {length.label}
        </option>
      ))}
    </select>
  </span>
);

/** How many bars a segment lasts, its trailing rests included. */
export const BarsSelect: FC<{
  bars: number;
  onChange: (bars: number) => void;
  label: string;
}> = ({ bars, onChange, label }) => (
  <label className="flex items-center gap-1.5 text-xs text-white/60">
    Lasts
    <select
      aria-label={label}
      value={bars}
      onChange={(e) => onChange(Number(e.target.value))}
      className={control}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <option key={n} value={n}>
          {n} bar{n === 1 ? '' : 's'}
        </option>
      ))}
    </select>
  </label>
);

/** A rest's chip: its length, and a way to take it out. */
export const RestChip: FC<{
  ticks: number;
  at: string;
  label: string;
  onLength: (ticks: number) => void;
  onRemove: () => void;
  className?: string;
}> = ({ ticks, at, label, onLength, onRemove, className }) => (
  <div
    className={cn(
      CHIP,
      'border-dashed border-white/15 bg-transparent',
      className,
    )}
  >
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-xs italic text-white/50">rest</span>
      <span className="text-[10px] tabular-nums text-white/35">{at}</span>
    </div>
    <LengthSelect ticks={ticks} rest label={label} onChange={onLength} />
    <button
      type="button"
      aria-label={`Remove the ${label}`}
      className="inline-flex items-center gap-0.5 self-start rounded px-1 text-[11px] text-white/35 transition-colors hover:bg-red-500/15 hover:text-red-300"
      onClick={onRemove}
    >
      <X className="size-3" /> remove
    </button>
  </div>
);

// ── The rhythm strip ───────────────────────────────────────────────────────

export interface StripItem {
  start: number;
  duration: number;
  label: string;
  /** Semitones above the lesson's 1, octaves included: how high to draw it. */
  pitch?: number;
  rest?: boolean;
  lit?: boolean;
}

/** The strip's height and a block's, in px. */
const STRIP = 44;
const BLOCK = 16;

/**
 * A segment's rhythm and the shape of its melody against its bars: each
 * note a block where it falls and as high as it sits, beats and bar lines
 * behind, and anything past the last bar in red.
 */
export const RhythmStrip: FC<{
  items: readonly StripItem[];
  bars: number;
  timeSignature: readonly [number, number];
}> = ({ items, bars, timeSignature }) => {
  const bar = barTicks(timeSignature);
  const beat = bar / timeSignature[0];
  const length = bars * bar;
  const end = items.reduce((m, i) => Math.max(m, i.start + i.duration), 0);
  const total = Math.max(length, end);
  const pct = (ticks: number) => `${(ticks / total) * 100}%`;
  const lines = Array.from(
    { length: Math.ceil(total / beat) + 1 },
    (_, i) => i * beat,
  );
  const pitches = items.flatMap((i) =>
    i.pitch === undefined ? [] : [i.pitch],
  );
  const low = Math.min(...pitches);
  const span = Math.max(...pitches) - low;
  const top = (pitch: number | undefined) =>
    pitch === undefined || span === 0
      ? (STRIP - BLOCK) / 2
      : 3 + (1 - (pitch - low) / span) * (STRIP - BLOCK - 6);
  return (
    <div
      className="relative w-full overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.02]"
      style={{ height: STRIP }}
      aria-hidden="true"
    >
      {end > length && (
        <div
          className="absolute inset-y-0 bg-red-400/10"
          style={{ left: pct(length), right: 0 }}
        />
      )}
      {lines.map((tick) => (
        <div
          key={tick}
          className={cn(
            'absolute inset-y-0 w-px',
            tick % bar === 0 ? 'bg-white/25' : 'bg-white/[0.07]',
          )}
          style={{ left: pct(tick) }}
        />
      ))}
      {items
        .filter((item) => !item.rest)
        .map((item, i) => (
          <div
            key={i}
            className={cn(
              'absolute flex items-center overflow-hidden rounded-sm px-1 text-[10px] leading-none',
              item.start + item.duration > length
                ? 'bg-red-400/40 text-red-50'
                : item.lit
                  ? 'bg-sky-300 text-[#101012]'
                  : 'bg-white/20 text-white/85',
            )}
            style={{
              left: pct(item.start),
              width: `calc(${pct(item.duration)} - 2px)`,
              top: top(item.pitch),
              height: BLOCK,
            }}
            title={item.label}
          >
            <span className="truncate">{item.label}</span>
          </div>
        ))}
    </div>
  );
};
