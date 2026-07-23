/**
 * PairingPanel — the teacher's control for a `studio-collab` slide. Auto-shuffle
 * the roster into pairs (trailing trio when odd), then PATCH `state.pairs`
 * (teacher+student fan-out; never the projector — Rule 2). Teacher-only surface.
 */
import { Shuffle, Users, X } from 'lucide-react';
import type { Enrollment } from '../../enrollments';
import type { SessionPair } from '../sessionsStore';

export interface PairingPanelProps {
  grouping: 'pairs' | 'solo';
  roster: Enrollment[];
  pairs: SessionPair[] | null | undefined;
  onSetPairs: (pairs: SessionPair[] | null) => void;
}

const shuffleIntoPairs = (roster: Enrollment[]): SessionPair[] => {
  const shuffled = [...roster];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const pairs: SessionPair[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const group = shuffled.slice(i, i + 2);
    if (group.length === 1 && pairs.length > 0) {
      // Fold a trailing odd student into the previous group (trio).
      pairs[pairs.length - 1].enrollmentIds.push(group[0].id);
      break;
    }
    pairs.push({
      id: `pair-${i / 2}`,
      enrollmentIds: group.map((e) => e.id),
      hostEnrollmentId: group[0].id,
    });
  }
  return pairs;
};

export const PairingPanel = ({
  grouping,
  roster,
  pairs,
  onSetPairs,
}: PairingPanelProps) => {
  const nameOf = (id: string) =>
    roster.find((e) => e.id === id)?.displayName ?? id;

  if (grouping === 'solo') {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-sm text-white/70">
          Solo Studio time — each of the {roster.length} student(s) opens their
          own project. No pairing needed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-white/90">
          <Users className="h-4 w-4 text-[#7ecfcf]" />
          Studio pairs
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={roster.length < 2}
            onClick={() => onSetPairs(shuffleIntoPairs(roster))}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7ecfcf] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#7ecfcf]/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Shuffle className="h-3.5 w-3.5" />
            {pairs && pairs.length > 0 ? 'Re-shuffle' : 'Shuffle into pairs'}
          </button>
          {pairs && pairs.length > 0 && (
            <button
              type="button"
              onClick={() => onSetPairs(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/25 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {!pairs || pairs.length === 0 ? (
        <p className="text-sm text-white/50">
          {roster.length < 2
            ? 'Need at least two students joined to pair.'
            : 'Shuffle to send students into shared Studio rooms.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pairs.map((pair) => (
            <li
              key={pair.id}
              className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              {pair.enrollmentIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 text-sm text-white/80"
                >
                  {id === pair.hostEnrollmentId && (
                    <span className="rounded-full bg-[#7ecfcf]/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#7ecfcf]">
                      host
                    </span>
                  )}
                  {nameOf(id)}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
