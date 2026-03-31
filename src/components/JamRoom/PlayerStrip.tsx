// ── Player Strip ──────────────────────────────────────────────────────────
// Horizontal row of player avatars showing who's in the jam room.

import { Piano, Drum } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useJamRoom } from './JamRoomProvider';
import { useJamRoomStore } from './jamRoomStore';

export function PlayerStrip() {
  const { remotePlayers, localColor } = useJamRoom();
  const { appUser } = useAuthContext();
  const localInstrument = useJamRoomStore((s) => s.localInstrument);

  const localPlayer = {
    userName: appUser?.nickname ?? appUser?.fullName ?? 'You',
    avatarUrl: appUser?.avatarUrl,
    color: localColor,
    instrument: localInstrument,
    isLocal: true,
  };

  const allPlayers = [
    localPlayer,
    ...remotePlayers.map((p) => ({ ...p, isLocal: false })),
  ];

  return (
    <div className="flex items-center gap-3 overflow-x-auto py-2 px-1">
      {allPlayers.map((player, i) => {
        const InstrumentIcon = player.instrument === 'piano' ? Piano : Drum;
        return (
          <div
            key={player.isLocal ? 'local' : i}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="relative">
              {/* Avatar circle */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden"
                style={{
                  border: `2px solid ${player.color}`,
                  boxShadow: `0 0 8px ${player.color}30`,
                  backgroundColor: player.color + '20',
                  color: player.color,
                }}
              >
                {player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  player.userName.charAt(0).toUpperCase()
                )}
              </div>
              {/* Instrument badge */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#09090b',
                  border: `1px solid ${player.color}`,
                }}
              >
                <InstrumentIcon size={8} color={player.color} />
              </div>
            </div>
            <span className="text-[9px] text-zinc-500 max-w-12 truncate">
              {player.isLocal ? 'You' : player.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
