import { useParams } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { SERVER_GRADEBOOK_ENABLED } from '@/constants/serverEndpoints';
import { ClassroomGradebook } from '@/features/classroom/grades/ClassroomGradebook';
import { OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../ui/styles';

/**
 * A class's Progress: its gradebook today, its students × lessons map in
 * Phase 3 of the Office overhaul. Scores, rubrics and returned feedback wait
 * on the gradebook endpoints, and the page says so.
 */
export const ProgressPage = () => {
  const { classroomId = '' } = useParams<{ classroomId: string }>();
  return (
    <div className={OFFICE_PAGE}>
      <header className="flex flex-col gap-1.5">
        <MicroLabel>Class</MicroLabel>
        <h1 className={OFFICE_PAGE_TITLE}>Progress</h1>
        {!SERVER_GRADEBOOK_ENABLED && (
          <p className="max-w-[60ch] text-[0.875rem] text-daw-text-3">
            Who has turned in each assignment, from this device. Scores, rubrics
            and feedback arrive with the gradebook.
          </p>
        )}
      </header>
      <ClassroomGradebook classroomId={classroomId} />
    </div>
  );
};
