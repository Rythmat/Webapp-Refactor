// ── BassLessonVisuals ─────────────────────────────────────────────────────
// What a bass lesson shows above its TAB, in the guitar lesson's look: the
// Bass Atlas box the step plays (the scale, its pentatonic, or the arpeggio
// at the playhead) beside a four-string neck marking what to play, what is
// sounding and what is done. A step through several chords names them in a
// row of chips, the one being played lit, with "Hear it" for its arpeggio.
// The playhead is polled from the container's tick ref, as guitar's is.
//
// Rendered inside FrettedInstrumentContext = BASS (the container's), so the
// neck and box draw four strings.

import { Volume2 } from 'lucide-react';
import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { Fretboard, ScaleBox } from '@/components/guitar';
import {
  fretboardHeightUnits,
  fretboardWidthUnits,
} from '@/components/guitar/Fretboard';
import {
  fretboardMarkers,
  groupAt,
  noteGroups,
  outOfTimeGroup,
  useTickRefSelector,
} from '@/curriculum/components/guitar';
import {
  getBassArpeggio,
  getBassCenter,
  type BassArpeggio,
  type BassBox,
} from '@/curriculum/data/bass';
import {
  centerScaleName,
  chordSymbol,
  qualityWords,
} from '@/curriculum/data/guitar/centers';
import type { GuitarCenterId } from '@/curriculum/data/guitar/types';
import type { LessonNoteEvent } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type { ActivityStepV2 } from '@/curriculum/types/activity.v2';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { fretToMidi, fretWindow } from '@/lib/guitar/fretboard';
import { BASS } from '@/lib/guitar/instrument';
import type { FretPosition } from '@/lib/guitar/types';

/** A lesson cell's size until it can be measured. */
const LESSON_CELL = { width: Infinity, height: 208 };
const NECK_MAX = 360;
const NECK_MIN = 120;

interface Size {
  width: number;
  height: number;
}

function useMeasuredSize(ref: RefObject<HTMLElement>, fallback: Size): Size {
  const [size, setSize] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
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
  }, [ref]);
  return size;
}

const samePlace = (a: FretPosition, b: FretPosition) =>
  a.string === b.string && a.fret === b.fret;

/**
 * Which of the step's arpeggios each note group plays: notes come chord by
 * chord, so a group stays with the current arpeggio while it is one of its
 * tones and moves on (round again, for a repeated map) when it isn't.
 */
export function arpeggioOfGroups(
  groups: readonly { notes: readonly { position: FretPosition }[] }[],
  arps: readonly BassArpeggio[],
): number[] {
  if (arps.length <= 1) return groups.map(() => 0);
  let at = 0;
  return groups.map((group) => {
    const position = group.notes[0]?.position;
    if (!position) return at;
    for (let k = 0; k < arps.length; k++) {
      const i = (at + k) % arps.length;
      if (arps[i].playOrder.some((p) => samePlace(p, position))) {
        at = i;
        return i;
      }
    }
    return at;
  });
}

export interface BassLessonVisualsProps {
  /** The resolved step: its bass meta and target notes. */
  step: ActivityStepV2;
  events: LessonNoteEvent[];
  keyCenter: GuitarCenterId;
  keyColor: string;
  activityState: 'preview' | 'practice' | 'performance' | 'complete';
  inTime: boolean;
  countInOffset: number;
  currentTickRef: MutableRefObject<number>;
  activeMidis: number[];
  demoHighlightMidis: Set<number>;
  isPlayingDemo: boolean;
  practiceHighlightMidis: Set<number>;
  targetMidiSet: Set<number>;
  noteHoldMeta?: Record<
    string,
    { isCompleted: boolean; isCurrentChord: boolean; holdProgress: number }
  >;
  /** Plays an arpeggio's notes, low to high ("Hear it"). */
  onHearNotes?: (midis: readonly number[]) => void;
}

export const BassLessonVisuals = memo(function BassLessonVisuals({
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
  onHearNotes,
}: BassLessonVisualsProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardCell = useMeasuredSize(boardRef, LESSON_CELL);
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const center = getBassCenter(keyCenter);
  const meta = step.bass;

  const scale: { box: BassBox; name: string; tonicPc: number } | null =
    useMemo(() => {
      const slot = meta?.scalePosition;
      if (!slot) return null;
      const box =
        slot === 'major'
          ? center.scale
          : (center.pentatonics[slot === 'pentatonic2' ? 1 : 0] ??
            center.scale);
      return {
        box,
        name: formatAccidentalsForDisplay(centerScaleName(center.theory, slot)),
        tonicPc: box.tonicPc,
      };
    }, [meta, center]);

  const arps = useMemo(
    () =>
      (meta?.arpeggioIds ?? [])
        .map((id) => getBassArpeggio(id))
        .filter((a): a is BassArpeggio => !!a),
    [meta],
  );

  const groups = useMemo(
    () => noteGroups(events, [], countInOffset, center.theory.tonicPc, BASS),
    [events, countInOffset, center],
  );
  const arpOfGroup = useMemo(
    () => arpeggioOfGroups(groups, arps),
    [groups, arps],
  );

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

  const arpIndex = arpOfGroup[Math.min(cursor, groups.length - 1)] ?? 0;
  const arp = arps[arpIndex];
  const box: BassBox | undefined = scale?.box ?? arp;
  const boxTonic = scale?.tonicPc ?? arp?.rootPc ?? center.theory.tonicPc;
  const symbolOf = (a: BassArpeggio) =>
    formatAccidentalsForDisplay(
      chordSymbol(center.theory, a.degree, a.quality),
    );
  const boxName = scale
    ? scale.name
    : arp
      ? `${formatAccidentalsForDisplay(
          center.theory.chordSpelling[arp.degree - 1],
        )} ${qualityWords(arp.quality)} arpeggio`
      : '';

  const window = useMemo(() => {
    const positions = [
      ...events.flatMap((e) => (e.fretPosition ? [e.fretPosition] : [])),
      ...(box?.playOrder ?? []),
    ];
    return fretWindow(positions, { maxFret: BASS.maxFret });
  }, [events, box]);

  const markers = useMemo(
    () =>
      fretboardMarkers({
        groups,
        cursor,
        completedIds,
        context: box ? { positions: box.playOrder, rootPc: boxTonic } : null,
        window,
        keyRootPc: center.theory.tonicPc,
        activityState,
        demoMidis: demoHighlightMidis,
        isPlayingDemo,
        activeMidis,
        practiceMidis: practiceHighlightMidis,
        targetMidiSet,
        inst: BASS,
      }),
    [
      groups,
      cursor,
      completedIds,
      box,
      boxTonic,
      window,
      center,
      activityState,
      demoHighlightMidis,
      isPlayingDemo,
      activeMidis,
      practiceHighlightMidis,
      targetMidiSet,
    ],
  );

  // The box rings the next note to play.
  const nextPosition = groups[cursor]?.notes[0]?.position;
  const activeIndex =
    box && nextPosition
      ? box.playOrder.findIndex((p) => samePlace(p, nextPosition))
      : -1;

  const neckHeight = Math.floor(
    Math.min(
      boardCell.height,
      NECK_MAX,
      Math.max(
        (boardCell.width * fretboardHeightUnits(BASS)) /
          fretboardWidthUnits(window),
        NECK_MIN,
      ),
    ),
  );

  // The step's chords in order, each once (a map's repeat isn't listed twice).
  const chipArps = arps.filter((a, i) => arps.findIndex((b) => b === a) === i);

  return (
    <div
      data-bass-visuals
      data-variant="lesson"
      className="flex h-full min-w-0 flex-col gap-4 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:grid-rows-[minmax(0,1fr)] sm:gap-6"
    >
      <div className="flex min-w-0 shrink-0 flex-col items-center gap-2 [justify-content:safe_center] sm:h-full sm:min-h-0">
        {chipArps.length > 1 && (
          <div
            data-bass-chord-chips
            className="flex max-w-64 flex-wrap justify-center gap-1"
          >
            {chipArps.map((a) => {
              const current = a === arp;
              return (
                <span
                  key={`${a.degree}-${a.quality}-${a.isOctaveRepeat ? 'r' : ''}`}
                  data-current={current || undefined}
                  className="rounded-full px-2 py-0.5 text-[0.75rem]"
                  style={{
                    border: `1px solid ${current ? keyColor : 'rgba(255,255,255,0.15)'}`,
                    color: current ? keyColor : 'rgba(232,232,240,0.7)',
                  }}
                >
                  {symbolOf(a)}
                </span>
              );
            })}
          </div>
        )}
        {box && (
          <ScaleBox
            playOrder={box.playOrder}
            fretStart={box.fretStart}
            fretEnd={box.fretEnd}
            unusedStrings={box.unusedStrings}
            name={boxName}
            tonicPc={boxTonic}
            keyColor={keyColor}
            activeIndex={activeIndex >= 0 ? activeIndex : undefined}
            size="md"
            mirrored={leftHanded}
            variant="lesson"
          />
        )}
        {arp && onHearNotes && (
          <button
            type="button"
            data-hear-arpeggio
            onClick={() =>
              onHearNotes(arp.playOrder.map((p) => fretToMidi(p, BASS)))
            }
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-[#e8e8f0]"
          >
            <Volume2 aria-hidden className="size-3.5" />
            Hear {symbolOf(arp)}
          </button>
        )}
      </div>
      <div
        ref={boardRef}
        data-fretboard-cell
        className="flex h-[150px] min-w-0 shrink-0 items-center sm:h-full sm:min-h-0"
      >
        <div className="w-full min-w-0">
          <Fretboard
            window={window}
            markers={markers}
            keyColor={keyColor}
            height={neckHeight}
            mirrored={leftHanded}
            scrollable
            variant="lesson"
          />
        </div>
      </div>
    </div>
  );
});
