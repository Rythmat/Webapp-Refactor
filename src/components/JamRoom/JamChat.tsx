// ── Jam Chat ──────────────────────────────────────────────────────────────
// Ephemeral text chat panel for the Jam Room.

import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJamRoom } from './JamRoomProvider';
import { useJamRoomStore } from './jamRoomStore';

export function JamChat() {
  const { sendChat, remotePlayers, localColor } = useJamRoom();
  const chatMessages = useJamRoomStore((s) => s.chatMessages);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages.length]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setText('');
  }, [text, sendChat]);

  // Build a color lookup for remote players
  const colorMap = new Map<string, string>();
  remotePlayers.forEach((p) => colorMap.set(p.userId, p.color));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {chatMessages.length === 0 && (
          <div className="text-[10px] text-zinc-600 text-center py-4">
            No messages yet
          </div>
        )}
        {chatMessages.map((msg) => {
          const color = colorMap.get(msg.userId) ?? localColor;
          return (
            <div key={msg.id} className="flex gap-1.5 items-start">
              <span
                className="text-[10px] font-medium shrink-0"
                style={{ color }}
              >
                {msg.userName}:
              </span>
              <span className="text-[11px] text-zinc-300">{msg.text}</span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 flex items-center gap-1 p-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 outline-none px-1.5 py-1"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-1 text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}
