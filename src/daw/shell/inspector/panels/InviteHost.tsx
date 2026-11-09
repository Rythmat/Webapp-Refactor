import { useEffect } from 'react';
import { useStore } from '@/daw/store';

// ── Where an invite asked for elsewhere lands ──────────────────────────────
//
// Mounted with the top bar, so it is there whether the People panel is open
// or not. A session started away from the panel (a ?collab=new boot) asks
// for the invite through `inviteRequested`; it brings the People panel
// forward, where the session's code is to copy, and clears the flag. The
// Invite collaborators dialog went (owner, 2026-10-25): the code is made and
// copied in the panel itself.

export function InviteHost() {
  const requested = useStore((s) => s.inviteRequested);
  useEffect(() => {
    if (!requested) return;
    const s = useStore.getState();
    s.showInspectorPanel('people');
    s._setInviteRequested(false);
  }, [requested]);
  return null;
}
