import { GROOVES } from '@/daw/data/groovesLibrary';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import { useStore } from '@/daw/store';

/**
 * Add a demo project's drum groove as a Drums track, once the demo bundle has
 * hydrated — the groove is a fetched .mid, so it can't ride in the synchronous
 * bundle. Grooves are longer performances than a demo loop, so the clip is cut
 * to the length of the demo's other clips and the kit loops with the chords.
 */
export async function applyDemoDrums(
  grooveId: string,
  projectName: string,
): Promise<void> {
  const events = await loadGrooveEvents(grooveId);
  if (!events) return;

  const store = useStore.getState();
  // The user may have opened another project while the groove was loading.
  if (store.projectId !== null || store.projectName !== projectName) return;

  const loopTicks = Math.max(
    0,
    ...store.tracks.flatMap((t) =>
      t.midiClips.flatMap((clip) =>
        clip.events.map((e) => clip.startTick + e.startTick + e.durationTicks),
      ),
    ),
  );
  if (loopTicks <= 0) return;

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
}
