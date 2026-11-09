import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { FOCUS_RING } from '@/daw/ui/styles';
import { IdCover } from '../ui/ClassCover';

/**
 * A Library item on a shelf, as a Learn card: its cover (drawn from its
 * id), small caps over its title, and a line under it.
 */
export const LibraryCard = ({
  id,
  to,
  eyebrow,
  title,
  meta,
}: {
  id: string;
  to: string;
  eyebrow: string;
  title: string;
  meta?: string;
}) => (
  <Link
    to={to}
    className={cn('group flex flex-col gap-2 rounded-2xl', FOCUS_RING)}
  >
    <div className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
      <IdCover id={id} className="w-full rounded-2xl" />
    </div>
    <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
      <MicroLabel className="truncate">{eyebrow}</MicroLabel>
      <span className="line-clamp-2 text-[0.875rem] font-medium leading-snug text-daw-text">
        {title}
      </span>
      {meta && (
        <span className="truncate text-[0.8125rem] text-daw-text-3">
          {meta}
        </span>
      )}
    </div>
  </Link>
);

/** A learning goal on a shelf: its words are the picture. */
export const GoalCard = ({
  to,
  eyebrow,
  text,
}: {
  to: string;
  eyebrow: string;
  text: string;
}) => (
  <Link
    to={to}
    className={cn(
      'flex aspect-square flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]',
      FOCUS_RING,
    )}
  >
    <MicroLabel className="truncate">{eyebrow}</MicroLabel>
    <span className="line-clamp-6 text-[0.875rem] leading-snug text-daw-text">
      {text}
    </span>
  </Link>
);
