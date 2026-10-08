import type { DemoProject } from '@/daw/data/demoProjects';
import { withDemoSynthPresets } from '@/daw/data/demoSynthPresets';
import { importPendingJamSession } from '@/daw/jam-import/importJamSession';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import { deserializeCloudProject } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { deriveChordRegionsFromSession } from '@/daw/store/prismSlice';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import type { PracticeTrackResult } from '@/features/practiceTracks/generatePracticeTrack';
import {
  practiceSessionFor,
  type ResolvedPracticeTrack,
} from '@/features/practiceTracks/genre/openGenrePracticeTrack';
import { seedStudioFromGenrePracticeTrack } from '@/features/practiceTracks/genre/seedStudioFromGenrePracticeTrack';
import { seedStudioFromPracticeTrack } from '@/features/practiceTracks/seedStudioFromPracticeTrack';
import type { BootIntent } from '@/lib/studio-projects/localSession';

// ── What each editor link opens ────────────────────────────────────────────
//
// The seeds the editor's links run inside replaceSession, which keeps the
// work they replace first: a template, a demo, a lesson, a Practice Track, a
// recorded jam. The Song page's song (seedStudioFromSong) is the other.
//
// Every seed is a load. It starts from a new project, through the registry's
// initialProjectState (resetProjectState, or a loader that writes it:
// deserializeCloudProject, loadProjectTemplate), so nothing of the project
// before carries into it, whether or not its caller reset first: not a key
// lock that silently keeps a song's key out, not a loop, a chord record mode,
// a Score mark, a lesson or a practice screen. And every seed ends as a
// baseline: nothing to undo, and the project as it opened is what the save
// status compares against, so a link that replaces an untouched one has no
// work to keep. A seed that finishes later (a demo's drums) checks that its
// project is still the one open (the session generation) before it lands.

/** A template, from the dashboard's tile or the Library panel. */
export function seedTemplate(templateId: string): void {
  // A load of its own: the template goes in over a new project's state.
  useStore.getState().loadProjectTemplate(templateId);
  resetUndoHistory();
  markDocumentBaseline();
}

/**
 * A demo, opened as an editable copy: its bundle hydrates as a cloud project
 * would, then loses its cloud id and takes the demo's name, so a Save writes
 * a new project and never the original. Its drums arrive later
 * (applyDemoDrums).
 */
export function seedDemo(demo: DemoProject): void {
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
  resetUndoHistory();
  markDocumentBaseline();
}

/**
 * A step-by-step lesson, in a new project, so its first steps (add or select
 * a track) start from a clean slate. The reset ends any lesson already
 * running; this one starts after it.
 */
export function seedTutorial(tutorialId: string): void {
  resetProjectState('tutorial');
  useStore.getState().startTutorial(tutorialId);
  resetUndoHistory();
  markDocumentBaseline();
}

/** The Theory Practice Track link's parameters. */
export type TheoryPracticeLink = Extract<BootIntent, { kind: 'practiceMode' }>;

/**
 * A Theory Practice Track (Learn > Theory), already generated: the caller
 * fetches its groove first, before anything is replaced. It lands on the
 * one-purpose practice screen, looped from the start; the full Studio is one
 * click away and shares the same project.
 */
export function seedTheoryPractice(
  practice: PracticeTrackResult,
  link: TheoryPracticeLink,
): void {
  seedStudioFromPracticeTrack(practice, link.level);
  const store = useStore.getState();
  store.setPracticeSession({
    kind: 'theory',
    mode: link.mode,
    rootParam: link.rootParam ?? 'c',
    level: link.level,
    openTrack: link.openTrack,
  });
  // A backing track to play over: loop it from the start.
  store.setLoopEnabled(true);
  store.setCurrentView('practice');
}

/**
 * A genre Practice Track (Learn > a genre level), as resolvePracticeTrack
 * found it: on its practice screen, its own groove looped.
 */
export function seedGenrePractice({
  track,
  genreLabel,
  returnTo,
}: ResolvedPracticeTrack): void {
  seedStudioFromGenrePracticeTrack(track, genreLabel);
  const store = useStore.getState();
  store.setPracticeSession(practiceSessionFor(track, genreLabel, returnTo));
  store.setCurrentView('practice');
}

/**
 * A recorded jam, one track per participant, offered for chord analysis. Its
 * import consumes the recording, so the project is its only copy and stays
 * work to keep (importPendingJamSession).
 */
export function seedJam(): void {
  importPendingJamSession();
  useStore.getState().offerChordAnalysis();
}
