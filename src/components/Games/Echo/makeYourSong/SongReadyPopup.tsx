// ── Your Song Is Ready! ────────────────────────────────────────────────────
// Once both tracks have a take: Listen plays the whole song (the tracks
// stay in view, the playhead running), Edit goes back to the mini-Studio
// (record a track again, change the band or its groove), Finish leads to
// the victory. A dialog over the input, focus on Listen, Escape is Edit.

import { Pencil, Play, Square, Trophy } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

export interface SongReadyPopupProps {
  listening: boolean;
  onListen: () => void;
  onStopListening: () => void;
  onEdit: () => void;
  onFinish: () => void;
}

export function SongReadyPopup({
  listening,
  onListen,
  onStopListening,
  onEdit,
  onFinish,
}: SongReadyPopupProps) {
  const titleId = useId();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-echo-song-ready
      onKeyDown={(e) => {
        if (e.key === 'Escape') onEdit();
      }}
      className="echo-pop-in mx-auto flex w-full max-w-[560px] flex-col gap-4 rounded-2xl border border-white/[0.12] bg-[#1b1b1f] p-5 shadow-[0_12px_48px_rgba(0,0,0,0.5)]"
    >
      <style>{`
        @keyframes echo-pop-in { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: none; } }
        .echo-pop-in { animation: echo-pop-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        @media (prefers-reduced-motion: reduce) { .echo-pop-in { animation: none; } }
      `}</style>
      <div className="flex flex-col gap-1">
        <h2
          id={titleId}
          className="text-[22px] font-normal leading-8 text-[#e8e8f0]"
        >
          Your Song Is Ready!
        </h2>
        <p className="text-[15px] leading-6 text-white/70">
          Listen to it, change something, or finish it.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {listening ? (
          <button
            ref={first}
            type="button"
            data-echo-listen
            onClick={onStopListening}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-5 text-[15px] text-[#e8e8f0] hover:bg-white/[0.14]"
          >
            <Square aria-hidden className="size-4" />
            Stop
          </button>
        ) : (
          <button
            ref={first}
            type="button"
            data-echo-listen
            onClick={onListen}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-5 text-[15px] text-[#e8e8f0] hover:bg-white/[0.14]"
          >
            <Play aria-hidden className="size-4" />
            Listen
          </button>
        )}
        <button
          type="button"
          data-echo-edit
          onClick={onEdit}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-5 text-[15px] text-[#e8e8f0] hover:bg-white/[0.14]"
        >
          <Pencil aria-hidden className="size-4" />
          Edit
        </button>
        <button
          type="button"
          data-echo-finish
          onClick={onFinish}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#101012] hover:bg-[#e6e6e8]"
        >
          <Trophy aria-hidden className="size-4" />
          Finish
        </button>
      </div>
    </div>
  );
}
