// ── KickedModal ──────────────────────────────────────────────────────────
// Shown after the host removes the local user from a collaborative session.
// The session is already torn down (the user is back in a local studio); this
// just explains why.

import { useStore } from '@/daw/store/index';
import { ConfirmDialog } from '@/daw/ui/ConfirmDialog';

export function KickedModal() {
  const kicked = useStore((s) => s.kickedNotice);
  const setKicked = useStore((s) => s._setKickedNotice);

  return (
    <ConfirmDialog
      open={kicked}
      onOpenChange={(next) => {
        if (!next) setKicked(false);
      }}
      title="You left the session"
      description="The host removed you from the shared session, so you’re back in your own studio. Your own projects are just as you left them."
      confirmLabel="OK"
      cancelLabel={null}
      onConfirm={() => setKicked(false)}
    />
  );
}
