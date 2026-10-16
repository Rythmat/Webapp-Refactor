// ── The Share pill (milestone 2.5; CollabToolbar until then) ───────────────
// Out of a session: 'Share', a popover to start one (the white pill) or
// join one with a code. In a session: the people in it (their initials in
// their presence colours, a count and the connection's dot), a popover with
// Invite, People, Chat and Leave. The People and Chat columns stay where
// they were, beside the Inspector, until 2.8's Session tab.
//
// The Share menu leaves room for Stage D's "Assign to a class…" (4.2).

import { useCallback, useEffect, useState } from 'react';
import { Link2, LogOut, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store/index';
import { openSession } from '@/daw/session/openSession';
import { useCollab } from '@/daw/collab/CollabProvider';
import { useCollaboratorCount, useRemoteUsers } from '@/daw/collab/presence';
import { InviteModal } from '@/daw/collab/ui/InviteModal';
import { Button, buttonVariants } from '@/daw/ui/Button';
import { onColor } from '@/daw/ui/color';
import { Popover, PopoverContent, PopoverTrigger } from '@/daw/ui/Popover';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';

/**
 * The room code in what the student typed or pasted: the code itself, or a
 * session link that carries it (`…/studio/editor?collab=<code>`).
 */
export function joinCodeOf(typed: string): string {
  const text = typed.trim();
  if (!text.includes('collab=')) return text;
  try {
    const url = new URL(text, 'https://x.invalid');
    return url.searchParams.get('collab')?.trim() || text;
  } catch {
    return text;
  }
}

/** Up to two letters for an avatar: 'Ana Lee' → 'AL'. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : words[0]?.slice(0, 2);
  return (letters ?? '?').toUpperCase();
}

const MAX_FACES = 3;

const ROW = cn(
  'flex h-7 w-full items-center gap-2 rounded-[var(--daw-radius-sm)] px-2 text-left text-daw-text hover:bg-daw-hover [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-daw-text-2',
  TYPE_CLASS.body,
  TRANSITION,
  FOCUS_RING,
);

export function SharePill({ iconOnly = false }: { iconOnly?: boolean }) {
  const isActive = useStore((s) => s.isCollabActive);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const unreadCount = useStore((s) => s.unreadChatCount);
  const roomError = useStore((s) => s.roomError);
  const setRoomError = useStore((s) => s._setRoomError);
  const setLeavePrompt = useStore((s) => s._setLeavePrompt);
  const userListOpen = useStore((s) => s.userListOpen);
  const chatPanelOpen = useStore((s) => s.chatPanelOpen);
  const toggleUserList = useStore((s) => s.toggleUserList);
  const toggleChatPanel = useStore((s) => s.toggleChatPanel);
  const collaboratorCount = useCollaboratorCount();
  const remoteUsers = useRemoteUsers();
  const { createAndJoinRoom } = useCollab();
  // E15: membership is the room id. A Join while one is set is off.
  const inRoom = useStore((s) => s.roomId !== null);
  const inviteRequested = useStore((s) => s.inviteRequested);
  const setInviteRequested = useStore((s) => s._setInviteRequested);
  const [open, setOpen] = useState(false);
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

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next) setRoomError(null);
      setOpen(next);
    },
    [setRoomError],
  );

  const handleCreateSession = useCallback(() => {
    createAndJoinRoom();
    setOpen(false);
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
    setOpen(false);
    const outcome = await openSession(
      { kind: 'collab', code, host: false, jamImport: false, awaitHost: false },
      { source: 'toolbar' },
    );
    if (outcome.status === 'ready') setJoinId('');
  }, [joinId, setRoomError]);

  const faces = remoteUsers.slice(0, MAX_FACES);
  const label = isActive
    ? `Session: ${collaboratorCount} ${collaboratorCount === 1 ? 'person' : 'people'}${connectionStatus === 'connecting' ? ', connecting' : ''}`
    : 'Share';

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        <Tooltip
          content={isActive ? label : 'Work on this together'}
          side="bottom"
        >
          <PopoverTrigger
            aria-label={label}
            data-testid="share-pill"
            data-in-session={isActive || undefined}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'md' }),
              TYPE_CLASS.label,
              iconOnly && !isActive ? 'w-7 px-0' : 'px-2.5',
            )}
          >
            {isActive ? (
              <>
                <span className="flex -space-x-1.5" aria-hidden>
                  {faces.map((user) => (
                    <span
                      key={user.userId}
                      data-meaning="presence"
                      className="flex size-5 items-center justify-center rounded-full font-bold ring-2 ring-daw-bg"
                      style={{
                        backgroundColor: user.color,
                        color: onColor(user.color),
                        fontSize: 'var(--daw-font-micro)',
                      }}
                    >
                      {initialsOf(user.userName)}
                    </span>
                  ))}
                </span>
                <span className="tabular-nums">{collaboratorCount}</span>
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 rounded-full',
                    connectionStatus === 'connected'
                      ? 'bg-daw-success'
                      : 'bg-daw-warning motion-safe:animate-pulse',
                  )}
                />
                {unreadCount > 0 ? (
                  <span className="sr-only">{unreadCount} unread</span>
                ) : null}
              </>
            ) : (
              <>
                <Users aria-hidden />
                {iconOnly ? null : 'Share'}
              </>
            )}
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          align="end"
          sideOffset={6}
          data-testid="collab-popover"
          data-ds="v2"
          className="w-64"
        >
          {isActive ? (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                className={ROW}
                onClick={() => {
                  setOpen(false);
                  setInviteOpen(true);
                }}
              >
                <Link2 aria-hidden />
                Invite…
              </button>
              <button
                type="button"
                className={ROW}
                aria-pressed={userListOpen}
                onClick={toggleUserList}
              >
                <Users aria-hidden />
                <span className="flex-1">People</span>
                {userListOpen ? (
                  <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
                    Shown
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className={ROW}
                aria-pressed={chatPanelOpen}
                onClick={toggleChatPanel}
              >
                <MessageSquare aria-hidden />
                <span className="flex-1">Chat</span>
                {unreadCount > 0 ? (
                  <span
                    className={cn(
                      TYPE_CLASS.label,
                      'rounded-full bg-daw-primary px-1.5 font-bold text-daw-on-primary',
                    )}
                  >
                    {unreadCount}
                  </span>
                ) : chatPanelOpen ? (
                  <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
                    Shown
                  </span>
                ) : null}
              </button>
              <div className="-mx-1 my-1 h-px bg-daw-hairline" />
              <button
                type="button"
                className={cn(
                  ROW,
                  'text-daw-danger-text [&_svg]:text-daw-danger-text',
                )}
                onClick={() => {
                  setOpen(false);
                  setLeavePrompt(true);
                }}
              >
                <LogOut aria-hidden />
                Leave session…
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button variant="primary" onClick={handleCreateSession}>
                Start a session
              </Button>
              <div className="h-px bg-daw-hairline" />
              <label className="flex flex-col gap-1.5">
                <span className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>
                  Join with a code
                </span>
                <div className="flex items-center gap-1.5">
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
                    placeholder="Code or link"
                    spellCheck={false}
                    autoComplete="off"
                    className={cn(
                      'h-7 min-w-0 flex-1 rounded-[var(--daw-radius-sm)] border border-daw-outline bg-transparent px-2 text-daw-text placeholder:text-daw-text-3',
                      TYPE_CLASS.body,
                      FOCUS_RING,
                    )}
                  />
                  <Button
                    onClick={() => void handleJoinRoom()}
                    disabled={!joinId.trim() || inRoom}
                  >
                    Join
                  </Button>
                </div>
              </label>
              {roomError && (
                <span
                  role="alert"
                  className={cn(TYPE_CLASS.label, 'text-daw-danger-text')}
                >
                  {roomError}
                </span>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
