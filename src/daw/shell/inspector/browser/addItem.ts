/**
 * addItem.ts — what + and a drop do with a Library item (milestone 2.14).
 *
 * + makes a new track holding the item at bar 1, as Soundtrap's "Add new
 * track" does: named after it, on its sound, with its role. A part or a
 * groove comes as one clip; a kit or a sound is the new track's instrument.
 * A drop does the same at the bar it lands on, and a part dropped on a
 * melodic track's lane (a groove on a drum lane) goes onto that track,
 * keeping the track's sound. A template opens as a new project instead.
 *
 * The song's key and tempo hold:
 * - A part moves into the song's key (partInSong). A song with no key and
 *   no notes takes the first part's key, as 1.16a's rule says (29-D SD8).
 * - A groove at another tempo asks first (Change to N BPM · Add anyway ·
 *   Cancel), as the dock's Grooves tab did; a part plays at the song's.
 * Each add is one undo step, the tempo change included, and adds nothing at
 * the track limit (and changes no key or tempo then). What loads first (a
 * groove's notes, a SERUM patch) is dropped if the session changed meanwhile.
 */

import { notice } from '@/daw/shell/notice';
import { partTicks } from '@/curriculum/engine/parts/part';
import { patternTicks } from '@/curriculum/engine/drumGrooves/drumGroove';
import { loadLiveGroove } from '@/curriculum/engine/drumGrooves/registry';
import { shortKeyLabel } from '@/daw/harmony/clipKey';
import { soundSettings } from '@/daw/instruments/trackSound';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import type { PresetData } from '@/daw/oracle-synth/store/presets/PresetData';
import {
  setTrackSynthState,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import { openSession } from '@/daw/session/openSession';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { trackHolder } from '@/daw/shell/canvas/clipMenu/clipActions';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import {
  getTrackLimitMessage,
  type InstrumentType,
  type MidiClip,
  type Track,
  type TrackInit,
} from '@/daw/store/tracksSlice';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import type { DropTarget } from '@/daw/shell/canvas/libraryDrop';
import { useBrowserStore } from './browserStore';
import type { BrowserItem } from './items';
import { presetData } from './presetData';
import { moveForSong, preparedEvents } from './partInSong';
import { stopPreview } from './preview';
import { songContextOf } from './songFit';

const BAR_ONE: DropTarget = { trackId: null, tick: 0 };

// ── Templates ─────────────────────────────────────────────────────────────

/**
 * Opens a template in place of the project, as the dashboard's tile does
 * (decision D10), through openSession: the work it replaces is kept with a
 * Restore, and the template is a new project. Never in a shared session (E15),
 * where it would replace the room's project for everyone.
 */
export function openTemplate(templateId: string): void {
  if (useStore.getState().roomId !== null) return;
  void openSession({ kind: 'template', templateId }, { source: 'library' });
}

// ── What an item makes ────────────────────────────────────────────────────

const isDrumLane = (t: Track) => t.instrument === 'drum-machine';

/** Whether `item` can go onto `track`'s lane (else it makes a track). */
export function fitsLane(item: BrowserItem, track: Track): boolean {
  if (track.type !== 'midi') return false;
  if (item.type === 'part') return !isDrumLane(track);
  if (item.type === 'groove') return isDrumLane(track);
  return false;
}

interface Made {
  instrument: InstrumentType;
  init: TrackInit;
  synthPatch?: PresetData;
}

/** The new track an item makes: its instrument, sound and role. */
function trackFor(item: BrowserItem, synthPatch?: PresetData): Made {
  switch (item.type) {
    case 'part': {
      const made = soundSettings(item.sound);
      const { instrument, bassVoice, gmProgram, presetName } = made.settings;
      return {
        // A part's sound as a Studio track (trackSound): an Instruments
        // track when the sound isn't a track type of its own.
        instrument: instrument ?? 'soundfont',
        init: {
          bassVoice,
          gmProgram,
          presetName,
          drumKit: made.drumKit,
          trackRole: item.trackRole,
        },
        synthPatch: made.synthPatch,
      };
    }
    case 'groove':
      return {
        instrument: 'drum-machine',
        init: { drumKit: item.kit, trackRole: 'drums' },
      };
    case 'kit':
      return {
        instrument: 'drum-machine',
        init: { drumKit: item.kitId, trackRole: 'drums' },
      };
    case 'preset':
      return item.instrumentType === 'oracle-synth'
        ? {
            instrument: 'oracle-synth',
            init: { presetName: item.presetName, trackRole: item.trackRole },
            synthPatch,
          }
        : {
            instrument: item.instrumentType,
            init: {
              gmProgram: item.gmProgram,
              presetName: item.presetName,
              trackRole: item.trackRole,
            },
          };
    case 'template':
      throw new Error('A template opens; it makes no track');
  }
}

/** Undefined values left out, so a track's defaults stand. */
const defined = (init: TrackInit): TrackInit =>
  Object.fromEntries(
    Object.entries(init).filter(([, v]) => v !== undefined),
  ) as TrackInit;

/** The dock tab an add shows: the notes it made, else the instrument. */
const tabFor = (item: BrowserItem): ChannelStripTabId =>
  item.type === 'part' || item.type === 'groove' ? 'piano-roll' : 'controls';

// ── Refusals ──────────────────────────────────────────────────────────────

function refusedAtLimit(): boolean {
  const message = getTrackLimitMessage(useStore.getState().tracks, 'midi');
  if (!message) return false;
  notice({
    title: 'Track limit reached',
    description: message,
    variant: 'destructive',
  });
  return true;
}

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

// ── + and drops ───────────────────────────────────────────────────────────

/**
 * Adds `item` to the song: on a new track at bar 1 (+), or where it was
 * dropped. Resolves to whether anything was added (a groove whose tempo
 * differs resolves once the student has answered).
 */
export async function addItem(
  item: BrowserItem,
  target: DropTarget = BAR_ONE,
): Promise<boolean> {
  if (item.type === 'template') {
    openTemplate(item.templateId);
    return false;
  }
  stopPreview();
  const lane =
    target.trackId === null
      ? null
      : (useStore.getState().tracks.find((t) => t.id === target.trackId) ??
        null);
  const onto = lane && fitsLane(item, lane) ? lane : null;
  if (onto ? refusedByLock(onto.id) : refusedAtLimit()) return false;

  const generation = getSessionGeneration();
  const busy = useBrowserStore.getState().setAdding;
  busy(item.id, true);
  let events: MidiClip['events'] | null = null;
  let durationTicks: number | undefined;
  let synthPatch: PresetData | undefined;
  // What is added: a groove as the designed groove that plays it (its tempo
  // and kit), even when the row was listed before that loaded.
  let adding: Exclude<BrowserItem, { type: 'template' }> = item;
  try {
    if (item.type === 'groove') {
      events = await loadGrooveEvents(item.grooveId);
      const designed = await loadLiveGroove(item.grooveId);
      durationTicks = designed ? patternTicks(designed) : undefined;
      if (designed) {
        adding = { ...item, bpm: designed.tempo, kit: designed.kit };
      }
      if (!events) {
        notice({
          title: 'That groove didn’t load',
          description: 'Check the connection and try again.',
          variant: 'destructive',
        });
        return false;
      }
    } else if (
      item.type === 'preset' &&
      item.instrumentType === 'oracle-synth'
    ) {
      synthPatch = await presetData(item);
      if (!synthPatch) {
        notice({
          title: 'That sound didn’t load',
          description: 'Check the connection and try again.',
          variant: 'destructive',
        });
        return false;
      }
    }
  } finally {
    busy(item.id, false);
  }
  // A session opened meanwhile isn't the one the student added to.
  if (getSessionGeneration() !== generation) return false;

  // Checked again at the answer: the question may have waited through an
  // open of another project.
  const commit = (changeTempo: boolean) =>
    getSessionGeneration() === generation &&
    commitAdd(
      adding,
      target,
      onto,
      { events, durationTicks, synthPatch },
      changeTempo,
    );

  const songBpm = useStore.getState().bpm;
  if (
    adding.type === 'groove' &&
    adding.bpm !== null &&
    adding.bpm !== songBpm
  ) {
    const itemBpm = adding.bpm;
    return new Promise<boolean>((resolve) => {
      useBrowserStore.getState().ask({
        itemId: item.id,
        name: item.name,
        itemBpm,
        songBpm,
        answer: (changeTempo) =>
          resolve(changeTempo === null ? false : commit(changeTempo)),
      });
    });
  }
  return commit(false);
}

interface Loaded {
  events: MidiClip['events'] | null;
  durationTicks?: number;
  synthPatch?: PresetData;
}

function commitAdd(
  item: Exclude<BrowserItem, { type: 'template' }>,
  target: DropTarget,
  dropLane: Track | null,
  loaded: Loaded,
  changeTempo: boolean,
): boolean {
  // The lane as it is now: the question may have waited while the track
  // was deleted or changed, and then the item makes a track of its own.
  const now = dropLane
    ? useStore.getState().tracks.find((t) => t.id === dropLane.id)
    : undefined;
  const onto = now && fitsLane(item, now) ? now : null;
  // Checked again: the question may have waited while tracks were added.
  if (onto ? refusedByLock(onto.id) : refusedAtLimit()) return false;
  let keyFilled: string | null = null;
  const added = withTransaction(`Add ${item.name}`, () => {
    const s = useStore.getState();
    if (changeTempo && item.bpm !== null) s.setBpm(item.bpm);

    let clip: MidiClip | null = null;
    const clipId = `clip-lib-${crypto.randomUUID().slice(0, 8)}`;
    if (item.type === 'part') {
      const ctx = songContextOf(s);
      if (!ctx.key) {
        // The song's first key: the part's own (1.16a). A lock left on with
        // no key (an undone key change) would refuse it.
        if (s.rootLocked) s.toggleRootLock();
        s.setMode(item.key.mode);
        s.setRootNote(item.key.tonic);
        if (useStore.getState().rootNote === item.key.tonic) {
          keyFilled = shortKeyLabel(item.key.tonic, item.key.mode);
        }
      }
      const move = moveForSong(item.part, ctx.key);
      clip = {
        id: clipId,
        name: item.name,
        startTick: target.tick,
        durationTicks: partTicks(item.part),
        events: preparedEvents(item.part, move.shift),
      };
    } else if (item.type === 'groove' && loaded.events) {
      clip = {
        id: clipId,
        name: item.name,
        startTick: target.tick,
        durationTicks: loaded.durationTicks,
        events: loaded.events,
      };
    }

    let trackId: string;
    if (onto) {
      trackId = onto.id;
      s.setSelectedTrackId(trackId);
    } else {
      const made = trackFor(item, loaded.synthPatch);
      trackId = s.addTrack(
        'midi',
        made.instrument,
        item.name,
        defined(made.init),
      );
      if (!trackId) return false;
      if (made.synthPatch) {
        // Seeded before the instrument finishes loading, which applies it.
        setTrackSynthState(
          trackId,
          synthTrackStateFromPreset(made.synthPatch, useStore.getState().bpm),
        );
      }
    }
    if (clip) {
      useStore.getState().addMidiClip(trackId, clip);
      useStore.getState().setSelectedClip(clip.id, trackId);
    }
    const now = useStore.getState();
    if (now.activeTutorialId === null) now.setChannelStripTab(tabFor(item));
    return true;
  });
  if (added && keyFilled) {
    notice({
      title: `Your song is now in ${keyFilled}`,
      description: `${item.name} set the song's key: it had none.`,
    });
  }
  return added;
}

/** + on a row: a new track holding the item at bar 1. */
export const addItemAsTrack = (item: BrowserItem) => addItem(item, BAR_ONE);

/**
 * A Library row dropped on the timeline (libraryDrop.ts): the row last
 * dragged, if it is the one the drop names.
 */
export function dropLibraryItem(
  itemId: string,
  target: DropTarget,
): Promise<boolean> {
  const item = useBrowserStore.getState().dragged;
  if (!item || item.id !== itemId) return Promise.resolve(false);
  return addItem(item, target);
}
