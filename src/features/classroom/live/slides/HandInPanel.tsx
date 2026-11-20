/**
 * HandInPanel — the teacher's view of a lesson's hand-in (owner,
 * 2026-11-13): each student's work from this class and their note on what
 * they got done, who hasn't handed in yet, and the button that asks the
 * class to hand in (a notice on every student's device). Identified, so the
 * teacher's alone (Rule 2): never on the room's screen.
 *
 * HandInChip is the same count and ask on Present, where the slide's
 * participation count sits.
 */
import { ArrowUpRight, BellRing, Inbox } from 'lucide-react';
import { AppIcons } from '@/components/icons/appIcons';
import { askedAt, type HandInRow } from '../handIn';

export interface HandInPanelProps {
  rows: HandInRow[];
  /** Ask the class to hand in. */
  onAsk: () => void;
  /** The last ask's id (its time), if the class has been asked. */
  lastAsked?: number | null;
}

const AskButton = ({
  onAsk,
  label,
  className = '',
}: {
  onAsk: () => void;
  label: string;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onAsk}
    className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-black transition-opacity hover:opacity-90 ${className}`}
  >
    <BellRing className="h-3.5 w-3.5" aria-hidden />
    {label}
  </button>
);

export const HandInPanel = ({ rows, onAsk, lastAsked }: HandInPanelProps) => {
  const done = rows.filter((r) => r.done).length;
  return (
    <div
      data-hand-in-panel=""
      className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm text-white/90">
          <Inbox className="h-4 w-4 text-white/60" aria-hidden />
          Handed in · {done} of {rows.length}
        </span>
        <span className="inline-flex items-center gap-2">
          {lastAsked ? (
            <span className="text-xs text-white/45">
              Asked {askedAt(lastAsked)}
            </span>
          ) : null}
          <AskButton
            onAsk={onAsk}
            label={lastAsked ? 'Ask again' : 'Ask the class to hand in'}
          />
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/50">No students have joined yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const Icon = row.work ? AppIcons[row.work.place ?? 'studio'] : null;
            return (
              <li
                key={row.enrollmentId}
                data-hand-in={row.done ? 'done' : 'missing'}
                className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-white/85">
                    {row.displayName}
                  </span>
                  {row.work ? (
                    <span className="inline-flex min-w-0 items-center gap-2">
                      {Icon && (
                        <Icon
                          className="size-4 shrink-0 text-white/50"
                          aria-hidden
                        />
                      )}
                      <span className="truncate text-sm text-white/60">
                        {row.work.name}
                      </span>
                      {row.work.deepLink && (
                        <a
                          href={row.work.deepLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-white/25 hover:text-white"
                        >
                          Open
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-white/40">
                      {row.done ? 'Note only' : 'Not yet'}
                    </span>
                  )}
                </div>
                {row.note && (
                  <p className="text-sm text-white/55">“{row.note}”</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/**
 * On Present (owner, 2026-11-13): how many have handed in, and the ask, in
 * the place the slide's participation count takes.
 */
export const HandInChip = ({
  done,
  total,
  onAsk,
  lastAsked,
}: {
  done: number;
  total: number;
  onAsk: () => void;
  lastAsked?: number | null;
}) => (
  <span
    data-hand-in-chip=""
    className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-4 pr-1 text-sm text-white/70"
  >
    <span>
      {done} of {total} handed in
    </span>
    <AskButton
      onAsk={onAsk}
      label={lastAsked ? 'Ask again' : 'Ask the class to hand in'}
      className="py-1"
    />
  </span>
);
