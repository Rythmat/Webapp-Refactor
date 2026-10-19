import { MessageSquare, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useCollab } from '@/daw/collab/CollabProvider';
import type { ChatMessage } from '@/daw/collab/types';
import { useStore } from '@/daw/store';
import { EmptyState } from '@/daw/ui/EmptyState';
import { IconButton } from '@/daw/ui/IconButton';
import { TYPE_CLASS } from '@/daw/ui/styles';

// ── The Chat panel (B4a; the collab ChatPanel column until then) ───────────
//
// The session's chat: messages live in the room's shared Yjs array, so they
// last across reconnects. Showing the panel marks them read (the rail's
// badge counts the rest). Out of a session there is no one to talk to, so
// it says how to start one.

export function ChatBody() {
  const active = useStore((s) => s.isCollabActive);
  if (!active) {
    return (
      <EmptyState
        icon={<MessageSquare />}
        title="No session yet"
        description="Chat opens when you share this project: start a session from People or Share."
      />
    );
  }
  return <SessionChat />;
}

function SessionChat() {
  const messages = useStore((s) => s.chatMessages);
  const markRead = useStore((s) => s.markChatRead);
  const { sendChatMessage } = useCollab();
  const { userId } = useAuthContext();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Showing the panel reads what's there, and what arrives while it shows.
  useEffect(() => {
    markRead();
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, markRead]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    // Pushes to the shared Yjs chat array; its observer mirrors it into the
    // store for us and everyone else in the room.
    sendChatMessage(text);
    setInput('');
  }, [input, sendChatMessage]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        role="log"
        aria-label="Messages"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <p
            className={cn(TYPE_CLASS.body, 'py-4 text-center text-daw-text-3')}
          >
            No messages yet
          </p>
        ) : null}
        {messages.map((msg) => (
          <Message
            key={msg.id}
            message={msg}
            self={!!userId && msg.userId === userId}
          />
        ))}
      </div>
      <form
        className="flex shrink-0 items-center gap-1 border-t border-daw-hairline p-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message"
          placeholder="Message…"
          data-testid="chat-input"
          className={cn(
            TYPE_CLASS.body,
            'h-8 min-w-0 flex-1 rounded-[var(--daw-radius-sm)] border border-daw-outline bg-daw-surface-2 px-2 text-daw-text outline-none placeholder:text-daw-text-3 focus:border-daw-text-2',
          )}
        />
        <IconButton
          type="submit"
          label="Send"
          icon={<Send />}
          disabled={!input.trim()}
          tooltipSide="left"
        />
      </form>
    </div>
  );
}

function Message({ message, self }: { message: ChatMessage; self: boolean }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2">
        <span className={cn(TYPE_CLASS.label, 'font-bold text-daw-text')}>
          {self ? 'You' : message.userName}
        </span>
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>{time}</span>
      </div>
      <p className={cn(TYPE_CLASS.body, 'break-words text-daw-text')}>
        {message.text}
      </p>
    </div>
  );
}
