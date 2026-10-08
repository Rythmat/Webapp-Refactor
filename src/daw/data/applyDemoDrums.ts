import { GROOVES } from '@/daw/data/groovesLibrary';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import {
  isDocumentDirty,
  markDocumentBaseline,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { isSessionCurrent, stampSession } from '@/daw/session/sessionStamp';
import { useStore } from '@/daw/store';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';

/**
 * Add a demo project's drum groove as a Drums track, once the demo bundle has
 * hydrated — the groove is a fetched .mid, so it can't ride in the synchronous
 * bundle. Grooves are longer performances than a demo loop, so the clip is cut
 * to the length of the demo's other clips and the kit loops with the chords.
 *
 * `generation` is the session generation of the demo the drums belong to:
 * the one the demo opened in (getSessionGeneration, the default, when called
 * as it opens). Called as the demo opens, so the room it is in (none, as a
 * rule) is the demo's too. By the time the groove arrives another project may
 * be open, the same demo opened again, or a room joined (sessionStamp.ts);
 * the drums then belong to no open project and are dropped.
 */
export async function applyDemoDrums(
  grooveId: string,
  generation = getSessionGeneration(),
): Promise<void> {
  const demo = stampSession(generation);
  const events = await loadGrooveEvents(grooveId);
  if (!events) return;
  if (!isSessionCurrent(demo)) return;

  const store = useStore.getState();
  const loopTicks = Math.max(
    0,
    ...store.tracks.flatMap((t) =>
      t.midiClips.flatMap((clip) =>
        clip.events.map((e) => clip.startTick + e.startTick + e.durationTicks),
      ),
    ),
  );
  if (loopTicks <= 0) return;

  // Untouched since it opened: the drums finish opening the demo, so they
  // belong to its baseline. The first Cmd+Z must not remove them, and the
  // demo still holds no work for the next link to keep. After an edit they
  // are an ordinary step, and the student's own history stays.
  //
  // A save since it opened leaves it touched too, edited or not: the cloud
  // copy lacks the drums, so they are an unsaved change. A demo opens with no
  // cloud link (seedDemo), and a Save or Save As links it before capturing
  // what it sends (ensureProjectId), so a save still under way counts as
  // well. Marking the drums' baseline then would outrank the one the save
  // marks when it returns, and read its partial copy as saved (D7).
  const untouched = store.projectId === null && !isDocumentDirty();
  // Nor do the drums ever make the baseline more complete than it was: a
  // session whose saved copy is partial, or was let go of (File ▸ Delete),
  // stays the only whole copy.
  const { savedComplete } = useSaveStatusStore.getState();

  const trackId = store.addTrack('midi', 'drum-machine', 'Drums');
  store.addMidiClip(trackId, {
    id: `clip-groove-${crypto.randomUUID().slice(0, 8)}`,
    name: GROOVES.find((g) => g.id === grooveId)?.name ?? 'Drums',
    startTick: 0,
    durationTicks: loopTicks,
    events: events
      .filter((e) => e.startTick < loopTicks)
      .map((e) => ({
        ...e,
        durationTicks: Math.min(e.durationTicks, loopTicks - e.startTick),
      })),
  });

  if (untouched) {
    resetUndoHistory();
    markDocumentBaseline({ savedComplete });
  }
}
