import { ALL_MODES, MODE_DISPLAY } from '@prism/engine';
import { SCALE_TYPES } from '@/daw/audio/pitch-correction/PitchCorrectionNode';
import { CARD_SELECT_LABEL } from '@/daw/components/Effects/EffectsPanel';
import { Select } from '@/daw/ui/Select';
import {
  retuneMs,
  smoothFromSpeed,
  speedFromSmooth,
} from './pitchCorrectionSmooth';
import { RotaryKnob } from './RotaryKnob';

// ── Pitch correction on an audio track's chain ─────────────────────────────
//
// The controls of a 'pitch-correction' block in an audio track's chain
// (AudioFxCards), drawn as an effect card's body, the plain set: the key and scale the notes snap to, and
// how strong, how smooth and how much of it. The Voice track's own view
// keeps its fuller panel. Key and scale write the notes the worklet may
// land on (activeNotes, bit 0 = C) along with themselves; with no key it
// snaps to the nearest semitone.

/** The default params of a new block, as the Voice track's view makes them. */
export const PITCH_CORRECTION_DEFAULTS: Readonly<Record<string, number>> = {
  rootNote: -1,
  scaleType: 2,
  correction: 80,
  speed: 50,
  humanize: 0,
  shift: 0.5,
  fine: 0.5,
  formant: 0,
  formantFollow: 0,
  mix: 100,
  activeNotes: 4095,
};

const ALL_NOTES = 0xfff;

/** The notes `scaleType` allows from `rootNote` (−1: any note). */
export function activeNotesFor(rootNote: number, scaleType: number): number {
  if (rootNote < 0) return ALL_NOTES;
  const mode = SCALE_TYPES[scaleType];
  const intervals = mode === 'chromatic' ? null : ALL_MODES[mode];
  if (!intervals) return ALL_NOTES;
  let mask = 0;
  for (const interval of intervals) mask |= 1 << (rootNote + interval) % 12;
  return mask;
}

/** The params for the song's key (rootPc, mode), if the scale is known. */
export function paramsForKey(
  rootPc: number,
  mode: string,
): Record<string, number> {
  const idx = SCALE_TYPES.indexOf(mode as (typeof SCALE_TYPES)[number]);
  const scaleType = idx >= 0 ? idx : SCALE_TYPES.indexOf('ionian');
  return {
    rootNote: rootPc,
    scaleType,
    activeNotes: activeNotesFor(rootPc, scaleType),
  };
}

const NOTE_NAMES = [
  'C',
  'C♯ / D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯ / G♭',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];

const KEY_OPTIONS = [
  { value: '-1', label: 'Any note' },
  ...NOTE_NAMES.map((name, pc) => ({ value: String(pc), label: name })),
];

/** The scales a student reaches for first; the song's own joins if it isn't. */
const COMMON_SCALES = [
  'ionian',
  'aeolian',
  'dorian',
  'mixolydian',
  'lydian',
  'phrygian',
  'locrian',
  'harmonicMinor',
  'melodicMinor',
  'chromatic',
];

const scaleLabel = (mode: string) =>
  mode === 'ionian'
    ? 'Major'
    : mode === 'aeolian'
      ? 'Minor'
      : mode === 'chromatic'
        ? 'Chromatic'
        : (MODE_DISPLAY[mode] ?? mode);

/** A select in a card, its name under it as the knobs' are. */
function CardSelect(props: Parameters<typeof Select>[0]) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Select {...props} size="sm" className="w-[128px]" />
      <span className={CARD_SELECT_LABEL}>{props.label}</span>
    </div>
  );
}

export function PitchCorrectionControls({
  params,
  color,
  onParam,
  knobSize = 52,
  rows = 1,
}: {
  params: Readonly<Record<string, number>>;
  color: string;
  onParam(key: string, value: number): void;
  /** The knobs' diameter: an effect card sizes them to its height. */
  knobSize?: number;
  /** The knobs in one row or two, as the card has room. */
  rows?: 1 | 2;
}) {
  const p = (key: string) => params[key] ?? PITCH_CORRECTION_DEFAULTS[key];
  const rootNote = p('rootNote');
  const scaleType = p('scaleType');
  const current = SCALE_TYPES[scaleType] ?? 'ionian';
  const scales = COMMON_SCALES.includes(current)
    ? COMMON_SCALES
    : [...COMMON_SCALES, current];

  const setKey = (root: number, scale: number) => {
    onParam('rootNote', root);
    onParam('scaleType', scale);
    onParam('activeNotes', activeNotesFor(root, scale));
  };
  const smooth = smoothFromSpeed(p('speed'));
  const knob = {
    min: 0,
    max: 100,
    step: 1,
    size: knobSize,
    arcColor: color,
  };
  const percent = (v: number) => `${Math.round(v)}%`;

  return (
    <div
      className="flex h-full items-center gap-3"
      data-testid="pitch-correction-controls"
    >
      <div className="flex shrink-0 flex-col justify-center gap-2">
        <CardSelect
          label="Key"
          id="pitch-correction-key"
          options={KEY_OPTIONS}
          value={String(rootNote)}
          onValueChange={(v) => setKey(Number(v), scaleType)}
        />
        <CardSelect
          label="Scale"
          id="pitch-correction-scale"
          options={scales.map((mode) => ({
            value: String(SCALE_TYPES.indexOf(mode as never)),
            label: scaleLabel(mode),
          }))}
          value={String(scaleType)}
          onValueChange={(v) => setKey(rootNote, Number(v))}
          disabled={rootNote < 0}
        />
      </div>
      <div
        className="grid h-full min-w-max shrink-0 content-center items-center justify-items-center gap-x-3 gap-y-1"
        style={{
          gridAutoFlow: 'column',
          gridTemplateRows: `repeat(${rows}, auto)`,
        }}
      >
        <RotaryKnob
          {...knob}
          label="Strength"
          value={p('correction')}
          formatValue={percent}
          onChange={(v) => onParam('correction', v)}
        />
        <RotaryKnob
          {...knob}
          label="Smooth"
          value={smooth}
          formatValue={(v) => `${Math.round(retuneMs(v))} ms`}
          onChange={(v) => onParam('speed', speedFromSmooth(v))}
        />
        <RotaryKnob
          {...knob}
          label="Human"
          value={p('humanize')}
          formatValue={percent}
          onChange={(v) => onParam('humanize', v)}
        />
        <RotaryKnob
          {...knob}
          label="Mix"
          value={p('mix')}
          formatValue={percent}
          onChange={(v) => onParam('mix', v)}
        />
      </div>
    </div>
  );
}
