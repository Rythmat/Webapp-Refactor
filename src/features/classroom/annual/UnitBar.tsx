/**
 * Single colored bar rendered inside a week row of the Annual Plan calendar.
 *
 * Occupies a CSS Grid column range set by the caller. Resolves the theme
 * title (bilingual) via `useThemeBank`. Deep-links to the existing UnitPage
 * so the calendar view stays a navigation surface, not an editor.
 */
import { CornerDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useThemeBank } from '../content/hooks';
import type { StudentLanguage, Unit } from '../types';
import { colorForUnitId } from './unitColors';

interface UnitBarProps {
  classroomId: string;
  unit: Unit;
  language: StudentLanguage;
  /** Grid column to start at, 1-7 (Sunday-first). */
  startColumn: number;
  /** Number of columns to span, 1-7. */
  spanColumns: number;
  /** True on the unit's first visible segment; false on continuation weeks. */
  isFirstSegment: boolean;
  /** Days planned / suggested — displayed as a tiny subtitle. */
  daysPlanned: number;
  suggestedDayCount: number;
}

export const UnitBar = ({
  classroomId,
  unit,
  language,
  startColumn,
  spanColumns,
  isFirstSegment,
  daysPlanned,
  suggestedDayCount,
}: UnitBarProps) => {
  const { byId } = useThemeBank();
  const theme = unit.theme ? byId(unit.theme.themeId) : undefined;

  const titleEn = theme?.title.en ?? unit.label;
  const titleEs = theme?.title.es;
  const displayTitle =
    language === 'es' && titleEs
      ? titleEs
      : language === 'both' && titleEs
        ? `${titleEn} · ${titleEs}`
        : titleEn;

  const color = colorForUnitId(unit.id);

  return (
    <Link
      to={TeacherRoutes.annualUnit({ classroomId, unitId: unit.id })}
      style={{
        gridColumnStart: startColumn,
        gridColumnEnd: `span ${spanColumns}`,
      }}
      className={`group flex items-center gap-2 overflow-hidden rounded-md border ${color.bg} ${color.border} px-2 py-1 transition-colors hover:brightness-125 ${
        isFirstSegment ? '' : 'opacity-70'
      }`}
      title={`${titleEn}${titleEs ? ` — ${titleEs}` : ''}`}
    >
      {!isFirstSegment && (
        <CornerDownRight className={`h-3 w-3 shrink-0 ${color.text}`} />
      )}
      <span
        className={`truncate text-[11px] font-medium leading-tight ${color.text}`}
      >
        {isFirstSegment ? displayTitle : `${displayTitle} (cont.)`}
      </span>
      {isFirstSegment && (
        <span
          className={`ml-auto shrink-0 text-[10px] tabular-nums opacity-70 ${color.text}`}
        >
          {daysPlanned}/{suggestedDayCount}
        </span>
      )}
    </Link>
  );
};
