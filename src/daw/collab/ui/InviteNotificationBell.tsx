// ── InviteNotificationBell ───────────────────────────────────────────────
// Bell icon that shows pending collab invites with accept/decline actions.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useCollab } from '../CollabProvider';
import { showSuccess, showError } from '@/util/toast';

interface PendingInvite {
  roomId: string;
  roomName: string;
  invitedBy: string;
  inviterName: string;
  role: 'editor' | 'viewer';
  createdAt: number;
}

const POLL_INTERVAL = 30_000; // 30 seconds

export function InviteNotificationBell() {
  const { token } = useAuthContext();
  const { joinRoom } = useCollab();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch pending invites
  const fetchInvites = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/collab/invites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { invites: PendingInvite[] };
        setInvites(data.invites);
      }
    } catch {
      // Silently fail
    }
  }, [token]);

  // Poll on interval and on window focus
  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, POLL_INTERVAL);
    const onFocus = () => fetchInvites();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchInvites]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Respond to an invite
  const handleRespond = useCallback(
    async (roomId: string, accept: boolean) => {
      if (!token || responding) return;
      setResponding(roomId);
      try {
        const res = await fetch('/api/collab/invites/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roomId, accept }),
        });

        if (res.ok) {
          setInvites((prev) => prev.filter((i) => i.roomId !== roomId));
          if (accept) {
            showSuccess('Joined session!');
            joinRoom(roomId, 'editor');
            setDropdownOpen(false);
          } else {
            showSuccess('Invite declined');
          }
        } else {
          showError('Failed to respond to invite');
        }
      } catch {
        showError('Failed to respond to invite');
      } finally {
        setResponding(null);
      }
    },
    [token, responding, joinRoom],
  );

  // Compute dropdown position from button rect
  const getDropdownStyle = (): React.CSSProperties => {
    if (!buttonRef.current) return { display: 'none' };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.right - 280,
      width: 280,
      zIndex: 9999,
      backgroundColor: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
    };
  };

  // Don't render if not authenticated
  if (!token) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setDropdownOpen((o) => !o)}
        className="relative flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/10"
        style={{
          color: 'var(--color-text-dim)',
          background: 'none',
          border: 'none',
        }}
        title="Collab invites"
      >
        <Bell size={14} strokeWidth={2} />
        {invites.length > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {invites.length}
          </span>
        )}
      </button>

      {/* Dropdown rendered via portal to escape overflow-hidden */}
      {dropdownOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden rounded-lg shadow-2xl"
              style={getDropdownStyle()}
            >
              <div
                className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color: 'var(--color-text-dim)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                Pending Invites
              </div>

              {invites.length === 0 ? (
                <div
                  className="px-3 py-4 text-center text-[11px]"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  No pending invites
                </div>
              ) : (
                <div className="flex max-h-[240px] flex-col overflow-y-auto">
                  {invites.map((invite) => (
                    <div
                      key={invite.roomId}
                      className="flex flex-col gap-1.5 px-3 py-2.5"
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: 'var(--color-text)' }}
                          >
                            {invite.roomName || 'Untitled Project'}
                          </span>
                          <span
                            className="text-[9px]"
                            style={{ color: 'var(--color-text-dim)' }}
                          >
                            from {invite.inviterName} &middot; {invite.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRespond(invite.roomId, true)}
                          disabled={responding === invite.roomId}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[9px] font-medium text-white transition-colors"
                          style={{
                            backgroundColor: 'var(--color-accent)',
                            border: 'none',
                            opacity: responding === invite.roomId ? 0.5 : 1,
                          }}
                        >
                          <Check size={9} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(invite.roomId, false)}
                          disabled={responding === invite.roomId}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[9px] font-medium transition-colors"
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text-dim)',
                            border: 'none',
                            opacity: responding === invite.roomId ? 0.5 : 1,
                          }}
                        >
                          <X size={9} />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
