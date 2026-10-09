// ── LeaveSavePrompt ──────────────────────────────────────────────────────
// Save-before-leaving modal. Shown when the local user clicks "Leave Session"
// or when the host disconnects. Saving stores a copy to the user's OWN account;
// either choice then leaves the room and continues in a new blank project, in
// place (openSession, source 'leave-collab': no reload). The room is left
// before the reset, so the empty project never reaches the room. Work the
// cloud copy can't hold yet, or a session that began with the student's own
// work, is kept as a device draft with a Restore, as when a link replaces it.

import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useStore } from '@/daw/store/index';
import { useDawBodyTokens } from '@/daw/hooks/useDawBodyTokens';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { saveProject } from '@/daw/commands/saveProject';
import { openSession } from '@/daw/session/openSession';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import { showSuccess } from '@/components/utils/toast';

/**
 * Leave the room and continue in a new blank project. The prompt closes as
 * the open starts (the Opening overlay shows the rest); when the open is
 * refused (the work open now couldn't be kept on this device, which a toast
 * says) and the room is still joined, it comes back. True once left.
 */
async function leaveToNewProject(keep: 'auto' | 'discard'): Promise<boolean> {
  useStore.getState()._setLeavePrompt(false);
  const outcome = await openSession(
    { kind: 'new' },
    { source: 'leave-collab', keep },
  );
  if (outcome.status === 'ready' || outcome.status === 'failed') return true;
  if (useStore.getState().roomId !== null) {
    useStore.getState()._setLeavePrompt(true);
  }
  return false;
}

export function LeaveSavePrompt() {
  const pending = useStore((s) => s.leavePromptPending);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const setLeavePrompt = useStore((s) => s._setLeavePrompt);
  const token = useAuthToken();
  const [saving, setSaving] = useState(false);
  // Portaled to <body>, outside .daw-root: it holds the DAW tokens there
  // itself, and for as long as it is mounted, so the card stays opaque
  // through its exit animation too.
  useDawBodyTokens();

  // The host disconnecting flips us to 'disconnected'. In that case the session
  // is already over, so there's nothing to cancel back into.
  const hostLeft = connectionStatus !== 'connected';

  // "Discard this session's changes": the session is being abandoned.
  // Nothing from before the session may go with it.
  // - A session that started from an empty project and was never saved
  //   holds only session work. Reclaim the draft it minted (on the first
  //   record-stop or upload) along with the assets only that draft uses —
  //   the server keeps any asset another, saved project still references,
  //   so a collaborator who DID save is unaffected — and keep nothing of it
  //   on this device (keep 'discard').
  // - Any other session may hold the student's own work: a host's room is
  //   seeded from their project, a joiner who leaves before the first sync
  //   still has theirs, and a saved session's draft is their saved project.
  //   Its cloud draft stays in their library, and what differs from it is
  //   kept on this device, as when a link replaces it (owner decision 6).
  const handleDiscardSessionChanges = useCallback(async () => {
    const { sessionStartedEmpty, sessionSaved, sessionDraftProjectId } =
      useStore.getState();
    const onlySessionWork = sessionStartedEmpty && !sessionSaved;
    const toDelete = onlySessionWork && token ? sessionDraftProjectId : null;
    setSaving(true);
    // Leave first: the open can still be refused (a take that won't
    // finish) or superseded, and the student is then still in the room,
    // where peers play this student's takes from that project's assets.
    const left = await leaveToNewProject(onlySessionWork ? 'discard' : 'auto');
    if (left && toDelete && token) {
      try {
        await studioProjectsApi.remove(token, toDelete);
      } catch (err) {
        // Best-effort cleanup — never block leaving on it. The hourly orphan
        // cron is the backstop for anything left behind.
        console.warn(
          '[leave] failed to delete unsaved draft project',
          err instanceof Error ? err.message : err,
        );
      }
    }
    setSaving(false);
  }, [token]);

  // The copy Save & Leave saved, while it is still the open project: pressed
  // again (the leave was refused, below), it saves over that copy instead of
  // making another.
  const savedCopyRef = useRef<string | null>(null);

  // A copy owned by THIS student, never the host's project. saveProject
  // words a failure itself (and says nothing when another open superseded
  // it); a session saved only in part is kept on this device by the leave
  // (keep 'auto': what isn't the same as its cloud copy is work).
  const handleSaveAndLeave = useCallback(async () => {
    setSaving(true);
    const again =
      savedCopyRef.current !== null &&
      useStore.getState().projectId === savedCopyRef.current;
    const result = await saveProject(
      again ? { source: 'leave' } : { source: 'leave', asNewProject: true },
    );
    if (result.status !== 'saved') {
      setSaving(false);
      return;
    }
    savedCopyRef.current = result.projectId;
    showSuccess('Saved to your projects');
    await leaveToNewProject('auto');
    setSaving(false);
  }, []);

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
