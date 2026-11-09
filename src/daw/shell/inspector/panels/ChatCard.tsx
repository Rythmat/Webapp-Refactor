import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PromptPillButton } from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  INSIGHT_DIM,
  INSIGHT_ROW,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { useCollab } from '@/daw/collab/CollabProvider';
import type { ChatMessage } from '@/daw/collab/types';
import { useStore } from '@/daw/store';

// ── The session's chat (B4a; its own rail panel until 2026-10-25) ──────────
//
// A card in the People panel, under who is in the session (owner,
// 2026-10-25: Chat and People are one panel), in Insight's design. Messages
// live in the room's shared Yjs array, so they last across reconnects.
// Showing the card marks them read (the rail's People badge counts the
// rest). It shows only in a session: out of one there is no one to talk to.

export function ChatCard() {
  const messages = useStore((s) => s.chatMessages);
  const markRead = useStore((s) => s.markChatRead);
  const { sendChatMessage } = useCollab();
  const { userId } = useAuthContext();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Showing the card reads what's there, and what arrives while it shows.
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
    <InsightCard title="Chat" data-testid="people-chat">
      <div
        ref={scrollRef}
        role="log"
        aria-label="Messages"
        className="-mx-1 flex max-h-80 flex-col gap-1.5 overflow-y-auto px-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <p className={INSIGHT_DIM}>No messages yet.</p>
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
        className="flex items-center gap-2"
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
          className="h-8 min-w-0 flex-1 rounded-full border border-white/10 bg-transparent px-3.5 text-[13px] text-white outline-none transition-colors placeholder:text-white/40 hover:border-white/20 focus-visible:border-white/25 focus-visible:ring-2 focus-visible:ring-white/40"
        />
        <PromptPillButton
          type="submit"
          variant="primary"
          aria-label="Send"
          disabled={!input.trim()}
          className="size-8 justify-center px-0 disabled:pointer-events-none disabled:opacity-40"
        >
          <Send aria-hidden className="size-3.5" />
        </PromptPillButton>
      </form>
    </InsightCard>
  );
}

/** A message: who and when, quiet, over what they said; yours to the right. */
function Message({ message, self }: { message: ChatMessage; self: boolean }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div
      className={cn(
        INSIGHT_ROW,
        'flex flex-col gap-0.5',
        self ? 'ml-6 bg-white/[0.08]' : 'mr-6',
      )}
    >
      <div className="flex items-baseline gap-2 text-[13px] leading-5">
        <span className="font-medium text-white/55">
          {self ? 'You' : message.userName}
        </span>
        <span className="text-white/40">{time}</span>
      </div>
      <p className="break-words text-[15px] leading-6 text-white">
        {message.text}
      </p>
    </div>
  );
}
