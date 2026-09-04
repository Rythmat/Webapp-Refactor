// ── InviteModal ──────────────────────────────────────────────────────────
// Modal for bringing collaborators into the current session: share the room
// code that others type into "Join Room".
//
// This used to also search users by name and send them an in-app invite via
// `POST /api/collab/rooms/:id/invite-user`. That path has been removed — it
// stored the invite under the recipient's `User.id` UUID while the invite inbox
// read from a key built out of the recipient's Auth0 `sub`, so no invite was
// ever delivered. The room code is how sessions are actually joined.

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, UserPlus, X } from 'lucide-react';
import { useStore } from '@/daw/store/index';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  // The room code another user types into "Join Room" to join this session.
  const roomCode = useStore((s) => s.roomCode);

  // Reset transient state on open.
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const handleCopyCode = useCallback(async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = roomCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomCode]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Centering wrapper — uses flex (not translate) so framer-motion's
              scale animation can't clobber the centering transform. The wrapper
              ignores pointer events so clicks outside the card hit the backdrop. */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onKeyDown={(e) => e.stopPropagation()}
              className="pointer-events-auto flex w-[380px] flex-col gap-4 rounded-xl p-5 shadow-2xl"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus
                    size={14}
                    strokeWidth={2}
                    style={{ color: 'var(--color-accent)' }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Invite Collaborators
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="flex size-5 items-center justify-center rounded transition-colors hover:bg-white/10"
                  style={{
                    color: 'var(--color-text-dim)',
                    background: 'none',
                    border: 'none',
                  }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>

              {/* Room code — share so others can join via Join Room */}
              <div className="flex flex-col gap-1.5">
                <span
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  Share this room code
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex-1 rounded-md px-3 py-2 text-center font-mono text-base font-semibold tracking-[0.3em]"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {roomCode ?? '—'}
                  </div>
                  <motion.button
                    onClick={handleCopyCode}
                    whileTap={{ scale: 0.9 }}
                    disabled={!roomCode}
                    className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5 disabled:opacity-40"
                    style={{
                      color: copied
                        ? 'var(--color-play)'
                        : 'var(--color-text-dim)',
                      background: 'none',
                      border: 'none',
                    }}
                    title="Copy room code"
                  >
                    {copied ? (
                      <Check size={12} strokeWidth={2.5} />
                    ) : (
                      <Copy size={12} strokeWidth={2} />
                    )}
                  </motion.button>
                </div>
                <span
                  className="text-[9px]"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  They can join from Start Collaboration → Join Room.
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
