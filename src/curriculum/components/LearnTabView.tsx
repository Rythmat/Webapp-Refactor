import { useMemo, useState, type ReactNode } from 'react';
import { CountOff, countOffBeatIndex } from '@/components/notation/CountOff';
import type { StaffLayout } from '@/components/notation/StaffView';
import { TabStaffView } from '@/components/notation/TabStaffView';
import { pitchNameToMidi } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { fretToMidi } from '@/lib/guitar/fretboard';
import { buildTab, type TabNoteInput } from '@/lib/notation';
import { ChordSymbolOverlay } from '../notation/ChordSymbolOverlay';
import type { LessonChordSymbol } from '../notation/lessonChordSymbols';
import type { NoteEvent, NoteHoldMeta } from './GenrePianoRoll';
import { learnNoteStyles } from './learnNoteStyles';

// ── Learn: guitar lesson notes as TAB ──────────────────────────────────────
// The TAB face of GenrePianoRoll, built like LearnNotationView: the roll keeps
// running the lesson (playhead, hold tracking) and this draws what it would
// show — each note at the string and fret the book gives it, in the same
// progress colours. Two optional theory layers ride over it, positioned from
// the drawn layout: W / H chips between the notes of a scale ("Show steps")
// and, under the rhythm, each arpeggio note's chord tone or each scale note's
// key number.

const HEADER_HEIGHT = 34;
/** Chip and annotation type, at TAB scale 1. */
const LAYER_FONT = 10;
/** Annotations sit this far above the bottom of the bar's rhythm room, just clear of the lowest beams. */
const ANNOTATION_LIFT = 7;
/** A chip whose next note starts a new line sits this far right of its note. */
const CHIP_TRAIL = 14;

/** A W or H chip between two neighbouring TAB notes. */
export interface TabStepChip {
  fromId: string;
  toId: string;
  size: 'W' | 'H';
  /** Read aloud, e.g. 'C to D: whole step'. */
  spoken: string;
}

export interface TabTheoryLayers {
  /**
   * Text under a note, by note id: its chord tone ('R', '♭3') or its key
   * number ('5').
   */
  noteAnnotations?: ReadonlyMap<string, string>;
  /** W / H chips between neighbouring notes. */
  stepChips?: readonly TabStepChip[];
}

/**
 * The theory layers over a drawn TAB. Each note is found by id in the layout
 * (its first drawn occurrence, not a tied continuation); a note the layout
 * doesn't have is skipped rather than guessed. Chips sit above the top
 * string, midway between their notes on one line; annotations sit under the
 * note, below the rhythm.
 */
export function TabTheoryOverlay({
  layout,
  noteAnnotations,
  stepChips,
}: TabTheoryLayers & { layout: StaffLayout | null }) {
  if (!layout || (!noteAnnotations?.size && !stepChips?.length)) return null;
  const first = new Map<string, StaffLayout['notes'][number]>();
  for (const note of layout.notes) {
    const held = first.get(note.id);
    if (!held || note.tick < held.tick) first.set(note.id, note);
  }
  const boxOf = (measureIndex: number) =>
    layout.measures.find((m) => m.measureIndex === measureIndex);
  const font = LAYER_FONT * layout.scale;

  return (
    <div data-tab-theory className="pointer-events-none absolute inset-0">
      {stepChips?.map((chip) => {
        const from = first.get(chip.fromId);
        const to = first.get(chip.toId);
        const box = from && boxOf(from.measureIndex);
        if (!from || !to || !box) return null;
        const sameLine = boxOf(to.measureIndex)?.system === box.system;
        const x = sameLine
          ? (from.x + to.x) / 2
          : from.x + CHIP_TRAIL * layout.scale;
        return (
          <span
            key={`${chip.fromId}>${chip.toId}`}
            data-step-chip={chip.size}
            className="absolute rounded font-bold leading-none"
            style={{
              left: x,
              top: box.y,
              transform: 'translate(-50%, -50%)',
              fontSize: font,
              padding: `${2 * layout.scale}px ${3 * layout.scale}px`,
              border: '1px solid rgba(232,232,240,0.45)',
              background: 'var(--color-surface, #16161b)',
              color: 'var(--color-text, #e8e8f0)',
            }}
          >
            <span aria-hidden>{chip.size}</span>
            <span className="sr-only">{chip.spoken}</span>
          </span>
        );
      })}
      {noteAnnotations &&
        [...noteAnnotations].map(([id, text]) => {
          const note = first.get(id);
          const box = note && boxOf(note.measureIndex);
          if (!note || !box || !text) return null;
          return (
            <span
              key={`a${id}`}
              data-note-annotation={id}
              className="absolute whitespace-nowrap font-semibold leading-none"
              style={{
                left: note.x,
                top: box.y + box.height - ANNOTATION_LIFT * layout.scale,
                transform: 'translateX(-50%)',
                fontSize: font,
                color: 'var(--color-text-dim, #b4b4c2)',
              }}
            >
              {text}
            </span>
          );
        })}
    </div>
  );
}

interface LearnTabViewProps {
  /** Guitar lesson notes; each carries the string and fret it's played on. */
  events: NoteEvent[];
  bars: number;
  beatsPerBar: number;
  keyColor?: string;
  inTime: boolean;
  playheadTick: number;
  /** Lead-in before bar 1, in ticks; 0 when there is no count-off. */
  countInTicks?: number;
  /** Ticks in one beat, for counting the lead-in. */
  beatTicks?: number;
  /** Where bar 1 sits on the playhead's scale; 0 unless notes are offset. */
  musicStartTick?: number;
  noteHoldMeta?: Record<string, NoteHoldMeta>;
  performanceMeta?: Record<string, { startTick: number; endTick?: number }>;
  /** Total height, matching the roll it replaces. */
  height: number;
  /** Chord symbols to draw above the TAB, one per harmonic change. */
  chordSymbols?: readonly LessonChordSymbol[];
  toggle: ReactNode;
  /**
   * More to draw over the TAB (practice loop, mistake markers), positioned
   * from the drawn layout; it scrolls with the TAB.
   */
  overlay?: (layout: StaffLayout | null) => ReactNode;
  /** Text under each note, by note id (Chord tones or Key numbers mode). */
  noteAnnotations?: TabTheoryLayers['noteAnnotations'];
  /** W / H chips between scale notes ("Show steps"). */
  stepChips?: TabTheoryLayers['stepChips'];
}

export function LearnTabView({
  events,
  bars,
  beatsPerBar,
  keyColor,
  inTime,
  playheadTick,
  countInTicks = 0,
  beatTicks = 480,
  musicStartTick = 0,
  noteHoldMeta,
  performanceMeta,
  height,
  chordSymbols,
  toggle,
  overlay,
  noteAnnotations,
  stepChips,
}: LearnTabViewProps) {
  const [layout, setLayout] = useState<StaffLayout | null>(null);
  // Rebuild only when the notes themselves change, not on every playhead frame.
  const signature = events
    .map(
      (e) =>
        `${e.id}|${e.midi}|${e.pitchName}|${e.startTicks}|${e.durationTicks}|${e.fretPosition?.string ?? ''}|${e.fretPosition?.fret ?? ''}`,
    )
    .join(';');
  const score = useMemo(() => {
    const notes: TabNoteInput[] = [];
    for (const e of events) {
      const midi = e.midi ?? pitchNameToMidi(e.pitchName);
      if (midi == null) continue;
      if (!e.fretPosition) {
        // Guitar data places every note; one without a place can't be drawn.
        if (import.meta.env.DEV) {
          console.warn(`[LearnTabView] note ${e.id} has no fret position`);
        }
        continue;
      }
      // Scoring hears `midi` while the TAB shows the fret: they must agree.
      if (import.meta.env.DEV && fretToMidi(e.fretPosition) !== midi) {
        console.warn(
          `[LearnTabView] note ${e.id} is MIDI ${midi} but string ${e.fretPosition.string} fret ${e.fretPosition.fret} sounds ${fretToMidi(e.fretPosition)}`,
        );
      }
      notes.push({
        id: e.id,
        midi,
        name: e.pitchName,
        startTick: e.startTicks,
        durationTicks: e.durationTicks,
        fretPosition: e.fretPosition,
      });
    }
    return buildTab(notes, {
      timeSignature: [beatsPerBar, 4],
      minMeasures: bars,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` stands for `events`
  }, [signature, bars, beatsPerBar]);

  const noteStyles = useMemo(
    () =>
      learnNoteStyles(events, {
        inTime,
        performanceMeta,
        noteHoldMeta,
        playheadTick,
        keyColor,
      }),
    [events, inTime, performanceMeta, noteHoldMeta, playheadTick, keyColor],
  );

  // No playhead runs up to the first note, so the lead-in is counted
  // underneath the TAB instead.
  // Out of time the TAB follows the first note still to play.
  const focusTick = useMemo(() => {
    if (inTime || !noteHoldMeta) return null;
    const next = events
      .filter((e) => {
        const meta = noteHoldMeta[e.id];
        return meta?.isCurrentChord && !meta.isCompleted;
      })
      .sort((a, b) => a.startTicks - b.startTicks)[0];
    return next?.startTicks ?? null;
  }, [inTime, noteHoldMeta, events]);

  const countInBeat = inTime
    ? countOffBeatIndex(playheadTick, countInTicks, beatTicks, musicStartTick)
    : null;

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-xl"
      style={{
        height,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="relative z-30 flex shrink-0 items-center gap-2 px-2"
        style={{
          height: HEADER_HEIGHT,
          background: 'rgba(25,25,25,0.95)',
          borderBottom: '1px solid rgba(120,120,120,0.25)',
        }}
      >
        {toggle}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <TabStaffView
          score={score}
          noteStyles={noteStyles}
          playheadTick={inTime && playheadTick >= 0 ? playheadTick : null}
          focusTick={inTime ? null : focusTick}
          fitHeight
          className="min-h-0 flex-1 px-2 pt-2"
          {...(chordSymbols?.length ||
          overlay ||
          noteAnnotations?.size ||
          stepChips?.length
            ? {
                onLayout: setLayout,
                overlay: (
                  <>
                    {chordSymbols?.length ? (
                      <ChordSymbolOverlay
                        symbols={chordSymbols}
                        layout={layout}
                      />
                    ) : null}
                    <TabTheoryOverlay
                      layout={layout}
                      noteAnnotations={noteAnnotations}
                      stepChips={stepChips}
                    />
                    {overlay?.(layout)}
                  </>
                ),
              }
            : {})}
        />
        <CountOff beatIndex={countInBeat} beatsPerBar={beatsPerBar} />
      </div>
    </div>
  );
}
