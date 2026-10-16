// ── InviteModal ──────────────────────────────────────────────────────────
// Modal for bringing collaborators into the current session: share the room
// code that others type into "Join Room", or a link that opens the session.
//
// This used to also search users by name and send them an in-app invite via
// `POST /api/collab/rooms/:id/invite-user`. That path has been removed — it
// stored the invite under the recipient's `User.id` UUID while the invite inbox
// read from a key built out of the recipient's Auth0 `sub`, so no invite was
// ever delivered. The room code is how sessions are actually joined.

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link } from 'lucide-react';
import { StudioRoutes } from '@/constants/routes';
import { useStore } from '@/daw/store/index';
import { Button } from '@/daw/ui/Button';
import { DawDialog } from '@/daw/ui/DawDialog';
import { TYPE_CLASS } from '@/daw/ui/styles';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

/** The editor link that joins this room (parseBootIntent's ?collab=). */
export function inviteLinkFor(roomCode: string, origin: string): string {
  return `${origin}${StudioRoutes.editor()}?collab=${encodeURIComponent(roomCode)}`;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  // The room code another user types into "Join Room" to join this session.
  const roomCode = useStore((s) => s.roomCode);

  // Reset transient state on open.
  useEffect(() => {
    if (open) setCopied(null);
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(
    async (what: 'code' | 'link') => {
      if (!roomCode) return;
      await copyText(
        what === 'code'
          ? roomCode
          : inviteLinkFor(roomCode, window.location.origin),
      );
      setCopied(what);
    },
    [roomCode],
  );

  return (
    <DawDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="sm"
      title="Invite collaborators"
      description="Share the room code, or send the link: it opens this session in the Studio."
      footer={
        <Button
          variant="primary"
          disabled={!roomCode}
          onClick={() => void copy('link')}
        >
          {copied === 'link' ? <Check /> : <Link />}
          {copied === 'link' ? 'Link copied' : 'Copy invite link'}
        </Button>
      }
    >
      <div className="flex flex-col gap-1.5">
        <span
          className={TYPE_CLASS.micro}
          style={{ color: 'var(--daw-text-3)' }}
        >
          Room code
        </span>
        <div className="flex items-center gap-2">
          <div
            className={`flex-1 rounded-[var(--daw-radius-md)] px-3 py-2 text-center tracking-[0.3em] ${TYPE_CLASS.heading}`}
            style={{
              backgroundColor: 'var(--daw-surface-2)',
              color: 'var(--daw-text)',
            }}
          >
            {roomCode ?? '—'}
          </div>
          <Button disabled={!roomCode} onClick={() => void copy('code')}>
            {copied === 'code' ? <Check /> : <Copy />}
            {copied === 'code' ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <span
          className={TYPE_CLASS.label}
          style={{ color: 'var(--daw-text-3)' }}
        >
          They can also join from Start Collaboration → Join Room.
        </span>
      </div>
    </DawDialog>
  );
}
