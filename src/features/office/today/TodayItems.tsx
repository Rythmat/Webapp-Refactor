import {
  AlarmClock,
  CalendarPlus,
  ChevronRight,
  CircleAlert,
  FileBarChart,
  PenLine,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { OFFICE_CARD, OFFICE_ROW, OFFICE_SECTION_TITLE } from '../ui/styles';
import { itemHref } from './officeLinks';
import type { TodayItem, TodayItemKind } from './todayModel';

const ICON: Record<TodayItemKind, { icon: LucideIcon; tone: string }> = {
  overdue: { icon: CircleAlert, tone: 'text-rose-300' },
  'due-soon': { icon: AlarmClock, tone: 'text-daw-text-2' },
  enrollments: { icon: UserPlus, tone: 'text-daw-text-2' },
  'session-report': { icon: FileBarChart, tone: 'text-daw-text-2' },
  'draft-soon': { icon: PenLine, tone: 'text-amber-200/80' },
  'nothing-planned': { icon: CalendarPlus, tone: 'text-daw-text-3' },
};

/**
 * A card of Today's lines, each a plain sentence with its class under it
 * and the action at the end — the whole row is the link, as Google
 * Classroom's insight cards. Empty, it says so calmly.
 */
export const TodayItems = ({
  title,
  items,
  empty,
}: {
  title: string;
  items: TodayItem[];
  empty: string;
}) => (
  <section aria-label={title} className={cn(OFFICE_CARD, 'flex flex-col p-2')}>
    <header className="flex items-baseline justify-between gap-3 px-3 pb-1 pt-2">
      <h2 className={OFFICE_SECTION_TITLE}>{title}</h2>
      {items.length > 0 && (
        <span className="text-[0.8125rem] tabular-nums text-daw-text-3">
          {items.length}
        </span>
      )}
    </header>
    {items.length === 0 ? (
      <p className="px-3 pb-4 pt-2 text-[0.875rem] text-daw-text-3">{empty}</p>
    ) : (
      <ul className="flex flex-col">
        {items.map((item) => {
          const { icon: Icon, tone } = ICON[item.kind];
          return (
            <li key={item.id}>
              <Link to={itemHref(item)} className={OFFICE_ROW}>
                <Icon aria-hidden className={cn('size-4 shrink-0', tone)} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[0.875rem] leading-5 text-daw-text">
                    {item.text}
                  </span>
                  <MicroLabel className="truncate">{item.className}</MicroLabel>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-[0.8125rem] text-daw-text-3">
                  {item.action}
                  <ChevronRight aria-hidden className="size-3.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
