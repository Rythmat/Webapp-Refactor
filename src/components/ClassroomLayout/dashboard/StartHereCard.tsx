import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  KeyCircle,
  keyTint,
  StepPips,
  stepsLine,
  StopActionLink,
} from '@/components/learn/StartHere';
import {
  currentStop,
  startHereRoute,
  useLiteracyPath,
} from '@/curriculum/musicLiteracy/literacyPath';

/**
 * Home's "Start here" card, over the Quick Start tiles: the Music Literacy
 * path's next stop and how far along it the student is, its one action
 * (Start, Continue, or Play again once it's done) and the way to the whole
 * path (Learn → Start Here). Tinted in the stop's key colour, as Learn
 * Home's Continue banner is. Shows nothing while no stop is open.
 */
export const StartHereCard = () => {
  const { current, upNext } = currentStop(useLiteracyPath());
  if (!current?.to) return null;
  const { stop, key, status, next } = current;

  const detail =
    status === 'started' && next
      ? `Next: ${next.title}`
      : status === 'done' && upNext
        ? `Up next: ${upNext.stop.title}${upNext.status === 'soon' ? ', coming soon' : ''}`
        : stop.description;

  return (
    <section
      aria-label="Start here"
      data-start-here={status}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
    >
      {key && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: keyTint(key.color) }}
        />
      )}
      <div className="relative flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-5 md:p-4">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
          {key && (
            <KeyCircle stopKey={key} className="h-14 w-14 md:h-16 md:w-16" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="text-xs uppercase tracking-wide text-white/50 md:text-sm">
              Start here · Music Literacy
            </div>
            <div className="truncate text-lg font-semibold leading-tight text-white md:text-xl">
              {stop.title}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <StepPips state={current} />
              <span className="min-w-0 truncate text-sm text-white/60">
                {stepsLine(current)}
                <span className="text-white/45">
                  {' · '}
                  {detail}
                </span>
              </span>
            </div>
          </div>
        </div>
        {/* Phone: under the stop, the action first. */}
        <div className="flex flex-row-reverse items-center justify-end gap-5 sm:flex-row">
          <Link
            to={startHereRoute()}
            className="flex shrink-0 items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            See the path
            <ArrowRight className="h-4 w-4" />
          </Link>
          <StopActionLink state={current} />
        </div>
      </div>
    </section>
  );
};
