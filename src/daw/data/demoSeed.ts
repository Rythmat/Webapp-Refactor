import type { MidiNoteEvent } from '@prism/engine';
import { getDemoProject, type DemoProject } from '@/daw/data/demoProjects';
import { withDemoSynthPresets } from '@/daw/data/demoSynthPresets';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import { deserializeCloudProject } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { deriveChordRegionsFromSession } from '@/daw/store/prismSlice';

// ── A demo project as a Studio project ─────────────────────────────────────
//
// The editor's `?demo=<id>` link (openSession's 'demo' intent) opens a
// curated demo as an editable copy, in two steps:
//
// - prepare (prepareDemo): find the demo and fetch its drum groove. Async,
//   and it changes nothing, so the drums are in hand before anything is
//   replaced. A groove that can't be fetched leaves the demo without drums,
//   as it always has.
// - apply (applyDemo): hydrate the bundle, then the Drums track, all
//   synchronously after openSession's reset. The demo opens in one piece, so
//   it has one baseline and the first Cmd+Z can't take its drums away. No
//   reset, no baseline and no undo reset of its own: those are the opener's.

/** A demo ready to apply: its bundle, and its groove's notes once fetched. */
export interface PreparedDemo {
  demo: DemoProject;
  /** The groove's notes at 480 PPQ, or null with no groove or no fetch. */
  drums: MidiNoteEvent[] | null;
  /** The groove's name in the Grooves library, the drum clip's name. */
  grooveName: string | null;
}

/**
 * Find a demo and fetch its drum groove. Null when no demo has that id.
 * Never rejects for the groove: one that is unknown or can't be fetched or
 * parsed gives `drums: null`.
 */
export async function prepareDemo(
  demoId: string,
): Promise<PreparedDemo | null> {
  const demo = getDemoProject(demoId);
  if (!demo) return null;
  const grooveId = demo.drumGrooveId;
  if (!grooveId) return { demo, drums: null, grooveName: null };
  let drums: MidiNoteEvent[] | null = null;
  try {
    drums = await loadGrooveEvents(grooveId);
  } catch (err) {
    console.error(`Demo drums failed to load ("${grooveId}"):`, err);
  }
  const grooveName = GROOVES.find((g) => g.id === grooveId)?.name ?? null;
  return { demo, drums: drums && drums.length > 0 ? drums : null, grooveName };
}

/**
 * Write a prepared demo into the project: its bundle hydrates as a cloud
 * project would (with its Oracle Synth patches), then loses its cloud id and
 * takes the demo's name, so a Save writes a new project and never the
 * original. Its chord lane is derived from its MIDI, and its groove becomes
 * a Drums track cut to the length of the demo's other clips, so the kit
 * loops with the chords.
 */
export function applyDemo(prepared: PreparedDemo): void {
  const { demo, drums, grooveName } = prepared;
  deserializeCloudProject(withDemoSynthPresets(demo.bundle, demo.synthPresets));
  const store = useStore.getState();
  store.setProjectId(null);
  store.setProjectName(demo.label);

  // Chord regions aren't part of a project bundle, so derive them from the
  // demo's MIDI (as a clip paste does) to give Insight its analysis.
  const { tracks, rootNote, mode, setChordRegions } = useStore.getState();
  if (rootNote !== null) {
    setChordRegions(
      deriveChordRegionsFromSession(tracks, rootNote + 48, mode),
      true,
    );
  }

  if (!drums) return;
  // Grooves are longer performances than a demo loop: the end of the demo's
  // last note is the loop.
  const loopTicks = Math.max(
    0,
    ...useStore
      .getState()
      .tracks.flatMap((t) =>
        t.midiClips.flatMap((clip) =>
          clip.events.map(
            (e) => clip.startTick + e.startTick + e.durationTicks,
          ),
        ),
      ),
  );
  if (loopTicks <= 0) return;
  const trackId = store.addTrack('midi', 'drum-machine', 'Drums');
  if (!trackId) return; // track cap reached (addTrack toasts)
  store.addMidiClip(trackId, {
    id: `clip-groove-${crypto.randomUUID().slice(0, 8)}`,
    name: grooveName ?? 'Drums',
    startTick: 0,
    durationTicks: loopTicks,
    events: drums
      .filter((e) => e.startTick < loopTicks)
      .map((e) => ({
        ...e,
        durationTicks: Math.min(e.durationTicks, loopTicks - e.startTick),
      })),
  });
}
