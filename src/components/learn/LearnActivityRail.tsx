import { ActivityRail } from '@/components/ClassroomLayout/home/ActivityRail';
import { PerStudent } from '@/components/ui/PerStudent';

/**
 * Pinned to the bottom of a Learn page, as on Home: where you left off,
 * cycling through your recent activity. The negative margins and the -8px
 * stick take it to the panel's edges, past the scroll area's 8px padding.
 */
export function LearnActivityRail() {
  return (
    <div className="sticky -bottom-2 z-20 -mx-2 -mb-2 mt-auto shrink-0">
      <PerStudent
        label="Recent activity"
        minHeight={72}
        className="rounded-none bg-[#0c0c0e]"
      >
        <ActivityRail />
      </PerStudent>
    </div>
  );
}
