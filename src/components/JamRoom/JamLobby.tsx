// ── Jam Lobby ─────────────────────────────────────────────────────────────
// Create or join a jam room.

import { Music, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Env } from '@/constants/env';
import { GameRoutes } from '@/constants/routes';

const RECENT_ROOMS_KEY = 'jam-room-recent';

const PARTYKIT_HOST =
  Env.get('VITE_PARTYKIT_HOST', { nullable: true }) ?? 'localhost:1999';

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

function removeRecentRoom(id: string) {
  const rooms = getRecentRooms().filter((r) => r.id !== id);
  localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(rooms));
}

/**
 * Check if a PartyKit jam room has an active host.
 * Returns `true` (active), `false` (confirmed inactive), or `null` (unknown/unreachable).
 */
async function checkRoomStatus(roomId: string): Promise<boolean | null> {
  try {
    const protocol = PARTYKIT_HOST.startsWith('localhost') ? 'http' : 'https';
    const res = await fetch(
      `${protocol}://${PARTYKIT_HOST}/parties/main/jam-${roomId}`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null; // server error or not deployed yet
    const data = (await res.json()) as { active?: boolean };
    return data.active === true;
  } catch {
    return null; // network error, CORS, timeout — treat as unknown
  }
}

export function JamLobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [recentRooms, setRecentRooms] = useState(getRecentRooms);

  // Show error from navigation state (e.g. kicked from room)
  useEffect(() => {
    const state = location.state as { error?: string } | null;
    if (state?.error) {
      setError(state.error);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Filter recent rooms to only show active ones on mount
  useEffect(() => {
    let cancelled = false;
    async function filterRooms() {
      const rooms = getRecentRooms();
      if (!rooms.length) return;

      const checks = await Promise.all(
        rooms.map(async (room) => ({
          ...room,
          status: await checkRoomStatus(room.id),
        })),
      );
      if (cancelled) return;

      // Only keep rooms confirmed active — drop unknown/unreachable rooms
      const activeRooms = checks.filter((r) => r.status === true);
      localStorage.setItem(
        RECENT_ROOMS_KEY,
        JSON.stringify(activeRooms.slice(0, 5)),
      );
      setRecentRooms(activeRooms);
    }
    filterRooms();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = useCallback(() => {
    setError(null);
    const roomId = crypto.randomUUID().slice(0, 8);
    addRecentRoom(roomId);
    navigate(GameRoutes.jamRoom({ roomId }), {
      state: { role: 'owner', created: true },
    });
  }, [navigate]);

  const handleJoin = useCallback(async () => {
    const code = joinCode.trim();
    if (!code) return;
    setError(null);
    setJoining(true);

    const status = await checkRoomStatus(code);
    setJoining(false);

    // Only allow joining rooms confirmed as active
    if (status !== true) {
      setError('Room not found');
      removeRecentRoom(code);
      return;
    }

    addRecentRoom(code);
    navigate(GameRoutes.jamRoom({ roomId: code }));
  }, [joinCode, navigate]);

  const [joiningRecent, setJoiningRecent] = useState<string | null>(null);

  const handleJoinRecent = useCallback(
    async (roomIdToJoin: string) => {
      setError(null);
      setJoiningRecent(roomIdToJoin);

      const status = await checkRoomStatus(roomIdToJoin);
      setJoiningRecent(null);

      if (status !== true) {
        setError('Room not found');
        removeRecentRoom(roomIdToJoin);
        setRecentRooms((prev) => prev.filter((r) => r.id !== roomIdToJoin));
        return;
      }

      addRecentRoom(roomIdToJoin);
      navigate(GameRoutes.jamRoom({ roomId: roomIdToJoin }));
    },
    [navigate],
  );

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

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
            <span className="text-sm text-zinc-300 font-medium">
              Start a new session
            </span>
          </div>
          <Button
            onClick={handleCreate}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
          >
            Create Jam Room
          </Button>
          <Button
            onClick={() => navigate(GameRoutes.jamLocal())}
            variant="outline"
            className="w-full"
          >
            Jam Locally
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
              disabled={!joinCode.trim() || joining}
              variant="outline"
              className="gap-1.5"
            >
              {joining ? 'Checking...' : 'Join'}
              {!joining && <ArrowRight size={14} />}
            </Button>
          </div>
        </div>

        {/* Recent rooms (only active rooms shown) */}
        {recentRooms.length > 0 && (
          <div>
            <span className="text-xs text-zinc-600 uppercase tracking-wider">
              Active Rooms
            </span>
            <div className="mt-2 flex flex-col gap-1">
              {recentRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleJoinRecent(room.id)}
                  disabled={joiningRecent === room.id}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <span className="text-zinc-400 font-mono text-xs">
                    {room.id}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {joiningRecent === room.id ? (
                      <span className="w-3 h-3 border border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <ArrowRight size={12} className="text-zinc-600" />
                      </>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
