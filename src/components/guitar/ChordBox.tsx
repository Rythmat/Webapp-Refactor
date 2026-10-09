// ── ChordBox ───────────────────────────────────────────────────────────────
// A chord shape as the book draws it: name and Hybrid Number System label on
// top, the box, the shape string underneath. The root is marked by shape, and
// chord-tone diagnostics ring the dots that carry a missing tone and name the
// extra ones in a badge (an extra tone has no dot to ring).
//
// With a Book One quality (a prop, or the shape's own) the box also carries
// its theory layer, all derived from the shape (beato-knowledge-spec §3): the
// formula line (R 3 5 ♭7), the voicing family and Movable / Uses open strings
// badge, R/3/5/7 dot labels in chord-tone mode with the quality tones ringed,
// hollow neck inlays up the neck, and an (i) popover with the other names,
// the family explainer, the hidden triad and the tone order. Display only:
// nothing here changes what a step grades.
//
// The lesson variant keeps two short lines over the box — the name with its
// (i), the Hybrid label under it — and moves the formula, family, badge,
// shape string and other names into the (i). The box itself plays the chord.

import { Info, Volume2 } from 'lucide-react';
import {
  memo,
  useId,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/components/utilities';
import {
  GUITAR_KEY_ORDER,
  MAJOR_SCALE_STEPS,
  keyPitchClass,
} from '@/curriculum/data/guitar/bookOne';
import { getGuitarCenter } from '@/curriculum/data/guitar/centers';
import {
  familyTag,
  notesFor,
  theoryString,
} from '@/curriculum/data/guitar/theoryNotes';
import type {
  BookChordQuality,
  GuitarCenterId,
  GuitarKeyName,
  ScaleDegree,
} from '@/curriculum/data/guitar/types';
import {
  formatNoteName,
  KEY_NOTE_NAMES,
  MIDI_ROOT_TO_KEY,
  noteNameToPitchClass,
  spellChord,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import {
  GUITAR_STRINGS_LOW_TO_HIGH,
  midiAt,
  parseShape,
} from '@/lib/guitar/fretboard';
import {
  QUALITY_TONES,
  CHORD_FORMULA,
  formulaText,
  isSeventhQuality,
  spokenToneLabel,
  toneLabelText,
} from '@/lib/guitar/theory/chordTones';
import { chordAliases } from '@/lib/guitar/theory/keyTheory';
import type { ChordToneLabel, VoicingInfo } from '@/lib/guitar/theory/types';
import { classifyVoicing } from '@/lib/guitar/theory/voicing';
import type { GuitarBarre, GuitarStringNumber } from '@/lib/guitar/types';
import { FretDiagram } from './FretDiagram';
import type {
  ChordBoxProps,
  DiagramInfoNote,
  DiagramVariant,
  FretDiagramDot,
} from './types';

/**
 * A pitch class spelled as an interval above the root `name` starts with, so
 * C♯ minor's fifth is G♯: the key row for pitch class 1 is D♭'s, which would
 * make it A♭. A name that doesn't start with the root falls back to that row.
 */
function spellPc(pc: number, rootPc: number, name: string): string {
  const root = name.split(' ')[0];
  if (noteNameToPitchClass(root) === rootPc) {
    return spellChord(root, [(pc - rootPc + 12) % 12])[0];
  }
  const names = KEY_NOTE_NAMES[MIDI_ROOT_TO_KEY[rootPc]] ?? KEY_NOTE_NAMES.C;
  return formatNoteName(names[pc]);
}

// ── Theory layer ───────────────────────────────────────────────────────────

/** The book key whose `degree` is rooted on `rootPc` (each book key is one pitch class). */
function bookKeyOf(rootPc: number, degree: ScaleDegree): GuitarKeyName | null {
  const keyPc = (rootPc - MAJOR_SCALE_STEPS[degree - 1] + 12) % 12;
  return GUITAR_KEY_ORDER.find((key) => keyPitchClass(key) === keyPc) ?? null;
}

/** 'A', 'A or B', 'A, B or C'. */
function orList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/** Popover order: names first, then the shape, then what hides inside it. */
const POPOVER_ORDER = [
  'b7.halfDim',
  'b7.drop2',
  'b7.drop3',
  'b7.open',
  'b7.movable',
  'b7.hidden',
  'b1.order',
  'b7.order',
];

export interface ChordTheory {
  /** 'R ♭3 ♭5 ♭7'. */
  formula: string;
  /** 'half-diminished (ø)' on min7♭5, else null. */
  nickname: string | null;
  voicing: VoicingInfo;
  /** 'Root on string 5 · drop 2'; null for a shape outside the families. */
  family: string | null;
  /** 'Movable' or 'Uses open strings'. */
  badge: string;
  /** Chord tone per sounding string; absent where a note is not in the chord. */
  toneByString: ReadonlyMap<GuitarStringNumber, ChordToneLabel>;
  /** The quality tones (3rd, 7th; and ♭5 in min7♭5) — ringed in chord-tone mode. */
  qualityTones: ReadonlySet<ChordToneLabel>;
  /** 'Also written as CM7, CΔ7 or CΔ. …' */
  aliases: string;
  /** Popover notes (theoryNotes.ts), resolved for this key and shape. */
  notes: DiagramInfoNote[];
}

/**
 * Everything the theory layer shows for one chord box, derived from the
 * shape, its root and quality (and, for the popover notes, its key and
 * degree). Exported for tests and for surfaces that describe a box in words.
 */
export function chordTheory({
  shape,
  name,
  rootPc,
  quality,
  degree,
  centerId,
}: {
  shape: ChordBoxProps['shape'];
  name: string;
  rootPc: number;
  quality: BookChordQuality;
  degree?: ScaleDegree;
  centerId?: GuitarCenterId;
}): ChordTheory {
  const voicing = classifyVoicing(shape, rootPc, quality);
  const toneByString = new Map<GuitarStringNumber, ChordToneLabel>();
  parseShape(shape.frets).forEach((fret, i) => {
    if (fret === null) return;
    const string = GUITAR_STRINGS_LOW_TO_HIGH[i];
    const interval = (midiAt(string, fret) - rootPc + 1200) % 12;
    const tone = CHORD_FORMULA[quality][interval];
    if (tone) toneByString.set(string, tone.label);
  });
  const qualityRoles = QUALITY_TONES[quality];
  const qualityTones = new Set(
    Object.values(CHORD_FORMULA[quality])
      .filter((tone) => qualityRoles.includes(tone.role))
      .map((tone) => tone.label),
  );

  // The root as the name spells it ('B♭'), so aliases read in the key.
  const root = name.split(' ')[0];
  const aliasList = chordAliases(root, quality);
  const aliases =
    quality === 'dom7'
      ? theoryString('aliases.dom7', { symbol: `${root}7` })
      : theoryString('aliases', { aliases: orList(aliasList) });

  const id = centerId ?? (degree ? bookKeyOf(rootPc, degree) : null);
  let notes: DiagramInfoNote[] = [];
  if (id && degree) {
    const seventh = isSeventhQuality(quality);
    const popover = notesFor(seventh ? 'B7' : 'B1', {
      center: getGuitarCenter(id),
      shape: { ...shape, degree, quality },
      voicing,
      settings: { accidentals: 'unicode' },
    }).popover;
    notes = popover
      .filter((note) => POPOVER_ORDER.includes(note.id))
      .sort((a, b) => POPOVER_ORDER.indexOf(a.id) - POPOVER_ORDER.indexOf(b.id))
      .map(({ id, title, body }) => ({ id, title, body }));
  }

  return {
    formula: formulaText(quality),
    nickname: quality === 'min7b5' ? theoryString('nickname.min7b5') : null,
    voicing,
    family: familyTag(voicing),
    badge: theoryString(
      voicing.movable ? 'badge.movable' : 'badge.openStrings',
    ),
    toneByString,
    qualityTones,
    aliases,
    notes,
  };
}

/** The spec's aria.chordbox sentence: name, shape, tones low to high, family. */
function chordBoxAria(
  name: string,
  frets: string,
  theory: ChordTheory,
): string {
  return theoryString('aria.chordbox', {
    chordName: name,
    shapeSpoken: frets.toLowerCase().split('-').join(' '),
    toneOrderSpoken: theory.voicing.toneOrder.map(spokenToneLabel).join(', '),
    // Read as a pause, not a dot: 'Root on string 5, drop 2'.
    familyTag: (theory.family ?? '').replace(' · ', ', '),
  }).replace(/ \.$/, '');
}

// ── (i) popover ────────────────────────────────────────────────────────────

/**
 * The popover's open and close without its zoom and slide: the lesson's
 * motion is colour and opacity only.
 */
const FADE_ONLY = {
  '--tw-enter-scale': '1',
  '--tw-exit-scale': '1',
  '--tw-enter-translate-x': '0',
  '--tw-enter-translate-y': '0',
  '--tw-exit-translate-x': '0',
  '--tw-exit-translate-y': '0',
} as CSSProperties;

/**
 * An (i) button that opens a small popover of theory notes. Shared by the
 * chord and scale boxes; the button sits outside the diagram's role="img".
 */
export function TheoryInfoButton({
  label,
  heading,
  lead,
  notes,
  size = 'md',
  variant = 'default',
  details,
}: {
  /** 'About C major': the button's and the popover's accessible name. */
  label: string;
  heading?: ReactNode;
  /** A first line with no title (the aliases sentence). */
  lead?: string;
  notes: readonly DiagramInfoNote[];
  size?: 'sm' | 'md';
  /** 'lesson': a 24px (i) with a 32px hit area, and the landing popover. */
  variant?: DiagramVariant;
  /** Lesson: lines under the heading, before the lead (family, shape). */
  details?: ReactNode;
}) {
  if (variant === 'lesson') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            data-theory-info
            // 24px to the eye, 32px to a finger.
            className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-white/[0.06] hover:text-[#e8e8f0]"
          >
            <Info aria-hidden className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={label}
          data-theory-popover
          className="w-72 space-y-2 rounded-xl border-white/[0.08] bg-[#141416] p-3 text-xs leading-snug text-[#e8e8f0] motion-reduce:!animate-none"
          style={FADE_ONLY}
        >
          {heading && <div className="text-sm font-bold">{heading}</div>}
          {details}
          {lead && <p className="text-white/55">{lead}</p>}
          {notes.map((note) => (
            <div key={note.id} data-note-id={note.id}>
              <div className="font-bold">{note.title}</div>
              <p className="text-white/55">{note.body}</p>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-theory-info
          className="inline-flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-white/10"
          style={{
            border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            color: 'var(--color-text-dim, #9a9aab)',
          }}
        >
          <Info
            aria-hidden
            className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={label}
        data-theory-popover
        // `!`: the popover's own data-[state=open]:animate-in is the more
        // specific selector, so a plain motion-reduce:animate-none loses.
        className="w-64 space-y-2 p-3 text-xs leading-snug motion-reduce:!animate-none"
        style={{
          background: '#1b1b20',
          color: 'var(--color-text, #e8e8f0)',
          borderColor: 'var(--color-border, rgba(255,255,255,0.12))',
        }}
      >
        {heading && <div className="text-sm font-semibold">{heading}</div>}
        {lead && <p>{lead}</p>}
        {notes.map((note) => (
          <div key={note.id} data-note-id={note.id}>
            <div className="font-semibold">{note.title}</div>
            <p style={{ color: 'var(--color-text-dim, #b4b4c2)' }}>
              {note.body}
            </p>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── ChordBox ───────────────────────────────────────────────────────────────

export const ChordBox = memo(function ChordBox({
  shape,
  name,
  hybridLabel,
  rootPc,
  keyColor,
  showFingers = true,
  state,
  size = 'md',
  mirrored,
  diagnostics,
  onHear,
  quality: qualityProp,
  degree: degreeProp,
  centerId,
  labelMode: labelModeProp,
  theory: withTheory = true,
  variant = 'default',
  toneLabels,
}: ChordBoxProps) {
  const storedMode = useGuitarDisplaySettings((s) => s.chordBoxLabels);
  // A Book One chord shape carries its own degree and quality.
  const book = shape as { degree?: ScaleDegree; quality?: BookChordQuality };
  const quality = qualityProp ?? book.quality;
  const degree = degreeProp ?? book.degree;

  const theory = useMemo(
    () =>
      withTheory && quality
        ? chordTheory({ shape, name, rootPc, quality, degree, centerId })
        : null,
    [withTheory, shape, name, rootPc, quality, degree, centerId],
  );
  // Chord-tone labels come from the theory layer, or are given (song chords).
  const chordTones =
    (labelModeProp ?? storedMode) === 'chordTones' &&
    (theory !== null || toneLabels !== undefined);

  const model = useMemo(() => {
    const missingPcs = new Set(diagnostics?.missingPcs);
    const ringed = new Set(diagnostics?.ringStrings);
    const muted: GuitarStringNumber[] = [];
    const open: GuitarStringNumber[] = [];
    const dots: FretDiagramDot[] = [];
    parseShape(shape.frets).forEach((fret, i) => {
      const string = GUITAR_STRINGS_LOW_TO_HIGH[i];
      if (fret === null) {
        muted.push(string);
        return;
      }
      if (fret === 0) open.push(string);
      const pc = midiAt(string, fret) % 12;
      const finger = shape.fingering.find(
        (f) => f.string === string && f.fret === fret,
      )?.finger;
      const tone = theory?.toneByString.get(string);
      let label: string | undefined;
      if (showFingers) {
        if (chordTones) {
          label = tone ? toneLabelText(tone) : toneLabels?.get(string);
        } else label = finger ? String(finger) : undefined;
      }
      dots.push({
        string,
        fret,
        label,
        isRoot: pc === rootPc,
        state: missingPcs.has(pc) || ringed.has(string) ? 'missing' : 'idle',
        ring:
          showFingers &&
          chordTones &&
          !!tone &&
          !!theory?.qualityTones.has(tone),
      });
    });

    const missing = [...missingPcs].map((pc) => spellPc(pc, rootPc, name));
    const extras = (diagnostics?.extraPcs ?? []).map((pc) =>
      spellPc(pc, rootPc, name),
    );
    // Fingers read low string to high, the way the shape string is written.
    const fingers = [...shape.fingering]
      .sort((a, b) => b.string - a.string)
      .map((f) => f.finger);
    const details = [
      fingers.length > 0 && `fingers ${fingers.join(' ')}`,
      shape.barre && `barre at fret ${shape.barre.fret}`,
      missing.length > 0 && `missing ${missing.join(' ')}`,
      extras.length > 0 && `extra ${extras.join(' ')}`,
    ].filter((d): d is string => !!d);
    const label = theory
      ? [
          chordBoxAria(name, shape.frets, theory),
          details.length > 0 &&
            details.join(', ').replace(/^./, (c) => c.toUpperCase()),
        ]
          .filter(Boolean)
          .join(' ')
      : [`${name}: ${shape.frets.toLowerCase().split('-').join(' ')}`]
          .concat(details)
          .join(', ');

    const barres = shape.barre ? [shape.barre] : undefined;
    return { muted, open, dots, barres, extras, label };
  }, [
    shape,
    name,
    rootPc,
    showFingers,
    diagnostics,
    theory,
    chordTones,
    toneLabels,
  ]);

  if (variant === 'lesson') {
    return (
      <LessonChordBox
        shape={shape}
        name={name}
        hybridLabel={hybridLabel}
        keyColor={keyColor}
        state={state}
        size={size}
        mirrored={mirrored}
        onHear={onHear}
        theory={theory}
        model={model}
      />
    );
  }

  const small = size === 'sm';
  const lineClass = small ? 'text-[10px]' : 'text-xs';
  const headerExtra = theory && (
    <div
      data-chord-theory
      className={`flex flex-col items-center leading-tight ${small ? 'max-w-[8.5rem]' : 'max-w-44'}`}
      style={{ color: 'var(--color-text-dim, #9a9aab)' }}
    >
      <div data-formula className={`${lineClass} text-center`}>
        {theory.formula}
        {theory.nickname && <span> · {theory.nickname}</span>}
      </div>
      <div
        data-family
        className={`flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center ${lineClass}`}
      >
        {theory.family && <span>{theory.family}</span>}
        <span
          data-badge
          className={`rounded-full px-1.5 ${small ? 'text-[9px]' : 'text-[10px]'}`}
          style={{ border: '1px solid rgba(232,232,240,0.28)' }}
        >
          {theory.badge}
        </span>
      </div>
    </div>
  );

  return (
    <div data-chord-box className="inline-flex flex-col items-center gap-1">
      <FretDiagram
        startFret={shape.diagramStartFret}
        muted={model.muted}
        open={model.open}
        dots={model.dots}
        barres={model.barres}
        keyColor={keyColor}
        title={name}
        subtitle={hybridLabel}
        headerExtra={headerExtra || undefined}
        caption={shape.frets}
        size={size}
        state={state}
        mirrored={mirrored}
        ariaLabel={model.label}
        inlays={theory !== null}
      />
      {(model.extras.length > 0 || onHear || theory) && (
        <div className="flex items-center gap-1.5">
          {model.extras.length > 0 && (
            <span
              data-extra-badge
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                border: '1px dashed rgba(232,232,240,0.5)',
                color: 'var(--color-text, #e8e8f0)',
              }}
            >
              extra: {model.extras.join(', ')}
            </span>
          )}
          {onHear && (
            <button
              type="button"
              onClick={onHear}
              aria-label={`Hear ${name}`}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors hover:bg-white/10"
              style={{
                border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                color: 'var(--color-text, #e8e8f0)',
              }}
            >
              <Volume2 aria-hidden className="h-3.5 w-3.5" />
              {size === 'md' && 'Hear it'}
            </button>
          )}
          {theory && (
            <TheoryInfoButton
              label={`About ${name}`}
              size={size}
              heading={
                <>
                  {name}
                  <span
                    className="ml-1.5 text-xs font-normal"
                    style={{ color: 'var(--color-text-dim, #9a9aab)' }}
                  >
                    {theory.formula}
                  </span>
                </>
              }
              lead={theory.aliases}
              notes={theory.notes}
            />
          )}
        </div>
      )}
    </div>
  );
});

/** What ChordBox works out for its box, handed to the lesson look. */
interface ChordBoxModel {
  muted: GuitarStringNumber[];
  open: GuitarStringNumber[];
  dots: FretDiagramDot[];
  barres: GuitarBarre[] | undefined;
  extras: string[];
  label: string;
}

/**
 * The lesson look: the name and its (i) on one line, the Hybrid label (and
 * any extra tones after a missed strum) under it, then the box, which plays
 * the chord when it can.
 */
function LessonChordBox({
  shape,
  name,
  hybridLabel,
  keyColor,
  state,
  size,
  mirrored,
  onHear,
  theory,
  model,
}: Pick<
  ChordBoxProps,
  | 'shape'
  | 'name'
  | 'hybridLabel'
  | 'keyColor'
  | 'state'
  | 'size'
  | 'mirrored'
  | 'onHear'
> & { theory: ChordTheory | null; model: ChordBoxModel }) {
  const descriptionId = useId();
  const diagram = (
    <FretDiagram
      variant="lesson"
      startFret={shape.diagramStartFret}
      muted={model.muted}
      open={model.open}
      dots={model.dots}
      barres={model.barres}
      keyColor={keyColor}
      size={size}
      state={state}
      mirrored={mirrored}
      ariaLabel={model.label}
      inlays={theory !== null}
    />
  );
  return (
    <div
      data-chord-box
      data-variant="lesson"
      className={cn(
        'inline-flex flex-col items-start gap-1',
        state === 'done' && 'opacity-40',
      )}
    >
      <div className="flex h-6 items-center gap-1">
        <span
          data-title
          className="whitespace-nowrap text-sm font-bold leading-none text-[#e8e8f0]"
        >
          {name}
        </span>
        {theory && (
          <TheoryInfoButton
            variant="lesson"
            label={`About ${name}`}
            heading={
              <>
                {name}
                <span
                  data-formula
                  className="ml-1.5 text-xs font-normal text-white/55"
                >
                  {theory.formula}
                  {theory.nickname && <span> · {theory.nickname}</span>}
                </span>
              </>
            }
            details={
              <div className="space-y-0.5 text-white/55">
                <div data-family>
                  {[theory.family, theory.badge].filter(Boolean).join(' · ')}
                </div>
                <div data-caption>Shape {shape.frets}</div>
              </div>
            }
            lead={theory.aliases}
            notes={theory.notes}
          />
        )}
      </div>
      {(hybridLabel || model.extras.length > 0) && (
        <div className="flex h-4 items-center gap-1.5 whitespace-nowrap text-xs leading-4 text-white/55">
          {hybridLabel && <span data-subtitle>{hybridLabel}</span>}
          {/* After a missed strum: the tones it had that the chord hasn't. */}
          {model.extras.length > 0 && (
            <span
              data-extra-badge
              className="rounded-full border border-dashed border-white/40 px-1.5 text-[#e8e8f0]"
            >
              extra: {model.extras.join(', ')}
            </span>
          )}
        </div>
      )}
      {onHear ? (
        <>
          <button
            type="button"
            onClick={onHear}
            aria-label={`Hear ${name}`}
            aria-describedby={descriptionId}
            data-hear
            className="rounded-lg bg-transparent p-0 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
          >
            {diagram}
          </button>
          {/* The box's own description: inside a button it isn't read. */}
          <span id={descriptionId} className="sr-only">
            {model.label}
          </span>
        </>
      ) : (
        diagram
      )}
    </div>
  );
}
