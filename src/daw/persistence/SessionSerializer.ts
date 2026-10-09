import { ensureProjectNoteIds } from '@/daw/model/noteIds';
import {
  getTrackSynthState,
  setTrackSynthState,
  type SynthTrackState,
} from '@/daw/oracle-synth/synthTrackState';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore, type AllSlices } from '@/daw/store';
import type { ReturnBus } from '@/daw/store/returnsSlice';
import type { Track } from '@/daw/store/tracksSlice';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import { guessTrackRole } from '@/daw/utils/trackRole';
import type { AutomationLanes } from '@/daw/audio/automation';
import {
  planCloudTrackIds,
  rewriteTrackRefs,
} from './projectDocument/cloudIds';
import {
  applyTrackSettings,
  checkedValue,
  decodeMidiEvents,
  decodeSession,
  encodeMidiEvents,
  encodeSession,
  restoreReturns,
  trackSettings,
  type DecodedSession,
  type MidiClipColumnar,
  type SerializedTrackSettings,
  type StoredSession,
} from './projectDocument/codec';
import { keyColourFor } from './projectDocument/derived';
import {
  initialProjectState,
  resetProjectState,
} from './projectDocument/initialState';
import {
  migrateSession,
  type LegacyPrefs,
  type UnreadableReason,
} from './projectDocument/migrations';
import { adoptLegacyPrefs } from './prefsStore';
import { documentFingerprint, markDocumentBaseline } from './saveStatusStore';

// ── The Studio session's codec ─────────────────────────────────────────────
//
// The doors in and out of the editor store for a whole project: the draft on
// this device (codec v3, projectDocument/codec.ts, with older drafts brought
// up to date by projectDocument/migrations.ts), the cloud payload, a reset
// to an empty project, and the marks of the live session (loaded, pristine).
// Everything else that saves or opens a project goes through here.
//
// Every load and reset starts the project afresh: a new session generation
// first (bumpSessionGeneration), which lets go of every cache keyed by track
// id, then the patches seeded, then one store write of initialProjectState()
// under whatever was decoded, so nothing of the previous project carries over
// (the registry says what belongs to a project). Whatever can refuse or
// throw (reading, migrating, decoding) runs before any of that.

export {
  dedupeChordRegionIds,
  decodeMidiEvents,
  encodeMidiEvents,
  restoreReturns,
  SESSION_ENVELOPE_VERSION,
  SESSION_SCHEMA_VERSION,
} from './projectDocument/codec';
export type {
  MidiClipColumnar,
  MidiClipEvents,
  SerializedTrackSettings,
} from './projectDocument/codec';
export type { UnreadableReason } from './projectDocument/migrations';

/**
 * A draft as storage holds it: the autosave, a kept session. Written as v3
 * in the v2 envelope; drafts written before 1.3 still load (migrations.ts).
 */
export type SessionData = StoredSession;

// ── Serialize ──────────────────────────────────────────────────────────────

/** The live session as a draft (codec v3). */
export function serializeSession(): SessionData {
  return encodeSession(useStore.getState(), getTrackSynthState, Date.now());
}

// ── Cloud serialize / deserialize ──────────────────────────────────────────
//
// MIDI clips travel inline (columnar in midiClipsJson). Audio clips reference
// AudioAsset rows; only clips with a persisted assetId round-trip. Clips with
// assetId=null (just-recorded / just-imported, bytes not yet uploaded) are
// dropped with a console warning — the upload-and-finalize flow needs to run
// first. Milestone 1.5's document field carries the rest of the project.

export interface CloudAudioClip {
  id?: string;
  assetId: string;
  startTick: number;
  duration: number;
  offsetSeconds: number;
  gain: number;
  fadeInTicks: number;
  fadeOutTicks: number;
}

export interface CloudProjectInput {
  name: string;
  composerName?: string | null;
  bpm: number;
  prism: {
    rootNote: number | null;
    rhythmName: string;
    genre: string;
    swing: number;
  };
  returns?: ReturnBus[];
  tracks: Array<{
    name: string;
    type: 'midi' | 'audio';
    instrument: string;
    color: string;
    mute: boolean;
    solo: boolean;
    volume: number;
    pan: number;
    activeEffects: string[];
    settings?: SerializedTrackSettings;
    midiClips: MidiClipColumnar[];
    audioClips: CloudAudioClip[];
  }>;
}

export interface CloudProjectDetail extends CloudProjectInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  tracks: Array<
    CloudProjectInput['tracks'][number] & { id: string; ordinal: number }
  >;
}

export function serializeSessionForCloud(
  nameOverride?: string,
): CloudProjectInput {
  const state = useStore.getState();
  let droppedAudioClipCount = 0;

  const tracks = state.tracks.map((t) => {
    const audioClips: CloudAudioClip[] = [];
    for (const c of t.audioClips) {
      if (!c.assetId) {
        droppedAudioClipCount++;
        continue;
      }
      audioClips.push({
        assetId: c.assetId,
        startTick: c.startTick,
        duration: c.duration,
        offsetSeconds: c.offsetSeconds ?? 0,
        gain: c.gain ?? 1,
        fadeInTicks: c.fadeInTicks ?? 0,
        fadeOutTicks: c.fadeOutTicks ?? 0,
      });
    }

    return {
      name: t.name,
      type: t.type,
      instrument: t.instrument,
      color: t.color,
      mute: t.mute,
      solo: t.solo,
      volume: t.volume,
      pan: t.pan,
      activeEffects: t.activeEffects ?? [],
      settings: {
        ...trackSettings(t, getTrackSynthState),
        trackRole: t.trackRole,
      },
      midiClips: t.midiClips.map((c) => ({
        id: c.id,
        name: c.name,
        startTick: c.startTick,
        events: encodeMidiEvents(c.events),
      })),
      audioClips,
    };
  });

  // Master automation rides on the first track's settings (see
  // SerializedTrackSettings.masterAutomation). A project with no tracks has
  // nothing to automate, so nothing is lost there.
  if (tracks.length > 0 && Object.keys(state.masterAutomation).length > 0) {
    tracks[0].settings = {
      ...tracks[0].settings,
      masterAutomation: state.masterAutomation,
    };
  }

  if (droppedAudioClipCount > 0) {
    console.warn(
      `[studio-projects] Cloud save dropped ${droppedAudioClipCount} audio clip(s) without an uploaded asset. Upload via uploadAndFinalizeAsset before saving to persist them.`,
    );
  }

  return {
    // A non-host saving their own copy can override the name without touching
    // the (host-owned) shared project title.
    name: nameOverride ?? state.projectName,
    composerName: state.composerName || null,
    bpm: state.bpm,
    prism: {
      rootNote: state.rootNote,
      rhythmName: state.rhythmName,
      genre: state.genre,
      swing: state.swing,
    },
    returns: state.returns,
    tracks,
  };
}

// ── The live session ───────────────────────────────────────────────────────
//
// The store is a module singleton that outlives the editor route: leaving for
// the dashboard and coming back finds the session still in memory. This marks
// when the page last loaded, reset or seeded it, so the editor's boot knows
// the store holds the live session (restoring the autosave over it would put
// an older copy over newer work) and the autosave knows there is a session
// worth writing. It lives here, beside every load below that sets it (the
// draft autosave and openSession read it; 1.4 retired 1.3's localSession.ts).

let loadedAt: number | null = null;
// The session as it stood when markSessionPristine noted it.
let pristine: string | null = null;

/** When this page last loaded, reset or seeded the session; null until then. */
export function sessionLoadedAt(): number | null {
  return loadedAt;
}

/** Mark the store as holding the live session (every load and reset does). */
export function markSessionLoaded(): void {
  loadedAt = Date.now();
  pristine = null;
}

/**
 * The store no longer holds a session worth writing: File ▸ New Project
 * drops the autosave and reloads, and nothing may write the old project
 * back in between. The next load or reset marks it again.
 */
export function forgetLiveSession(): void {
  loadedAt = null;
  pristine = null;
}

/**
 * A session's project, for telling whether two sessions hold the same work:
 * its cloud link and its content as the save status fingerprints it (the
 * registry's doc fields and each Oracle patch). How it was last seen (the
 * playhead, zoom, the view), arming and inputs, and prefs are not work, so
 * they are not in it. Drafts of any version compare by what they load as,
 * so a v2 slot and the v3 session restored from it agree. Deterministic.
 */
export function sessionFingerprint(session: SessionData): string {
  const migrated = migrateSession(session);
  if (migrated.ok) {
    try {
      const { project, synthPatches } = decodeSession(migrated.session);
      return `${JSON.stringify(project.projectId)}|${documentFingerprint(
        project as unknown as AllSlices,
        Object.fromEntries(synthPatches),
      )}`;
    } catch {
      // No load can read it either: it is compared word for word below.
    }
  }
  return `unreadable:${JSON.stringify(session)}`;
}

/**
 * Note the session as just opened: a template, demo, song, practice track or
 * cloud project nobody has changed yet, which can be opened again from where
 * it came. No load calls it since milestone 1.3: whether a session holds
 * work is the save status's call (hasWorkToKeep, isDocumentDirty), which
 * costs no serialization per load. It stays for milestone 1.4's drafts.
 *
 * A caller passes the session it serialized when the moment to compare
 * against has passed: a save's, taken before its request.
 */
export function markSessionPristine(
  session: SessionData = serializeSession(),
): void {
  pristine = sessionFingerprint(session);
}

/** Whether `session` is the live one as it was opened (markSessionPristine). */
export function isPristineSession(
  session: SessionData = serializeSession(),
): boolean {
  return pristine !== null && sessionFingerprint(session) === pristine;
}

// ── Opening a cloud project ────────────────────────────────────────────────

/**
 * Open a project from the cloud as the live session. Its tracks keep the ids
 * they were saved with (settings.sourceTrackId), so everything that names a
 * track by id still finds it; a project saved before ids travelled gets new
 * ones once. Audio clips get new ids until milestone 1.10 keys audio by
 * asset. What the cloud payload doesn't carry yet (the chord lane, the
 * mode, the metre, …) opens at its default until milestone 1.5.
 */
export function deserializeCloudProject(project: CloudProjectDetail): void {
  // First everything that can throw, with nothing changed yet: once the
  // generation moves, the open project's patches are gone from the cache.
  const { ids, remap } = planCloudTrackIds(
    project.tracks.map((t) => t.settings?.sourceTrackId),
    () => crypto.randomUUID(),
  );
  const synthPatches: [string, SynthTrackState][] = [];
  const decoded = project.tracks.map((t, i): Track => {
    const id = ids[i];
    if (t.instrument === 'oracle-synth' && t.settings?.oracleSynth) {
      synthPatches.push([id, t.settings.oracleSynth]);
    }
    return {
      id,
      name: t.name,
      type: t.type,
      instrument: t.instrument as Track['instrument'],
      color: t.color,
      mute: t.mute,
      solo: t.solo,
      volume: t.volume,
      pan: t.pan,
      // This person's input on this device never travels: re-defaulted.
      recordArmed: false,
      monitoring: false,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel: null,
      // Instrument voice and effect config (effects re-default when a save
      // predates this field).
      ...applyTrackSettings(t.settings),
      activeEffects: (t.activeEffects ?? []) as Track['activeEffects'],
      midiClips: (t.midiClips ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        startTick: c.startTick,
        events: decodeMidiEvents(c.events),
      })),
      audioClips: (t.audioClips ?? []).map((c) => ({
        // Track-local clip id. The AudioBufferStore is keyed on this; bytes
        // for this clip will be fetched + decoded asynchronously by the
        // caller (loadCloudProjectAudio).
        id: crypto.randomUUID(),
        assetId: c.assetId,
        startTick: c.startTick,
        duration: c.duration,
        offsetSeconds: c.offsetSeconds,
        gain: c.gain,
        fadeInTicks: c.fadeInTicks,
        fadeOutTicks: c.fadeOutTicks,
      })),
      // Saves from before the role was carried guess it from the name.
      trackRole: t.settings?.trackRole ?? guessTrackRole(t.name, t.instrument),
    };
  });

  // A MIDI keyboard plays the first MIDI track.
  const firstMidi = decoded.find((t) => t.type === 'midi');
  if (firstMidi) {
    firstMidi.monitoring = true;
    firstMidi.recordArmed = true;
  }

  // Notes saved without ids (the cloud carries none until 1.5) get their
  // legacy ids, the same on every open. Every reference to a track points
  // at the id it loaded under; one to a track not in the payload is cleared.
  const tracks = rewriteTrackRefs(
    { tracks: ensureProjectNoteIds(decoded) },
    remap,
  ).tracks;
  // The values the payload shares with a draft load as a draft's do: one of
  // the wrong type opens at its default.
  const prism: Partial<CloudProjectInput['prism']> = project.prism ?? {};
  const rootNote = checkedValue('rootNote', prism.rootNote);
  const initial = initialProjectState();
  const opened: Partial<AllSlices> = {
    ...initial,
    projectId: project.id,
    projectName: checkedValue('projectName', project.name),
    composerName: checkedValue('composerName', project.composerName ?? ''),
    bpm: checkedValue('bpm', project.bpm),
    tracks,
    nextColorIndex: tracks.length,
    selectedTrackId: firstMidi?.id ?? null,
    rootNote,
    // The payload has no mode yet, so the key colour is the default mode's.
    rootTrackColor: keyColourFor(rootNote, initial.mode ?? 'ionian'),
    rhythmName: checkedValue('rhythmName', prism.rhythmName),
    genre: checkedValue('genre', prism.genre),
    swing: checkedValue('swing', prism.swing),
    returns: restoreReturns(project.returns),
    masterAutomation: checkedValue(
      'masterAutomation',
      masterAutomationFromCloud(project),
    ),
  };

  bumpSessionGeneration('cloud-open');
  for (const [trackId, patch] of synthPatches) {
    setTrackSynthState(trackId, patch);
  }
  useStore.setState(opened);
  resetUndoHistory();
  markSessionLoaded();
  // The cloud holds this project as it opened, so until it changes there is
  // no work in it for a link to keep.
  markDocumentBaseline({ savedComplete: true });
}

/** The Master automation a cloud save carried on a track's settings (the
 *  first track at save time; searched for, so track order can't lose it). */
function masterAutomationFromCloud(
  project: CloudProjectDetail,
): AutomationLanes {
  return (
    project.tracks.find((t) => t.settings?.masterAutomation)?.settings
      ?.masterAutomation ?? {}
  );
}

// ── Starting empty ─────────────────────────────────────────────────────────

/**
 * Reset the store to an empty project: what a fresh page shows, without
 * reloading. Used when the user starts a new project (the home page's
 * "Create New Project" tile) and before every link seeds the one it opens
 * (replaceSession), so no project left in the store from an earlier session
 * bleeds through. `reason` names the reset for the session generation's
 * listeners ('new', 'template', …).
 */
export function resetSessionToEmpty(reason = 'new'): void {
  resetProjectState(reason);
  resetUndoHistory();
  markSessionLoaded();
  markDocumentBaseline();
}

// ── Opening a draft ────────────────────────────────────────────────────────

/** Whether this build can load `session` (a draft of any version it reads). */
export function isLoadableSession(session: SessionData | string): boolean {
  return migrateSession(session).ok;
}

/** What loadSession did with a draft. */
export type LoadOutcome =
  | {
      ok: true;
      /**
       * The format it was written in: 1, 2, 3, or a later schema this build
       * reads as 3 (its `compat` allows it). Unless it is
       * SESSION_SCHEMA_VERSION, the next write over the draft loses its
       * original, so the caller backs it up first (backupBeforeMigration).
       */
      from: number;
      /** Values that were missing or broken and loaded as their default. */
      repaired: number;
    }
  | {
      ok: false;
      reason: UnreadableReason;
      detail: string;
      version?: number;
    };

/**
 * Load a draft (the autosave, kept work) as the live session. `stored` is
 * the draft as storage holds it, best read raw before any JSON.parse so an
 * unreadable one can be quarantined whole (projectDocument/quarantine.ts),
 * or already parsed. A draft written before 1.3 is brought up to v3 first.
 * When it can't be read nothing changes, and the outcome says why. Never
 * throws for the draft's sake.
 */
export function loadSession(stored: SessionData | string): LoadOutcome {
  let migrated: ReturnType<typeof migrateSession>;
  let decoded: DecodedSession;
  try {
    migrated = migrateSession(stored);
    if (!migrated.ok) {
      const { reason, detail, version } = migrated;
      return { ok: false, reason, detail, version };
    }
    decoded = decodeSession(migrated.session);
  } catch (err) {
    return { ok: false, reason: 'migration-failed', detail: String(err) };
  }
  applyDraft(decoded, migrated.legacyPrefs);
  return {
    ok: true,
    from: migrated.from,
    repaired: migrated.repaired + decoded.repaired,
  };
}

/** Load a local session (the autosave, or kept work); false if unreadable. */
export function deserializeSession(session: SessionData | string): boolean {
  const outcome = loadSession(session);
  if (!outcome.ok) {
    console.warn(
      `[session] Draft not loaded (${outcome.reason}): ${outcome.detail}`,
    );
  }
  return outcome.ok;
}

/**
 * Put a decoded draft in the store as the live session, in the order every
 * load keeps (see sessionGeneration.ts): the new generation lets go of every
 * cache keyed by track id, the Oracle patches go in, then the project as one
 * store write.
 */
function applyDraft(decoded: DecodedSession, legacyPrefs: LegacyPrefs): void {
  bumpSessionGeneration('restore');
  for (const [trackId, patch] of decoded.synthPatches) {
    setTrackSynthState(trackId, patch);
  }
  useStore.setState({
    ...initialProjectState(),
    ...decoded.project,
    // Stop returns to where the draft left the playhead.
    lastSeekPosition: decoded.project.position,
  });
  // A draft from before 1.3 carries the metronome, a pref now. It becomes
  // the student's only while they have none (prefsStore): a student with
  // prefs restoring an old draft, an old tab's autosave or a rolled-back
  // build's keeps their own.
  adoptLegacyPrefs(legacyPrefs);
  resetUndoHistory();
  markSessionLoaded();
  // A draft is the only copy of what it holds: a cloud copy, if there is
  // one, may be older. So it is never complete elsewhere, and replacing it
  // keeps it.
  markDocumentBaseline({ savedComplete: false });
}
