import { Check, Copy, LogOut, Users } from 'lucide-react';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { PromptPillButton } from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { useCollab } from '@/daw/collab/CollabProvider';
import { useRemoteUsers } from '@/daw/collab/presence';
import type { UserActivity } from '@/daw/collab/types';
import { useStore } from '@/daw/store';
import { initialsOf, joinCodeOf } from '@/daw/collab/ui/people';
import { openSession } from '@/daw/session/openSession';
import { ChatCard } from './ChatCard';

// ── The People panel (B4a; the collab UserList column until then) ──────────
//
// Who is in the session, what each is doing, the connection, the code to
// share, the session's chat (ChatCard; its own panel until 2026-10-25), and
// Leave. Out of a session it offers to start one, whose button
// then shows the session's code to copy, or to join one with a code. It is the
// one place for sessions since the top bar's Share pill went (owner,
// 2026-10-21: "this already is in the side rail"). It wears Insight's
// design (InsightCard): each part is the prompt box's card, with its
// statement in 15 px white, the rest in quieter 13 px, and round pills.

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

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-emerald-400',
  connecting: 'bg-white/40',
  disconnected: 'bg-red-400',
};

/** The panel's column of cards, scrolling as Insight's does. */
function Cards({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      style={{ scrollbarWidth: 'thin' }}
    >
      <div className="flex flex-col gap-2 p-2">{children}</div>
    </div>
  );
}

export function PeopleBody() {
  const active = useStore((s) => s.isCollabActive);
  const remoteUsers = useRemoteUsers();
  const status = useStore((s) => s.connectionStatus);
  const roomCode = useStore((s) => s.roomCode);
  const { createAndJoinRoom } = useCollab();
  // The code is the session's from the click on (createAndJoinRoom makes
  // it), before the room's server has answered.
  const inRoom = active || roomCode !== null;

  return (
    <Cards>
      {/* Start a session, then its code in the button's place: a click
          copies it (owner, 2026-10-25; the Invite dialog went). */}
      <InsightCard className="items-center px-6 py-8 text-center">
        <Users aria-hidden className="size-5 text-white/40" />
        <p className={cn(INSIGHT_TEXT, 'font-medium')}>
          {roomCode ? 'Invite people' : 'Make music together'}
        </p>
        <p className={INSIGHT_DIM}>
          {roomCode
            ? 'Share this code: whoever joins with it edits this project with you.'
            : 'Start a session and invite people: everyone edits this project at once.'}
        </p>
        {roomCode ? (
          <InviteCode code={roomCode} />
        ) : (
          <PromptPillButton
            variant="primary"
            data-testid="people-start-session"
            className="mt-1"
            onClick={createAndJoinRoom}
          >
            Start a session
          </PromptPillButton>
        )}
      </InsightCard>

      {inRoom ? (
        <InsightCard
          title="In the session"
          aside={
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  'size-2 rounded-full',
                  STATUS_DOT[status] ?? 'bg-white/40',
                )}
              />
              {STATUS[status] ?? status}
            </span>
          }
        >
          <ul
            aria-label="People in the session"
            className="flex flex-col gap-2"
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
            <p className={INSIGHT_DIM}>No one else is here yet.</p>
          ) : null}
          <PromptPillButton
            variant="ghost"
            data-testid="people-leave"
            className="-ml-1 gap-1.5 self-start px-2.5 text-red-300/80 hover:text-red-300"
            onClick={() => useStore.getState()._setLeavePrompt(true)}
          >
            <LogOut aria-hidden className="size-3.5" />
            Leave session…
          </PromptPillButton>
        </InsightCard>
      ) : (
        <JoinWithCode />
      )}
      {active ? <ChatCard /> : null}
    </Cards>
  );
}

/** The session's code, as the button Start a session was: a click copies it. */
function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard refused (an insecure page, a denied permission): the code
      // is on screen to type.
    }
  }, [code]);
  return (
    <div className="mt-1 flex flex-col items-center gap-1.5">
      <PromptPillButton
        variant="primary"
        data-testid="people-invite-code"
        aria-label={
          copied ? 'Invite code copied' : `Copy the invite code ${code}`
        }
        className="h-10 gap-2.5 px-5 text-[15px] tracking-[0.2em]"
        onClick={() => void copy()}
      >
        {code}
        {copied ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <Copy aria-hidden className="size-4 opacity-60" />
        )}
      </PromptPillButton>
      <span aria-live="polite" className="text-[12px] text-white/40">
        {copied ? 'Copied' : 'Click to copy'}
      </span>
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
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-daw-bg"
        style={{ backgroundColor: color }}
      >
        {initialsOf(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn(INSIGHT_TEXT, 'truncate')}>{name}</div>
        {self ? null : <div className={INSIGHT_DIM}>{ACTIVITY[activity]}</div>}
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
    <InsightCard title={<label htmlFor={inputId}>Join with a code</label>}>
      <div className="flex items-center gap-2">
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
          className="h-8 min-w-0 flex-1 rounded-full border border-white/10 bg-transparent px-3.5 text-[13px] text-white outline-none transition-colors placeholder:text-white/40 hover:border-white/20 focus-visible:border-white/25 focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50"
        />
        <PromptPillButton
          onClick={() => void join()}
          disabled={!typed.trim() || inRoom}
          className="disabled:pointer-events-none disabled:opacity-40"
        >
          Join
        </PromptPillButton>
      </div>
      {roomError ? (
        <p role="alert" className="text-[13px] leading-5 text-red-300">
          {roomError}
        </p>
      ) : null}
    </InsightCard>
  );
}
