import {
  getTrackSynthState,
  setTrackSynthState,
} from '@/daw/oracle-synth/synthTrackState';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore, type AllSlices } from '@/daw/store';
import type { ReturnBus } from '@/daw/store/returnsSlice';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import {
  CLOUD_DOCUMENT_SCHEMA,
  cloudProjectDraft,
  encodeCloudDocument,
  findCloudDocument,
  type CloudDocument,
} from './projectDocument/cloudDocument';
import {
  decodeSession,
  encodeMidiEvents,
  encodeSession,
  trackSettings,
  type DecodedSession,
  type MidiClipColumnar,
  type SerializedTrackSettings,
  type StoredSession,
} from './projectDocument/codec';
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
// first. The cloud document (milestone 1.5, projectDocument/cloudDocument.ts)
// carries the rest of the project: in the API's `document` field once it has
// one, and until then on the first track's settings (the interim fallback).

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

/**
 * Where a cloud save puts the cloud document: the API's `document` field
 * ('document'), or the first track's settings ('interim', until the API has
 * the field; see cloudDocumentSupport.ts).
 */
export type CloudWriteMode = 'document' | 'interim';

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
  /** The cloud document, in 'document' mode. */
  document?: CloudDocument;
  /** Its schema (CLOUD_DOCUMENT_SCHEMA), in 'document' mode. */
  documentSchema?: number;
}

export interface CloudProjectDetail
  extends Omit<CloudProjectInput, 'document' | 'documentSchema'> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  tracks: Array<
    CloudProjectInput['tracks'][number] & { id: string; ordinal: number }
  >;
  /** From an API with the document field: null when none was saved. */
  document?: unknown;
  documentSchema?: number | null;
  /** Bumped by every write of the project (milestone 1.5's contract). */
  revision?: number;
  /** The revision the document was last written at. */
  writtenAtRevision?: number | null;
}

/**
 * The live session as a cloud save sends it, with the cloud document where
 * `mode` puts it. In 'interim' mode a project without tracks has nowhere to
 * put it: the save leaves it out, and says so (cloudGapMode).
 */
export function serializeSessionForCloud(
  nameOverride?: string,
  mode: CloudWriteMode = 'interim',
): CloudProjectInput {
  const state = useStore.getState();
  let droppedAudioClipCount = 0;

  const tracks = state.tracks.map((t) => {
    const audioClips: CloudAudioClip[] = [];
    const audioClipIds: string[] = [];
    for (const c of t.audioClips) {
      if (!c.assetId) {
        droppedAudioClipCount++;
        continue;
      }
      audioClipIds.push(c.id);
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
        // The clips' own ids, so an open keeps them (cloudProjectDraft).
        ...(audioClipIds.length > 0 ? { audioClipIds } : {}),
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

  const document = encodeCloudDocument(state);
  if (mode === 'interim' && tracks.length > 0) {
    tracks[0].settings = {
      ...tracks[0].settings,
      projectDoc: document,
      projectDocSchema: CLOUD_DOCUMENT_SCHEMA,
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
    ...(mode === 'document'
      ? { document, documentSchema: CLOUD_DOCUMENT_SCHEMA }
      : {}),
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

/** What a cloud open made of the project's document. */
export interface CloudOpenReport {
  /** Where the document came from; null when the project had none. */
  document: 'field' | 'interim' | null;
  /** An app from before 1.5 saved the project after its document. */
  stale: boolean;
  /** The document is from a later schema, which this build left out. */
  newer: boolean;
  /** Clips whose notes changed since the document: their parts left out. */
  partsSkipped: number;
}

/**
 * Open a project from the cloud as the live session: its rows and its cloud
 * document (projectDocument/cloudDocument.ts) merged into one v3 draft and
 * decoded as a draft is, so the chord lane, the mode, the metre, the Score
 * and the rest come back with it. Its tracks keep the ids they were saved
 * with (settings.sourceTrackId), so everything that names a track by id
 * still finds it; a project saved before ids travelled gets new ones once.
 * Its audio clips keep theirs too (settings.audioClipIds, milestone 1.10).
 * A project without a document opens what its rows carry, the rest at its
 * defaults. Throws, changing nothing, when the payload can't be read.
 */
export function deserializeCloudProject(
  project: CloudProjectDetail,
): CloudOpenReport {
  // First everything that can throw, with nothing changed yet: once the
  // generation moves, the open project's patches are gone from the cache.
  const found = findCloudDocument(project);
  const draft = cloudProjectDraft(project, found, () => crypto.randomUUID());
  const migrated = migrateSession(draft.session);
  if (!migrated.ok) {
    throw new Error(
      `cloud project ${project.id} can't be read (${migrated.reason}): ${migrated.detail}`,
    );
  }
  const decoded = decodeSession(migrated.session, {
    trackIds: draft.trackIds,
  });

  bumpSessionGeneration('cloud-open');
  for (const [trackId, patch] of decoded.synthPatches) {
    setTrackSynthState(trackId, patch);
  }
  useStore.setState({
    ...initialProjectState(),
    ...decoded.project,
    lastSeekPosition: decoded.project.position,
  });
  resetUndoHistory();
  markSessionLoaded();
  // The cloud holds this project as it opened, so until it changes there is
  // no work in it for a link to keep.
  markDocumentBaseline({ savedComplete: true });
  return {
    document: found.document ? found.source : null,
    stale: found.document !== null && found.stale,
    newer: found.newer,
    partsSkipped: draft.partsSkipped,
  };
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
