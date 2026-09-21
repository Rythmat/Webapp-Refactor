import type { MidiNoteEvent } from '@prism/engine';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Track } from '@/daw/store/tracksSlice';
import type { LeadSheetRepeat, LeadSheetSection } from '@/daw/store/uiSlice';
import type { ItemKind } from './leadSheetSelection';

// ── Copy and paste on the lead sheet ───────────────────────────────────────
// A copy carries whatever was selected — chord symbols, melody notes, the
// roadmap marks on a barline — stored relative to the start of the copied
// block so it lands wherever the paste starts. Pasting a block of measures
// replaces what is inside them; pasting loose items drops them in without
// clearing anything, the way the Score behaves.

export interface ClipboardChord {
  /** Ticks after the block's start. */
  tickOffset: number;
  name: string;
  noteName: string;
  color: [number, number, number];
  degreeKey?: string;
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
    chords: source.chords.map((region) => ({
      tickOffset: region.startTick - source.startTick,
      name: region.name,
      noteName: region.noteName,
      color: region.color,
      degreeKey: region.degreeKey,
    })),
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

/** A chord region reduced to where it starts and what it says. */
interface ChordStart {
  startTick: number;
  name: string;
  noteName: string;
  color: [number, number, number];
  degreeKey?: string;
  id?: string;
}

/**
 * Rebuild contiguous regions from their starts: each runs to the next one,
 * and the last keeps the old end — or the end of the pasted block when that
 * reaches further.
 */
function regionsFromStarts(
  starts: ChordStart[],
  endTick: number,
): ChordRegion[] {
  const sorted = [...starts].sort((a, b) => a.startTick - b.startTick);
  return sorted.map((start, i) => ({
    id: start.id ?? '',
    startTick: start.startTick,
    endTick: sorted[i + 1]?.startTick ?? Math.max(endTick, start.startTick),
    name: start.name,
    noteName: start.noteName,
    color: start.color,
    ...(start.degreeKey ? { degreeKey: start.degreeKey } : {}),
  }));
}

/**
 * Paste the clipboard's chords so its start lands on `targetTick`. A measure
 * copy clears the chords already in that span; a loose chord copy adds to
 * them, replacing only an exact collision.
 */
export function pasteChords(
  regions: ChordRegion[],
  clipboard: LeadSheetClipboard,
  targetTick: number,
): ChordRegion[] {
  if (clipboard.chords.length === 0 && !clipboard.replace) return regions;

  const from = targetTick;
  const to = targetTick + clipboard.spanTicks;
  const kept: ChordStart[] = regions
    .filter((region) =>
      clipboard.replace
        ? region.startTick < from || region.startTick >= to
        : !clipboard.chords.some(
            (chord) => chord.tickOffset + targetTick === region.startTick,
          ),
    )
    .map((region) => ({
      startTick: region.startTick,
      name: region.name,
      noteName: region.noteName,
      color: region.color,
      degreeKey: region.degreeKey,
      id: region.id,
    }));

  const incoming: ChordStart[] = clipboard.chords.map((chord) => ({
    startTick: targetTick + chord.tickOffset,
    name: chord.name,
    noteName: chord.noteName,
    color: chord.color,
    degreeKey: chord.degreeKey,
  }));

  const previousEnd = regions.reduce(
    (max, region) => Math.max(max, region.endTick),
    0,
  );
  return regionsFromStarts([...kept, ...incoming], Math.max(previousEnd, to));
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
