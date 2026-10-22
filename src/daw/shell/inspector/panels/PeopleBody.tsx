import { Check, Copy, Link2, LogOut, Users } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { cn } from '@/components/utilities';
import { useCollab } from '@/daw/collab/CollabProvider';
import { useRemoteUsers } from '@/daw/collab/presence';
import type { UserActivity } from '@/daw/collab/types';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TYPE_CLASS } from '@/daw/ui/styles';
import { initialsOf, joinCodeOf } from '@/daw/collab/ui/people';
import { openSession } from '@/daw/session/openSession';

// ── The People panel (B4a; the collab UserList column until then) ──────────
//
// Who is in the session, what each is doing, the connection, the room code
// to share, Invite and Leave. Out of a session it offers to start one (the
// invite opens once the room exists) or to join one with a code. It is the
// one place for sessions since the top bar's Share pill went (owner,
// 2026-10-21: "this already is in the side rail").

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
      <div className="flex min-h-0 flex-1 flex-col">
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
        <JoinWithCode />
      </div>
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
          No one else is here yet. Share the room code, or invite someone.
        </p>
      ) : null}
      <div className="flex shrink-0 items-center gap-2 border-t border-daw-hairline px-3 py-2">
        <Button
          variant="secondary"
          data-testid="people-invite"
          onClick={() => useStore.getState()._setInviteRequested(true)}
        >
          <Link2 aria-hidden />
          Invite…
        </Button>
        <Button
          variant="quiet"
          data-testid="people-leave"
          className="ml-auto text-daw-danger-text hover:text-daw-danger-text"
          onClick={() => useStore.getState()._setLeavePrompt(true)}
        >
          <LogOut aria-hidden />
          Leave session…
        </Button>
      </div>
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

/**
 * Join with a code: opens the room's session through openSession (milestone
 * 1.4), off while a room is joined (E15). The code is cleared only once the
 * session opened, so a refused join leaves it there to fix; a pasted session
 * link joins by the code it carries.
 */
function JoinWithCode() {
  const inRoom = useStore((s) => s.roomId !== null);
  const roomError = useStore((s) => s.roomError);
  const setRoomError = useStore((s) => s._setRoomError);
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const join = useCallback(async () => {
    const code = joinCodeOf(typed);
    if (!code || useStore.getState().roomId !== null) return;
    setRoomError(null);
    const outcome = await openSession(
      { kind: 'collab', code, host: false, jamImport: false, awaitHost: false },
      { source: 'toolbar' },
    );
    if (outcome.status === 'ready') setTyped('');
  }, [typed, setRoomError]);
  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-t border-daw-hairline px-3 py-3">
      <label
        htmlFor={inputId}
        className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}
      >
        Join with a code
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={inputId}
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            if (roomError) setRoomError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void join();
          }}
          disabled={inRoom}
          placeholder="Code or link"
          spellCheck={false}
          autoComplete="off"
          data-testid="people-join-code"
          className={cn(
            'h-7 min-w-0 flex-1 rounded-[var(--daw-radius-sm)] border border-daw-outline bg-transparent px-2 text-daw-text placeholder:text-daw-text-3',
            TYPE_CLASS.body,
            FOCUS_RING,
          )}
        />
        <Button onClick={() => void join()} disabled={!typed.trim() || inRoom}>
          Join
        </Button>
      </div>
      {roomError ? (
        <span
          role="alert"
          className={cn(TYPE_CLASS.label, 'text-daw-danger-text')}
        >
          {roomError}
        </span>
      ) : null}
    </div>
  );
}
