import { useEffect, useState } from 'react';
import { InviteModal } from '@/daw/collab/ui/InviteModal';
import { useStore } from '@/daw/store';

// ── The invite dialog's one instance ────────────────────────────────────────
//
// Mounted with the top bar, so it is there whether the People panel is open
// or not: the People panel's Start a session and Invite, and the Studio
// Dashboard's "Start a Session", ask for it through `inviteRequested`. It
// opens once per request and clears the flag, so it never reopens by itself.
// (The Share pill held it until the floating frame's top bar, 2026-10-21.)

export function InviteHost() {
  const requested = useStore((s) => s.inviteRequested);
  const clear = useStore((s) => s._setInviteRequested);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!requested) return;
    setOpen(true);
    clear(false);
  }, [requested, clear]);
  return <InviteModal open={open} onClose={() => setOpen(false)} />;
}
