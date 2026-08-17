/**
 * Single colored bar rendered inside a week row of the Annual Plan calendar.
 *
 * A premium "card" treatment: a bright left accent stripe (the unit's color),
 * a bilingual theme title, and a coverage status pill (Complete / Planning /
 * Plan). Occupies a CSS Grid column range set by the caller and deep-links to
 * the UnitPage. Draggable to reschedule the whole unit.
 */
import { CornerDownRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useThemeBank } from '../content/hooks';
import type { StudentLanguage, Unit } from '../types';
import { setDragItem } from './calendarDnd';
import { CAL_FONT } from './calendarSizing';
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
  /** Days planned / suggested — displayed as a coverage pill. */
  daysPlanned: number;
  suggestedDayCount: number;
  /** Grid row for this bar. The caller derives it from the Unit's lane and the
   *  view's row model (Month grid: `2*lane+2`; Week band: `lane+1`). */
  gridRow: number;
}

/** Compact coverage pill from planned vs suggested day counts. */
const CoveragePill = ({
  planned,
  suggested,
}: {
  planned: number;
  suggested: number;
}) => {
  if (planned === 0) {
    return (
      <span
        style={{ fontSize: CAL_FONT.coverage }}
        className="ml-auto shrink-0 rounded-full border border-dashed border-white/25 px-2 py-0.5 font-medium uppercase tracking-wide text-white/50"
      >
        Plan
      </span>
    );
  }
  const complete = suggested > 0 && planned >= suggested;
  return (
    <span
      style={{ fontSize: CAL_FONT.coverage }}
      className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 font-medium tabular-nums ${
        complete
          ? 'border-emerald-400/30 bg-emerald-400/[0.10] text-emerald-200'
          : 'border-amber-400/30 bg-amber-400/[0.10] text-amber-200'
      }`}
    >
      {planned}/{suggested}
    </span>
  );
};

export const UnitBar = ({
  classroomId,
  unit,
  language,
  startColumn,
  spanColumns,
  isFirstSegment,
  daysPlanned,
  suggestedDayCount,
  gridRow,
}: UnitBarProps) => {
  const [dragging, setDragging] = useState(false);
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
  const isEmpty = daysPlanned === 0;

  return (
    <Link
      to={TeacherRoutes.annualUnit({ classroomId, unitId: unit.id })}
      draggable
      onDragStart={(e) => {
        setDragItem(e.dataTransfer, { kind: 'unit', id: unit.id });
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      style={{
        gridColumnStart: startColumn,
        gridColumnEnd: `span ${spanColumns}`,
        gridRowStart: gridRow,
      }}
      className={`group flex cursor-grab items-stretch self-start overflow-hidden rounded-lg border ${color.bg} ${
        isEmpty ? 'border-dashed border-white/20' : color.border
      } transition-[filter,opacity] hover:brightness-125 active:cursor-grabbing ${
        isFirstSegment ? '' : 'opacity-70'
      } ${dragging ? 'opacity-50' : ''}`}
      title={`${titleEn}${titleEs ? ` — ${titleEs}` : ''}`}
    >
      {/* Bright accent stripe, flush to the left edge (clipped square by the
          card's overflow-hidden). */}
      <span
        aria-hidden
        className="w-1.5 shrink-0 self-stretch"
        style={{ background: color.hex }}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2 pr-2">
        {!isFirstSegment && (
          <CornerDownRight className={`h-3.5 w-3.5 shrink-0 ${color.text}`} />
        )}
        <span
          style={{ fontSize: CAL_FONT.unitTitle }}
          className={`truncate font-medium leading-tight ${color.text}`}
        >
          {isFirstSegment ? displayTitle : `${displayTitle} (cont.)`}
        </span>
        {isFirstSegment && (
          <CoveragePill planned={daysPlanned} suggested={suggestedDayCount} />
        )}
      </span>
    </Link>
  );
};
