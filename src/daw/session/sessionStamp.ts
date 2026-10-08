import { getBridge } from '@/daw/collab/collabMiddleware';
import { useStore } from '@/daw/store';
import { getSessionGeneration } from './sessionGeneration';

// ── Which session later work belongs to ────────────────────────────────────
//
// Some work lands after an await: a link that loads something first (a cloud
// project, the song library, a practice track's groove) and a demo's drums.
// By then the student may have moved on, and the work must not land in what
// they moved on to. A stamp taken as the work starts names the session it
// belongs to, and the work lands only while that session is still open.
//
// Every load and reset of the project starts a new session generation. A
// room doesn't, yet (the in-editor Join stays as it is until 1.14): a
// guest's join pulls the room's project into the store without a load, and a
// room the student creates shares the open project with everyone in it. So
// a room joined, created or left since the stamp is another session too.

/** The session open when some later work started (stampSession). */
export interface SessionStamp {
  readonly generation: number;
  readonly roomId: string | null;
  readonly bridge: ReturnType<typeof getBridge>;
}

/**
 * The session open now. `generation` names an earlier generation in the same
 * room instead, for work that starts just after its project opened (a demo's
 * drums).
 */
export function stampSession(
  generation: number = getSessionGeneration(),
): SessionStamp {
  return {
    generation,
    roomId: useStore.getState().roomId,
    bridge: getBridge(),
  };
}

/** Whether the session `stamp` names is still the one open. */
export function isSessionCurrent(stamp: SessionStamp): boolean {
  return (
    getSessionGeneration() === stamp.generation &&
    useStore.getState().roomId === stamp.roomId &&
    getBridge() === stamp.bridge
  );
}
