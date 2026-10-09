import { initialProjectState } from '@/daw/persistence/projectDocument/initialState';
import {
  documentFingerprint,
  isDocumentEmpty,
  liveDocumentFingerprint,
} from '@/daw/persistence/saveStatusStore';
import {
  serializeSession,
  SESSION_SCHEMA_VERSION,
} from '@/daw/persistence/SessionSerializer';
import { useStore, type AllSlices } from '@/daw/store';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';

// ── The live session as one draft write (milestone 1.4, E7) ────────────────
//
// One synchronous capture of the editor store: the body text a draft write
// stores (1.3's v3-in-v2 envelope, JSON) and the facts its meta records
// about it. Taken once per write and shared by the mirror and the IndexedDB
// write that start at the same moment (E5), so both hold the same snapshot.
//
// docFingerprint is hashFingerprint(documentFingerprint()): the same scheme
// the save path stamps on LastSaved.fingerprint and DraftCloudRecord, so the
// predicates can compare them. hasContent is 1.3's own isDocumentEmpty (the
// one that ignores the few keys pre-1.3 builds wrote into blank projects),
// not a second notion of "empty".

export interface LiveSnapshot {
  /** The body: JSON of serializeSession(). */
  text: string;
  /** hashFingerprint(documentFingerprint()). */
  docFingerprint: string;
  /** Whether the project differs from an empty one (!isDocumentEmpty()). */
  hasContent: boolean;
  name: string;
  trackCount: number;
  /** The body's schema (SESSION_SCHEMA_VERSION for anything this build writes). */
  schema: number;
  projectId: string | null;
  roomId: string | null;
}

function mark(name: string): void {
  if (!import.meta.env.DEV) return;
  try {
    performance.mark(name);
  } catch {
    // No performance timeline (tests): nothing to mark.
  }
}

/** Capture the live session (one serialize, one fingerprint). */
export function snapshotLiveSession(): LiveSnapshot {
  mark('ma:draft:snapshot:start');
  const state = useStore.getState();
  const session = serializeSession();
  const snapshot: LiveSnapshot = {
    text: JSON.stringify(session),
    // The live document's fingerprint, kept per documentVersion.
    docFingerprint: hashFingerprint(liveDocumentFingerprint()),
    hasContent: !isDocumentEmpty(state),
    name: state.projectName,
    trackCount: state.tracks.length,
    schema:
      typeof session.schema === 'number'
        ? session.schema
        : SESSION_SCHEMA_VERSION,
    projectId: state.projectId ?? null,
    roomId: state.roomId ?? null,
  };
  mark('ma:draft:snapshot:end');
  return snapshot;
}

let emptyHash: string | null = null;

/**
 * The hashed fingerprint of an empty project: initialProjectState() over the
 * state at the first call, with no tracks and no Oracle patches. Computed
 * once per page. Diagnostics and tests only: hasContent is 1.3's
 * isDocumentEmpty, and nothing compares a draft's docFingerprint with this
 * (an Oracle track's patch, or keys pre-1.3 builds wrote into blank
 * projects, would make that comparison wrong). Kept for the CONTRACTS name.
 */
export function emptyDocFingerprint(): string {
  if (emptyHash === null) {
    const empty = {
      ...useStore.getState(),
      ...initialProjectState(),
      tracks: [],
    } as AllSlices;
    emptyHash = hashFingerprint(documentFingerprint(empty, {}));
  }
  return emptyHash;
}

// The envelope's head is '{"version":2,"schema":3,"compat":3,"timestamp":N,'
// (encodeSession's key order). Two writes of the same project differ only
// in that timestamp, so the "identical text is skipped" rule compares the
// text with it left out. Anything else (a body of another shape) compares
// whole.
const ENVELOPE_TIMESTAMP =
  /^(\{"version":-?\d+(?:,"schema":-?\d+)?(?:,"compat":-?\d+)?,"timestamp":)-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i;

/** `text` without the envelope's write timestamp, for comparing two bodies. */
export function bodyContent(text: string): string {
  const match = ENVELOPE_TIMESTAMP.exec(text);
  if (!match) return text;
  return match[1] + '0' + text.slice(match[0].length);
}
