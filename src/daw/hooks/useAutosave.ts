import { useEffect, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { useSynthStore, type SynthStore } from '@/daw/oracle-synth/store';
import type { SynthTrackState } from '@/daw/oracle-synth/synthTrackState';
import { useStore, type AllSlices } from '@/daw/store';
import {
  sessionLoadedAt,
  writeLocalSession,
} from '@/lib/studio-projects/localSession';

// Wait this long after the last change to the project before writing it, so
// a drag or a burst of edits costs one write rather than one per frame...
const AUTOSAVE_DEBOUNCE_MS = 1500;
// ...but never longer than this after the first unsaved change, so a stream
// of changes (a long fader drag, a take adding notes) still reaches it.
const AUTOSAVE_MAX_WAIT_MS = 5000;

/**
 * What serializeSession writes from the editor store, by reference: a change
 * to any of these is a change to the project, and nothing else is. Listening
 * to every store write instead let the playhead's ~30 Hz updates (and meters,
 * presence and UI state) restart the debounce forever, so nothing was saved
 * while a loop played. The playhead itself is saved, but only along with a
 * real change or a flush.
 */
const projectFields = (s: AllSlices): unknown[] => [
  s.projectId,
  s.projectName,
  s.composerName,
  s.bpm,
  s.metronomeEnabled,
  s.loopEnabled,
  s.loopStart,
  s.loopEnd,
  s.tracks,
  s.chordRegions,
  s.rootNote,
  s.mode,
  s.rhythmName,
  s.genre,
  s.swing,
  s.returns,
  s.masterAutomation,
];

/**
 * The Oracle patch serializeSession reads from the synth store for the track
 * whose panel is open: synthTrackState's SYNTH_STATE_KEYS, which the
 * autosave test checks this against. Synth knobs write only that store, so
 * without this a sound-design session never autosaved.
 */
const SYNTH_PATCH_KEYS = [
  'oscillators',
  'subOscillator',
  'noise',
  'filters',
  'envelopes',
  'lfos',
  'modRoutes',
  'voiceMode',
  'voiceCount',
  'glide',
  'spread',
  'masterVolume',
  'fx',
  'fxRoutes',
  'routing',
  'arp',
  'macros',
  'keyScale',
  'presetName',
  'pitchBendRange',
  'bpm',
] as const satisfies readonly (keyof SynthTrackState)[];

const synthPatchFields = (s: SynthStore): unknown[] =>
  SYNTH_PATCH_KEYS.map((key) => s[key]);

/**
 * Writes the session to localStorage (crash recovery, one slot) 1.5 s after
 * the project last changed, at most 5 s after the first unsaved change, and
 * at once when the page is hidden or closed or the editor unmounts. Cleared
 * by File → New Project (see FileMenu). `userId` is whose kept work stays put
 * when full storage needs room for the write (see writeLocalSession).
 */
export function useAutosave(userId?: string | null): void {
  // Read at write time, so a user id that resolves later doesn't restart the
  // subscriptions (and their pending write).
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let maxWait: ReturnType<typeof setTimeout> | null = null;

    const write = () => {
      if (debounce !== null) clearTimeout(debounce);
      if (maxWait !== null) clearTimeout(maxWait);
      debounce = maxWait = null;
      writeLocalSession(userIdRef.current);
    };
    const schedule = () => {
      if (debounce !== null) clearTimeout(debounce);
      debounce = setTimeout(write, AUTOSAVE_DEBOUNCE_MS);
      maxWait ??= setTimeout(write, AUTOSAVE_MAX_WAIT_MS);
    };
    // The page may get no other chance: write what is waiting, now
    // (localStorage is synchronous, so it lands before the page goes).
    const flush = () => {
      if (debounce !== null) write();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    const unsubscribeProject = useStore.subscribe(projectFields, schedule, {
      equalityFn: shallow,
    });
    const unsubscribeSynth = useSynthStore.subscribe(
      synthPatchFields,
      schedule,
      { equalityFn: shallow },
    );
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // The store outlives the editor route, so a session can arrive while the
    // editor is away (a song seeded from its page, a Restore): write it.
    if (sessionLoadedAt() !== null) schedule();

    return () => {
      unsubscribeProject();
      unsubscribeSynth();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Leaving the editor writes the edit in flight instead of dropping it.
      flush();
    };
  }, []);
}
