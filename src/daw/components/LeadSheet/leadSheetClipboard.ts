import type { MidiNoteEvent } from '@prism/engine';
import {
  identityIsCurrent,
  type ChordRegionIdentity,
} from '@/daw/harmony/chordIdentity';
import {
  laneWithChordAt,
  replaceChordRegionsInRange,
  type ChordRegion,
} from '@/daw/store/prismSlice';
import type { TimeSignature } from '@/daw/time/timeModel';
import type { Track } from '@/daw/store/tracksSlice';
import type { LeadSheetRepeat, LeadSheetSection } from '@/daw/store/uiSlice';
import type { ItemKind } from './leadSheetSelection';

// ── Copy and paste on the lead sheet ───────────────────────────────────────
// A copy carries whatever was selected — chord symbols, melody notes, the
// roadmap marks on a barline — stored relative to the start of the copied
// block so it lands wherever the paste starts. Pasting a block of measures
// replaces what is inside them; pasting loose items drops them in without
// clearing anything, the way the Score behaves. Either way only the span
// pasted over changes: every chord outside it is the same object, ends and
// gaps (N.C.) included (leadsheet-08).

export interface ClipboardChord {
  /** Ticks after the block's start. */
  tickOffset: number;
  /** How long it lasts, cut at the end of a copied block. */
  lengthTicks: number;
  name: string;
  noteName: string;
  color: [number, number, number];
  degreeKey?: string;
  /** Its identity, when it had a current one (it names the same name). */
  identity?: ChordRegionIdentity;
}

export interface ClipboardNote {
  tickOffset: number;
  midi: number;
  durationTicks: number;
  velocity: number;
}

export interface ClipboardRoadmap {
  /** Measures after the block's first measure. */
  measureOffset: number;
  sectionLabel: string | null;
  repeatStart: boolean;
  repeatEnd: boolean;
  systemBreak: boolean;
}

export interface LeadSheetClipboard {
  /** The kind that was selected; paste writes only what this covers. */
  kind: ItemKind;
  /** Ticks the block covers. A measure paste clears this much first. */
  spanTicks: number;
  /** Measures the block covers, for the roadmap marks. */
  spanMeasures: number;
  /** True for a whole-measure copy, which replaces the destination. */
  replace: boolean;
  chords: ClipboardChord[];
  notes: ClipboardNote[];
  roadmap: ClipboardRoadmap[];
}

export interface CopySource {
  kind: ItemKind;
  /** Where the block starts; everything is stored relative to this. */
  startTick: number;
  startMeasure: number;
  spanTicks: number;
  spanMeasures: number;
  replace: boolean;
  chords: ChordRegion[];
  notes: Array<{
    tick: number;
    midi: number;
    durationTicks: number;
    velocity: number;
  }>;
  roadmap: Array<{
    measureIndex: number;
    sectionLabel: string | null;
    repeatStart: boolean;
    repeatEnd: boolean;
    systemBreak: boolean;
  }>;
}

export function buildClipboard(source: CopySource): LeadSheetClipboard {
  return {
    kind: source.kind,
    spanTicks: source.spanTicks,
    spanMeasures: source.spanMeasures,
    replace: source.replace,
    chords: source.chords.map((region) => {
      const blockEnd = source.startTick + source.spanTicks;
      const end =
        source.spanTicks > 0
          ? Math.min(region.endTick, blockEnd)
          : region.endTick;
      return {
        tickOffset: region.startTick - source.startTick,
        lengthTicks: Math.max(0, end - region.startTick),
        name: region.name,
        noteName: region.noteName,
        color: region.color,
        degreeKey: region.degreeKey,
        ...(identityIsCurrent(region) ? { identity: region.identity } : {}),
      };
    }),
    notes: source.notes.map((note) => ({
      tickOffset: note.tick - source.startTick,
      midi: note.midi,
      durationTicks: note.durationTicks,
      velocity: note.velocity,
    })),
    roadmap: source.roadmap.map((mark) => ({
      measureOffset: mark.measureIndex - source.startMeasure,
      sectionLabel: mark.sectionLabel,
      repeatStart: mark.repeatStart,
      repeatEnd: mark.repeatEnd,
      systemBreak: mark.systemBreak,
    })),
  };
}

/**
 * The region a pasted chord becomes over [startTick, endTick): what the
 * clipboard holds, and no id until the store gives it one.
 */
function pastedRegion(
  chord: ClipboardChord,
  startTick: number,
  endTick: number,
): ChordRegion {
  return {
    id: '',
    startTick,
    endTick,
    name: chord.name,
    noteName: chord.noteName,
    color: chord.color,
    ...(chord.degreeKey ? { degreeKey: chord.degreeKey } : {}),
    ...(chord.identity ? { identity: chord.identity } : {}),
  };
}

/**
 * Paste the clipboard's chords so its start lands on `targetTick`. A block
 * (measures or beats) replaces the chords across its span, each pasted chord
 * as long as it was, and a chord crossing either edge keeps its part
 * outside; an empty block clears the span. Loose chords go in as a typed
 * chord does: over a chord starting on the same beat, else splitting the
 * one they land in. Chords outside the span stay exactly as they were.
 */
export function pasteChords(
  regions: ChordRegion[],
  clipboard: LeadSheetClipboard,
  targetTick: number,
  ts: TimeSignature,
): ChordRegion[] {
  if (clipboard.chords.length === 0 && !clipboard.replace) return regions;

  if (clipboard.replace) {
    const from = targetTick;
    const to = targetTick + clipboard.spanTicks;
    const incoming = clipboard.chords.map((chord) => {
      const startTick = targetTick + chord.tickOffset;
      return pastedRegion(
        chord,
        startTick,
        Math.min(startTick + chord.lengthTicks, to),
      );
    });
    return replaceChordRegionsInRange(regions, incoming, from, to);
  }

  let lane = regions;
  const loose = [...clipboard.chords].sort(
    (a, b) => a.tickOffset - b.tickOffset,
  );
  for (const chord of loose) {
    const tick = targetTick + chord.tickOffset;
    lane = laneWithChordAt(
      lane,
      tick,
      ts,
      // Over a chord on the same beat: that region, with this chord in it.
      (existing) => ({
        ...pastedRegion(chord, existing.startTick, existing.endTick),
        id: existing.id,
      }),
      (startTick, endTick) =>
        pastedRegion(
          chord,
          startTick,
          chord.lengthTicks > 0
            ? Math.min(endTick, startTick + chord.lengthTicks)
            : endTick,
        ),
    );
  }
  return lane;
}

export interface RoadmapEdit {
  measureIndex: number;
  sectionLabel: string | null;
  repeatStart: boolean;
  repeatEnd: boolean;
  systemBreak: boolean;
}

/** Where the clipboard's roadmap marks land when pasted at `targetMeasure`. */
export function pasteRoadmap(
  clipboard: LeadSheetClipboard,
  targetMeasure: number,
  measureCount: number,
): RoadmapEdit[] {
  return clipboard.roadmap
    .map((mark) => ({
      measureIndex: targetMeasure + mark.measureOffset,
      sectionLabel: mark.sectionLabel,
      repeatStart: mark.repeatStart,
      repeatEnd: mark.repeatEnd,
      systemBreak: mark.systemBreak,
    }))
    .filter(
      (mark) => mark.measureIndex >= 0 && mark.measureIndex <= measureCount,
    );
}

/** Read the roadmap marks attached to a measure's opening barline. */
export function roadmapAt(
  measureIndex: number,
  sections: LeadSheetSection[],
  repeats: LeadSheetRepeat[],
  systemBreaks: ReadonlySet<number>,
): RoadmapEdit {
  return {
    measureIndex,
    sectionLabel:
      sections.find((section) => section.measureIdx === measureIndex)?.label ??
      null,
    repeatStart: repeats.some((r) => r.startMeasure === measureIndex),
    repeatEnd: repeats.some((r) => r.endMeasure === measureIndex - 1),
    systemBreak: systemBreaks.has(measureIndex),
  };
}

/** True when a mark carries nothing — nothing to copy, nothing to paste. */
export const isEmptyRoadmap = (mark: RoadmapEdit): boolean =>
  !mark.sectionLabel &&
  !mark.repeatStart &&
  !mark.repeatEnd &&
  !mark.systemBreak;

export interface MelodyClipWrite {
  trackId: string;
  clipId: string;
  events: MidiNoteEvent[];
}

/**
 * Paste the clipboard's melody notes into the track the lead sheet reads from.
 * A measure copy clears the destination span first; loose notes are added.
 * Returns one write per touched clip, or nothing when there is nowhere to put
 * them.
 */
export function pasteMelodyNotes(
  track: Track | null,
  clipboard: LeadSheetClipboard,
  targetTick: number,
): MelodyClipWrite[] {
  if (!track || track.midiClips.length === 0) return [];
  if (clipboard.notes.length === 0 && !clipboard.replace) return [];

  // The clip covering the target, else the last one starting before it.
  const covering = track.midiClips.find((clip) => {
    const length =
      clip.durationTicks ??
      Math.max(0, ...clip.events.map((e) => e.startTick + e.durationTicks), 0);
    return targetTick >= clip.startTick && targetTick < clip.startTick + length;
  });
  const before = [...track.midiClips]
    .filter((clip) => clip.startTick <= targetTick)
    .sort((a, b) => b.startTick - a.startTick)[0];
  const clip = covering ?? before ?? track.midiClips[0];

  const from = targetTick - clip.startTick;
  const to = from + clipboard.spanTicks;
  let events = [...clip.events];
  if (clipboard.replace) {
    events = events.filter((e) => e.startTick < from || e.startTick >= to);
  }
  for (const note of clipboard.notes) {
    events.push({
      note: note.midi,
      velocity: note.velocity,
      startTick: Math.max(0, from + note.tickOffset),
      durationTicks: note.durationTicks,
      channel: clip.events[0]?.channel ?? 0,
    });
  }
  return [
    {
      trackId: track.id,
      clipId: clip.id,
      events: events.sort((a, b) => a.startTick - b.startTick),
    },
  ];
}
