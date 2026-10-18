// ── Inserting time and copying a section (milestone 2.13) ──────────────────
// The sections lane's Insert before or after and Duplicate with its clips:
// edits to the whole arrangement, not to one track. Inserting time moves
// everything at or after a tick later on every track (clips, their
// automation, the chord lane, markers, sections, the loop and the chart's
// marks), cutting what straddles the tick the way the scissors do, so the
// music before it stays where it was. Duplicate inserts a section's length
// after it and copies what plays in it into the gap: notes and controllers,
// windows of audio, chords, automation and the Score's marks on the copied
// notes.
//
// The Lead Sheet's + Measure is a different edit (measureEdits.ts): it moves
// the chart and the melody it shows, as a chart editor does, and leaves the
// other tracks alone. This one shares its handling of the chart's bar marks
// (shiftChartMarks).
//
// Pure: the caller writes the patch in one store write, as one undo step,
// and then lets each new audio clip play its source's audio (sharedAudio).
// `mint` gives every new id, so a test can predict them.

import type { AutomationLanes } from '@/daw/audio/automation';
import { audioClipSection, splitAudioClip } from '@/daw/audio/audioClipCuts';
import {
  midiClipLength,
  midiClipSection,
  splitMidiClip,
} from '@/daw/components/Timeline/midiClipCuts';
import { noteKey } from '@/daw/model/noteKeys';
import { followNoteEdit, type NoteKeyedMarks } from '@/daw/model/noteMarks';
import {
  DEFAULT_SECTION_BARS,
  normalizeSections,
  type SectionType,
  type SongSection,
} from '@/daw/model/sections';
import type { AllSlices } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { AudioClip, MidiClip, Track } from '@/daw/store/tracksSlice';
import {
  chartBarCount,
  shiftChartMarks,
  type ChartMarkKey,
} from './measureEdits';
import { ticksPerBar, timeSignatureOf } from './timeModel';

/** The store keys these edits read. */
export type ArrangementState = Pick<
  AllSlices,
  | 'tracks'
  | 'chordRegions'
  | 'markers'
  | 'sections'
  | 'masterAutomation'
  | 'loopStart'
  | 'loopEnd'
  | 'bpm'
  | 'timeSignatureNumerator'
  | 'timeSignatureDenominator'
  | 'remoteUsers'
  | 'isRecording'
  | 'leadSheetBars'
  | ChartMarkKey
  | 'scoreArticulations'
  | 'scoreSlurs'
  | 'scoreSpellings'
  | 'scoreSlashNotes'
>;

/** What an edit writes: store keys, in one write. */
export type ArrangementPatch = Partial<
  Pick<
    AllSlices,
    | 'tracks'
    | 'chordRegions'
    | 'markers'
    | 'sections'
    | 'masterAutomation'
    | 'loopStart'
    | 'loopEnd'
    | 'leadSheetBars'
    | ChartMarkKey
    | 'scoreArticulations'
    | 'scoreSlurs'
    | 'scoreSpellings'
    | 'scoreSlashNotes'
  >
>;

export interface ArrangementEdit {
  patch: ArrangementPatch;
  /**
   * New audio clips and the clip whose audio each plays: the caller shares
   * it once the patch has landed (AudioBufferStore.shareClipAudio).
   */
  sharedAudio: Array<{ from: string; to: string }>;
}

/** A new id of each kind. */
export type Mint = (kind: 'clip' | 'note' | 'region' | 'section') => string;

/**
 * Why the arrangement can't be edited now, or null: these edits move every
 * track, so a recording in progress, or a collaborator holding any track,
 * stops them.
 */
export function arrangementBlocker(
  state: Pick<AllSlices, 'isRecording' | 'remoteUsers' | 'tracks'>,
): string | null {
  if (state.isRecording) return 'Stop recording first';
  for (const user of state.remoteUsers.values()) {
    if (
      user.selectedTrackId &&
      state.tracks.some((t) => t.id === user.selectedTrackId)
    ) {
      return `${user.userName || 'Someone'} is editing a track`;
    }
  }
  return null;
}

/** `list` mapped, or `list` itself when no entry changed. */
function mapKept<T>(list: T[], map: (entry: T) => T): T[] {
  let changed = false;
  const out = list.map((entry) => {
    const next = map(entry);
    if (next !== entry) changed = true;
    return next;
  });
  return changed ? out : list;
}

/** Lanes with every point at or after `at` moved `delta` later. */
function shiftLanes(
  lanes: AutomationLanes,
  at: number,
  delta: number,
): AutomationLanes {
  let changed = false;
  const out: AutomationLanes = {};
  for (const [lane, points] of Object.entries(lanes)) {
    out[lane] = mapKept(points, (p) =>
      p.tick >= at ? { ...p, tick: p.tick + delta } : p,
    );
    if (out[lane] !== points) changed = true;
  }
  return changed ? out : lanes;
}

/** Lanes with the points in [from, to) copied `offset` later. */
function copyLanePoints(
  lanes: AutomationLanes,
  from: number,
  to: number,
  offset: number,
): AutomationLanes {
  let changed = false;
  const out: AutomationLanes = {};
  for (const [lane, points] of Object.entries(lanes)) {
    const copies = points
      .filter((p) => p.tick >= from && p.tick < to)
      .map((p) => ({ ...p, tick: p.tick + offset }));
    if (copies.length === 0) {
      out[lane] = points;
      continue;
    }
    changed = true;
    out[lane] = [...points, ...copies].sort((a, b) => a.tick - b.tick);
  }
  return changed ? out : lanes;
}

/** The store's note-keyed marks, as noteMarks.ts names them. */
function noteMarksOf(state: ArrangementState): NoteKeyedMarks {
  return {
    articulations: state.scoreArticulations,
    slurs: state.scoreSlurs,
    spellings: state.scoreSpellings,
    slashNotes: state.scoreSlashNotes,
  };
}

/** The marks that changed, as a store patch. */
function marksPatch(
  before: NoteKeyedMarks,
  after: NoteKeyedMarks,
): ArrangementPatch {
  const patch: ArrangementPatch = {};
  if (after.articulations !== before.articulations) {
    patch.scoreArticulations = after.articulations;
  }
  if (after.slurs !== before.slurs) patch.scoreSlurs = after.slurs;
  if (after.spellings !== before.spellings) {
    patch.scoreSpellings = after.spellings;
  }
  if (after.slashNotes !== before.slashNotes) {
    patch.scoreSlashNotes = after.slashNotes;
  }
  return patch;
}

/**
 * The marks of notes that were copied, added for their copies (old key →
 * the copy's key). A slur is copied when both of its notes were.
 */
function copyNoteMarks(
  marks: NoteKeyedMarks,
  copies: ReadonlyMap<string, string>,
): NoteKeyedMarks {
  if (copies.size === 0) return marks;
  // `head|tail`, split at the last '|' the way the Score reads marks.
  const withHead = (entries: string[]): string[] => {
    const extra: string[] = [];
    for (const entry of entries) {
      const bar = entry.lastIndexOf('|');
      const head = bar < 0 ? entry : entry.slice(0, bar);
      const copy = copies.get(head);
      if (copy) extra.push(bar < 0 ? copy : `${copy}${entry.slice(bar)}`);
    }
    return extra.length > 0 ? [...entries, ...extra] : entries;
  };
  const slurs: string[] = [];
  for (const entry of marks.slurs) {
    const bar = entry.lastIndexOf('|');
    if (bar < 0) continue;
    const from = copies.get(entry.slice(0, bar));
    const to = copies.get(entry.slice(bar + 1));
    if (from && to) slurs.push(`${from}|${to}`);
  }
  return {
    articulations: withHead(marks.articulations),
    slurs: slurs.length > 0 ? [...marks.slurs, ...slurs] : marks.slurs,
    spellings: withHead(marks.spellings),
    slashNotes: withHead(marks.slashNotes),
  };
}

// ── Inserting time ─────────────────────────────────────────────────────────

/**
 * `ticks` of silence inserted at song tick `atTick`: everything at or after
 * it moves that much later, on every track. A clip that straddles the tick
 * is cut there (the right half under a new id, its notes' Score marks with
 * it), and so is a chord; a section or a loop that straddles it gets longer.
 * When the tick and the length are whole bars, the chart's bar marks move
 * too, as + Measure moves them.
 */
export function insertTimeEdit(
  state: ArrangementState,
  atTick: number,
  ticks: number,
  mint: Mint,
): ArrangementEdit {
  const at = Math.max(0, Math.round(atTick));
  const delta = Math.round(ticks);
  if (!(delta > 0)) return { patch: {}, sharedAudio: [] };
  const sharedAudio: ArrangementEdit['sharedAudio'] = [];
  /** A cut MIDI clip's id → its right half's. */
  const rightHalf = new Map<string, string>();
  /** Score keys of notes that moved to a right half: old → new. */
  const renamed = new Map<string, string>();

  const moveMidi = (track: Track, clip: MidiClip): MidiClip[] => {
    if (clip.startTick >= at) {
      return [{ ...clip, startTick: clip.startTick + delta }];
    }
    if (clip.startTick + midiClipLength(clip) <= at) return [clip];
    const rightId = mint('clip');
    const halves = splitMidiClip(clip, at, rightId);
    if (!halves) return [clip];
    const cut = at - clip.startTick;
    for (const e of clip.events) {
      if (e.startTick >= cut) {
        renamed.set(
          noteKey(track.id, clip.id, e.startTick, e.note),
          noteKey(track.id, rightId, e.startTick - cut, e.note),
        );
      }
    }
    rightHalf.set(clip.id, rightId);
    const [left, right] = halves;
    return [left, { ...right, startTick: right.startTick + delta }];
  };

  const moveAudio = (clip: AudioClip): AudioClip[] => {
    if (clip.startTick >= at) {
      return [{ ...clip, startTick: clip.startTick + delta }];
    }
    if (clip.startTick + clip.duration <= at) return [clip];
    const rightId = mint('clip');
    const halves = splitAudioClip(clip, at, state.bpm, rightId);
    if (!halves) return [clip];
    sharedAudio.push({ from: clip.id, to: rightId });
    const [left, right] = halves;
    return [left, { ...right, startTick: right.startTick + delta }];
  };

  const tracks = mapKept(state.tracks, (track) => {
    const midi = track.midiClips.flatMap((clip) => moveMidi(track, clip));
    const audio = track.audioClips.flatMap(moveAudio);
    const automation = track.automation
      ? shiftLanes(track.automation, at, delta)
      : track.automation;
    const midiSame =
      midi.length === track.midiClips.length &&
      midi.every((c, i) => c === track.midiClips[i]);
    const audioSame =
      audio.length === track.audioClips.length &&
      audio.every((c, i) => c === track.audioClips[i]);
    if (midiSame && audioSame && automation === track.automation) return track;
    return {
      ...track,
      midiClips: midiSame ? track.midiClips : midi,
      audioClips: audioSame ? track.audioClips : audio,
      ...(automation !== track.automation ? { automation } : {}),
    };
  });

  const followClip = (id: string | undefined) =>
    id !== undefined ? (rightHalf.get(id) ?? id) : id;
  const chordRegions = state.chordRegions.flatMap((region): ChordRegion[] => {
    if (region.startTick >= at) {
      const moved: ChordRegion = {
        ...region,
        startTick: region.startTick + delta,
        endTick: region.endTick + delta,
      };
      if (region.rawStartTick !== undefined) {
        moved.rawStartTick = region.rawStartTick + delta;
      }
      if (region.sourceClipId !== undefined) {
        moved.sourceClipId = followClip(region.sourceClipId);
      }
      return [moved];
    }
    if (region.endTick <= at) return [region];
    const right: ChordRegion = {
      ...region,
      id: mint('region'),
      startTick: at + delta,
      endTick: region.endTick + delta,
    };
    delete right.rawStartTick;
    if (region.sourceClipId !== undefined) {
      right.sourceClipId = followClip(region.sourceClipId);
    }
    return [{ ...region, endTick: at }, right];
  });

  const markers = mapKept(state.markers, (m) =>
    m.tick >= at ? { ...m, tick: m.tick + delta } : m,
  );
  const sections = normalizeSections(
    mapKept(state.sections, (s) =>
      s.startTick >= at
        ? { ...s, startTick: s.startTick + delta, endTick: s.endTick + delta }
        : s.endTick > at
          ? { ...s, endTick: s.endTick + delta }
          : s,
    ),
  );

  const patch: ArrangementPatch = {
    tracks,
    chordRegions,
    markers,
    sections,
    masterAutomation: shiftLanes(state.masterAutomation, at, delta),
  };
  if (state.loopStart >= at) {
    patch.loopStart = state.loopStart + delta;
    patch.loopEnd = state.loopEnd + delta;
  } else if (state.loopEnd > at) {
    patch.loopEnd = state.loopEnd + delta;
  }

  // The chart's bar marks, when whole bars go in inside the chart.
  const ts = timeSignatureOf(state);
  const bar = ticksPerBar(ts);
  if (at % bar === 0 && delta % bar === 0) {
    const atBar = at / bar;
    const count = delta / bar;
    const barCount = chartBarCount(
      state.chordRegions,
      state.leadSheetBars,
      ts,
      state.sections,
    );
    if (atBar < barCount) {
      Object.assign(patch, shiftChartMarks(state, atBar, count, barCount));
    }
    if (state.leadSheetBars !== null && atBar < state.leadSheetBars) {
      patch.leadSheetBars = state.leadSheetBars + count;
    }
  }

  const marks = noteMarksOf(state);
  Object.assign(
    patch,
    marksPatch(marks, followNoteEdit(marks, { renamed, removed: new Set() })),
  );
  return { patch, sharedAudio };
}

// ── Duplicating a section ──────────────────────────────────────────────────

/**
 * Section `sectionId` played twice: its length inserted after it
 * (insertTimeEdit), and what plays in it copied into the gap: each MIDI
 * clip's notes and controllers there (a clip that starts before the section
 * gives only its part in it), each audio clip's window, the chords, the
 * automation, and the Score's marks on the copied notes. A new section of
 * the same kind and name covers the copy. Markers stay as cues, uncopied.
 * Null when there is no such section.
 */
export function duplicateSectionEdit(
  state: ArrangementState,
  sectionId: string,
  mint: Mint,
): ArrangementEdit | null {
  const section = state.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const { startTick: from, endTick: to } = section;
  const length = to - from;
  const inserted = insertTimeEdit(state, to, length, mint);
  const after = { ...state, ...inserted.patch } as ArrangementState;
  const sharedAudio = [...inserted.sharedAudio];
  /** A source clip's id → its copy's, for the chords read from it. */
  const copyOfClip = new Map<string, string>();
  /** Score keys of copied notes: the note's → its copy's. */
  const copyOfNote = new Map<string, string>();

  const tracks = mapKept(after.tracks, (track) => {
    const midiCopies: MidiClip[] = [];
    for (const clip of track.midiClips) {
      const part = midiClipSection(clip, from, to);
      if (!part) continue;
      const inside =
        clip.startTick >= from && clip.startTick + midiClipLength(clip) <= to;
      // A clip partly in the section with nothing in that part isn't copied.
      if (!inside && part.events.length === 0 && !part.ccEvents?.length) {
        continue;
      }
      const copyId = mint('clip');
      const shift = part.startTick - clip.startTick;
      const events = part.events.map((e) => {
        copyOfNote.set(
          noteKey(track.id, clip.id, e.startTick + shift, e.note),
          noteKey(track.id, copyId, e.startTick, e.note),
        );
        return { ...e, id: mint('note') };
      });
      midiCopies.push({
        ...part,
        id: copyId,
        startTick: part.startTick + length,
        events,
      });
      if (!copyOfClip.has(clip.id)) copyOfClip.set(clip.id, copyId);
    }
    const audioCopies: AudioClip[] = [];
    for (const clip of track.audioClips) {
      const part = audioClipSection(clip, from, to, state.bpm);
      if (!part) continue;
      const copyId = mint('clip');
      audioCopies.push({
        ...part,
        id: copyId,
        startTick: part.startTick + length,
      });
      sharedAudio.push({ from: clip.id, to: copyId });
    }
    const automation = track.automation
      ? copyLanePoints(track.automation, from, to, length)
      : track.automation;
    if (
      midiCopies.length === 0 &&
      audioCopies.length === 0 &&
      automation === track.automation
    ) {
      return track;
    }
    return {
      ...track,
      midiClips: [...track.midiClips, ...midiCopies],
      audioClips: [...track.audioClips, ...audioCopies],
      ...(automation !== track.automation ? { automation } : {}),
    };
  });

  const chordCopies: ChordRegion[] = [];
  for (const region of after.chordRegions) {
    const start = Math.max(region.startTick, from);
    const end = Math.min(region.endTick, to);
    if (end <= start) continue;
    const copy: ChordRegion = {
      ...region,
      id: mint('region'),
      startTick: start + length,
      endTick: end + length,
    };
    if (region.rawStartTick !== undefined && start === region.startTick) {
      copy.rawStartTick = region.rawStartTick + length;
    } else {
      delete copy.rawStartTick;
    }
    if (region.sourceClipId !== undefined) {
      const source = copyOfClip.get(region.sourceClipId);
      if (source) copy.sourceClipId = source;
      else delete copy.sourceClipId;
    }
    chordCopies.push(copy);
  }

  const marks = noteMarksOf(after);
  const patch: ArrangementPatch = {
    ...inserted.patch,
    tracks,
    chordRegions:
      chordCopies.length > 0
        ? [...after.chordRegions, ...chordCopies].sort(
            (a, b) => a.startTick - b.startTick,
          )
        : after.chordRegions,
    masterAutomation: copyLanePoints(after.masterAutomation, from, to, length),
    sections: normalizeSections([
      ...after.sections,
      {
        id: mint('section'),
        type: section.type,
        label: section.label,
        startTick: to,
        endTick: to + length,
      },
    ]),
    ...marksPatch(marks, copyNoteMarks(marks, copyOfNote)),
  };
  return { patch, sharedAudio };
}

// ── Inserting a section ────────────────────────────────────────────────────

/**
 * A new section of `input`'s kind and name, DEFAULT_SECTION_BARS long, put
 * in before or after section `sectionId`: that many empty bars inserted
 * there (insertTimeEdit), and the section over them. Null when there is no
 * such section.
 */
export function insertSectionEdit(
  state: ArrangementState,
  sectionId: string,
  where: 'before' | 'after',
  input: { type: SectionType; label: string },
  mint: Mint,
): ArrangementEdit | null {
  const section = state.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const length = DEFAULT_SECTION_BARS * ticksPerBar(timeSignatureOf(state));
  const at = where === 'before' ? section.startTick : section.endTick;
  const inserted = insertTimeEdit(state, at, length, mint);
  const added: SongSection = {
    id: mint('section'),
    type: input.type,
    label: input.label,
    startTick: at,
    endTick: at + length,
  };
  return {
    patch: {
      ...inserted.patch,
      sections: normalizeSections([
        ...(inserted.patch.sections ?? state.sections),
        added,
      ]),
    },
    sharedAudio: inserted.sharedAudio,
  };
}
