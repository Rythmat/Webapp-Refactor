import { midiNameInKey, type MidiNoteEvent } from '@prism/engine';
import {
  midiToPitchName,
  parseNoteName,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type {
  MeasureBox,
  NoteInfo,
  RestInfo,
  StaffLayout,
} from '@/components/notation/StaffView';
import {
  keySignatureAlterations,
  type NotationScore,
  type StaffId,
} from '@/lib/notation';
import { TOP_LINE_STEP, writtenOctaves } from '@/lib/notation/clefs';
import { mintNoteId } from '@/daw/model/noteIds';
import { noteKey } from '@/daw/model/noteKeys';
import type { Track } from '@/daw/store/tracksSlice';
import { clipAt, type ClipWrite } from './scoreClipboard';
import type { DurationChoice } from './noteEditor';

// ── Note input ─────────────────────────────────────────────────────────────
// MuseScore's note input, as pure parts: where the pointer is on the page as
// a pitch and a time, and what writing a note there does to the clip. The
// Score's editor (useScoreEditing) wires them to the pointer and the keys.
//
// A pitch is read off the staff: the line or space under the pointer,
// through that staff's clef and the key signature, so the top line of a
// treble staff in G major is F♯5. A staff written an octave above its sound
// (the bass clef with an 8, clefs.ts) writes the note it sounds: its C3 line
// writes MIDI C2. Steps (`step`, the cursor's) count the lines as written;
// the MIDI pitch is the one heard. A time is the nearest place in the bar the
// chosen length can start on. Writing a note overwrites, as MuseScore does:
// what starts inside the new note on that staff goes, and a note held into
// it is cut short where it begins.

/** C D E F G A B as pitch classes. */
const LETTER_PITCH_CLASS = [0, 2, 4, 5, 7, 9, 11];

/** A staff spans eight steps, its top line to its bottom one. */
const STAFF_STEPS = 8;

/** One staff below the next in a part: VexFlow's slot over its step. */
const STAFF_SLOT_STEPS = 20;

/**
 * How far off the staff the pointer still reads a pitch: six ledger lines.
 * Past that it is between parts, or off the music.
 */
const LEDGER_REACH_STEPS = 12;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** The absolute diatonic step of a written note ('c'…'b', its octave). */
export function stepOf(letter: string, octave: number): number {
  return octave * 7 + 'cdefgab'.indexOf(letter);
}

/** The MIDI pitch a diatonic step sounds in the key: its letter as the key writes it. */
export function pitchForStep(step: number, keyFifths: number): number {
  const letter = ((step % 7) + 7) % 7;
  const octave = Math.floor(step / 7);
  return (
    (octave + 1) * 12 +
    LETTER_PITCH_CLASS[letter] +
    keySignatureAlterations(keyFifths)[letter]
  );
}

/**
 * The MIDI pitch a step written on `staff` sounds: pitchForStep, an octave
 * lower on a staff written an octave up (the bass clef with an 8).
 */
export function soundingPitchForStep(
  step: number,
  keyFifths: number,
  staff: StaffId,
): number {
  return pitchForStep(step, keyFifths) - 12 * writtenOctaves(staff);
}

/** The step a note written on `step` of `staff` sounds on, an octave down on an 8vb staff. */
export function soundingStep(step: number, staff: StaffId): number {
  return step - 7 * writtenOctaves(staff);
}

const SIGNS: Record<number, string> = {
  [-2]: '𝄫',
  [-1]: '♭',
  0: '',
  1: '♯',
  2: '𝄪',
};

/** How the key writes a diatonic step: its letter, sign and octave (F♯5). */
export function writtenName(step: number, keyFifths: number): string {
  const letter = ((step % 7) + 7) % 7;
  const sign = SIGNS[keySignatureAlterations(keyFifths)[letter]] ?? '';
  return `${'CDEFGAB'[letter]}${sign}${Math.floor(step / 7)}`;
}

/**
 * The spelling to pin on a note written on `step`, or null when the Score
 * spells it there already. The Score names a note by the song's key
 * (scoreParts), or with the default names when the song has none, and that
 * can put a black key on the other letter (A♯ for the B♭ an inferred F major
 * draws). Pinning it, as an accidental does, keeps the note on the line it
 * was written on. `step` is the one the note sounds on (soundingStep), so the
 * name's octave is the pitch's, as every pinned spelling's is.
 */
export function pinnedSpelling(
  midi: number,
  step: number,
  keyFifths: number,
  rootNote: number | null,
  mode: string,
): string | null {
  const spelled =
    rootNote !== null
      ? midiNameInKey(midi, rootNote, mode)
      : midiToPitchName(midi);
  const letter = parseNoteName(spelled)?.letterIndex;
  return letter === ((step % 7) + 7) % 7 ? null : writtenName(step, keyFifths);
}

/** The middle line of a clef, where a first typed note's octave is sought. */
export function middleLineStep(staff: StaffId): number {
  return (TOP_LINE_STEP[staff] ?? TOP_LINE_STEP.treble!) - STAFF_STEPS / 2;
}

export interface StaffPitch {
  midi: number;
  /** Absolute diatonic step. */
  step: number;
  /** Staff steps below the top line: 0 is the top line, 8 the bottom one. */
  position: number;
}

/**
 * The pitch at `y` on a staff whose top line is at `topLineY`: snapped to the
 * nearest line or space, read through the clef and the key signature. Null on
 * a drumset staff, or past the ends of MIDI.
 */
export function pitchAtY(
  y: number,
  topLineY: number,
  stepPx: number,
  staff: StaffId,
  keyFifths: number,
): StaffPitch | null {
  const top = TOP_LINE_STEP[staff];
  if (top === undefined || stepPx <= 0) return null;
  const position = Math.round((y - topLineY) / stepPx);
  const step = top - position;
  const midi = soundingPitchForStep(step, keyFifths, staff);
  if (midi < 0 || midi > 127) return null;
  return { midi, step, position };
}

/**
 * The note a typed letter writes (0 = C … 6 = B), in the key: the nearest
 * one to `near` (a diatonic step as written on `staff`), as MuseScore picks
 * it — never more than a fourth away, so F then B climbs to the B above.
 * `above` takes the first one higher than `near` instead, which is how Shift
 * adds to a chord. The step comes back as written, the pitch as it sounds.
 */
export function letterPitch(
  letter: number,
  near: number,
  keyFifths: number,
  above = false,
  staff: StaffId = 'treble',
): { midi: number; step: number } | null {
  let step = near - mod(near - letter, 7);
  if (above) {
    if (step <= near) step += 7;
  } else if (near - step > 3) {
    step += 7;
  }
  const midi = soundingPitchForStep(step, keyFifths, staff);
  if (midi < 0 || midi > 127) return null;
  return { midi, step };
}

/**
 * The places a note of this length can start, as a step in ticks: every one
 * of its own length, or for a dotted length every one of its dot's (a dotted
 * quarter can start on any eighth). Never finer than a sixteenth, the finest
 * onset the engraver writes.
 */
export function inputGrid(
  choice: DurationChoice,
  ticksPerQuarter: number,
  dotted: boolean,
): number {
  const plain = choice.quarters * ticksPerQuarter;
  return Math.max(
    Math.round(ticksPerQuarter / 4),
    Math.round(dotted ? plain / 2 : plain),
  );
}

// ── Where the pointer is ──────────────────────────────────────────────────

export interface BarStaff {
  staff: StaffId;
  topLineY: number;
}

/** A bar's staves with their top lines, as the staff reported them. */
export function barStaves(
  box: MeasureBox,
  layout: Pick<StaffLayout, 'stepPx' | 'topLineDrop'>,
  staffIds: readonly StaffId[],
): BarStaff[] {
  if (box.staves) return box.staves;
  // A layout from before the staff reported them: the part's staves stand a
  // fixed slot apart below the box's top.
  return staffIds.map((staff, i) => ({
    staff,
    topLineY: box.y + layout.topLineDrop + i * STAFF_SLOT_STEPS * layout.stepPx,
  }));
}

export interface StaffHit {
  box: MeasureBox;
  staffIndex: number;
  staff: StaffId;
  topLineY: number;
}

/**
 * The staff under the pointer: of the bars under `x`, the staff nearest `y`,
 * measured from its lines, so a ledger line above or below still belongs to
 * it. Null when the nearest staff is a drumset's, or too far off any staff.
 */
export function staffAt(
  layout: Pick<StaffLayout, 'measures' | 'stepPx' | 'topLineDrop'>,
  x: number,
  y: number,
  staffIdsOf: (partIndex: number) => readonly StaffId[],
): StaffHit | null {
  let best: StaffHit | null = null;
  let bestDistance = Infinity;
  for (const box of layout.measures) {
    if (x < box.x || x > box.x + box.width) continue;
    barStaves(box, layout, staffIdsOf(box.partIndex)).forEach((s, i) => {
      const bottom = s.topLineY + STAFF_STEPS * layout.stepPx;
      const distance =
        y < s.topLineY ? s.topLineY - y : y > bottom ? y - bottom : 0;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { box, staffIndex: i, staff: s.staff, topLineY: s.topLineY };
      }
    });
  }
  const hit = best as StaffHit | null;
  if (!hit || hit.staff === 'percussion') return null;
  if (bestDistance > LEDGER_REACH_STEPS * layout.stepPx) return null;
  return hit;
}

export interface TickAnchor {
  tick: number;
  x: number;
}

/**
 * Where time falls across one part's bar: the x of every beat something is
 * written on (a note's head, a rest), between the bar's own first and last
 * note places. Engraving isn't proportional to time — a bar of sixteenths
 * then a held note crowds its start — so a place nothing is written at is
 * found between its written neighbours, not by sweeping the bar evenly.
 */
export function barAnchors(
  box: MeasureBox,
  notes: readonly NoteInfo[],
  rests: readonly RestInfo[],
  stepPx: number,
): TickAnchor[] {
  const span = box.endTick - box.startTick;
  const inside = (item: { partIndex: number; tick: number }) =>
    item.partIndex === box.partIndex &&
    item.tick >= box.startTick &&
    item.tick < box.endTick;
  const byTick = new Map<number, number>();
  const add = (tick: number, x: number) =>
    byTick.set(tick, Math.min(x, byTick.get(tick) ?? Infinity));
  for (const note of notes) if (inside(note)) add(note.tick, note.x);
  // A rest filling the bar is drawn centred, which says nothing about time.
  for (const rest of rests) {
    if (inside(rest) && rest.durationTicks < span) add(rest.tick, rest.x);
  }
  // A notehead's centre sits a head's half-width in from the bar's note
  // area, at either end.
  const half = 1.2 * stepPx;
  const first = (box.noteStartX ?? box.x) + half;
  const last = (box.noteEndX ?? box.x + box.width) - half;
  if (!byTick.has(box.startTick)) add(box.startTick, first);
  const anchors: TickAnchor[] = [];
  for (const [tick, x] of [...byTick].sort((a, b) => a[0] - b[0])) {
    // Keep time running left to right, whatever two voices drew.
    if (anchors.length > 0 && x <= anchors[anchors.length - 1].x) continue;
    anchors.push({ tick, x });
  }
  const end = Math.max(last, anchors[anchors.length - 1].x + half);
  anchors.push({ tick: box.endTick, x: end });
  return anchors;
}

/** The x of `tick` across a bar's anchors, between the two around it. */
export function xAtTick(anchors: readonly TickAnchor[], tick: number): number {
  if (anchors.length === 0) return 0;
  if (tick <= anchors[0].tick) return anchors[0].x;
  for (let i = 1; i < anchors.length; i++) {
    const b = anchors[i];
    if (tick <= b.tick) {
      const a = anchors[i - 1];
      return a.x + ((tick - a.tick) / (b.tick - a.tick || 1)) * (b.x - a.x);
    }
  }
  return anchors[anchors.length - 1].x;
}

/** The start in the bar, one grid step apart, whose place is nearest `x`. */
export function snapTick(
  x: number,
  box: Pick<MeasureBox, 'startTick' | 'endTick'>,
  anchors: readonly TickAnchor[],
  grid: number,
): number {
  let best = box.startTick;
  let bestDistance = Infinity;
  for (
    let tick = box.startTick;
    tick < box.endTick;
    tick += Math.max(1, grid)
  ) {
    const distance = Math.abs(xAtTick(anchors, tick) - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = tick;
    }
  }
  return best;
}

/** Where a note would be written, and where its ghost is drawn. */
export interface InputTarget {
  partIndex: number;
  measureIndex: number;
  /** Which of the part's staves, top to bottom. */
  staffIndex: number;
  staff: StaffId;
  /** Song tick. */
  tick: number;
  midi: number;
  step: number;
  /** Staff steps below the top line. */
  position: number;
  x: number;
  y: number;
  topLineY: number;
}

/** The note the pointer at `x`, `y` would write, or null off the staves. */
export function inputTargetAt({
  layout,
  x,
  y,
  grid,
  staffIdsOf,
  keyFifthsOf,
}: {
  layout: Pick<
    StaffLayout,
    'measures' | 'notes' | 'rests' | 'stepPx' | 'topLineDrop'
  >;
  x: number;
  y: number;
  grid: number;
  staffIdsOf: (partIndex: number) => readonly StaffId[];
  keyFifthsOf: (partIndex: number) => number;
}): InputTarget | null {
  const hit = staffAt(layout, x, y, staffIdsOf);
  if (!hit) return null;
  const { box } = hit;
  const pitch = pitchAtY(
    y,
    hit.topLineY,
    layout.stepPx,
    hit.staff,
    keyFifthsOf(box.partIndex),
  );
  if (!pitch) return null;
  const anchors = barAnchors(box, layout.notes, layout.rests, layout.stepPx);
  const tick = snapTick(x, box, anchors, grid);
  return {
    partIndex: box.partIndex,
    measureIndex: box.measureIndex,
    staffIndex: hit.staffIndex,
    staff: hit.staff,
    tick,
    ...pitch,
    x: xAtTick(anchors, tick),
    y: hit.topLineY + pitch.position * layout.stepPx,
    topLineY: hit.topLineY,
  };
}

/**
 * Where `tick` is drawn on one staff of a part: the x, and that staff's top
 * line. For the input cursor. Null when no bar of the part holds the tick.
 */
export function placeOfTick(
  layout: Pick<
    StaffLayout,
    'measures' | 'notes' | 'rests' | 'stepPx' | 'topLineDrop'
  >,
  partIndex: number,
  staffIndex: number,
  tick: number,
  staffIds: readonly StaffId[],
): { x: number; topLineY: number; box: MeasureBox } | null {
  const box = layout.measures.find(
    (m) => m.partIndex === partIndex && tick >= m.startTick && tick < m.endTick,
  );
  if (!box) return null;
  const staves = barStaves(box, layout, staffIds);
  const staff = staves[Math.min(staffIndex, staves.length - 1)];
  if (!staff) return null;
  const anchors = barAnchors(box, layout.notes, layout.rests, layout.stepPx);
  return { x: xAtTick(anchors, tick), topLineY: staff.topLineY, box };
}

// ── Writing the note ──────────────────────────────────────────────────────

/** Where a note is drawn, in quantized song ticks, and on which staff. */
export interface DrawnSpan {
  staff: StaffId;
  start: number;
  end: number;
}

/**
 * Every note of a part as the page draws it, by Score key: its staff and its
 * written span, a held note's tied pieces taken together. Overwriting goes by
 * what is drawn, so a played note a few ticks early still counts as on the
 * beat it is written on.
 */
export function drawnSpans(score: NotationScore): Map<string, DrawnSpan> {
  const spans = new Map<string, DrawnSpan>();
  for (const measure of score.measures) {
    for (const staff of score.staves) {
      for (const voice of measure.staves[staff] ?? []) {
        for (const item of voice.items) {
          if (item.kind !== 'note') continue;
          const end = item.startTick + item.durationTicks;
          for (const key of item.keys) {
            const seen = spans.get(key.noteId);
            if (seen) {
              seen.start = Math.min(seen.start, item.startTick);
              seen.end = Math.max(seen.end, end);
            } else {
              spans.set(key.noteId, { staff, start: item.startTick, end });
            }
          }
        }
      }
    }
  }
  return spans;
}

export interface NoteInsert {
  trackId: string;
  /** Song tick the note starts on. */
  tick: number;
  durationTicks: number;
  midi: number;
  velocity: number;
  /** A bar's length: a clip the note makes or grows is whole bars. */
  barTicks: number;
  /**
   * The staff being written, and where each note of the part is drawn. Only
   * notes on that staff are overwritten; without a staff, all of the track's.
   */
  staff?: StaffId;
  drawn?: ReadonlyMap<string, DrawnSpan>;
  /** Add to the chord already starting here instead of overwriting. */
  chord?: boolean;
}

/** One clip's new events; a clip the insert makes or grows says its length. */
export interface InsertWrite extends ClipWrite {
  durationTicks?: number;
}

export interface NoteInsertPlan {
  writes: InsertWrite[];
  /** The new note's Score key (or the chord note it already was). */
  noteId: string;
  /** Score keys of the notes the new one wrote over. */
  removed: string[];
  /** Score keys of the notes cut short where the new one starts. */
  trimmed: string[];
  /** The length written: a chord note takes the chord's. */
  durationTicks: number;
}

const roundUp = (tick: number, step: number) => Math.ceil(tick / step) * step;

/**
 * Write one note onto a track, MuseScore's way: on the staff being written,
 * every note starting inside the new note goes, and a note started earlier
 * that is still sounding is cut to end where the new one starts. With
 * `chord`, the note joins the chord starting on that tick instead, at the
 * chord's own length, and nothing is overwritten (with no chord there, it is
 * written as usual). The note goes in the clip paste would put it in, which
 * grows to hold it; a track with no clip there gets a new one from the bar's
 * start. Null when the track isn't there.
 */
export function planNoteInsert(
  tracks: readonly Track[],
  insert: NoteInsert,
): NoteInsertPlan | null {
  const track = tracks.find((t) => t.id === insert.trackId);
  if (!track) return null;
  const { tick, midi, barTicks } = insert;

  const spanOf = (clipStart: number, event: MidiNoteEvent, id: string) =>
    insert.drawn?.get(id) ?? {
      staff: undefined,
      start: clipStart + event.startTick,
      end: clipStart + event.startTick + event.durationTicks,
    };
  const onStaff = (span: { staff?: StaffId }) =>
    !insert.staff || !span.staff || span.staff === insert.staff;

  // A chord to join: the notes on this staff written on this tick.
  if (insert.chord) {
    for (const clip of track.midiClips) {
      for (const event of clip.events) {
        const id = noteKey(track.id, clip.id, event.startTick, event.note);
        const span = spanOf(clip.startTick, event, id);
        if (span.start !== tick || !onStaff(span)) continue;
        const relative = tick - clip.startTick;
        const existing = clip.events.find(
          (e) => e.note === midi && e.startTick === relative,
        );
        if (existing || event.note === midi) {
          // Already in the chord: nothing to write, the note is just picked.
          return {
            writes: [],
            noteId: noteKey(track.id, clip.id, relative, midi),
            removed: [],
            trimmed: [],
            durationTicks: (existing ?? event).durationTicks,
          };
        }
        const added: MidiNoteEvent = {
          id: mintNoteId(),
          note: midi,
          velocity: insert.velocity,
          startTick: relative,
          durationTicks: event.durationTicks,
          channel: event.channel,
        };
        return {
          writes: [
            {
              trackId: track.id,
              clipId: clip.id,
              events: [...clip.events, added].sort(
                (a, b) => a.startTick - b.startTick,
              ),
            },
          ],
          noteId: noteKey(track.id, clip.id, relative, midi),
          removed: [],
          trimmed: [],
          durationTicks: event.durationTicks,
        };
      }
    }
  }

  const end = tick + insert.durationTicks;
  const removed: string[] = [];
  const trimmed: string[] = [];
  const writes = new Map<string, InsertWrite>();

  // 1. Clear the way on this staff, clip by clip.
  for (const clip of track.midiClips) {
    let changed = false;
    const events: MidiNoteEvent[] = [];
    for (const event of clip.events) {
      const id = noteKey(track.id, clip.id, event.startTick, event.note);
      const span = spanOf(clip.startTick, event, id);
      if (!onStaff(span)) {
        events.push(event);
        continue;
      }
      if (span.start >= tick && span.start < end) {
        removed.push(id);
        changed = true;
        continue;
      }
      if (span.start < tick && span.end > tick) {
        const length = tick - (clip.startTick + event.startTick);
        if (length <= 0) {
          removed.push(id);
        } else {
          events.push({ ...event, durationTicks: length });
          trimmed.push(id);
        }
        changed = true;
        continue;
      }
      events.push(event);
    }
    if (changed) {
      writes.set(clip.id, { trackId: track.id, clipId: clip.id, events });
    }
  }

  // 2. The note itself, in the clip paste would choose.
  const clip = clipAt(track, tick);
  let write: InsertWrite;
  let clipStart: number;
  if (clip) {
    clipStart = clip.startTick;
    write = writes.get(clip.id) ?? {
      trackId: track.id,
      clipId: clip.id,
      events: [...clip.events],
    };
    // A clip with a set length grows to the bar the note ends in.
    if (
      clip.durationTicks !== undefined &&
      end > clip.startTick + clip.durationTicks
    ) {
      write.durationTicks = roundUp(end, barTicks) - clip.startTick;
    }
  } else {
    clipStart = Math.floor(tick / barTicks) * barTicks;
    write = {
      trackId: track.id,
      clipId: `clip-note-${crypto.randomUUID().slice(0, 8)}`,
      events: [],
      newClipStartTick: clipStart,
      durationTicks: roundUp(end, barTicks) - clipStart,
    };
  }
  const relative = tick - clipStart;
  write.events = [
    ...write.events,
    {
      id: mintNoteId(),
      note: midi,
      velocity: insert.velocity,
      startTick: relative,
      durationTicks: insert.durationTicks,
      channel: write.events[0]?.channel ?? 0,
    },
  ].sort((a, b) => a.startTick - b.startTick);
  writes.set(write.clipId, write);

  return {
    writes: [...writes.values()],
    noteId: noteKey(track.id, write.clipId, relative, midi),
    removed,
    trimmed,
    durationTicks: insert.durationTicks,
  };
}
