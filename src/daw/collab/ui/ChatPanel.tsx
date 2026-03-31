// ── ChatPanel ────────────────────────────────────────────────────────────
// A lightweight text chat panel for collaborators. Messages are stored in
// the Yjs `chat` Y.Array so they persist across reconnections.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Send, X } from 'lucide-react';
import { useStore } from '@/daw/store/index';
import type { ChatMessage } from '../types';

const SPRING = { type: 'spring' as const, stiffness: 350, damping: 30 };

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const messages = useStore((s) => s.chatMessages);
  const appendMessage = useStore((s) => s._appendChatMessage);
  const markRead = useStore((s) => s.markChatRead);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Mark as read when opened
  useEffect(() => {
    if (open) markRead();
  }, [open, markRead]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId: '', // TODO: populate from Auth0
      userName: 'You',
      text,
      timestamp: Date.now(),
    };
    appendMessage(msg);
    setInput('');
  }, [input, appendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
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
            <div className="flex items-center gap-1.5">
              <MessageSquare
                size={10}
                strokeWidth={2}
                style={{ color: 'var(--color-text-dim)' }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Chat
              </span>
            </div>
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

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
            style={{ scrollbarWidth: 'none' }}
          >
            {messages.length === 0 && (
              <div
                className="py-4 text-center text-[10px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                No messages yet
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>

          {/* Input */}
          <div
            className="flex shrink-0 items-center gap-1 border-t p-1.5"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="flex-1 rounded-md border-none px-2 py-1 text-[10px] outline-none"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-text)',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-white/5"
              style={{
                color: input.trim()
                  ? 'var(--color-accent)'
                  : 'var(--color-text-dim)',
                background: 'none',
                border: 'none',
                opacity: input.trim() ? 1 : 0.4,
              }}
            >
              <Send size={10} strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const time = new Date(message.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-0.5 rounded-md px-1.5 py-1">
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[9px] font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {message.userName}
        </span>
        <span
          className="text-[7px]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {timeStr}
        </span>
      </div>
      <span
        className="text-[10px] leading-tight"
        style={{ color: 'var(--color-text)' }}
      >
        {message.text}
      </span>
    </div>
  );
}
