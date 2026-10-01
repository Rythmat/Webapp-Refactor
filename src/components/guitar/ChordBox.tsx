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

import { Info, Volume2 } from 'lucide-react';
import { memo, useMemo, type ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
  MAJOR_SCALE_STEPS,
  keyPitchClass,
} from '@/curriculum/data/guitar/bookOne';
import {
  familyTag,
  notesFor,
  theoryString,
} from '@/curriculum/data/guitar/theoryNotes';
import type {
  BookChordQuality,
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
  spokenToneLabel,
  toneLabelText,
} from '@/lib/guitar/theory/chordTones';
import { chordAliases } from '@/lib/guitar/theory/keyTheory';
import type { ChordToneLabel, VoicingInfo } from '@/lib/guitar/theory/types';
import { classifyVoicing } from '@/lib/guitar/theory/voicing';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { FretDiagram } from './FretDiagram';
import type { ChordBoxProps, DiagramInfoNote, FretDiagramDot } from './types';

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
  keyName,
}: {
  shape: ChordBoxProps['shape'];
  name: string;
  rootPc: number;
  quality: BookChordQuality;
  degree?: ScaleDegree;
  keyName?: GuitarKeyName;
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

  const key = keyName ?? (degree ? bookKeyOf(rootPc, degree) : null);
  let notes: DiagramInfoNote[] = [];
  if (key && degree) {
    const seventh = quality !== 'maj' && quality !== 'min';
    const popover = notesFor(seventh ? 'B7' : 'B1', {
      center: GUITAR_ATLAS_BOOK_ONE[key],
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
 * An (i) button that opens a small popover of theory notes. Shared by the
 * chord and scale boxes; the button sits outside the diagram's role="img".
 */
export function TheoryInfoButton({
  label,
  heading,
  lead,
  notes,
  size = 'md',
}: {
  /** 'About C major': the button's and the popover's accessible name. */
  label: string;
  heading?: ReactNode;
  /** A first line with no title (the aliases sentence). */
  lead?: string;
  notes: readonly DiagramInfoNote[];
  size?: 'sm' | 'md';
}) {
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
  keyName,
  labelMode: labelModeProp,
  theory: withTheory = true,
}: ChordBoxProps) {
  const storedMode = useGuitarDisplaySettings((s) => s.chordBoxLabels);
  // A Book One chord shape carries its own degree and quality.
  const book = shape as { degree?: ScaleDegree; quality?: BookChordQuality };
  const quality = qualityProp ?? book.quality;
  const degree = degreeProp ?? book.degree;

  const theory = useMemo(
    () =>
      withTheory && quality
        ? chordTheory({ shape, name, rootPc, quality, degree, keyName })
        : null,
    [withTheory, shape, name, rootPc, quality, degree, keyName],
  );
  const chordTones =
    (labelModeProp ?? storedMode) === 'chordTones' && theory !== null;

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
        if (chordTones) label = tone && toneLabelText(tone);
        else label = finger ? String(finger) : undefined;
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
  }, [shape, name, rootPc, showFingers, diagnostics, theory, chordTones]);

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
