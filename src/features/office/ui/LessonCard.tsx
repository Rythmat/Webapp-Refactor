import type { Feature } from 'geojson';
import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { FOCUS_RING } from '@/daw/ui/styles';
import { LessonThumb } from '@/features/classroom/plan/LessonThumb';
import {
  StatusChip,
  type LessonStatus,
} from '@/features/classroom/plan/lessonStatus';
import type { Day } from '@/features/classroom/types';

/**
 * A lesson on a shelf, as a Learn card: its square picture, then when and
 * for which class, its name and its state. It opens in the Inspector.
 */
export const LessonCard = ({
  day,
  status,
  eyebrow,
  to,
  countryFeatures,
  songsReady,
}: {
  day: Day;
  /** Its state, where the page knows it. */
  status?: LessonStatus;
  /** Small caps over the title ("Tuesday — Jazz Band"). */
  eyebrow: string;
  to: string;
  countryFeatures: Feature[] | null;
  songsReady: boolean;
}) => (
  <Link
    to={to}
    className={cn('group flex flex-col gap-2 rounded-xl', FOCUS_RING)}
  >
    <div className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
      <LessonThumb
        day={day}
        countryFeatures={countryFeatures}
        songsReady={songsReady}
      />
    </div>
    <div className="flex min-w-0 flex-col gap-1 px-0.5">
      <MicroLabel className="truncate">{eyebrow}</MicroLabel>
      <span className="truncate text-[0.875rem] font-medium text-daw-text">
        {day.label}
      </span>
      {status && (
        <span>
          <StatusChip status={status} />
        </span>
      )}
    </div>
  </Link>
);
