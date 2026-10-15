import { Lock, Repeat, TrendingUp } from 'lucide-react';
import { memo, useEffect, useMemo, useRef } from 'react';
import {
  ChordBox,
  type ChordDiagnostics,
  type DiagramVariant,
} from '@/components/guitar';
import {
  getGuitarCenter,
  seventhShapeId,
} from '@/curriculum/data/guitar/centers';
import {
  GUITAR_THEORY_NOTES,
  notesFor,
} from '@/curriculum/data/guitar/theoryNotes';
import type {
  GuitarCenterId,
  GuitarMusicMap,
} from '@/curriculum/data/guitar/types';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import {
  analyzeChange,
  analyzeMusicMap,
  romanNumeral,
  topLineRuns,
  type ChangeInfo,
  type GuitarSubsectionPrefix,
} from '@/lib/guitar/theory';
import type { GuitarVisualChord } from './guitarVisualModel';
import { TheoryPopover, type PopoverNote } from './theory/TheoryPopover';
import { CHANGE_PREFIXES, sharedNotesText } from './theory/theoryUi';

// ── GuitarChordStrip ───────────────────────────────────────────────────────
// The step's chord boxes in playing order, as the book prints a progression.
// The chord to play now is outlined and kept in view, glows once the
// detector hears it, and carries what a missed strum was missing or had
// extra.
//
// Given a key (and the step's subsection), it also carries the theory layer,
// display only: Roman numerals beside the Hybrid labels (setting), what each
// change keeps — shared notes, a finger that can stay down — between the
// boxes (setting, on by default), and on the 7th-chord page (B8) the
// climbing top line and the closing chord 1.
//
// The lesson variant draws the lesson chord boxes, fades the strip's edges
// where it scrolls, and sets the cues in 12px white/55 — no key colour, which
// the lesson keeps for the chord being played.

const CHANGE_NOTE_IDS = new Set(['d3.tricky', 'd3.sameFret']);
const ANCHOR_TITLE =
  GUITAR_THEORY_NOTES.find((n) => n.id === 'b2.anchor')?.title ?? '';

interface GuitarChordStripProps {
  chords: readonly GuitarVisualChord[];
  currentIndex: number;
  keyColor: string;
  /** The current chord is being heard. */
  heard: boolean;
  /** For the current chord, after a missed strum. */
  diagnostics?: ChordDiagnostics;
  mirrored: boolean;
  /** Plays the exact voicing; omitted = no "Hear it" buttons. */
  onHearShape?: (frets: string) => void;
  /** The step's key center. Omitted = no theory layer (the strip as before). */
  keyCenter?: GuitarCenterId;
  /** The step's subsection ('B2', 'B8', 'D3'): which change and B8 cues apply. */
  stepPrefix?: GuitarSubsectionPrefix | null;
  /** Music Map steps: the map, so the last bar's change back to bar 1 shows. */
  map?: GuitarMusicMap;
  /** Shared-note badges and keep-a-finger-down markers (default: the device setting). */
  showSharedNotes?: boolean;
  /** Roman numeral beside each Hybrid label (default: the device setting). */
  showRomanNumerals?: boolean;
  /** 'lesson': the lesson chord boxes and quieter cues (default 'default'). */
  variant?: DiagramVariant;
  /** The chord boxes' size (default 'sm'). */
  size?: 'sm' | 'md';
}

interface ChangeCue {
  change: ChangeInfo;
  /** The map's last bar back to its first. */
  wraps: boolean;
  /** d3.tricky / d3.sameFret, when they apply. */
  notes: PopoverNote[];
  anchorNote: PopoverNote | null;
}

interface BoxCue {
  roman: string | null;
  change: ChangeCue | null;
  /** B8: this box and the next are in a climbing top line. */
  topLine: 'start' | 'continue' | null;
  topNote: PopoverNote | null;
  /** B8: the closing chord 1. */
  octaveNote: PopoverNote | null;
}

/** The theory cues beside each box. Exported for tests. */
export function chordStripCues(
  chords: readonly GuitarVisualChord[],
  keyCenter: GuitarCenterId,
  prefix: GuitarSubsectionPrefix | null,
  map: GuitarMusicMap | undefined,
): BoxCue[] {
  const center = getGuitarCenter(keyCenter);
  const settings = { accidentals: 'unicode' as const };
  const n = chords.length;

  let changes: (ChangeCue | null)[] = chords.map(() => null);
  if (prefix && CHANGE_PREFIXES.has(prefix) && n > 1) {
    const analysis = map ? analyzeMusicMap(map, center.mode) : undefined;
    const infos = analysis
      ? analysis.changes
      : chords
          .slice(1)
          .map((chord, i) =>
            analyzeChange(chords[i].shape, chord.shape, i, i + 1),
          );
    changes = chords.map((_, i) => {
      const change = infos.find((c) => c.fromBar === i);
      if (!change) return null;
      const popover = notesFor(prefix, {
        center,
        map,
        analysis,
        change,
        settings,
      }).popover;
      return {
        change,
        wraps: change.wrapsRepeat,
        notes: popover.filter((note) => CHANGE_NOTE_IDS.has(note.id)),
        anchorNote: popover.find((note) => note.id === 'b2.anchor') ?? null,
      };
    });
  }

  // B8 plays the 7th-chord page in order: box k is sevenths[k].
  let topLine: BoxCue['topLine'][] = chords.map(() => null);
  let topNote: PopoverNote | null = null;
  let octaveNote: PopoverNote | null = null;
  if (prefix === 'B8') {
    const info = notesFor('B8', { center, settings }).info;
    topNote = info.find((note) => note.id === 'b8.topNote') ?? null;
    octaveNote = info.find((note) => note.id.startsWith('b8.octave')) ?? null;
    const pageIndex = chords.map((chord) =>
      center.sevenths.findIndex(
        (_, k) => seventhShapeId(center, k + 1) === chord.shapeId,
      ),
    );
    const runs = topLineRuns(center);
    topLine = chords.map((_, i) => {
      const a = pageIndex[i];
      const b = pageIndex[i + 1];
      if (a < 0 || b !== a + 1) return null;
      const run = runs.find((r) => r.start <= a && b <= r.end);
      if (!run) return null;
      return a === run.start || i === 0 ? 'start' : 'continue';
    });
  }
  const lastIsOctave =
    prefix === 'B8' &&
    chords[n - 1]?.shapeId === seventhShapeId(center, center.sevenths.length);

  return chords.map((chord, i) => ({
    roman: romanNumeral(center, chord.shape.degree, chord.shape.quality),
    change: changes[i],
    topLine: topLine[i],
    topNote,
    octaveNote: lastIsOctave && i === n - 1 ? octaveNote : null,
  }));
}

const CUE_LOOK = {
  default: {
    text: 'text-[10px] leading-tight',
    border: '1px solid var(--color-border, rgba(255,255,255,0.14))',
    column: 'w-16',
    dim: 'var(--color-text-dim, #9a9aab)',
    ink: 'var(--color-text, #e8e8f0)',
    icon: 'h-2.5 w-2.5',
    /** Tappable cues: as drawn. */
    hit: '',
  },
  lesson: {
    text: 'text-xs leading-tight',
    // Plain captions between the boxes: an outline on every one of them
    // read as a row of buttons.
    border: 'none',
    column: 'w-20',
    dim: 'rgba(255, 255, 255, 0.55)',
    ink: 'rgba(255, 255, 255, 0.55)',
    icon: 'h-3 w-3',
    /** Tappable cues reach 36px round their text. */
    hit: " relative before:absolute before:-inset-2 before:content-['']",
  },
} as const;

function ChangeBadges({
  cue,
  showShared,
  keyColor,
  variant,
}: {
  cue: BoxCue;
  showShared: boolean;
  keyColor: string;
  variant: DiagramVariant;
}) {
  const look = CUE_LOOK[variant];
  // The climbing top line: the key colour in the book's look, neutral in a lesson.
  const lineColor = variant === 'lesson' ? look.dim : keyColor;
  const change = showShared ? cue.change : null;
  const topLine = cue.topLine && cue.topNote ? cue.topLine : null;
  if (!change && !topLine && !cue.octaveNote) return null;
  const shared = change
    ? sharedNotesText(change.change.sharedPitchClasses.length)
    : '';
  const anchors = change?.change.anchors ?? [];
  const anchorWhere = anchors
    .map((a) => `string ${a.string}, fret ${a.fret}`)
    .join('; ');

  return (
    <div
      data-strip-cues
      className={`flex ${look.column} flex-col items-center gap-1 text-center`}
      style={{ color: look.dim }}
    >
      {change &&
        (change.notes.length > 0 ? (
          <TheoryPopover
            notes={change.notes}
            triggerLabel={change.wraps ? `Back to bar 1: ${shared}` : shared}
            className={`${look.text} inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 hover:bg-white/10${look.hit}`}
            style={{ border: look.border, color: look.ink }}
          >
            {change.wraps && (
              <Repeat aria-hidden className={`${look.icon} shrink-0`} />
            )}
            <span data-shared-badge={change.change.sharedPitchClasses.length}>
              {shared}
            </span>
          </TheoryPopover>
        ) : (
          <span
            className={`${look.text} inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5`}
            style={{ border: look.border }}
          >
            {change.wraps && (
              <>
                <Repeat aria-hidden className={`${look.icon} shrink-0`} />
                <span className="sr-only">Back to bar 1: </span>
              </>
            )}
            <span data-shared-badge={change.change.sharedPitchClasses.length}>
              {shared}
            </span>
          </span>
        ))}
      {change && anchors.length > 0 && (
        <span data-anchor-marker className="contents">
          {change.anchorNote ? (
            <TheoryPopover
              notes={[change.anchorNote]}
              triggerLabel={`${ANCHOR_TITLE}: ${anchorWhere}`}
              className={`${look.text} inline-flex items-center gap-0.5 rounded px-1 hover:bg-white/10${look.hit}`}
              style={{ color: look.ink }}
            >
              <Lock aria-hidden className={`${look.icon} shrink-0`} />
              {ANCHOR_TITLE}
            </TheoryPopover>
          ) : (
            <span className={`${look.text} inline-flex items-center gap-0.5`}>
              <Lock aria-hidden className={`${look.icon} shrink-0`} />
              {ANCHOR_TITLE}
              <span className="sr-only">: {anchorWhere}</span>
            </span>
          )}
        </span>
      )}
      {topLine === 'start' && cue.topNote && (
        <TheoryPopover
          notes={[cue.topNote]}
          className={`${look.text} inline-flex items-center gap-0.5 rounded px-1 hover:bg-white/10${look.hit}`}
          style={{ color: lineColor }}
        >
          <TrendingUp aria-hidden className="h-3 w-3 shrink-0" />
          <span data-top-line>{cue.topNote.title}</span>
        </TheoryPopover>
      )}
      {topLine === 'continue' && (
        <TrendingUp
          aria-hidden
          data-top-line-continue
          className="h-3 w-3"
          style={{ color: lineColor }}
        />
      )}
      {cue.octaveNote && (
        <TheoryPopover
          notes={[cue.octaveNote]}
          className={`${look.text} rounded-full px-1.5 py-0.5 hover:bg-white/10${look.hit}`}
          style={{ border: look.border, color: look.ink }}
        >
          <span data-octave-return={cue.octaveNote.id}>
            {cue.octaveNote.title}
          </span>
        </TheoryPopover>
      )}
    </div>
  );
}

export const GuitarChordStrip = memo(function GuitarChordStrip({
  chords,
  currentIndex,
  keyColor,
  heard,
  diagnostics,
  mirrored,
  onHearShape,
  keyCenter,
  stepPrefix = null,
  map,
  showSharedNotes,
  showRomanNumerals,
  variant = 'default',
  size = 'sm',
}: GuitarChordStripProps) {
  const lesson = variant === 'lesson';
  const listRef = useRef<HTMLOListElement>(null);
  const sharedSetting = useGuitarDisplaySettings((s) => s.showSharedNotes);
  const romanSetting = useGuitarDisplaySettings((s) => s.showRomanNumerals);
  const showShared = showSharedNotes ?? sharedSetting;
  const showRoman = showRomanNumerals ?? romanSetting;

  // Stable per box, so the boxes that aren't changing skip their render.
  const hearHandlers = useMemo(
    () =>
      chords.map((chord) =>
        onHearShape ? () => onHearShape(chord.shape.frets) : undefined,
      ),
    [chords, onHearShape],
  );

  const cues = useMemo(
    () =>
      keyCenter ? chordStripCues(chords, keyCenter, stepPrefix, map) : null,
    [chords, keyCenter, stepPrefix, map],
  );

  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[currentIndex];
    if (!list || !(item instanceof HTMLElement)) return;
    // Centre the current box by scrolling the strip itself: scrollIntoView
    // would scroll the lesson page too. The strip's scroll-smooth class
    // animates it unless the student prefers reduced motion. Following the
    // lesson is also why the strip can hide its scrollbar, which would
    // otherwise take height the boxes need (touch, trackpad and shift+wheel
    // still scroll it). The box, not its item: an item also holds the cues
    // to the next chord.
    const box = item.querySelector<HTMLElement>('[data-chord-box]') ?? item;
    list.scrollLeft = box.offsetLeft - (list.clientWidth - box.offsetWidth) / 2;
  }, [currentIndex, chords]);

  return (
    <ol
      ref={listRef}
      aria-label="Chords"
      data-variant={lesson ? 'lesson' : undefined}
      className={
        lesson
          ? // The edges fade where boxes scroll past them; the padding keeps
            // the first and last box clear of the fade. The boxes sit centred
            // in the lesson's tall area — safely: in an area shorter than
            // they are (a short window while practising), they keep their
            // names in view and lose the bottom row instead of both ends.
            'relative flex h-full max-w-full snap-x gap-3 overflow-x-auto overflow-y-hidden px-4 [align-items:safe_center] [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)] motion-safe:scroll-smooth [scrollbar-width:none]'
          : 'relative flex h-full max-w-full items-start gap-2 overflow-x-auto overflow-y-hidden motion-safe:scroll-smooth [scrollbar-width:none]'
      }
    >
      {chords.map((chord, i) => {
        const isCurrent = i === currentIndex;
        const cue = cues?.[i];
        return (
          <li
            key={`${i}-${chord.shapeId}`}
            data-chord-index={i}
            aria-current={isCurrent ? 'step' : undefined}
            className={
              lesson
                ? 'flex shrink-0 snap-center items-center gap-3'
                : 'flex shrink-0 items-center gap-2'
            }
          >
            <ChordBox
              shape={chord.shape}
              name={chord.name}
              hybridLabel={
                cue?.roman && showRoman
                  ? `${chord.hybridLabel} · ${cue.roman}`
                  : chord.hybridLabel
              }
              rootPc={chord.rootPc}
              {...(keyCenter ? { centerId: keyCenter } : {})}
              keyColor={keyColor}
              size={size}
              {...(lesson ? { variant: 'lesson' as const } : {})}
              state={isCurrent ? (heard ? 'heard' : 'current') : 'idle'}
              mirrored={mirrored}
              diagnostics={isCurrent ? diagnostics : undefined}
              onHear={hearHandlers[i]}
            />
            {cue && (
              <ChangeBadges
                cue={cue}
                showShared={showShared}
                keyColor={keyColor}
                variant={variant}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
});
