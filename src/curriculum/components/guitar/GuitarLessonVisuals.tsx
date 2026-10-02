import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Fretboard,
  ScaleBox,
  type ChordDiagnostics,
  type ScaleBoxLabelMode,
} from '@/components/guitar';
import {
  FRETBOARD_HEIGHT_UNITS,
  fretboardWidthUnits,
} from '@/components/guitar/Fretboard';
import { getGuitarCenter } from '@/curriculum/data/guitar/centers';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import type { GuitarCenterId } from '@/curriculum/data/guitar/types';
import type { LessonNoteEvent } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type { ActivityStepV2 } from '@/curriculum/types/activity.v2';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import type { TabTheoryLayers } from '../LearnTabView';
import { GuitarChordStrip } from './GuitarChordStrip';
import {
  GuitarLabelModeToggle,
  labelLegend,
  useGuitarLabelMode,
} from './GuitarLabelModeToggle';
import {
  fretboardMarkers,
  groupAt,
  noteGroups,
  outOfTimeGroup,
} from './fretboardMarkers';
import {
  chordTargetAt,
  guitarVisualModel,
  markerLabeler,
  tabChordToneAnnotations,
  tabKeyNumberAnnotations,
  tabStepChips,
} from './guitarVisualModel';
import { useTickRefSelector } from './useTickRefSelector';

// ── GuitarLessonVisuals ────────────────────────────────────────────────────
// What a guitar lesson shows where piano shows the keyboard: the step's chord
// boxes (or its scale box) beside a fretboard marking what to play, what is
// sounding and what is done. The playhead is read from the container's tick
// ref by polling, so the visuals re-render when the chord or note at the
// playhead changes, never on every frame.
//
// The theory layer (beato-knowledge-spec §3) is display only: a label toggle
// (fingers, notes, key numbers or chord tones) with its one-line legend, the
// scale box's octave hairline and pentatonic ghosts, half-step brackets with
// "Show steps" on A1, and the chord boxes' own formula, family and popover.
//
// The guitar lesson layout passes `controls={false}`: its settings sheet has
// the label, steps and left-handed choices and its action bar the input and
// the missed-strum hint, so the big area above the TAB is the diagrams alone,
// in their lesson look — a scale step's box on the left beside the
// fretboard, a chord step's strip beside a fretboard column a little wider
// than it, each diagram centred in its cell. The neck is drawn as large as
// its cell allows with the whole fret window in view (440px tall at most);
// on a phone they stack, the strip or box over a 150px neck.

/**
 * Height the lesson container gives this block (the keyboard's is 120): a
 * small chord box with its names, formula and family lines, shape string
 * and "Hear it" row fits.
 */
export const GUITAR_VISUALS_HEIGHT = 228;

/** Room above the fretboard for the label, input and handedness chips. */
const CHIP_ROW = 26;
/** Room under the fretboard for the label legend (two short lines). */
const LEGEND_ROW = 26;
/** A lesson cell's size when it can't be measured: 208px tall, width free. */
const LESSON_CELL: Size = { width: Infinity, height: 208 };
/**
 * From these heights the lesson diagrams draw at their larger size. A chord
 * strip clips what doesn't fit, so its boxes (up to 207px tall at the larger
 * size, 181px at the smaller) wait until they fit whole. The scale box
 * (199px) may overhang its cell a little into the gaps round it.
 */
const LESSON_MD_MIN = { chords: 208, scale: 196 } as const;
/** The lesson neck is never drawn taller than this, however large its cell. */
const LESSON_NECK_MAX = 440;
/**
 * Nor shorter than this to fit a wide window (B's sevenths span 16 frets):
 * its labels would drop under 12px. It scrolls sideways instead.
 */
const LESSON_NECK_MIN = 150;

interface Size {
  width: number;
  height: number;
}

/** An element's size as it lays out, or `fallback` until it can be measured. */
function useMeasuredSize(
  ref: RefObject<HTMLElement>,
  enabled: boolean,
  fallback: Size,
): Size {
  const [size, setSize] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      // Whole pixels, rounded down: what's drawn to fit never overflows.
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      if (width <= 0 || height <= 0) return;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled]);
  return size;
}

/**
 * The lesson neck's height in its cell: the cell's height, unless the whole
 * fret window would then be wider than the cell — then the height at which
 * it fits exactly — and 440px at most. A window too wide to fit at 150px
 * keeps 150px and scrolls sideways.
 */
function lessonNeckHeight(
  cell: Size,
  window: { min: number; max: number },
): number {
  const fit =
    (cell.width * FRETBOARD_HEIGHT_UNITS) / fretboardWidthUnits(window);
  return Math.floor(
    Math.min(cell.height, LESSON_NECK_MAX, Math.max(fit, LESSON_NECK_MIN)),
  );
}

/**
 * The TAB's theory layers for a step, from the device settings: W / H chips
 * on A1 with "Show steps"; under the notes, each arpeggio note's chord tone
 * (B1, B5, B7) in Chord tones mode, or each scale or melody note's key
 * number in Key numbers mode. Pass the result to LearnTabView (or draw it
 * with TabTheoryOverlay through GenrePianoRoll's `tabOverlay`). Empty
 * otherwise, and for a step that isn't a guitar step (safe to call on every
 * lesson).
 */
export function useGuitarTabLayers({
  step,
  keyCenter,
  events,
  countInOffset,
}: {
  step: ActivityStepV2 | null | undefined;
  keyCenter: GuitarCenterId | null | undefined;
  /** The roll events LearnTabView draws (same ids). */
  events: readonly LessonNoteEvent[];
  countInOffset: number;
}): TabTheoryLayers {
  const showSteps = useGuitarDisplaySettings((s) => s.showSteps);
  const chordLabels = useGuitarDisplaySettings((s) => s.chordFretboardLabels);
  const scaleLabels = useGuitarDisplaySettings((s) => s.scaleLabels);
  const model = useMemo(
    () =>
      step?.guitar && keyCenter ? guitarVisualModel(step, keyCenter) : null,
    [step, keyCenter],
  );
  const wantChips = !!model && showSteps && model.hasSteps;
  const wantTones = !!model && chordLabels === 'chordTones' && model.isArpeggio;
  const wantNumbers =
    !!model && scaleLabels === 'keyNumbers' && model.labelKind === 'scale';
  const chordTargets = step?.chordTargets;
  const tonicPc = model?.tonicPc ?? 0;
  return useMemo(() => {
    // A step is a chord step or a scale step, never both: one kind of text
    // sits under its notes.
    const noteAnnotations = wantTones
      ? tabChordToneAnnotations(events, chordTargets ?? [], countInOffset)
      : wantNumbers
        ? tabKeyNumberAnnotations(events, tonicPc)
        : null;
    return {
      ...(wantChips ? { stepChips: tabStepChips(events, tonicPc) } : {}),
      ...(noteAnnotations ? { noteAnnotations } : {}),
    };
  }, [
    wantChips,
    wantTones,
    wantNumbers,
    events,
    tonicPc,
    chordTargets,
    countInOffset,
  ]);
}

export interface GuitarLessonVisualsProps {
  /** The resolved step: guitar meta, chordTargets, targetNotes. */
  step: ActivityStepV2;
  /** Roll events: ids, midi, startTicks (shifted in time), fretPosition. */
  events: LessonNoteEvent[];
  keyCenter: GuitarCenterId;
  keyColor: string;
  activityState: 'preview' | 'practice' | 'performance' | 'complete';
  inTime: boolean;
  /** 1920 in time, 0 out of time: chordTargets ticks + this = roll ticks. */
  countInOffset: number;
  /** Roll playhead tick, same space as events. */
  currentTickRef: MutableRefObject<number>;
  /** Notes sounding from the student's input. */
  activeMidis: number[];
  demoHighlightMidis: Set<number>;
  isPlayingDemo: boolean;
  practiceHighlightMidis: Set<number>;
  targetMidiSet: Set<number>;
  noteHoldMeta?: Record<
    string,
    {
      isCompleted: boolean;
      isCurrentChord: boolean;
      holdProgress: number;
      isHeld?: boolean;
    }
  >;
  heardChord?: {
    label: string;
    confidence: number;
    matchesCurrent: boolean;
  } | null;
  /** For the current chord after a missed strum. */
  diagnostics?: ChordDiagnostics | null;
  /** Input chip (source, level, set-up), shown top-right. */
  inputStatus?: ReactNode;
  /** Plays the exact voicing ("Hear it"). */
  onHearShape?: (frets: string) => void;
  /**
   * Roman numerals on the chord strip: a teacher's setting, so the lesson
   * decides; omitted, the strip follows the device setting.
   */
  showRomanNumerals?: boolean;
  /**
   * The chip row (dot labels, Show steps, input, Left-handed) and the legend
   * or hint line (default). Off, the diagrams take the whole band in their
   * lesson look; the host shows those choices and the hint elsewhere.
   */
  controls?: boolean;
}

export const GuitarLessonVisuals = memo(function GuitarLessonVisuals({
  step,
  events,
  keyCenter,
  keyColor,
  activityState,
  inTime,
  countInOffset,
  currentTickRef,
  activeMidis,
  demoHighlightMidis,
  isPlayingDemo,
  practiceHighlightMidis,
  targetMidiSet,
  noteHoldMeta,
  heardChord,
  diagnostics,
  inputStatus,
  onHearShape,
  showRomanNumerals,
  controls = true,
}: GuitarLessonVisualsProps) {
  const lesson = !controls;
  const diagramsRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const diagramsHeight = useMeasuredSize(
    diagramsRef,
    lesson,
    LESSON_CELL,
  ).height;
  const boardCell = useMeasuredSize(boardRef, lesson, LESSON_CELL);
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const setLeftHanded = useInstrumentStore((s) => s.setLeftHanded);
  const showSteps = useGuitarDisplaySettings((s) => s.showSteps);
  const setShowSteps = useGuitarDisplaySettings((s) => s.setShowSteps);

  const model = useMemo(
    () => guitarVisualModel(step, keyCenter),
    [step, keyCenter],
  );
  const lessonSize =
    diagramsHeight >=
    LESSON_MD_MIN[model.chords.length > 0 ? 'chords' : 'scale']
      ? 'md'
      : 'sm';
  const labelKind = model.labelKind ?? 'scale';
  const labelMode = useGuitarLabelMode(labelKind);
  const labelOf = useMemo(
    () => (model.labelKind ? markerLabeler(model, labelMode) : undefined),
    [model, labelMode],
  );
  const chordTargets = step.chordTargets;
  const groups = useMemo(
    () => noteGroups(events, chordTargets ?? [], countInOffset, model.tonicPc),
    [events, chordTargets, countInOffset, model.tonicPc],
  );

  // Where the student is: at the playhead in time, at the first note not yet
  // completed out of time, at the start otherwise.
  const isActive =
    activityState === 'practice' || activityState === 'performance';
  const selectGroup = useCallback(
    (tick: number) => groupAt(groups, tick),
    [groups],
  );
  const playheadGroup = useTickRefSelector(
    currentTickRef,
    selectGroup,
    isActive && inTime,
  );
  const holdMeta = isActive && !inTime ? noteHoldMeta : undefined;
  const cursor = holdMeta
    ? outOfTimeGroup(groups, holdMeta)
    : isActive && inTime
      ? playheadGroup
      : 0;

  // noteHoldMeta is rebuilt every frame while a note is held; keying the
  // completed set by its contents keeps the markers still between changes.
  const completedKey = holdMeta
    ? events
        .filter((e) => holdMeta[e.id]?.isCompleted)
        .map((e) => e.id)
        .join(' ')
    : '';
  const completedIds = useMemo(
    () => new Set(completedKey.split(' ').filter(Boolean)),
    [completedKey],
  );

  const cursorGroup = groups[Math.min(cursor, groups.length - 1)];
  const chordIndex = cursorGroup
    ? (model.chordIndexOfTarget[
        chordTargetAt(chordTargets ?? [], cursorGroup.startTicks, countInOffset)
      ] ?? 0)
    : 0;
  const chord = model.chords[chordIndex];

  // Faintly under everything: the whole scale position, or the chord's shape.
  const context = useMemo(
    () =>
      model.scale
        ? { positions: model.scale.position.playOrder, rootPc: model.tonicPc }
        : chord
          ? { positions: chord.positions, rootPc: chord.rootPc }
          : null,
    [model, chord],
  );

  const markers = useMemo(
    () =>
      fretboardMarkers({
        groups,
        cursor,
        completedIds,
        context,
        window: model.window,
        keyRootPc: model.tonicPc,
        activityState,
        demoMidis: demoHighlightMidis,
        isPlayingDemo,
        activeMidis,
        practiceMidis: practiceHighlightMidis,
        targetMidiSet,
        labelOf,
      }),
    [
      groups,
      cursor,
      completedIds,
      context,
      model,
      activityState,
      demoHighlightMidis,
      isPlayingDemo,
      activeMidis,
      practiceHighlightMidis,
      targetMidiSet,
      labelOf,
    ],
  );

  const stepsOn = showSteps && model.hasSteps;
  const legend = [
    model.labelKind && labelLegend(labelMode),
    stepsOn && theoryString('legend.steps'),
  ]
    .filter(Boolean)
    .join(' ');

  const scaleMode =
    labelKind === 'scale' ? (labelMode as ScaleBoxLabelMode) : undefined;

  // The scale box rings the next note to play.
  const nextPosition = groups[cursor]?.notes[0]?.position;
  const scaleIndex =
    model.scale && nextPosition
      ? model.scale.position.playOrder.findIndex(
          (p) =>
            p.string === nextPosition.string && p.fret === nextPosition.fret,
        )
      : -1;

  const map = step.guitar?.musicMap
    ? getGuitarCenter(keyCenter).musicMaps[step.guitar.musicMap.example - 1]
    : undefined;

  if (lesson) {
    const isChordStep = model.chords.length > 0;
    // The row is the area's height, never its content's: the cells are
    // measured to size what they draw, so a row that grew to fit its content
    // would feed back — a short area would keep the larger diagrams, and a
    // sideways scrollbar under the fretboard would grow the neck without end.
    return (
      <div
        data-guitar-visuals
        data-variant="lesson"
        className={
          isChordStep
            ? 'flex h-full min-w-0 flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:grid-rows-[minmax(0,1fr)] sm:gap-6'
            : 'flex h-full min-w-0 flex-col gap-4 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:grid-rows-[minmax(0,1fr)] sm:gap-6'
        }
      >
        <div
          ref={diagramsRef}
          // The strip centres its own boxes; the scale box is centred here,
          // safely (in a shorter cell its title stays at the top).
          className={
            isChordStep
              ? 'h-[208px] min-w-0 shrink-0 sm:h-full sm:min-h-0'
              : 'flex h-[208px] min-w-0 shrink-0 [align-items:safe_center] sm:h-full sm:min-h-0'
          }
        >
          {isChordStep ? (
            <GuitarChordStrip
              chords={model.chords}
              currentIndex={chordIndex}
              keyColor={keyColor}
              heard={heardChord?.matchesCurrent ?? false}
              diagnostics={diagnostics ?? undefined}
              mirrored={leftHanded}
              onHearShape={onHearShape}
              keyCenter={keyCenter}
              stepPrefix={model.prefix}
              map={map}
              showRomanNumerals={showRomanNumerals}
              variant="lesson"
              size={lessonSize}
            />
          ) : (
            model.scale && (
              <ScaleBox
                playOrder={model.scale.position.playOrder}
                fretStart={model.scale.position.fretStart}
                fretEnd={model.scale.position.fretEnd}
                unusedStrings={model.scale.position.unusedStrings}
                name={model.scale.name}
                tonicPc={model.tonicPc}
                keyColor={keyColor}
                activeIndex={scaleIndex >= 0 ? scaleIndex : undefined}
                size={lessonSize}
                mirrored={leftHanded}
                labelMode={scaleMode}
                showOctave={model.showOctave}
                ghosts={model.scale.ghosts}
                about={model.scaleAbout}
                variant="lesson"
              />
            )
          )}
        </div>
        <div
          ref={boardRef}
          data-fretboard-cell
          className="flex h-[150px] min-w-0 shrink-0 items-center sm:h-full sm:min-h-0"
        >
          {/* The neck draws centred in the full width (the SVG keeps its
              aspect ratio). */}
          <div className="w-full min-w-0">
            <Fretboard
              window={model.window}
              markers={markers}
              keyColor={keyColor}
              height={lessonNeckHeight(boardCell, model.window)}
              mirrored={leftHanded}
              labelShape={
                labelOf && labelMode === 'keyNumbers' ? 'chip' : 'dot'
              }
              brackets={stepsOn ? model.scale?.halfSteps : undefined}
              scrollable
              variant="lesson"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-guitar-visuals
      className="flex h-full min-w-0 flex-wrap items-stretch gap-3 overflow-y-auto"
    >
      {model.chords.length > 0 ? (
        <div className="h-full min-w-0 max-w-[55%] shrink">
          <GuitarChordStrip
            chords={model.chords}
            currentIndex={chordIndex}
            keyColor={keyColor}
            heard={heardChord?.matchesCurrent ?? false}
            diagnostics={diagnostics ?? undefined}
            mirrored={leftHanded}
            onHearShape={onHearShape}
            keyCenter={keyCenter}
            stepPrefix={model.prefix}
            map={map}
            showRomanNumerals={showRomanNumerals}
          />
        </div>
      ) : (
        model.scale && (
          <div className="shrink-0">
            <ScaleBox
              playOrder={model.scale.position.playOrder}
              fretStart={model.scale.position.fretStart}
              fretEnd={model.scale.position.fretEnd}
              unusedStrings={model.scale.position.unusedStrings}
              name={model.scale.name}
              tonicPc={model.tonicPc}
              keyColor={keyColor}
              activeIndex={scaleIndex >= 0 ? scaleIndex : undefined}
              size="sm"
              mirrored={leftHanded}
              labelMode={scaleMode}
              showOctave={model.showOctave}
              ghosts={model.scale.ghosts}
              about={model.scaleAbout}
            />
          </div>
        )
      )}
      <div className="flex min-w-0 flex-col" style={{ flex: '1 1 240px' }}>
        <div
          className="flex flex-wrap items-center justify-end gap-1.5"
          style={{ minHeight: CHIP_ROW }}
        >
          {model.labelKind && (
            <GuitarLabelModeToggle kind={model.labelKind} keyColor={keyColor} />
          )}
          {model.hasSteps && (
            <button
              type="button"
              aria-pressed={showSteps}
              onClick={() => setShowSteps(!showSteps)}
              title={theoryString('legend.steps')}
              className="rounded-full px-2 py-0.5 text-[11px] transition-colors hover:bg-white/10"
              style={{
                border: `1px solid ${showSteps ? keyColor : 'var(--color-border, rgba(255,255,255,0.12))'}`,
                color: showSteps ? keyColor : 'var(--color-text-dim, #9a9aab)',
              }}
            >
              Show steps
            </button>
          )}
          {inputStatus}
          <button
            type="button"
            aria-pressed={leftHanded}
            onClick={() => setLeftHanded(!leftHanded)}
            title="Mirror the fretboard and diagrams for a left-handed player"
            className="rounded-full px-2 py-0.5 text-[11px] transition-colors hover:bg-white/10"
            style={{
              border: `1px solid ${leftHanded ? keyColor : 'var(--color-border, rgba(255,255,255,0.12))'}`,
              color: leftHanded ? keyColor : 'var(--color-text-dim, #9a9aab)',
            }}
          >
            Left-handed
          </button>
        </div>
        <Fretboard
          window={model.window}
          markers={markers}
          keyColor={keyColor}
          height={GUITAR_VISUALS_HEIGHT - CHIP_ROW - LEGEND_ROW}
          mirrored={leftHanded}
          labelShape={labelOf && labelMode === 'keyNumbers' ? 'chip' : 'dot'}
          brackets={stepsOn ? model.scale?.halfSteps : undefined}
          scrollable
        />
        {/* After a missed strum, one thing to try takes the legend's line */}
        {diagnostics?.hint ? (
          <p
            data-chord-hint
            role="status"
            className="text-[11px] leading-tight"
            style={{
              minHeight: LEGEND_ROW,
              color: 'var(--color-text, #e8e8f0)',
            }}
          >
            {diagnostics.hint}
          </p>
        ) : (
          legend && (
            <p
              data-label-legend
              className="text-[10px] leading-tight"
              style={{
                minHeight: LEGEND_ROW,
                color: 'var(--color-text-dim, #9a9aab)',
              }}
            >
              {legend}
            </p>
          )
        )}
      </div>
    </div>
  );
});
