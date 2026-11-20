/**
 * The teacher's controls for the class's vote on its Group Project (owner,
 * 2026-11-16). On Present, in the participation count's place: how many
 * have voted, and Show results / Hide results (the vote's share, hidden by
 * default). On the dashboard: a Go button for each Group Project, its votes
 * and the leader marked; the teacher confirms where the lesson goes.
 */
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export const VoteChip = ({
  voted,
  total,
  shown,
  onToggle,
}: {
  voted: number;
  total: number;
  /** The results are on the room's screen. */
  shown: boolean;
  onToggle: (on: boolean) => void;
}) => (
  <span
    data-vote-chip=""
    className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-4 pr-1 text-sm text-white/70"
  >
    <span>
      {voted} of {total} voted
    </span>
    <button
      type="button"
      aria-pressed={shown}
      // Present's arrow keys move the slides, not this.
      onKeyDown={(e) => e.stopPropagation()}
      onClick={() => onToggle(!shown)}
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-black transition-opacity hover:opacity-90"
    >
      {shown ? (
        <EyeOff className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Eye className="h-3.5 w-3.5" aria-hidden />
      )}
      {shown ? 'Hide results' : 'Show results'}
    </button>
  </span>
);

export const VoteGoRow = ({
  names,
  counts,
  leader,
  onGo,
}: {
  /** Each option's name: Promoter, Producer, Performer. */
  names: readonly string[];
  counts: readonly number[];
  leader: number | null;
  onGo: (option: number) => void;
}) => (
  <div
    data-vote-go=""
    className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
  >
    <span className="text-sm text-white/90">Where the class goes next</span>
    <div className="flex flex-wrap gap-2">
      {names.map((name, i) => (
        <button
          key={name}
          type="button"
          onClick={() => onGo(i)}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${
            leader === i
              ? 'bg-white text-black hover:opacity-90'
              : 'border border-white/10 text-white/80 hover:border-white/25 hover:text-white'
          }`}
        >
          Go to {name}
          <span className="tabular-nums opacity-70">
            {counts[i] ?? 0} {(counts[i] ?? 0) === 1 ? 'vote' : 'votes'}
          </span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
    </div>
    <span className="text-xs text-white/45">
      Next goes to the one with the most votes
      {leader !== null && names[leader] ? ` (${names[leader]})` : ''}.
    </span>
  </div>
);
