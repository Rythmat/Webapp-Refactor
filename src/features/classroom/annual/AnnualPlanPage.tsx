/**
 * AnnualPlanPage — the classroom's Calendar tab.
 *
 * Renders the lesson calendar (`CalendarView`): month / week views of the
 * classroom's scheduled lessons over the school calendar (weekends, holidays
 * and breaks, plus the teacher's own exceptions). Lessons are created from the
 * Lessons tab; here they are rescheduled by drag-and-drop.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClassroomSettingsDialog } from '../settings/ClassroomSettingsDialog';
import { CalendarView } from './CalendarView';
import { SchoolCalendarDialog } from './SchoolCalendarDialog';
import { EMPTY_EXCEPTIONS } from './schoolCalendar';
import { useAnnualPlan } from './useAnnualPlan';

export const AnnualPlanPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const {
    plan,
    nonSchoolMap,
    addNonSchoolDate,
    removeNonSchoolDate,
    restoreDefaultNonSchoolDate,
  } = useAnnualPlan(cid);
  const [showingSchoolCalendar, setShowingSchoolCalendar] = useState(false);
  const [showingSettings, setShowingSettings] = useState(false);

  return (
    <div className="flex w-full flex-col gap-8 md:gap-10">
      <CalendarView
        classroomId={cid}
        nonSchoolMap={nonSchoolMap}
        onOpenSettings={() => setShowingSettings(true)}
      />

      {showingSchoolCalendar && (
        <SchoolCalendarDialog
          exceptions={plan?.exceptions ?? EMPTY_EXCEPTIONS}
          onAdd={addNonSchoolDate}
          onRemove={removeNonSchoolDate}
          onRestore={restoreDefaultNonSchoolDate}
          onClose={() => setShowingSchoolCalendar(false)}
        />
      )}

      {showingSettings && (
        <ClassroomSettingsDialog
          classroomId={cid}
          onClose={() => setShowingSettings(false)}
          onOpenSchoolCalendar={() => {
            setShowingSettings(false);
            setShowingSchoolCalendar(true);
          }}
        />
      )}
    </div>
  );
};
