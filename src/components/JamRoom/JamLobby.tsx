// ── Jam Lobby ─────────────────────────────────────────────────────────────
// Create or join a jam room.

import { Music, Users, ArrowRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GameRoutes } from '@/constants/routes';

const RECENT_ROOMS_KEY = 'jam-room-recent';

function getRecentRooms(): { id: string; name: string; timestamp: number }[] {
  try {
    const raw = localStorage.getItem(RECENT_ROOMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentRoom(id: string) {
  const rooms = getRecentRooms().filter((r) => r.id !== id);
  rooms.unshift({ id, name: `Jam Room`, timestamp: Date.now() });
  localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(rooms.slice(0, 5)));
}

export function JamLobby() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const recentRooms = getRecentRooms();

  const handleCreate = useCallback(() => {
    const roomId = crypto.randomUUID().slice(0, 8);
    addRecentRoom(roomId);
    navigate(GameRoutes.jamRoom({ roomId }));
  }, [navigate]);

  const handleJoin = useCallback(() => {
    const code = joinCode.trim();
    if (!code) return;
    addRecentRoom(code);
    navigate(GameRoutes.jamRoom({ roomId: code }));
  }, [joinCode, navigate]);

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Music size={24} className="text-purple-400" />
            <h1
              className="text-3xl font-semibold text-white"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Jam Room
            </h1>
          </div>
          <p className="text-sm text-zinc-500">
            Play piano and drums together in real-time with friends.
          </p>
        </div>

        {/* Create room */}
        <div className="bg-[#121214] rounded-xl border border-zinc-800 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-zinc-500" />
            <span className="text-sm text-zinc-300 font-medium">Start a new session</span>
          </div>
          <Button
            onClick={handleCreate}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
          >
            Create Jam Room
          </Button>
        </div>

        {/* Join room */}
        <div className="bg-[#121214] rounded-xl border border-zinc-800 p-6 flex flex-col gap-4">
          <span className="text-sm text-zinc-300 font-medium">
            Join with room code
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              placeholder="Enter room code..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-purple-500 transition-colors font-mono"
            />
            <Button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              variant="outline"
              className="gap-1.5"
            >
              Join
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>

        {/* Recent rooms */}
        {recentRooms.length > 0 && (
          <div>
            <span className="text-xs text-zinc-600 uppercase tracking-wider">
              Recent Rooms
            </span>
            <div className="mt-2 flex flex-col gap-1">
              {recentRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    addRecentRoom(room.id);
                    navigate(GameRoutes.jamRoom({ roomId: room.id }));
                  }}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm transition-colors"
                >
                  <span className="text-zinc-400 font-mono text-xs">
                    {room.id}
                  </span>
                  <ArrowRight size={12} className="text-zinc-600" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
