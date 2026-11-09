import { useState } from 'react';
import { SchoolCalendarDialog } from '@/features/classroom/annual/SchoolCalendarDialog';
import { EMPTY_EXCEPTIONS } from '@/features/classroom/annual/schoolCalendar';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import { ClassroomSettingsDialog } from '@/features/classroom/settings/ClassroomSettingsDialog';

/**
 * A class's settings (age preset, language, modules, backup) and, from
 * them, its school calendar — the pair the Calendar tab opens, here for the
 * Overview's Settings button.
 */
export const ClassSettings = ({
  classroomId,
  open,
  onClose,
}: {
  classroomId: string;
  open: boolean;
  onClose: () => void;
}) => {
  const {
    plan,
    addNonSchoolDate,
    removeNonSchoolDate,
    restoreDefaultNonSchoolDate,
  } = useAnnualPlan(classroomId);
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <>
      {open && (
        <ClassroomSettingsDialog
          classroomId={classroomId}
          onClose={onClose}
          onOpenSchoolCalendar={() => {
            onClose();
            setCalendarOpen(true);
          }}
        />
      )}
      {calendarOpen && (
        <SchoolCalendarDialog
          exceptions={plan?.exceptions ?? EMPTY_EXCEPTIONS}
          onAdd={addNonSchoolDate}
          onRemove={removeNonSchoolDate}
          onRestore={restoreDefaultNonSchoolDate}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </>
  );
};
