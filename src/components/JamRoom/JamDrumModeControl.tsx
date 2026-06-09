// ── Jam Drum Mode Control ─────────────────────────────────────────────────
// Toolbar control for the shared drum pattern's edit permission.
//
// Host: a "Drum Mode" button opening a menu to pick "Open Drums" (anyone can
// edit) or "Designate Drummer" → pick a room member who becomes the sole
// editor. Non-hosts see a read-only pill showing the current mode.

import { ChevronDown, Drum, ArrowLeft, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useJamRoom } from './JamRoomProvider';
import { useJamRoomStore } from './jamRoomStore';

export interface JamParticipant {
  userId: string;
  userName: string;
  /** True for the local user (rendered with a "you" hint). */
  isLocal: boolean;
}

interface JamDrumModeControlProps {
  participants: JamParticipant[];
}

export function JamDrumModeControl({ participants }: JamDrumModeControlProps) {
  const { isHost, sendDrumMode } = useJamRoom();
  const drumMode = useJamRoomStore((s) => s.drumMode);
  const drummerId = useJamRoomStore((s) => s.drummerId);
  const setDrumMode = useJamRoomStore((s) => s.setDrumMode);

  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the popover on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPicking(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const drummerName =
    participants.find((p) => p.userId === drummerId)?.userName ?? 'someone';

  const applyMode = (mode: 'open' | 'designated', id: string | null) => {
    setDrumMode(mode, id);
    sendDrumMode(mode, id);
    setOpen(false);
    setPicking(false);
  };

  // ── Non-host: read-only status pill ──────────────────────────────────
  if (!isHost) {
    return (
      <span
        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-800/50 text-zinc-400"
        title="The host controls who can edit the drum pattern"
      >
        <Drum size={11} />
        {drumMode === 'open' ? 'Open Drums' : `Drummer: ${drummerName}`}
      </span>
    );
  }

  // ── Host: interactive Drum Mode menu ─────────────────────────────────
  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          setPicking(false);
        }}
        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
          open
            ? 'bg-zinc-700 text-white'
            : 'bg-zinc-800/50 text-zinc-300 hover:text-white hover:bg-zinc-800'
        }`}
        title="Choose who can edit the drum pattern"
      >
        <Drum size={11} />
        Drum Mode
        <ChevronDown
          size={10}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-zinc-800 overflow-hidden py-1"
          style={{
            backgroundColor: '#111113ee',
            backdropFilter: 'blur(16px)',
            width: 200,
            maxHeight: 280,
          }}
        >
          {!picking ? (
            <>
              <button
                onClick={() => applyMode('open', null)}
                className="flex items-center justify-between w-full text-left px-3 py-1.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                Open Drums
                {drumMode === 'open' && (
                  <Check size={12} className="text-emerald-400" />
                )}
              </button>
              <button
                onClick={() => setPicking(true)}
                className="flex items-center justify-between w-full text-left px-3 py-1.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  Designate Drummer
                  {drumMode === 'designated' && (
                    <span className="text-zinc-500">· {drummerName}</span>
                  )}
                </span>
                <ChevronDown size={10} className="-rotate-90" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-zinc-800 mb-1">
                <button
                  onClick={() => setPicking(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <ArrowLeft size={12} />
                </button>
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-medium">
                  Pick a drummer
                </span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                {participants.map((p) => (
                  <button
                    key={p.userId}
                    onClick={() => applyMode('designated', p.userId)}
                    className="flex items-center justify-between w-full text-left px-3 py-1.5 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
                  >
                    <span className="truncate">
                      {p.userName}
                      {p.isLocal && (
                        <span className="text-zinc-500"> (you)</span>
                      )}
                    </span>
                    {drumMode === 'designated' && drummerId === p.userId && (
                      <Check size={12} className="text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
