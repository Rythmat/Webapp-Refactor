import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { CountOff, countOffBeatIndex } from '@/components/notation/CountOff';
import type { NoteStyle, StaffLayout } from '@/components/notation/StaffView';
import { TabStaffView } from '@/components/notation/TabStaffView';
import { pitchNameToMidi } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { fretToMidi } from '@/lib/guitar/fretboard';
import { buildTab, type TabNoteInput } from '@/lib/notation';
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
//
// The digits carry the lesson: the text colour until a note is due, the key
// colour for the note to play and the notes played, white/30 for a note the
// playhead passed unplayed. Nothing glows. The count-in is counted in the
// empty count-in bar, and the chord symbols are lead-sheet type at a fixed
// 16px, the one being played underlined in the key colour.

const HEADER_HEIGHT = 34;
/** The lesson panel (no header strip): the raised surface, and the digits' gap. */
const PANEL = '#151518';
/** Annotations sit this far above the bottom of the bar's rhythm room, just clear of the lowest beams. */
const ANNOTATION_LIFT = 7;
/** A chip whose next note starts a new line sits this far right of its note. */
const CHIP_TRAIL = 14;
/** Theory chips and annotations: neutral, fixed 12px type whatever the scale. */
const LAYER_CHIP =
  'absolute inline-flex h-5 min-w-5 items-center justify-center whitespace-nowrap rounded-full border border-white/15 px-1.5 text-xs leading-none text-white/55';
/** Chord symbols: 16px bold, as on a lead sheet, at every TAB scale. */
const CHORD_PX = 16;
/** Air between a symbol and the headroom line it stands over, at scale 1. */
const CHORD_GAP = 6;
/** A note the playhead passed unplayed. */
const MISSED: NoteStyle = { color: 'rgba(255, 255, 255, 0.3)' };

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
  // The panel's own colour, so a chip hides what it sits on.
  const background = `var(--ma-tab-gap, ${PANEL})`;

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
            className={LAYER_CHIP}
            style={{
              left: x,
              top: box.y,
              transform: 'translate(-50%, -50%)',
              background,
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
              className={LAYER_CHIP}
              style={{
                left: note.x,
                top: box.y + box.height - ANNOTATION_LIFT * layout.scale,
                transform: 'translateX(-50%)',
                background,
              }}
            >
              {text}
            </span>
          );
        })}
    </div>
  );
}

/**
 * The step's chord symbols over the TAB: above the note each names (or at its
 * place in the bar when no note is drawn there), bold at a fixed 16px, in the
 * text colour. The one being played — the last to start by `currentTick` — is
 * underlined in the key colour. A symbol outside every drawn bar is skipped.
 */
export function TabChordSymbols({
  symbols,
  layout,
  currentTick,
  keyColor,
}: {
  symbols: readonly LessonChordSymbol[];
  layout: StaffLayout | null;
  /** Where the student is: the playhead, or out of time the next note; null before the step runs. */
  currentTick: number | null;
  keyColor?: string;
}) {
  if (!layout || symbols.length === 0) return null;
  const current =
    currentTick === null
      ? null
      : (symbols
          .filter((symbol) => symbol.startTick <= currentTick)
          .sort((a, b) => b.startTick - a.startTick)[0] ?? null);
  return (
    <div data-tab-chords className="pointer-events-none absolute inset-0">
      {symbols.map((symbol) => {
        const box = layout.measures.find(
          (m) =>
            symbol.startTick >= m.startTick && symbol.startTick < m.endTick,
        );
        if (!box) return null;
        const anchors = layout.notes.filter((n) => n.tick === symbol.startTick);
        const span = box.endTick - box.startTick || 1;
        const left = anchors.length
          ? Math.min(...anchors.map((n) => n.x))
          : box.x + ((symbol.startTick - box.startTick) / span) * box.width;
        const isCurrent = symbol === current;
        return (
          <span
            key={symbol.id}
            data-chord-symbol={symbol.text}
            data-current={isCurrent || undefined}
            className="absolute whitespace-nowrap font-bold text-[#e8e8f0]"
            style={{
              left,
              // TAB notes never climb above the top string, so every symbol
              // stands the same height over the stave's headroom line.
              top:
                box.y +
                layout.topLineDrop -
                CHORD_GAP * layout.scale -
                CHORD_PX,
              fontSize: CHORD_PX,
              lineHeight: 1,
              ...(isCurrent && keyColor
                ? {
                    textDecorationLine: 'underline',
                    textDecorationColor: keyColor,
                    textDecorationThickness: 2,
                    textUnderlineOffset: 4,
                  }
                : {}),
            }}
          >
            {symbol.text}
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
   * The header strip holding `toggle` (default). Without it the panel is
   * the lesson's raised surface, a hairline round it and nothing over it.
   */
  showHeader?: boolean;
  /**
   * In time: whether the playhead is running. Once it has stopped (the take
   * is over) nothing is "now": a note left under it unplayed reads as
   * missed, and no chord symbol is underlined. Omitted, the note under the
   * playhead stays lit.
   */
  playing?: boolean;
  /**
   * In time, parked before the music with nothing running (the step's
   * preview): show bar 1 of the music rather than the empty count-in bar,
   * which a paged, one-line TAB would otherwise show alone.
   */
  openOnMusic?: boolean;
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
  showHeader = true,
  playing,
  openOnMusic = false,
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

  const noteStyles = useMemo(() => {
    const styles = learnNoteStyles(events, {
      inTime,
      performanceMeta,
      noteHoldMeta,
      playheadTick,
      keyColor,
      missed: MISSED,
    });
    // The key colour marks the note to play and the notes played; flat, with
    // no glow (played keeps the lesson's softer tint of it). With the
    // playhead stopped there is no note to play: the one under it was missed.
    const stopped = inTime && playing === false;
    for (const [id, style] of styles) {
      if (style.glow) styles.set(id, stopped ? MISSED : { color: style.color });
    }
    return styles;
  }, [
    events,
    inTime,
    performanceMeta,
    noteHoldMeta,
    playheadTick,
    keyColor,
    playing,
  ]);

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

  // Counted only while the playhead runs: parked before bar 1 (the preview,
  // or a take that has stopped) it would hold a lone "1" in the empty bar.
  const countInBeat =
    inTime && playing !== false
      ? countOffBeatIndex(playheadTick, countInTicks, beatTicks, musicStartTick)
      : null;
  // No playhead runs up to the first note, so the lead-in is counted: in the
  // empty bar the TAB draws before bar 1, clear of every note (under the TAB
  // when there is no such bar, or before the TAB has been laid out).
  const countInBar =
    inTime && layout
      ? (layout.measures
          .filter((m) => m.endTick <= musicStartTick)
          .sort((a, b) => b.endTick - a.endTick)[0] ?? null)
      : null;
  const countOff = (
    <CountOff
      beatIndex={countInBeat}
      beatsPerBar={beatsPerBar}
      tone="neutral"
      {...(countInBar
        ? { placement: 'countInBar' as const, bar: countInBar }
        : {})}
    />
  );
  const currentTick = inTime
    ? playheadTick >= 0 && playing !== false
      ? playheadTick
      : null
    : focusTick;
  // In time the view follows the playhead. Parked before the music in the
  // preview (openOnMusic) it shows bar 1 of the music, and while the count
  // runs ahead of the TAB's first tick, the count-in bar: a phone's one-line
  // TAB would otherwise open on the empty count-in bar alone. (Between two
  // passes of a loop it stays where the next count will be.)
  const inTimeFocusTick =
    playing === false
      ? openOnMusic && playheadTick < musicStartTick
        ? // A tick into bar 1: its first tick is also the count-in bar's end.
          musicStartTick + 1
        : null
      : playheadTick < 0
        ? 0
        : null;

  return (
    <div
      className={
        showHeader
          ? 'flex w-full flex-col overflow-hidden rounded-xl'
          : 'flex w-full flex-col overflow-hidden rounded-xl border border-white/[0.08]'
      }
      style={
        showHeader
          ? {
              height,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--color-border)',
            }
          : ({
              height,
              background: PANEL,
              '--ma-tab-gap': PANEL,
            } as CSSProperties)
      }
    >
      {showHeader && (
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
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <TabStaffView
          score={score}
          noteStyles={noteStyles}
          playheadTick={inTime && playheadTick >= 0 ? playheadTick : null}
          focusTick={inTime ? inTimeFocusTick : focusTick}
          fitHeight
          className="min-h-0 flex-1 px-2 pt-2"
          onLayout={setLayout}
          overlay={
            <>
              {chordSymbols?.length ? (
                <TabChordSymbols
                  symbols={chordSymbols}
                  layout={layout}
                  currentTick={currentTick}
                  keyColor={keyColor}
                />
              ) : null}
              <TabTheoryOverlay
                layout={layout}
                noteAnnotations={noteAnnotations}
                stepChips={stepChips}
              />
              {countInBar && countOff}
              {overlay?.(layout)}
            </>
          }
        />
        {!countInBar && countOff}
      </div>
    </div>
  );
}
