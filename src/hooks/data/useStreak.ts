import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { computeStreak } from '@/features/arcade/useArcadeActivityStore';
import { useMe } from '@/hooks/data';
import { challengeEventBus } from '@/lib/challenges/eventBus';
import { showSuccess } from '@/util/toast';

export interface StreakState {
  currentStreak: number;
  longest: number;
  freezeTokens: number;
  activeToday: boolean;
}

const FREEZE_TOKENS = 2;
const LS_KEY = 'music-atlas-learning-days';
const todayKey = () => new Date().toISOString().slice(0, 10);

// A day counts toward the streak when a real learning action completes — not
// bare login (rewards learning, per the research + COPPA-gentle design).
const QUALIFYING_EVENTS = new Set([
  'lesson_completed',
  'activity_completed',
  'arcade_streak',
]);

// ── localStorage mirror — canonical is the server; this is the dev/offline
// fallback (and instant optimistic source), same pattern as the bio feature.
function loadDays(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function saveDays(days: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(days.slice(-400)));
  } catch {
    // non-critical
  }
}
function addTodayLocal(): string[] {
  const days = loadDays();
  const today = todayKey();
  if (days.includes(today)) return days;
  const next = [...days, today];
  saveDays(next);
  return next;
}
/** Longest consecutive run in the local day set (for the offline fallback). */
function localLongest(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (Date.parse(sorted[i]) - Date.parse(sorted[i - 1]) === 86_400_000) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function localState(): StreakState {
  const days = loadDays();
  return {
    currentStreak: computeStreak(days),
    longest: localLongest(days),
    freezeTokens: FREEZE_TOKENS,
    activeToday: days.includes(todayKey()),
  };
}

async function fetchStreak(token: string | null): Promise<StreakState> {
  if (!token) return localState();
  try {
    const res = await fetch('/api/streak', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`streak GET ${res.status}`);
    return (await res.json()) as StreakState;
  } catch {
    return localState(); // no serverless route (plain Vite dev) → local
  }
}

async function pingStreak(token: string): Promise<StreakState | null> {
  try {
    const res = await fetch('/api/streak', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`streak POST ${res.status}`);
    return (await res.json()) as StreakState;
  } catch {
    return null;
  }
}

/**
 * The current user's learning streak — server-canonical (`/api/streak`), with a
 * localStorage fallback so it also works in plain Vite dev.
 */
export function useStreak() {
  const token = useAuthToken();
  const { data: me } = useMe();
  return useQuery({
    queryKey: ['streak', me?.id],
    enabled: !!me?.id,
    queryFn: () => fetchStreak(token),
    placeholderData: (prev) => prev ?? localState(),
    staleTime: 60_000,
  });
}

/**
 * Mount ONCE (in ClassroomDashboard). On the first qualifying learning action
 * each day it records a learning day (server + local), refreshes the streak, and
 * shows a single gentle, gain-framed toast.
 */
export function useStreakPing() {
  const token = useAuthToken();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const pingedDay = useRef<string | null>(null);

  useEffect(() => {
    const key = ['streak', me?.id] as const;
    return challengeEventBus.subscribe((event) => {
      if (!QUALIFYING_EVENTS.has(event.kind)) return;
      const today = todayKey();
      if (pingedDay.current === today) return; // already handled today
      const alreadyActive = loadDays().includes(today);
      pingedDay.current = today;

      const days = addTodayLocal();
      const streak = computeStreak(days);
      queryClient.setQueryData<StreakState>(key, (prev) => ({
        ...(prev ?? localState()),
        currentStreak: streak,
        activeToday: true,
      }));

      // Celebrate once per day only (survives navigation remounts).
      if (!alreadyActive) {
        showSuccess(
          streak > 1
            ? `${streak}-day streak — keep it going!`
            : 'Streak started — nice work!',
        );
      }

      if (token) {
        void pingStreak(token).then((state) => {
          if (state) queryClient.setQueryData(key, state);
        });
      }
    });
  }, [token, me?.id, queryClient]);
}
