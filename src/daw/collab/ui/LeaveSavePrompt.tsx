// ── LeaveSavePrompt ──────────────────────────────────────────────────────
// Save-before-leaving modal. Shown when the local user clicks "Leave Session"
// or when the host disconnects. Saving stores a copy to the user's OWN account;
// either choice then tears down the session and opens a fresh solo project.

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useStore } from '@/daw/store/index';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
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

  const handleSaveAndLeave = useCallback(async () => {
    if (!token) {
      showError('You must be signed in to save.');
      return;
    }
    setSaving(true);
    try {
      // Force a brand-new project owned by THIS user — never overwrite the
      // host's project.
      useStore.getState().setProjectId(null);
      await saveCurrentProjectToCloud(token);
      showSuccess('Saved to your projects');
      finishLeave();
    } catch (err) {
      showError(
        `Save failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
      setSaving(false);
    }
  }, [token, finishLeave]);

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
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto flex w-[360px] flex-col gap-4 rounded-xl p-5 shadow-2xl"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <LogOut
                  size={14}
                  strokeWidth={2}
                  style={{ color: 'var(--color-accent)' }}
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

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => void handleSaveAndLeave()}
                  disabled={saving}
                  className="rounded-md py-2 text-xs font-medium transition-colors hover:brightness-110 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  {saving ? 'Saving…' : 'Save & Leave'}
                </button>
                <button
                  onClick={() => void handleDiscardSessionChanges()}
                  disabled={saving}
                  className="rounded-md py-2 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                  style={{
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    background: 'none',
                  }}
                >
                  Discard this session's changes
                </button>
                {!hostLeft && (
                  <button
                    onClick={() => setLeavePrompt(false)}
                    disabled={saving}
                    className="rounded-md py-1.5 text-[11px] transition-colors hover:bg-white/5 disabled:opacity-50"
                    style={{
                      color: 'var(--color-text-dim)',
                      background: 'none',
                      border: 'none',
                    }}
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
