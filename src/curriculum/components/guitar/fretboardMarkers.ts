import type { FretMarker, FretMarkerRole } from '@/components/guitar/types';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type { LessonNoteEvent } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type { ChordTarget } from '@/curriculum/types/activity.v2';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import {
  fretToMidi,
  nearestPosition,
  type FretWindow,
} from '@/lib/guitar/fretboard';
import type { FretPosition } from '@/lib/guitar/types';
import { chordTargetAt } from './guitarVisualModel';

// ── Guitar lesson visuals: fretboard markers ───────────────────────────────
// What the fretboard shows, in the keyboard's priority order in the lesson
// container: the demo, else the student's notes, else the practice guide,
// else the step itself (the chord or note to play now, the one after it, and
// what's done). Under all of them lies the book position, faint, so the hand
// always has its shape to aim at. A pitch is drawn where the step plays it;
// one the step doesn't use goes to the nearest spot in the fret window.
// Markers are labelled with the note name unless a labeler (fingers, key
// numbers, chord tones) says otherwise; the name is still what is read aloud.

export interface GroupNote {
  id: string;
  midi: number;
  position: FretPosition;
}

/** Notes that start together: one strum, or one note of a line. */
export interface NoteGroup {
  /** Roll tick the notes start on. */
  startTicks: number;
  notes: GroupNote[];
  /** The chord's root on a chord step, the key's tonic otherwise. */
  rootPc: number;
  /** The book shape of the chord the notes belong to, on a chord step. */
  shapeId?: string;
}

/** What a marker shows in place of its note name, and how that is read. */
export interface MarkerText {
  text: string;
  /** Read after the note name: 'finger 3', 'flat 3'. Omitted when empty. */
  spoken?: string;
}

/**
 * The text for a note at a spot, in the group it belongs to (the anchor group
 * for a sounding note). Undefined keeps the note name.
 */
export type MarkerLabeler = (
  position: FretPosition,
  midi: number,
  group: NoteGroup | undefined,
) => MarkerText | undefined;

/** The step's notes by onset, each group rooted in the chord it belongs to. */
export function noteGroups(
  events: readonly LessonNoteEvent[],
  chordTargets: readonly ChordTarget[],
  countInOffset: number,
  tonicPc: number,
): NoteGroup[] {
  const byTick = new Map<number, GroupNote[]>();
  for (const event of events) {
    if (!event.fretPosition) continue;
    const notes = byTick.get(event.startTicks) ?? [];
    notes.push({
      id: event.id,
      midi: fretToMidi(event.fretPosition),
      position: event.fretPosition,
    });
    byTick.set(event.startTicks, notes);
  }
  return [...byTick.entries()]
    .sort(([a], [b]) => a - b)
    .map(([startTicks, notes]) => {
      const target =
        chordTargets[chordTargetAt(chordTargets, startTicks, countInOffset)];
      return {
        startTicks,
        notes,
        rootPc: target?.rootPc ?? tonicPc,
        ...(target ? { shapeId: target.shapeId } : {}),
      };
    });
}

/** In time: the group at the playhead — the last one started, else the first. */
export function groupAt(groups: readonly NoteGroup[], tick: number): number {
  let at = 0;
  groups.forEach((group, i) => {
    if (group.startTicks <= tick) at = i;
  });
  return at;
}

/**
 * Out of time: the group holding the first note that is current and not yet
 * completed. With none left, every note is done: past the last group.
 */
export function outOfTimeGroup(
  groups: readonly NoteGroup[],
  noteHoldMeta: Readonly<
    Record<string, { isCompleted: boolean; isCurrentChord: boolean }>
  >,
): number {
  const at = groups.findIndex((group) =>
    group.notes.some((note) => {
      const meta = noteHoldMeta[note.id];
      return meta?.isCurrentChord && !meta.isCompleted;
    }),
  );
  return at >= 0 ? at : groups.length;
}

export interface FretboardMarkerInput {
  groups: readonly NoteGroup[];
  /** Index of the group to play now; groups.length once all are done. */
  cursor: number;
  /** Notes already completed (out of time). */
  completedIds: ReadonlySet<string>;
  /** The book position, drawn faintly under everything. */
  context: { positions: readonly FretPosition[]; rootPc: number } | null;
  window: FretWindow;
  /** The key's tonic, for spelling note names. */
  keyRootPc: number;
  activityState: 'preview' | 'practice' | 'performance' | 'complete';
  demoMidis: ReadonlySet<number>;
  isPlayingDemo: boolean;
  activeMidis: readonly number[];
  practiceMidis: ReadonlySet<number>;
  targetMidiSet: ReadonlySet<number>;
  /** Fingers, key numbers or chord tones in place of note names. */
  labelOf?: MarkerLabeler;
}

/** Weakest first, as components/guitar/types.ts orders the roles. */
const ROLE_RANK: Readonly<Record<FretMarkerRole, number>> = {
  context: 0,
  hint: 1,
  next: 2,
  target: 3,
  done: 4,
  played: 5,
  wrong: 6,
  missed: 7,
};

const spotOf = (p: FretPosition) => `${p.string}:${p.fret}`;

/** The note name in the key, without its octave: 'B♭', 'F♯'. */
function noteLabel(midi: number, keyRootPc: number): string {
  return formatAccidentalsForDisplay(
    midiToPitchName(midi, keyRootPc).replace(/-?\d+$/, ''),
  );
}

function marker(
  position: FretPosition,
  midi: number,
  role: FretMarkerRole,
  rootPc: number,
  keyRootPc: number,
  labeled?: { labelOf?: MarkerLabeler; group: NoteGroup | undefined },
): FretMarker {
  const text = labeled?.labelOf?.(position, midi, labeled.group);
  return {
    string: position.string,
    fret: position.fret,
    midi,
    label: noteLabel(midi, keyRootPc),
    role,
    isRoot: midi % 12 === rootPc,
    ...(text ? { text: text.text } : {}),
    ...(text?.spoken ? { spokenText: text.spoken } : {}),
  };
}

/**
 * The group a sounding set belongs to — the chord being strummed, the note
 * being picked: the one sharing most of its pitches, nearest the cursor on a
 * tie. -1 for a step with no notes.
 */
function anchorGroup(
  midis: readonly number[],
  groups: readonly NoteGroup[],
  cursor: number,
): number {
  let best = -1;
  let bestShared = -1;
  let bestDistance = Infinity;
  groups.forEach((group, i) => {
    const shared = group.notes.filter((n) => midis.includes(n.midi)).length;
    const distance = Math.abs(i - cursor);
    if (
      shared > bestShared ||
      (shared === bestShared && distance < bestDistance)
    ) {
      best = i;
      bestShared = shared;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * Pitches that are sounding (demo, guide or the student), each at the fret
 * its anchor group plays it on, else where the step nearest the anchor plays
 * it, else the nearest spot in the window.
 */
function soundingMarkers(
  midis: readonly number[],
  roleOf: (midi: number) => FretMarkerRole,
  { groups, cursor, window, keyRootPc, labelOf }: FretboardMarkerInput,
): FretMarker[] {
  const anchor = anchorGroup(midis, groups, cursor);
  const group = groups[anchor];
  const rootPc = group?.rootPc ?? keyRootPc;
  const where = new Map<number, FretPosition>();
  const byDistance = groups
    .map((group, i) => ({ group, distance: Math.abs(i - anchor) }))
    .sort((a, b) => a.distance - b.distance);
  for (const { group } of byDistance) {
    for (const note of group.notes) {
      if (!where.has(note.midi)) where.set(note.midi, note.position);
    }
  }
  return midis.flatMap((midi) => {
    const position = where.get(midi) ?? nearestPosition(midi, window);
    return position
      ? [
          marker(position, midi, roleOf(midi), rootPc, keyRootPc, {
            labelOf,
            group,
          }),
        ]
      : [];
  });
}

/**
 * The step at rest or waiting for the student: the group to play now, the
 * one after it, and the notes already completed. A spot takes the first of
 * those it is part of, so a repeated chord or a scale coming back down shows
 * what to play, not the check from last time.
 */
function stepMarkers({
  groups,
  cursor,
  completedIds,
  keyRootPc,
  labelOf,
}: FretboardMarkerInput): FretMarker[] {
  const bySpot = new Map<string, FretMarker>();
  const claim = (note: GroupNote, role: FretMarkerRole, group: NoteGroup) => {
    const spot = spotOf(note.position);
    if (!bySpot.has(spot)) {
      bySpot.set(
        spot,
        marker(note.position, note.midi, role, group.rootPc, keyRootPc, {
          labelOf,
          group,
        }),
      );
    }
  };
  const now = groups[cursor];
  now?.notes.forEach((note) =>
    claim(note, completedIds.has(note.id) ? 'done' : 'target', now),
  );
  const next = groups[cursor + 1];
  next?.notes.forEach((note) => claim(note, 'next', next));
  for (const group of groups) {
    for (const note of group.notes) {
      if (completedIds.has(note.id)) claim(note, 'done', group);
    }
  }
  return [...bySpot.values()];
}

function highlightMarkers(input: FretboardMarkerInput): FretMarker[] {
  const {
    activityState,
    demoMidis,
    isPlayingDemo,
    activeMidis,
    practiceMidis,
    targetMidiSet,
  } = input;
  const isActive =
    activityState === 'practice' || activityState === 'performance';
  if (demoMidis.size > 0) {
    return soundingMarkers([...demoMidis], () => 'target', input);
  }
  // Between the demo's notes: nothing, as on the keyboard.
  if (isPlayingDemo) return [];
  if (isActive && activeMidis.length > 0) {
    return soundingMarkers(
      activeMidis,
      (midi) => (targetMidiSet.has(midi) ? 'played' : 'wrong'),
      input,
    );
  }
  if (activityState === 'practice' && practiceMidis.size > 0) {
    return soundingMarkers([...practiceMidis], () => 'target', input);
  }
  return stepMarkers(input);
}

/** One marker per spot; where two meet, the stronger role wins. */
export function fretboardMarkers(input: FretboardMarkerInput): FretMarker[] {
  const { context, keyRootPc } = input;
  const contextMarkers = context
    ? context.positions.map((p) =>
        marker(p, fretToMidi(p), 'context', context.rootPc, keyRootPc),
      )
    : [];
  const bySpot = new Map<string, FretMarker>();
  for (const m of [...contextMarkers, ...highlightMarkers(input)]) {
    const spot = spotOf(m);
    const held = bySpot.get(spot);
    if (!held || ROLE_RANK[m.role] > ROLE_RANK[held.role]) bySpot.set(spot, m);
  }
  return [...bySpot.values()];
}
