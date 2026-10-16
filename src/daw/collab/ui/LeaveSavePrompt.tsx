// ── LeaveSavePrompt ──────────────────────────────────────────────────────
// Save-before-leaving modal. Shown when the local user clicks "Leave Session"
// or when the host disconnects. Saving stores a copy to the user's OWN account;
// either choice then leaves the room and continues in a new blank project, in
// place (openSession, source 'leave-collab': no reload). The room is left
// before the reset, so the empty project never reaches the room. Work the
// cloud copy can't hold yet, or a session that began with the student's own
// work, is kept as a device draft with a Restore, as when a link replaces it.

import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/daw/store/index';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { saveProject } from '@/daw/commands/saveProject';
import { openSession } from '@/daw/session/openSession';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import { showSuccess } from '@/components/utils/toast';
import { Button } from '@/daw/ui/Button';
import { DawDialog } from '@/daw/ui/DawDialog';

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

  // Saving is the choice that keeps the work, so it is the one white pill.
  // When the host has left there is no session to go back to: no Cancel,
  // and the dialog can't be closed without a choice.
  return (
    <DawDialog
      open={pending}
      onOpenChange={(next) => {
        if (!next && !hostLeft && !saving) setLeavePrompt(false);
      }}
      closable={!hostLeft}
      dismissible={false}
      size="sm"
      title="Save project before leaving?"
      description={`${
        hostLeft
          ? 'The host ended the session. '
          : "You're about to leave the collaborative session. "
      }Save a copy to your own account before you go. You'll continue in a new solo project.`}
      footer={
        <>
          {!hostLeft && (
            <Button
              variant="quiet"
              className="mr-auto"
              onClick={() => setLeavePrompt(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={() => void handleDiscardSessionChanges()}
            disabled={saving}
          >
            Discard this session's changes
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSaveAndLeave()}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save & Leave'}
          </Button>
        </>
      }
    />
  );
}
