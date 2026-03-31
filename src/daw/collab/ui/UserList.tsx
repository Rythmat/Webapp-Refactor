// ── UserList ─────────────────────────────────────────────────────────────
// Sidebar panel showing all online collaborators with their current
// activity and presence state. Follows the LibraryPanel pattern.

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useRemoteUsers } from '../presence';
import { useStore } from '@/daw/store/index';
import type { UserActivity } from '../types';

const SPRING = { type: 'spring' as const, stiffness: 350, damping: 30 };

const ACTIVITY_LABELS: Record<UserActivity, string> = {
  idle: 'Idle',
  editing: 'Editing',
  recording: 'Recording',
  playing: 'Playing',
  mixing: 'Mixing',
};

interface UserListProps {
  open: boolean;
  onClose: () => void;
}

export function UserList({ open, onClose }: UserListProps) {
  const remoteUsers = useRemoteUsers();
  const connectionStatus = useStore((s) => s.connectionStatus);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 200, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={SPRING}
          className="flex shrink-0 flex-col overflow-hidden border-l"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between border-b px-3"
            style={{
              height: 28,
              borderColor: 'var(--color-border)',
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Collaborators
            </span>
            <button
              onClick={onClose}
              className="flex size-4 items-center justify-center rounded transition-colors hover:bg-white/10"
              style={{
                color: 'var(--color-text-dim)',
                background: 'none',
                border: 'none',
              }}
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </div>

          {/* Connection status */}
          <div
            className="flex items-center gap-1.5 border-b px-3 py-1.5"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="size-1.5 rounded-full"
              style={{
                backgroundColor:
                  connectionStatus === 'connected'
                    ? '#22c55e'
                    : connectionStatus === 'connecting'
                      ? '#f59e0b'
                      : '#ef4444',
              }}
            />
            <span
              className="text-[9px] capitalize"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {connectionStatus}
            </span>
          </div>

          {/* User list */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Self */}
            <UserRow
              name="You"
              color="var(--color-accent)"
              activity="idle"
              isSelf
            />

            {/* Remote users */}
            {remoteUsers.map((user) => (
              <UserRow
                key={user.userId}
                name={user.userName}
                color={user.color}
                activity={user.activity}
              />
            ))}

            {remoteUsers.length === 0 && (
              <div
                className="px-3 py-4 text-center text-[10px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                No other users online
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── UserRow ─────────────────────────────────────────────────────────────

function UserRow({
  name,
  color,
  activity,
  isSelf = false,
}: {
  name: string;
  color: string;
  activity: UserActivity;
  isSelf?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-white/5"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      {/* Avatar dot */}
      <div
        className="size-5 shrink-0 rounded-full"
        style={{
          backgroundColor: color,
          opacity: isSelf ? 0.7 : 1,
        }}
      />
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[10px] font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          {name}
        </div>
        <div className="text-[8px]" style={{ color: 'var(--color-text-dim)' }}>
          {ACTIVITY_LABELS[activity]}
        </div>
      </div>
    </div>
  );
}
