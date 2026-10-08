// ── LeaveSavePrompt ──────────────────────────────────────────────────────
// Save-before-leaving modal. Shown when the local user clicks "Leave Session"
// or when the host disconnects. Saving stores a copy to the user's OWN account;
// either choice then tears down the session and opens a fresh solo project.
// Work the reset would lose (what a cloud copy can't hold yet, or a session
// that began with the student's own work) goes to a kept slot first.

import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useStore } from '@/daw/store/index';
import { useDawBodyTokens } from '@/daw/hooks/useDawBodyTokens';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  SaveSupersededError,
  saveCurrentProjectToCloud,
  studioProjectsApi,
} from '@/lib/studio-projects/api';
import {
  announceKeptWorkAfterReload,
  keepOutgoingSession,
} from '@/lib/studio-projects/localSession';
import { resetToNewProject } from '@/lib/studio-projects/newProject';
import { showError, showSuccess } from '@/components/utils/toast';
import { useCollab } from '../CollabProvider';

export function LeaveSavePrompt() {
  const pending = useStore((s) => s.leavePromptPending);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const setLeavePrompt = useStore((s) => s._setLeavePrompt);
  const { token, userId } = useAuthContext();
  const { leaveRoom } = useCollab();
  const [saving, setSaving] = useState(false);
  // Portaled to <body>, outside .daw-root: it holds the DAW tokens there
  // itself, and for as long as it is mounted, so the card stays opaque
  // through its exit animation too.
  useDawBodyTokens();

  // The host disconnecting flips us to 'disconnected'. In that case the session
  // is already over, so there's nothing to cancel back into.
  const hostLeft = connectionStatus !== 'connected';

  const finishLeave = useCallback(() => {
    leaveRoom();
    // Reloads into a blank solo project (also resets leavePromptPending).
    resetToNewProject();
  }, [leaveRoom]);

  // "Discard this session's changes": the session is being abandoned, and the
  // reset after it clears the autosave. Nothing from before the session may go
  // with it.
  // - A session that started from an empty project holds only session work.
  //   Reclaim the draft it minted (on the first record-stop or upload) along
  //   with the assets only that draft uses — the server keeps any asset
  //   another, saved project still references, so a collaborator who DID save
  //   is unaffected. Not once a save was made: the draft is the saved project.
  // - One that started with work may still hold the student's own, unsaved
  //   work: a host's room is seeded from their project, and a joiner who
  //   leaves before the first sync still has theirs. Its draft stays in their
  //   library, and the work goes to a kept slot before the reset, as when a
  //   link replaces it (owner decision 6).
  const handleDiscardSessionChanges = useCallback(async () => {
    const { sessionStartedEmpty, sessionSaved, sessionDraftProjectId } =
      useStore.getState();
    if (!sessionStartedEmpty) {
      const kept = keepOutgoingSession(userId);
      if (kept.status === 'failed') {
        showError(
          "Your work couldn't be set aside on this device, so it's still open. Use Save & Leave instead.",
        );
        return;
      }
      // The reset reloads the page, so the kept-work toast (with Restore)
      // waits for the editor's next boot.
      if (kept.status === 'kept') announceKeptWorkAfterReload(kept.slot);
    } else if (token && sessionDraftProjectId && !sessionSaved) {
      try {
        await studioProjectsApi.remove(token, sessionDraftProjectId);
      } catch (err) {
        // Best-effort cleanup — never block leaving on it. The hourly orphan
        // cron is the backstop for anything left behind.
        console.warn(
          '[leave] failed to delete unsaved draft project',
          err instanceof Error ? err.message : err,
        );
      }
    }
    finishLeave();
  }, [token, userId, finishLeave]);

  // The copy Save & Leave saved, while it is still the open project: pressed
  // again (its work couldn't be set aside, below), it saves over that copy
  // instead of making another.
  const savedCopyRef = useRef<string | null>(null);

  const handleSaveAndLeave = useCallback(async () => {
    if (!token) {
      showError('You must be signed in to save.');
      return;
    }
    setSaving(true);
    try {
      // Force a brand-new project owned by THIS user — never overwrite the
      // host's project.
      if (useStore.getState().projectId !== savedCopyRef.current) {
        useStore.getState().setProjectId(null);
      }
      savedCopyRef.current = (await saveCurrentProjectToCloud(token)).id;
    } catch (err) {
      if (err instanceof SaveSupersededError) {
        setSaving(false);
        return;
      }
      showError(
        `Save failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
      setSaving(false);
      return;
    }
    // Today's cloud payload has no place for the chord lane, the mode, the
    // metre, markers, mastering, the Score and Lead Sheet marks, the Prism
    // progression and the rest that only milestone 1.5's document carries,
    // so a project holding any of them was saved only in part (D7), and the
    // reset clears the autosave, the only other copy of what was left out.
    // Such a session goes to a kept slot first, as when a link replaces it
    // (one that gives way to other kept work first: the cloud holds the
    // rest). A project saved whole has nothing to keep.
    const kept = keepOutgoingSession(userId);
    if (kept.status === 'failed') {
      showError(
        "Saved to your projects, but not all of this session fits in a cloud copy yet, and the rest couldn't be set aside on this device, so it's still open.",
      );
      setSaving(false);
      return;
    }
    showSuccess('Saved to your projects');
    // The reset reloads the page, so the kept-work toast (with Restore)
    // waits for the editor's next boot.
    if (kept.status === 'kept') announceKeptWorkAfterReload(kept.slot);
    finishLeave();
  }, [token, userId, finishLeave]);

  return createPortal(
    <AnimatePresence>
      {pending && (
        <>
          {/* Backdrop — non-dismissable; the user must make a choice. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Centering wrapper — flex (not translate) so framer-motion's scale
              animation can't clobber the centering transform. */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal: an opaque card, its tokens from body.daw-active. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto flex w-[360px] flex-col gap-4 rounded-xl p-5 shadow-2xl"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <LogOut
                  size={14}
                  strokeWidth={2}
                  style={{ color: 'var(--color-text)' }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text)' }}
                >
                  Save project before leaving?
                </span>
              </div>

              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {hostLeft
                  ? 'The host ended the session. '
                  : "You're about to leave the collaborative session. "}
                Save a copy to your own account before you go — you'll continue
                in a new solo project.
              </p>

              {/* Actions. Saving is the choice that keeps the work, so it is
                  the one white pill; the others stay quiet, with no inline
                  background so their hover step shows. */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => void handleSaveAndLeave()}
                  disabled={saving}
                  className="rounded-full py-2 text-xs font-semibold transition-[filter] hover:brightness-90 disabled:opacity-50"
                  style={{
                    backgroundColor: '#fff',
                    color: '#101012',
                    border: 'none',
                  }}
                >
                  {saving ? 'Saving…' : 'Save & Leave'}
                </button>
                <button
                  onClick={() => void handleDiscardSessionChanges()}
                  disabled={saving}
                  className="rounded-full py-2 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                  style={{
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  Discard this session's changes
                </button>
                {!hostLeft && (
                  <button
                    onClick={() => setLeavePrompt(false)}
                    disabled={saving}
                    className="rounded-full py-1.5 text-xs transition-colors hover:bg-white/5 disabled:opacity-50"
                    style={{ color: 'var(--color-text-dim)', border: 'none' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
