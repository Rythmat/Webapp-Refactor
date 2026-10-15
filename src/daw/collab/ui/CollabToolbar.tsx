// ── CollabToolbar ────────────────────────────────────────────────────────
// Toolbar button for the TransportBar that shows collaboration status
// and opens the user list panel. Also provides join/leave functionality.

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Link2 } from 'lucide-react';
import { useStore } from '@/daw/store/index';
import { openSession } from '@/daw/session/openSession';
import { useCollab } from '../CollabProvider';
import { useCollaboratorCount } from '../presence';
import { InviteModal } from './InviteModal';

/**
 * The room code in what the student typed or pasted: the code itself, or a
 * session link that carries it (`…/studio/editor?collab=<code>`).
 */
function joinCodeOf(typed: string): string {
  const text = typed.trim();
  if (!text.includes('collab=')) return text;
  try {
    const url = new URL(text, 'https://x.invalid');
    return url.searchParams.get('collab')?.trim() || text;
  } catch {
    return text;
  }
}

interface CollabToolbarProps {
  onToggleUserList: () => void;
  userListOpen: boolean;
  onToggleChatPanel: () => void;
  chatPanelOpen: boolean;
}

export function CollabToolbar({
  onToggleUserList,
  userListOpen,
  onToggleChatPanel,
  chatPanelOpen,
}: CollabToolbarProps) {
  const isActive = useStore((s) => s.isCollabActive);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const unreadCount = useStore((s) => s.unreadChatCount);
  const roomError = useStore((s) => s.roomError);
  const setRoomError = useStore((s) => s._setRoomError);
  const setLeavePrompt = useStore((s) => s._setLeavePrompt);
  const collaboratorCount = useCollaboratorCount();
  const { createAndJoinRoom } = useCollab();
  // E15: membership is the room id. A Join while one is set is off.
  const inRoom = useStore((s) => s.roomId !== null);
  const inviteRequested = useStore((s) => s.inviteRequested);
  const setInviteRequested = useStore((s) => s._setInviteRequested);
  const [showCreatePopover, setShowCreatePopover] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinId, setJoinId] = useState('');

  // An external flow (Studio Dashboard "Start a Session") can request the invite
  // modal; open our single instance and clear the flag so it doesn't reopen.
  useEffect(() => {
    if (inviteRequested) {
      setInviteOpen(true);
      setInviteRequested(false);
    }
  }, [inviteRequested, setInviteRequested]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    if (isActive) {
      onToggleUserList();
    } else {
      setRoomError(null);
      setShowCreatePopover((prev) => !prev);
    }
  }, [isActive, onToggleUserList, setRoomError]);

  const handleCreateSession = useCallback(() => {
    createAndJoinRoom();
    setShowCreatePopover(false);
    setInviteOpen(true);
  }, [createAndJoinRoom]);

  // The Join opens the room's session through openSession (milestone 1.4):
  // the work open now is kept first, the Opening overlay shows the wait,
  // and a join that fails says why in the error panel.
  // The typed code is cleared only once the session opened: a refused join
  // (a mistyped code, a toast) leaves it there to fix.
  const handleJoinRoom = useCallback(async () => {
    const code = joinCodeOf(joinId);
    if (!code || useStore.getState().roomId !== null) return;
    setRoomError(null);
    setShowCreatePopover(false);
    const outcome = await openSession(
      { kind: 'collab', code, host: false, jamImport: false, awaitHost: false },
      { source: 'toolbar' },
    );
    if (outcome.status === 'ready') setJoinId('');
  }, [joinId, setRoomError]);

  // Close popover on outside click
  useEffect(() => {
    if (!showCreatePopover) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowCreatePopover(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showCreatePopover]);

  // Compute popover position from button rect
  const getPopoverStyle = (): React.CSSProperties => {
    if (!buttonRef.current) return { display: 'none' };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.right - 220,
      width: 220,
      zIndex: 9999,
      backgroundColor: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      backdropFilter: 'blur(24px)',
    };
  };

  return (
    <div className="flex items-center">
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        whileTap={{ scale: 0.85 }}
        className="flex h-7 items-center gap-1 rounded-md px-1 transition-colors hover:bg-white/5"
        style={{
          color:
            isActive || userListOpen
              ? 'var(--color-accent)'
              : 'var(--color-text-dim)',
        }}
        title={isActive ? `${collaboratorCount} online` : 'Start Collaboration'}
      >
        <Users size={13} strokeWidth={2} />
        {isActive && collaboratorCount > 1 && (
          <span className="text-[9px] font-medium tabular-nums">
            {collaboratorCount}
          </span>
        )}
        {connectionStatus === 'connecting' && (
          <div
            className="size-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: 'var(--color-meter-yellow)' }}
          />
        )}
      </motion.button>

      {/* Start Collaboration popover — rendered via portal to escape overflow-hidden */}
      {showCreatePopover &&
        !isActive &&
        createPortal(
          <div
            ref={popoverRef}
            className="flex flex-col gap-2 rounded-lg p-2 shadow-2xl"
            style={getPopoverStyle()}
          >
            <button
              onClick={handleCreateSession}
              className="rounded-full py-1.5 text-xs font-semibold transition-[filter] hover:brightness-90"
              style={{
                backgroundColor: '#fff',
                color: '#101012',
                border: 'none',
              }}
            >
              Create Session
            </button>

            {/* Divider */}
            <div
              className="h-px"
              style={{ backgroundColor: 'var(--color-border)' }}
            />

            {/* Join Room by id */}
            <span
              className="text-[9px] font-medium uppercase tracking-wide"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Join Room
            </span>
            <div className="flex items-center gap-1">
              <input
                value={joinId}
                onChange={(e) => {
                  setJoinId(e.target.value);
                  if (roomError) setRoomError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleJoinRoom();
                }}
                disabled={inRoom}
                placeholder="Enter room id"
                spellCheck={false}
                autoComplete="off"
                className="min-w-0 flex-1 rounded border bg-transparent px-1.5 py-1 text-[10px] outline-none"
                style={{
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)',
                }}
              />
              <button
                onClick={() => void handleJoinRoom()}
                disabled={!joinId.trim() || inRoom}
                className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/10 disabled:opacity-40"
                style={{
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  background: 'none',
                }}
              >
                Join
              </button>
            </div>
            {roomError && (
              <span
                className="text-[9px]"
                style={{ color: 'var(--color-record)' }}
              >
                {roomError}
              </span>
            )}
          </div>,
          document.body,
        )}

      {/* Chat toggle when connected */}
      {isActive && (
        <motion.button
          onClick={onToggleChatPanel}
          whileTap={{ scale: 0.85 }}
          className="flex h-7 items-center gap-1 rounded-md px-1 transition-colors hover:bg-white/5"
          style={{
            color: chatPanelOpen
              ? 'var(--color-accent)'
              : 'var(--color-text-dim)',
          }}
          title="Chat"
        >
          <MessageSquare size={13} strokeWidth={2} />
          {unreadCount > 0 && (
            // Dark on white, as on the white pill: white on teal was about 1.8:1.
            <span
              className="flex size-3 items-center justify-center rounded-full text-[7px] font-bold"
              style={{ backgroundColor: '#fff', color: '#101012' }}
            >
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* Invite button when connected */}
      {isActive && (
        <motion.button
          onClick={() => setInviteOpen(true)}
          whileTap={{ scale: 0.85 }}
          className="flex h-7 items-center gap-1 rounded-md px-1 transition-colors hover:bg-white/5"
          style={{ color: 'var(--color-text-dim)' }}
          title="Invite Collaborators"
        >
          <Link2 size={13} strokeWidth={2} />
        </motion.button>
      )}

      {/* Leave button when connected — opens the save-before-leaving prompt */}
      {isActive && (
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            setLeavePrompt(true);
          }}
          whileTap={{ scale: 0.85 }}
          className="ml-0.5 flex h-5 items-center rounded px-1 text-[8px] font-medium transition-colors hover:bg-red-500/10"
          style={{
            color: 'var(--color-record)',
            background: 'none',
            border: 'none',
          }}
          title="Leave Collaborative Session"
        >
          Leave Session
        </motion.button>
      )}

      {/* Invite modal */}
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
