import type { StateCreator } from 'zustand';
import type { MidiNoteEvent, MidiCCEvent } from '@prism/engine';
import type { AllSlices } from './index';
import { genreSettings } from './genreSettings';
import { isTrackLockedByRemote } from './trackLock';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import { getBridge } from '@/daw/collab/collabMiddleware';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import { withNoteIds } from '@/daw/model/noteIds';
import { initialProjectState } from '@/daw/persistence/projectDocument/projectDefaults';
import { initialTrackDefaults } from '@/daw/persistence/projectDocument/trackDefaults';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import type { DawTrackRole } from '@/daw/utils/trackRole';
import type { DrumKitId } from '@/daw/instruments/drumKits';
import {
  insertPoint,
  removePoint,
  type AutomationPoint,
  type AutomationLanes,
} from '@/daw/audio/automation';
import type { SamplerSampleRef } from '@/daw/instruments/samplerChops';
import type { OrganState } from '@/daw/instruments/TonewheelOrganEngine';
import { toast } from '@/hooks/use-toast';

// The store's index creates this slice as it loads, so nothing imported
// here may load the store: not '@/daw/store' and not initialState.ts, which
// does. A new project's state and a new track's defaults come from
// projectDefaults.ts and trackDefaults.ts, which never load it; see there
// for what goes wrong otherwise.

// ── Track limits ────────────────────────────────────────────────────────

/** Maximum number of audio tracks allowed in a single project. */
export const MAX_AUDIO_TRACKS = 6;
/** Maximum number of tracks (audio + midi) allowed in a single project. */
export const MAX_TOTAL_TRACKS = 10;

/**
 * Returns a human-readable message explaining why a track of `type` cannot be
 * added to `tracks`, or `null` if it is within the limits. The midi cap is
 * implicit: with at most {@link MAX_TOTAL_TRACKS} total tracks, the number of
 * midi tracks can never exceed `MAX_TOTAL_TRACKS - audioCount`.
 */
export function getTrackLimitMessage(
  tracks: { type: TrackType }[],
  type: TrackType,
): string | null {
  if (tracks.length >= MAX_TOTAL_TRACKS) {
    return `You've reached the maximum of ${MAX_TOTAL_TRACKS} tracks per project.`;
  }
  if (type === 'audio') {
    const audioCount = tracks.filter((t) => t.type === 'audio').length;
    if (audioCount >= MAX_AUDIO_TRACKS) {
      return `You've reached the maximum of ${MAX_AUDIO_TRACKS} audio tracks per project.`;
    }
  }
  return null;
}

// ── Collab track lock ───────────────────────────────────────────────────
// The rule itself is in trackLock.ts, so prismSlice can share it without
// loading this slice; it is still exported from here.

export { isTrackLockedByRemote };

/**
 * Wrap a track-scoped Zustand set-updater so it becomes a no-op when the track
 * is locked by a remote collaborator.
 */
function guardTrack(
  trackId: string,
  updater: (state: AllSlices) => Partial<AllSlices>,
): (state: AllSlices) => Partial<AllSlices> {
  return (state) =>
    isTrackLockedByRemote(state.remoteUsers, trackId) ? state : updater(state);
}

// ── Types ───────────────────────────────────────────────────────────────

export type TrackType = 'midi' | 'audio';

export type InstrumentType =
  | 'oracle-synth'
  | 'piano-sampler'
  | 'electric-piano'
  | 'bass-electric'
  | 'cello'
  | 'organ'
  | 'tonewheel-organ'
  | 'soundfont'
  | 'drum-machine'
  | 'sampler'
  | 'guitar-fx'
  | 'bass-fx'
  | 'vocal-fx'
  | 'none';

export type StudioBassVoice = 'fretless' | 'finger' | 'upright' | '808';

export type AudioInputChannel =
  | { mode: 'mono'; channel: number }
  | { mode: 'stereo'; left: number; right: number };

/**
 * Guitar/Bass-to-MIDI binding on a MIDI (synth) track: turns a live guitar or
 * bass audio track into a MIDI controller that drives this track's instrument.
 * Session-only (deliberately not persisted/synced — it references a sibling
 * track by id and is a local monitoring preference).
 */
export interface AudioMidiSource {
  enabled: boolean;
  /** Source guitar-fx/bass-fx track id, or null to auto-pick the first one. */
  sourceTrackId: string | null;
  mode: 'mono' | 'poly';
}

export interface MidiClip {
  id: string;
  name?: string;
  startTick: number;
  durationTicks?: number;
  events: MidiNoteEvent[];
  ccEvents?: MidiCCEvent[];
}

/** Audio clip metadata (no AudioBuffer — not serializable). */
export interface AudioClip {
  id: string;
  startTick: number;
  duration: number; // ticks (PPQ=480)
  fadeInTicks: number; // 0 = no fade
  fadeOutTicks: number; // 0 = no fade
  /**
   * GCS-backed asset id. Null while the clip is ephemeral (just recorded /
   * imported / generated, bytes not yet uploaded). Becomes a real id after
   * the upload-and-finalize flow. Cloud save skips clips with assetId=null.
   */
  assetId?: string | null;
  /** Start offset into the underlying asset, in seconds (for trimming). */
  offsetSeconds?: number;
  /** Per-clip gain multiplier; defaults to 1 (no change). */
  gain?: number;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  instrument: InstrumentType;
  gmProgram?: number; // GM program number for SoundFont tracks (0-127)
  color: string;
  mute: boolean;
  solo: boolean;
  volume: number; // 0 – 1
  pan: number; // -1 (L) .. 1 (R)
  recordArmed: boolean;
  monitoring: boolean;
  midiInputId: string | null;
  audioInputId: string | null;
  audioInputChannel: AudioInputChannel | null;
  /** Guitar/Bass-to-MIDI binding (MIDI tracks only). Session-only. */
  audioMidiSource?: AudioMidiSource;
  effects: TrackEffectState;
  activeEffects: EffectSlotType[];
  midiClips: MidiClip[];
  audioClips: AudioClip[];
  /** Persisted vocal pedal chain config (survives VocalView unmount). */
  vocalChain?: {
    type: string;
    enabled: boolean;
    params: Record<string, number>;
  }[];
  /** Persisted guitar/bass pedal chain config (survives GuitarBassView unmount). */
  guitarChain?: {
    type: string;
    enabled: boolean;
    params: Record<string, number>;
    namModelId?: string | null;
  }[];
  /** Per-pad volume/pan for drum-machine tracks, keyed by MIDI note. */
  drumPads?: Record<number, { volume: number; pan: number }>;
  /** Selected drum kit for drum-machine tracks ('natural' when unset). */
  drumKit?: DrumKitId;
  /**
   * The bass sound on a bass-electric track: a lesson bass voice or the 808;
   * the sampled electric bass when unset. Set when a Practice Track carries
   * its lesson's bass into the Studio.
   */
  bassVoice?: StudioBassVoice;
  /** Loaded one-shot for 'sampler' (Chops) tracks; unset until a sample lands. */
  samplerSample?: SamplerSampleRef;
  /** Tonewheel organ settings (drawbars, Leslie, percussion, …) for
   *  'tonewheel-organ' tracks; the engine's defaults when unset. */
  organState?: OrganState;
  /** The keyboard preset name shown on piano/keys tracks (display only — the
   *  sound itself is `instrument` + `gmProgram`). */
  presetName?: string;
  /** Post-fader aux send levels keyed by return bus id (0–1); absent = 0. */
  sends?: Record<string, number>;
  /** Parameter-automation lanes keyed by paramId (volume/pan/send.X/effect.*).
   *  Each lane is a tick-sorted breakpoint list; absent until the first point. */
  automation?: AutomationLanes;
  /** Harmonic role for chord detection (auto = infer from name/instrument). */
  trackRole: DawTrackRole;
}

// ── Note ids ────────────────────────────────────────────────────────────
// Every note in the store has an id of its own (model/noteIds.ts). The
// actions that write notes make sure of it, so a note made anywhere (drawn,
// recorded, imported, generated, pasted) has one by the time it lands.
//
// An edit to a clip's notes (updateMidiClipEvents, updateMidiClip) only
// fills in missing ids and splits a repeat within the clip, so a piano-roll
// drag, which writes on every frame, stays cheap: it hands back the same
// array, allocating nothing, when the notes have their ids already. It never
// scans the other clips, so a caller that copies notes into another clip
// gives the copies new ids itself (as the Score's paste does) or adds them
// as a clip.
//
// A write that brings clips in (addMidiClip, updateTrack's midiClips) makes
// their ids unique across the project, so a duplicated or pasted clip,
// whose notes are copies, gets ids of its own.

/** Every note id held by the project's tracks, but those of `skipTrackId`. */
function projectNoteIds(
  tracks: readonly Track[],
  skipTrackId?: string,
): Set<string> {
  const ids = new Set<string>();
  for (const track of tracks) {
    if (track.id === skipTrackId) continue;
    for (const clip of track.midiClips) {
      for (const event of clip.events) {
        if (event.id !== undefined) ids.add(event.id);
      }
    }
  }
  return ids;
}

/**
 * `clip` with an id on every note that none of `taken` has (`taken` gains
 * them): the same object when its notes have such ids already.
 */
function clipWithNoteIds(clip: MidiClip, taken?: Set<string>): MidiClip {
  const events = withNoteIds(clip.events, taken);
  return events === clip.events ? clip : { ...clip, events };
}

/** clipWithNoteIds over `clips`: the same array when every clip is whole. */
function clipsWithNoteIds(clips: MidiClip[], taken: Set<string>): MidiClip[] {
  let out: MidiClip[] | null = null;
  clips.forEach((clip, i) => {
    const whole = clipWithNoteIds(clip, taken);
    if (whole === clip) return;
    out ??= clips.slice();
    out[i] = whole;
  });
  return out ?? clips;
}

// ── Slice ───────────────────────────────────────────────────────────────

export interface TracksSlice {
  tracks: Track[];
  nextColorIndex: number;

  /**
   * Adds a track and returns its id, or returns `''` (and shows a toast)
   * without creating anything when a project track limit would be exceeded.
   * @see getTrackLimitMessage
   */
  addTrack: (
    type: TrackType,
    instrument: InstrumentType,
    name: string,
    color?: string,
  ) => string;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  toggleRecordArm: (id: string) => void;
  toggleMonitoring: (id: string) => void;
  addMidiClip: (trackId: string, clip: MidiClip) => void;
  removeMidiClip: (trackId: string, clipId: string) => void;
  updateMidiClip: (
    trackId: string,
    clipId: string,
    updates: Partial<MidiClip>,
  ) => void;
  updateMidiClipEvents: (
    trackId: string,
    clipId: string,
    events: MidiNoteEvent[],
  ) => void;
  updateTrackEffects: (
    trackId: string,
    effects: Partial<TrackEffectState>,
  ) => void;
  addAudioClip: (trackId: string, clip: AudioClip) => void;
  removeAudioClip: (trackId: string, clipId: string) => void;
  updateAudioClip: (
    trackId: string,
    clipId: string,
    updates: Partial<AudioClip>,
  ) => void;
  reorderTrack: (id: string, newIndex: number) => void;
  addActiveEffect: (trackId: string, effectType: EffectSlotType) => void;
  removeActiveEffect: (trackId: string, effectType: EffectSlotType) => void;
  setVocalChain: (
    trackId: string,
    chain: { type: string; enabled: boolean; params: Record<string, number> }[],
  ) => void;
  setGuitarChain: (
    trackId: string,
    chain: {
      type: string;
      enabled: boolean;
      params: Record<string, number>;
      namModelId?: string | null;
    }[],
  ) => void;
  updateDrumPad: (
    trackId: string,
    note: number,
    params: { volume?: number; pan?: number },
  ) => void;
  setDrumKit: (trackId: string, kitId: DrumKitId) => void;
  setSamplerSample: (
    trackId: string,
    sample: SamplerSampleRef | undefined,
  ) => void;
  setSend: (trackId: string, returnId: string, level: number) => void;
  // ── Parameter automation (Phase 7) ──
  /** Insert or replace a breakpoint at its tick on a param lane (keeps sorted). */
  upsertAutomationPoint: (
    trackId: string,
    paramId: string,
    point: AutomationPoint,
  ) => void;
  /** Remove the breakpoint at exactly `tick` from a param lane (drops the lane
   *  entirely when it becomes empty). */
  removeAutomationPoint: (
    trackId: string,
    paramId: string,
    tick: number,
  ) => void;
  /** Remove a whole param lane. */
  clearAutomationLane: (trackId: string, paramId: string) => void;
  /**
   * Open a project template in place of the project: a load, so everything
   * the last project held starts over, the template going in as one store
   * write. An unknown id changes nothing.
   *
   * The rest of a load is the caller's: open it through seedTemplate
   * (session/linkSeeds.ts) inside replaceSession, which keeps the outgoing
   * work first and, once the template is in, resets the undo history and
   * marks the save-status baseline. The slice can do neither itself, since
   * undoMiddleware and saveStatusStore load the store; without them Cmd+Z
   * would bring the last project's tracks back into the template.
   *
   * Throws, changing nothing, while a collab room is connected (see the
   * action). Refusing in a room, and while a take is recording, is the
   * caller's first: the Library panel does both.
   */
  loadProjectTemplate: (templateId: string) => void;
}

export const createTracksSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  TracksSlice
> = (set, get, api) => ({
  // ── State ── (blank project by default)
  tracks: [],
  nextColorIndex: 0,

  // ── Actions ──
  addTrack: (type, instrument, name) => {
    // Enforce per-project track limits. Returns '' (no track created) and
    // notifies the user when adding would exceed a cap, so every creation
    // path — menus, Cmd+N, drag-drop, file import — is covered.
    const limitMessage = getTrackLimitMessage(get().tracks, type);
    if (limitMessage) {
      toast({
        title: 'Track limit reached',
        description: limitMessage,
        variant: 'destructive',
      });
      return '';
    }
    const id = crypto.randomUUID();
    let assignedColor = '';
    set((state) => {
      assignedColor =
        TRACK_PALETTES[state.nextColorIndex % TRACK_PALETTES.length];
      return { nextColorIndex: state.nextColorIndex + 1 };
    });
    const rootColor = get().rootTrackColor;
    if (rootColor) {
      assignedColor = rootColor;
    }
    // The registry's new-track defaults; the caller's type stands, since an
    // imported audio file makes an audio track with no instrument.
    const track: Track = {
      id,
      ...initialTrackDefaults(instrument, name),
      type,
      color: assignedColor,
    };
    set((state) => ({
      tracks: [...state.tracks, track],
      selectedTrackId: id,
    }));
    return id;
  },

  removeTrack: (id) =>
    set(
      guardTrack(id, (state) => ({
        tracks: state.tracks.filter((t) => t.id !== id),
      })),
    ),

  updateTrack: (id, updates) =>
    set(
      guardTrack(id, (state) => {
        // New clips for the track (the scissors write both halves this way)
        // come in like added ones: whole ids, unique across the project.
        const next = updates.midiClips
          ? {
              ...updates,
              midiClips: clipsWithNoteIds(
                updates.midiClips,
                projectNoteIds(state.tracks, id),
              ),
            }
          : updates;
        return {
          tracks: state.tracks.map((t) =>
            t.id === id ? { ...t, ...next } : t,
          ),
        };
      }),
    ),

  // mute/solo are per-user-local (excluded from collab sync — see
  // diffEngine.ts) so they stay editable even when a remote collaborator has
  // locked the track. They never propagate to peers, so toggling them can't
  // clobber the lock owner's state. Other track edits remain guarded.
  toggleMute: (id) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, mute: !t.mute } : t,
      ),
    })),

  toggleSolo: (id) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === id ? { ...t, solo: !t.solo } : t,
      ),
    })),

  toggleRecordArm: (id) =>
    set(
      guardTrack(id, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === id ? { ...t, recordArmed: !t.recordArmed } : t,
        ),
      })),
    ),

  toggleMonitoring: (id) =>
    set(
      guardTrack(id, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === id ? { ...t, monitoring: !t.monitoring } : t,
        ),
      })),
    ),

  addMidiClip: (trackId, clip) =>
    set(
      guardTrack(trackId, (state) => {
        // A copy of a clip in the project (duplicate, paste) brings its
        // notes' ids along: those get new ones.
        const added = clipWithNoteIds(clip, projectNoteIds(state.tracks));
        return {
          tracks: state.tracks.map((t) =>
            t.id === trackId ? { ...t, midiClips: [...t.midiClips, added] } : t,
          ),
        };
      }),
    ),

  removeMidiClip: (trackId, clipId) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? { ...t, midiClips: t.midiClips.filter((c) => c.id !== clipId) }
            : t,
        ),
      })),
    ),

  updateMidiClip: (trackId, clipId, updates) =>
    set(
      guardTrack(trackId, (state) => {
        // A trim rewrites the clip's notes: an edit, so ids are only made
        // whole within the clip.
        const next = updates.events
          ? { ...updates, events: withNoteIds(updates.events) }
          : updates;
        return {
          tracks: state.tracks.map((t) =>
            t.id === trackId
              ? {
                  ...t,
                  midiClips: t.midiClips.map((c) =>
                    c.id === clipId ? { ...c, ...next } : c,
                  ),
                }
              : t,
          ),
        };
      }),
    ),

  // The piano roll calls this on every drag frame: withNoteIds hands the
  // same array back, allocating nothing, while every note has its id.
  updateMidiClipEvents: (trackId, clipId, events) =>
    set(
      guardTrack(trackId, (state) => {
        const whole = withNoteIds(events);
        return {
          tracks: state.tracks.map((t) =>
            t.id === trackId
              ? {
                  ...t,
                  midiClips: t.midiClips.map((c) =>
                    c.id === clipId ? { ...c, events: whole } : c,
                  ),
                }
              : t,
          ),
        };
      }),
    ),

  updateTrackEffects: (trackId, effects) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? { ...t, effects: { ...t.effects, ...effects } }
            : t,
        ),
      })),
    ),

  addAudioClip: (trackId, clip) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, audioClips: [...t.audioClips, clip] } : t,
        ),
      })),
    ),

  removeAudioClip: (trackId, clipId) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? { ...t, audioClips: t.audioClips.filter((c) => c.id !== clipId) }
            : t,
        ),
      })),
    ),

  updateAudioClip: (trackId, clipId, updates) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                audioClips: t.audioClips.map((c) =>
                  c.id === clipId ? { ...c, ...updates } : c,
                ),
              }
            : t,
        ),
      })),
    ),

  reorderTrack: (id, newIndex) =>
    set((state) => {
      const idx = state.tracks.findIndex((t) => t.id === id);
      if (idx === -1 || idx === newIndex) return state;
      const updated = [...state.tracks];
      const [removed] = updated.splice(idx, 1);
      updated.splice(newIndex, 0, removed);
      return { tracks: updated };
    }),

  addActiveEffect: (trackId, effectType) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) => {
          if (t.id !== trackId || t.activeEffects.includes(effectType))
            return t;
          return {
            ...t,
            activeEffects: [...t.activeEffects, effectType],
            effects: {
              ...t.effects,
              [effectType]: { ...t.effects[effectType], enabled: true },
            },
          };
        }),
      })),
    ),

  removeActiveEffect: (trackId, effectType) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            activeEffects: t.activeEffects.filter((e) => e !== effectType),
            effects: {
              ...t.effects,
              [effectType]: { ...t.effects[effectType], enabled: false },
            },
          };
        }),
      })),
    ),

  setVocalChain: (trackId, chain) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, vocalChain: chain } : t,
        ),
      })),
    ),

  setGuitarChain: (trackId, chain) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, guitarChain: chain } : t,
        ),
      })),
    ),

  updateDrumPad: (trackId, note, params) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) => {
          if (t.id !== trackId) return t;
          const prev = t.drumPads?.[note] ?? { volume: 0.8, pan: 0 };
          return {
            ...t,
            drumPads: {
              ...t.drumPads,
              [note]: { ...prev, ...params },
            },
          };
        }),
      })),
    ),

  setDrumKit: (trackId, kitId) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, drumKit: kitId } : t,
        ),
      })),
    ),

  setSamplerSample: (trackId, sample) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, samplerSample: sample } : t,
        ),
      })),
    ),

  setSend: (trackId, returnId, level) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                sends: {
                  ...t.sends,
                  [returnId]: Math.max(0, Math.min(1, level)),
                },
              }
            : t,
        ),
      })),
    ),

  // ── Parameter automation ──
  // Every edit mints a fresh `automation` object + track (like drumPads) — the
  // collab diff and undo both change-detect by reference, so in-place mutation
  // would silently break sync/undo.
  upsertAutomationPoint: (trackId, paramId, point) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            automation: {
              ...t.automation,
              [paramId]: insertPoint(t.automation?.[paramId], point),
            },
          };
        }),
      })),
    ),

  removeAutomationPoint: (trackId, paramId, tick) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) => {
          if (t.id !== trackId || !t.automation?.[paramId]) return t;
          const next = removePoint(t.automation[paramId], tick);
          const automation: AutomationLanes = { ...t.automation };
          if (next.length === 0) delete automation[paramId];
          else automation[paramId] = next;
          return { ...t, automation };
        }),
      })),
    ),

  clearAutomationLane: (trackId, paramId) =>
    set(
      guardTrack(trackId, (state) => ({
        tracks: state.tracks.map((t) => {
          if (t.id !== trackId || !t.automation?.[paramId]) return t;
          const automation: AutomationLanes = { ...t.automation };
          delete automation[paramId];
          return { ...t, automation };
        }),
      })),
    ),

  loadProjectTemplate: (templateId) => {
    const template = getProjectTemplate(templateId);
    if (!template) return;
    // The template's write goes past the collab middleware (below). In a
    // connected room the store would then hold the template while the room's
    // doc kept the project, and the next edit's diff would delete from the
    // room every track the template lacks, for everyone in it. The Library
    // panel refuses in a room with a message first; this is the backstop,
    // and it throws rather than return quietly, so a caller that missed the
    // check fails instead of carrying on as if the template were open. A
    // room identity with no connection (the editor was left, or the room
    // closed) is no obstacle: no write can reach the room then, and a rejoin
    // takes the room's project.
    //
    // A take in progress is the callers' to refuse too (the Library panel
    // does), but not here: a seed runs after replaceSession's reset, which
    // has already ended any take, so a check here could never fire.
    if (getBridge() !== null) {
      throw new Error(
        'A template cannot open while a collab room is connected',
      );
    }

    const tracks: Track[] = template.tracks.map((def) => ({
      id: crypto.randomUUID(),
      ...initialTrackDefaults(def.instrument, def.name),
      type: def.type,
      color: def.color,
    }));
    // The first MIDI track is armed and monitored, ready to play into.
    const firstMidi = tracks.findIndex((t) => t.type === 'midi');
    if (firstMidi >= 0) {
      tracks[firstMidi] = {
        ...tracks[firstMidi],
        recordArmed: true,
        monitoring: true,
      };
    }

    // A load: the caches keyed by track id let go of the last project first
    // (session generation), then the template goes in over a new project's
    // state as one write. Whatever the last project held (chords, key,
    // markers, metre, mastering, marks, its cloud link) starts over, so a
    // Save makes a new project. The write goes past the collab middleware,
    // as a reset's does: a load is not an edit to send to a room.
    bumpSessionGeneration('template');
    api.setState({
      ...initialProjectState(),
      ...genreSettings(template.genre),
      bpm: template.bpm,
      tracks,
      nextColorIndex: tracks.length,
      selectedTrackId: firstMidi >= 0 ? tracks[firstMidi].id : null,
    });
  },
});
