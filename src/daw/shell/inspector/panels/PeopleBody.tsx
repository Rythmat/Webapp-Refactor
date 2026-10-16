import { Check, Copy, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '@/components/utilities';
import { useCollab } from '@/daw/collab/CollabProvider';
import { useRemoteUsers } from '@/daw/collab/presence';
import type { UserActivity } from '@/daw/collab/types';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { IconButton } from '@/daw/ui/IconButton';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { initialsOf } from '../../topbar/SharePill';

// ── The People panel (B4a; the collab UserList column until then) ──────────
//
// Who is in the session, what each is doing, the connection and the room
// code to share. Out of a session it offers to start one, as Share does
// (the invite opens once the room exists).

const ACTIVITY: Record<UserActivity, string> = {
  idle: 'Idle',
  editing: 'Editing',
  recording: 'Recording',
  playing: 'Playing',
  mixing: 'Mixing',
};

const STATUS: Record<string, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Not connected',
};

export function PeopleBody() {
  const active = useStore((s) => s.isCollabActive);
  const remoteUsers = useRemoteUsers();
  const status = useStore((s) => s.connectionStatus);
  const roomCode = useStore((s) => s.roomCode);
  const { createAndJoinRoom } = useCollab();

  if (!active) {
    return (
      <EmptyState
        icon={<Users />}
        title="Make music together"
        description="Start a session and invite people: everyone edits this project at once."
        actions={
          <Button
            variant="primary"
            data-testid="people-start-session"
            onClick={() => {
              createAndJoinRoom();
              useStore.getState()._setInviteRequested(true);
            }}
          >
            Start a session
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-daw-hairline px-3 py-2">
        <span
          aria-hidden
          className={cn(
            'size-2 rounded-full',
            status === 'connected'
              ? 'bg-daw-success'
              : status === 'connecting'
                ? 'bg-daw-text-3'
                : 'bg-daw-record',
          )}
        />
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
          {STATUS[status] ?? status}
        </span>
      </div>
      {roomCode ? <RoomCode code={roomCode} /> : null}
      <ul
        aria-label="People in the session"
        className="min-h-0 flex-1 overflow-y-auto py-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        <Person name="You" color="var(--daw-text-2)" activity="idle" self />
        {remoteUsers.map((user) => (
          <Person
            key={user.userId}
            name={user.userName}
            color={user.color}
            activity={user.activity}
          />
        ))}
      </ul>
      {remoteUsers.length === 0 ? (
        <p className={cn(TYPE_CLASS.label, 'px-3 pb-3 text-daw-text-3')}>
          No one else is here yet. Share the room code or invite someone from
          Share.
        </p>
      ) : null}
    </div>
  );
}

function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused (an insecure page, a denied permission): the code
      // is on screen to type.
    }
  }, [code]);
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-daw-hairline px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>Room code</div>
        <div
          className={cn(
            TYPE_CLASS.body,
            'truncate font-bold tracking-[0.2em] text-daw-text',
          )}
        >
          {code}
        </div>
      </div>
      <IconButton
        label={copied ? 'Copied' : 'Copy the room code'}
        icon={copied ? <Check /> : <Copy />}
        tooltipSide="left"
        onClick={() => void copy()}
      />
    </div>
  );
}

function Person({
  name,
  color,
  activity,
  self = false,
}: {
  name: string;
  color: string;
  activity: UserActivity;
  self?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5 px-3 py-1.5">
      <span
        aria-hidden
        className={cn(
          TYPE_CLASS.micro,
          'flex size-7 shrink-0 items-center justify-center rounded-full text-daw-bg',
        )}
        style={{ backgroundColor: color }}
      >
        {initialsOf(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn(TYPE_CLASS.body, 'truncate text-daw-text')}>
          {name}
        </div>
        {self ? null : (
          <div className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
            {ACTIVITY[activity]}
          </div>
        )}
      </div>
    </li>
  );
}
