import { shareClipAudio } from '@/daw/audio/AudioBufferStore';
import { midiClipLength } from '@/daw/components/Timeline/midiClipCuts';
import { splitAudioClipAt } from '@/daw/components/Timeline/splitAudioClipAt';
import { splitMidiClipAt } from '@/daw/components/Timeline/splitMidiClipAt';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { followNoteEdit } from '@/daw/model/noteMarks';
import { noteKey } from '@/daw/model/noteKeys';
import { useStore, type AllSlices } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { isTrackLockedByRemote } from '@/daw/store/trackLock';
import type { AudioClip, MidiClip, Track } from '@/daw/store/tracksSlice';
import type { MidiNoteEvent } from '@prism/engine';
import {
  barStartTick,
  gridStepTicks,
  snapTicks,
  ticksPerBar,
  timeSignatureOf,
  timelineSnapGrid,
} from '@/daw/time/timeModel';
import { promptDialog } from '@/daw/ui/DialogHost';
import { quantizeEvents, type AllGridSize } from '@/daw/utils/quantize';
import { resolveTrackRole } from '@/daw/utils/trackRole';
import { notice } from '@/daw/shell/notice';

// ── What the clip menu does (milestone 2.12) ───────────────────────────────
//
// Every action of the one clip menu, on a clip named by its track and id:
// the right-click menu, the Edit pill and the timeline's keys all come here
// (the keys act on the selected clip, clipCommands.ts). Each change is one
// undo step with a label that says what it did. On a track a collaborator
// holds the store would refuse the write anyway (guardTrack); an action
// says so instead of doing half of it (a cut that copied but kept the
// clip), and the menu shows those items off.

export interface ClipRef {
  trackId: string;
  clipId: string;
}

export interface FoundClip {
  track: Track;
  midi?: MidiClip;
  audio?: AudioClip;
}

/** The clip and its track, or null when either has gone. */
export function findClip(
  state: Pick<AllSlices, 'tracks'>,
  ref: ClipRef,
): FoundClip | null {
  const track = state.tracks.find((t) => t.id === ref.trackId);
  const midi = track?.midiClips.find((c) => c.id === ref.clipId);
  const audio = midi
    ? undefined
    : track?.audioClips.find((c) => c.id === ref.clipId);
  if (!track || (!midi && !audio)) return null;
  return { track, midi, audio };
}

/** The clip's song span in ticks: [start, end). */
export function clipSpan(found: FoundClip): { start: number; end: number } {
  if (found.midi) {
    return {
      start: found.midi.startTick,
      end: found.midi.startTick + midiClipLength(found.midi),
    };
  }
  const audio = found.audio!;
  return { start: audio.startTick, end: audio.startTick + audio.duration };
}

/** Drum tracks never change pitch, as transposePart leaves drums alone. */
export function isDrumTrack(
  track: Pick<Track, 'instrument' | 'name' | 'trackRole'>,
): boolean {
  return (
    track.instrument === 'drum-machine' || resolveTrackRole(track) === 'drums'
  );
}

/** A clip's name, or its track's when it has none of its own. */
export function clipTitle(found: FoundClip): string {
  const own = (found.midi ?? found.audio)?.name?.trim();
  return own || found.track.name;
}

const newClipId = (prefix: string) =>
  `clip-${prefix}-${crypto.randomUUID().slice(0, 8)}`;

/** The collaborator holding `trackId`, by name, or null while it is free. */
export function trackHolder(
  state: Pick<AllSlices, 'remoteUsers'>,
  trackId: string,
): string | null {
  if (!isTrackLockedByRemote(state.remoteUsers, trackId)) return null;
  for (const user of state.remoteUsers.values()) {
    if (user.selectedTrackId === trackId) return user.userName || 'Someone';
  }
  return 'Someone';
}

/**
 * True, having said why, when a collaborator holds the track: the action
 * changes nothing then. A key that lands here is still taken.
 */
function refusedByLock(trackId: string): boolean {
  const holder = trackHolder(useStore.getState(), trackId);
  if (holder === null) return false;
  notice({
    title: 'Track locked',
    description: `${holder} is editing this track`,
    variant: 'destructive',
  });
  return true;
}

/** Whether clip `clipId` is on `trackId` now (a refused add isn't). */
const landed = (trackId: string, clipId: string) =>
  findClip(useStore.getState(), { trackId, clipId }) !== null;

// ── Clipboard ──────────────────────────────────────────────────────────────

export function copyClip(ref: ClipRef): boolean {
  const found = findClip(useStore.getState(), ref);
  if (!found) return false;
  const state = useStore.getState();
  // One clip on the clipboard at a time: a copied MIDI clip replaces a
  // copied audio clip, which paste would otherwise prefer.
  if (found.midi) {
    state.setClipboard([structuredClone(found.midi)]);
    useStore.setState({ clipboardAudioClip: null });
  } else if (found.audio) {
    state.setAudioClipboard(structuredClone(found.audio), found.audio.id);
    state.setClipboard([]);
  }
  return true;
}

export function deleteClip(ref: ClipRef): boolean {
  const state = useStore.getState();
  const found = findClip(state, ref);
  if (!found) return false;
  if (found.midi) state.removeMidiClip(ref.trackId, ref.clipId);
  // The take's audio stays in the AudioBufferStore: undo brings the clip
  // back, and a take that was never uploaded could not play again otherwise
  // (1.10 gives the audio a lifetime).
  else state.removeAudioClip(ref.trackId, ref.clipId);
  if (useStore.getState().selectedClipId === ref.clipId) {
    state.setSelectedClip(null, null);
  }
  return true;
}

export function cutClip(ref: ClipRef): boolean {
  if (!findClip(useStore.getState(), ref)) return false;
  if (refusedByLock(ref.trackId)) return true;
  copyClip(ref);
  withTransaction('Cut clip', () => deleteClip(ref));
  return true;
}

/** Deletes the clip as one undo step ('Delete clip'). */
export function deleteClipStep(ref: ClipRef): boolean {
  if (!findClip(useStore.getState(), ref)) return false;
  if (refusedByLock(ref.trackId)) return true;
  return withTransaction('Delete clip', () => deleteClip(ref));
}

/** Says so when a clip can't go on the track it was pasted to. */
function wrongTrack(kind: 'midi' | 'audio'): void {
  notice({
    title: "Can't paste the clip there",
    description:
      kind === 'midi'
        ? 'MIDI clips go on MIDI tracks.'
        : 'Audio clips go on audio tracks.',
  });
}

export function hasClipboard(
  state: Pick<AllSlices, 'clipboardClips' | 'clipboardAudioClip'>,
): boolean {
  return state.clipboardClips.length > 0 || state.clipboardAudioClip !== null;
}

/**
 * Pastes the clipboard's clip onto `trackId` at `tick`: by default the
 * selected clip's track (or the first) at the playhead, where it is heard,
 * also while playing (the store's position is parked then). Returns false
 * when the clipboard is empty.
 */
export function pasteClipboard(
  at: { trackId?: string | null; tick?: number } = {},
): boolean {
  const state = useStore.getState();
  const { clipboardClips, clipboardAudioClip } = state;
  if (clipboardClips.length === 0 && !clipboardAudioClip) return false;
  const position = Math.max(0, Math.round(at.tick ?? getPlayheadTick()));
  const targetTrackId =
    at.trackId ?? (state.selectedClipTrackId || state.tracks[0]?.id);
  const target = state.tracks.find((t) => t.id === targetTrackId);
  if (!target) return true;
  if (refusedByLock(target.id)) return true;
  withTransaction('Paste clip', () => {
    if (clipboardAudioClip) {
      if (target.type !== 'audio') {
        wrongTrack('audio');
        return;
      }
      const id = newClipId('paste');
      if (!shareClipAudio(clipboardAudioClip.bufferId, id)) return;
      state.addAudioClip(target.id, {
        ...structuredClone(clipboardAudioClip.clip),
        id,
        startTick: position,
      });
      if (landed(target.id, id)) state.setSelectedClip(id, target.id);
      return;
    }
    if (target.type !== 'midi') {
      wrongTrack('midi');
      return;
    }
    for (const clip of clipboardClips) {
      const id = newClipId('paste');
      state.addMidiClip(target.id, {
        ...structuredClone(clip),
        id,
        startTick: position,
      });
      if (landed(target.id, id)) state.setSelectedClip(id, target.id);
    }
  });
  return true;
}

export function duplicateClip(ref: ClipRef): boolean {
  const state = useStore.getState();
  const found = findClip(state, ref);
  if (!found) return false;
  if (refusedByLock(ref.trackId)) return true;
  const id = newClipId('dup');
  withTransaction('Duplicate clip', () => {
    if (found.midi) {
      // Events are clip-relative, so the copy goes right after the clip's
      // own length, not after its song position.
      state.addMidiClip(ref.trackId, {
        ...structuredClone(found.midi),
        id,
        startTick: found.midi.startTick + midiClipLength(found.midi),
      });
    } else if (found.audio) {
      if (!shareClipAudio(found.audio.id, id)) return;
      state.addAudioClip(ref.trackId, {
        ...structuredClone(found.audio),
        id,
        startTick: found.audio.startTick + found.audio.duration,
      });
    }
    if (landed(ref.trackId, id)) state.setSelectedClip(id, ref.trackId);
  });
  return true;
}

// ── The clip itself ────────────────────────────────────────────────────────

function updateClip(
  found: FoundClip,
  updates: Partial<MidiClip> & Partial<AudioClip>,
): void {
  const state = useStore.getState();
  if (found.midi) state.updateMidiClip(found.track.id, found.midi.id, updates);
  else if (found.audio) {
    state.updateAudioClip(found.track.id, found.audio.id, updates);
  }
}

/** Asks for a new name; a blank one gives the clip its track's name again. */
export async function renameClip(ref: ClipRef): Promise<void> {
  const found = findClip(useStore.getState(), ref);
  if (!found || refusedByLock(ref.trackId)) return;
  const name = await promptDialog({
    title: 'Rename clip',
    label: 'Clip name',
    defaultValue: clipTitle(found),
    confirmLabel: 'Rename',
  });
  if (name === null) return;
  // The clip may have gone while the dialog was open.
  const now = findClip(useStore.getState(), ref);
  if (!now || refusedByLock(ref.trackId)) return;
  const trimmed = name.trim();
  const next = trimmed && trimmed !== now.track.name ? trimmed : undefined;
  if (next === (now.midi ?? now.audio)?.name) return;
  withTransaction('Rename clip', () => updateClip(now, { name: next }));
}

/** Whether the playhead is strictly inside the clip, where a split can go. */
export function playheadInside(found: FoundClip, tick: number): boolean {
  const { start, end } = clipSpan(found);
  return tick > start && tick < end;
}

/**
 * Splits the clip where the student hears the playhead, also while playing,
 * and selects the right half. False when the playhead isn't inside it.
 */
export function splitClipAtPlayhead(ref: ClipRef): boolean {
  const found = findClip(useStore.getState(), ref);
  if (!found) return false;
  if (refusedByLock(ref.trackId)) return true;
  const tick = Math.round(getPlayheadTick());
  if (!playheadInside(found, tick)) {
    notice({
      title: 'Move the playhead into the clip',
      description: 'A clip splits where the playhead is.',
    });
    return true;
  }
  // Each is null for the other kind of clip; one undo step with the chords
  // it hands to the right half.
  const rightId = withTransaction(
    'Split clip',
    () =>
      splitMidiClipAt(ref.trackId, ref.clipId, tick) ??
      splitAudioClipAt(ref.trackId, ref.clipId, tick),
  );
  if (rightId) useStore.getState().setSelectedClip(rightId, ref.trackId);
  return true;
}

/** Mutes or unmutes the clip: a muted clip stays put but plays nothing. */
export function toggleClipMute(ref: ClipRef): boolean {
  const found = findClip(useStore.getState(), ref);
  if (!found) return false;
  if (refusedByLock(ref.trackId)) return true;
  const muted = !(found.midi ?? found.audio)?.muted;
  withTransaction(muted ? 'Mute clip' : 'Unmute clip', () =>
    updateClip(found, { muted: muted || undefined }),
  );
  return true;
}

/**
 * Writes a clip's notes moved one for one (`next[i]` is `before[i]` moved),
 * as one undo step: the Score's marks on them (articulations, slurs, pinned
 * spellings, slash notes) follow, keyed as they are by where each note sits,
 * or they would point at nothing and the next save would drop them.
 */
function moveClipNotes(
  ref: ClipRef,
  before: readonly MidiNoteEvent[],
  next: MidiNoteEvent[],
  label: string,
): void {
  const renamed = new Map<string, string>();
  before.forEach((event, i) => {
    const from = noteKey(ref.trackId, ref.clipId, event.startTick, event.note);
    const to = noteKey(
      ref.trackId,
      ref.clipId,
      next[i].startTick,
      next[i].note,
    );
    if (from !== to) renamed.set(from, to);
  });
  withTransaction(label, () => {
    const state = useStore.getState();
    state.updateMidiClipEvents(ref.trackId, ref.clipId, next);
    if (renamed.size === 0) return;
    const marks = {
      articulations: state.scoreArticulations,
      slurs: state.scoreSlurs,
      spellings: state.scoreSpellings,
      slashNotes: state.scoreSlashNotes,
    };
    const moved = followNoteEdit(marks, { renamed, removed: new Set() });
    if (moved.articulations !== marks.articulations) {
      state.setScoreArticulations(moved.articulations);
    }
    if (moved.slurs !== marks.slurs) state.setScoreSlurs(moved.slurs);
    if (moved.spellings !== marks.spellings) {
      state.setScoreSpellings(moved.spellings);
    }
    if (moved.slashNotes !== marks.slashNotes) {
      state.setScoreSlashNotes(moved.slashNotes);
    }
  });
}

/**
 * Moves a MIDI clip's notes by `semitones`. Drums never move. A move that
 * would push a note off the 0–127 keyboard is refused, so the clip keeps
 * its shape. Returns whether the notes moved.
 */
export function transposeClip(ref: ClipRef, semitones: number): boolean {
  const found = findClip(useStore.getState(), ref);
  if (!found?.midi || semitones === 0 || isDrumTrack(found.track)) {
    return false;
  }
  if (refusedByLock(ref.trackId)) return false;
  const { events } = found.midi;
  if (events.length === 0) return false;
  const notes = events.map((e) => e.note);
  const low = Math.min(...notes) + semitones;
  const high = Math.max(...notes) + semitones;
  if (low < 0 || high > 127) {
    notice({
      title: 'Too far to move',
      description: 'Some notes would go off the end of the keyboard.',
    });
    return false;
  }
  moveClipNotes(
    ref,
    events,
    events.map((e) => ({ ...e, note: e.note + semitones })),
    'Transpose clip',
  );
  return true;
}

/** The grids Quantize offers, after the timeline's own. */
export const QUANTIZE_GRIDS: readonly { size: AllGridSize; label: string }[] = [
  { size: '1/4', label: '1/4 notes' },
  { size: '1/8', label: '1/8 notes' },
  { size: '1/16', label: '1/16 notes' },
  { size: '1/32', label: '1/32 notes' },
  { size: '1/8T', label: '1/8 triplets' },
  { size: '1/16T', label: '1/16 triplets' },
];

/**
 * Moves each note's start to the nearest line of `grid`, in the project's
 * metre and counted from the bar lines, as the timeline snaps: in song time,
 * so a clip that starts off the grid still lands its notes on it.
 */
export function quantizeClip(ref: ClipRef, grid: AllGridSize): boolean {
  const state = useStore.getState();
  const found = findClip(state, ref);
  if (!found?.midi || found.midi.events.length === 0) return false;
  if (refusedByLock(ref.trackId)) return true;
  const ts = timeSignatureOf(state);
  const step = gridStepTicks(grid, ts);
  const snapped = quantizeEvents(
    found.midi.events,
    (tick) => snapTicks(tick, { enabled: true, step, ts }),
    found.midi.startTick,
  );
  moveClipNotes(ref, found.midi.events, snapped, 'Quantize clip');
  return true;
}

/** One beat: the length Fade in and Fade out give a clip without one. */
const DEFAULT_FADE_TICKS = 480;

/**
 * Sets a fade's length on an audio clip, kept within the clip and clear of
 * the other fade. 0 removes it.
 */
export function setClipFade(
  ref: ClipRef,
  edge: 'in' | 'out',
  ticks: number,
): boolean {
  const found = findClip(useStore.getState(), ref);
  if (!found?.audio) return false;
  if (refusedByLock(ref.trackId)) return true;
  const other =
    edge === 'in' ? found.audio.fadeOutTicks : found.audio.fadeInTicks;
  const room = Math.max(0, found.audio.duration - other);
  const next = Math.max(0, Math.min(room, Math.round(ticks)));
  const field = edge === 'in' ? 'fadeInTicks' : 'fadeOutTicks';
  if (found.audio[field] === next) return false;
  withTransaction(edge === 'in' ? 'Fade in' : 'Fade out', () =>
    updateClip(found, { [field]: next }),
  );
  return true;
}

/** Fade in or Fade out from the menu: on at a beat, or off. */
export function toggleClipFade(ref: ClipRef, edge: 'in' | 'out'): boolean {
  const found = findClip(useStore.getState(), ref);
  if (!found?.audio) return false;
  const now =
    edge === 'in' ? found.audio.fadeInTicks : found.audio.fadeOutTicks;
  return setClipFade(ref, edge, now > 0 ? 0 : DEFAULT_FADE_TICKS);
}

// ── An empty lane ──────────────────────────────────────────────────────────

/**
 * Makes a one-bar MIDI clip on `trackId` from the grid line at or before
 * `tick` (the Draw tool's clip) and opens it in the dock's Notes. Returns
 * its id, or null on a track that isn't MIDI.
 */
export function createClipAt(trackId: string, tick: number): string | null {
  const state = useStore.getState();
  const track = state.tracks.find((t) => t.id === trackId);
  if (!track || track.type !== 'midi') return null;
  if (refusedByLock(trackId)) return null;
  const grid = timelineSnapGrid(state);
  const barStart = barStartTick(tick, grid.ts);
  const startTick = grid.enabled
    ? barStart + Math.floor((tick - barStart) / grid.step) * grid.step
    : Math.max(0, Math.round(tick));
  const id = newClipId('draw');
  withTransaction('Draw clip', () =>
    state.addMidiClip(track.id, {
      id,
      name: track.name,
      startTick,
      durationTicks: ticksPerBar(grid.ts),
      events: [],
    }),
  );
  if (!findClip(useStore.getState(), { trackId, clipId: id })) return null;
  state.setSelectedTrackId(track.id);
  state.setSelectedClip(id, track.id);
  // Notes: the drum grid on drums, the piano roll on the rest (2.9).
  state.setChannelStripTab('piano-roll');
  return id;
}
