import { useEffect, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { useSynthStore, type SynthStore } from '@/daw/oracle-synth/store';
import { SYNTH_STATE_KEYS } from '@/daw/oracle-synth/synthPatchKeys';
import { VIEW_KEYS } from '@/daw/persistence/projectDocument/fields';
import {
  attachDocumentObserver,
  noteSynthPatchChange,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
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
 * Whether a store write changed how the project was last seen on this
 * device: the registry's view keys (the playhead, zoom, scroll, the view,
 * the selected track, …).
 */
function viewChanged(state: AllSlices, prev: AllSlices): boolean {
  for (const key of VIEW_KEYS) {
    if (state[key] !== prev[key]) return true;
  }
  return false;
}

/** The Oracle patch's fields in the synth store (SYNTH_STATE_KEYS). */
const synthPatchFields = (s: SynthStore): unknown[] =>
  SYNTH_STATE_KEYS.map((key) => s[key]);

interface AutosaveTriggers {
  /**
   * The draft has something new to write: the project document changed (a
   * doc key, a track's doc fields, an Oracle patch), or a track's per-user
   * fields did (arm, monitor, inputs), which only the draft keeps.
   */
  onChange: () => void;
  /**
   * Only how the project was last seen changed (a view key). It goes with
   * the next write or a flush, never on a schedule of its own: the playhead
   * moves about 30 times a second while playing (decision D8).
   */
  onView: () => void;
}

/**
 * What the draft listens to, from the registry: the save status's
 * draftVersion, which moves on every write to the project document
 * (DOC_KEYS, each track's TRACK_DOC_FIELDS) or a track's per-user fields
 * (TRACK_PER_USER_FIELDS), and on every Oracle patch edit; and the view keys
 * (VIEW_KEYS). Prefs live apart from the draft (prefsStore), and session
 * state is never saved, so neither reaches it. A synth knob writes only the
 * synth store, so this also reports each patch edit to the save status
 * (noteSynthPatchChange). Returns the unsubscribe. Milestone 1.4's draft
 * store can listen through this too (exporting it then) and change only
 * where the write goes.
 */
function subscribeAutosaveTriggers({
  onChange,
  onView,
}: AutosaveTriggers): () => void {
  // The save status counts the store's writes from the moment its module
  // loads; attaching again changes nothing. Never detached here: kept-work
  // checks run with no editor mounted (a Song page opening a song).
  attachDocumentObserver();
  const unsubscribeDraft = useSaveStatusStore.subscribe((status, prev) => {
    if (status.draftVersion !== prev.draftVersion) onChange();
  });
  const unsubscribeView = useStore.subscribe((state, prev) => {
    if (viewChanged(state, prev)) onView();
  });
  const unsubscribeSynth = useSynthStore.subscribe(
    synthPatchFields,
    () => noteSynthPatchChange(),
    { equalityFn: shallow },
  );
  return () => {
    unsubscribeDraft();
    unsubscribeView();
    unsubscribeSynth();
  };
}

/**
 * Writes the session to localStorage (crash recovery, one slot) 1.5 s after
 * the project last changed, at most 5 s after the first unsaved change, and
 * at once when the page is hidden or closed or the editor unmounts. A change
 * to the view alone (scrolling, zooming, the playhead) schedules nothing: it
 * goes with the next write, or with the flush when nothing else changed. A
 * write storage refused is tried again by the flush.
 * Cleared by File → New Project (see FileMenu). `userId` is whose kept work
 * stays put when full storage needs room for the write (see
 * writeLocalSession).
 */
export function useAutosave(userId?: string | null): void {
  // Read at write time, so a user id that resolves later doesn't restart the
  // subscriptions (and their pending write).
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let maxWait: ReturnType<typeof setTimeout> | null = null;
    // The draft is behind the session with nothing scheduled: the view
    // changed since the last write, or the last write didn't land (storage
    // full, say; writeLocalSession tells the student), so the flush tries.
    let stale = false;

    const write = () => {
      if (debounce !== null) clearTimeout(debounce);
      if (maxWait !== null) clearTimeout(maxWait);
      debounce = maxWait = null;
      stale = !writeLocalSession(userIdRef.current);
    };
    const schedule = () => {
      if (debounce !== null) clearTimeout(debounce);
      debounce = setTimeout(write, AUTOSAVE_DEBOUNCE_MS);
      maxWait ??= setTimeout(write, AUTOSAVE_MAX_WAIT_MS);
    };
    // The page may get no other chance: write what is waiting, now
    // (localStorage is synchronous, so it lands before the page goes).
    const flush = () => {
      if (debounce !== null || stale) write();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    const unsubscribe = subscribeAutosaveTriggers({
      onChange: schedule,
      onView: () => {
        stale = true;
      },
    });
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // The store outlives the editor route, so a session can arrive while the
    // editor is away (a song seeded from its page, a Restore): write it.
    if (sessionLoadedAt() !== null) schedule();

    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Leaving the editor writes the edit in flight instead of dropping it.
      flush();
    };
  }, []);
}
