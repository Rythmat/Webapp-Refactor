import { experienceApi } from './api';

// ── A little XP for everything done in Learn ───────────────────────────────
// Hearing a demo, practising, performing, answering. The amounts are asked for
// here, and the server has the last word: what's shown is only ever what it says it
// granted, so if it refuses or says nothing, the student sees nothing.
//
// Each thing counts once a day, kept on this device, so that replaying a demo isn't
// a way to farm XP. After a refusal it stops asking for the rest of the session.

export const LEARN_XP = {
  demo: 1,
  practice: 2,
  perform: 3,
  pass: 5,
  answer: 2,
  finish: 5,
} as const;

export type LearnXpAction = keyof typeof LEARN_XP;

/** The most this asks for in a day, whatever the server's own cap is. */
export const LEARN_XP_DAILY_CAP = 100;

const STORAGE_PREFIX = 'learn_xp_';

interface DayLedger {
  asked: number;
  sources: string[];
}

const dayKey = (now: Date) =>
  `${STORAGE_PREFIX}${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

function readDay(now: Date): DayLedger {
  try {
    const stored = localStorage.getItem(dayKey(now));
    if (stored) return JSON.parse(stored) as DayLedger;
  } catch {
    // Blocked or broken: start the day over.
  }
  return { asked: 0, sources: [] };
}

function writeDay(now: Date, day: DayLedger) {
  try {
    localStorage.setItem(dayKey(now), JSON.stringify(day));
  } catch {
    // Storage blocked: the server's own limits still apply.
  }
}

/** Refused this session: asking again would only fail again. */
let refused = false;

export const resetLearnXpForTests = () => {
  refused = false;
  gainListeners.clear();
};

// ── What's shown ───────────────────────────────────────────────────────────

const gainListeners = new Set<(gain: number) => void>();

/** Told each time the server really grants something. */
export function subscribeXpGains(listener: (gain: number) => void) {
  gainListeners.add(listener);
  return () => {
    gainListeners.delete(listener);
  };
}

/** The server has granted this, by whichever route. */
export function announceXpGain(amount: number) {
  gainListeners.forEach((listener) => listener(amount));
}

/** What the award route reports. Its reply is undocumented, so all of it's optional. */
export interface LearnXpReply {
  awarded?: boolean;
  awardedExperience?: number;
  totalExperience?: number;
  level?: number;
}

/** The amount the server says it granted, if it says so plainly. */
export function grantedBy(
  reply: LearnXpReply | null | undefined,
): number | null {
  if (!reply || reply.awarded === false) return null;
  const amount = reply.awardedExperience;
  return typeof amount === 'number' && amount > 0 ? amount : null;
}

/** The API client only says the status in its message: "… failed (403): …". */
const statusOf = (error: unknown) => {
  const match = /failed \((\d{3})\)/.exec(
    error instanceof Error ? error.message : '',
  );
  return match ? Number(match[1]) : null;
};

/**
 * Ask for the XP for one thing done. Resolves to what the server granted, or null
 * for anything else: already counted today, over the cap, refused, or no answer.
 */
export async function awardLearnXp(
  token: string | null | undefined,
  action: LearnXpAction,
  scope: string,
  onReply?: (reply: LearnXpReply) => void,
  now: Date = new Date(),
): Promise<number | null> {
  if (!token || refused) return null;
  const amount = LEARN_XP[action];
  const source = `learn:${action}:${scope}`;
  const day = readDay(now);
  if (day.sources.includes(source)) return null;
  if (day.asked + amount > LEARN_XP_DAILY_CAP) return null;
  writeDay(now, {
    asked: day.asked + amount,
    sources: [...day.sources, source],
  });

  try {
    const reply = await experienceApi.awardAction(token, { source, amount });
    if (reply) onReply?.(reply);
    const granted = grantedBy(reply);
    if (granted !== null) announceXpGain(granted);
    return granted;
  } catch (error) {
    const status = statusOf(error);
    if (status === 401 || status === 403) {
      refused = true;
      return null;
    }
    // It didn't get through, so it can be asked for again.
    const after = readDay(now);
    writeDay(now, {
      asked: Math.max(0, after.asked - amount),
      sources: after.sources.filter((s) => s !== source),
    });
    return null;
  }
}
