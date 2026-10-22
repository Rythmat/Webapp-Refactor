import { memo } from 'react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { COMMENT_LANE_PX } from '../../tracklist/rowLayout';

// ── The comment lane's slot (milestone 2.13, for 4.3) ──────────────────────
//
// Soundtrap shows a comment lane above its sections while the Comments panel
// is open (anatomy §3, a29). The lane stack keeps its row here, above the
// sections, shown only while that panel is open: milestone 4.3 adds the
// Comments panel to the side rail and fills the row with its pins. Until
// then no panel is called 'comments', so the row never shows.

/** The side rail's Comments panel, which milestone 4.3 adds. */
const COMMENTS_PANEL = 'comments';

/** Whether the comment lane shows: while the Comments panel is open. */
export function useCommentLaneShown(): boolean {
  return useStore(
    (s) => s.libraryOpen && (s.inspectorPanel as string) === COMMENTS_PANEL,
  );
}

export const CommentLaneSlot = memo(function CommentLaneSlot({
  shown,
}: {
  shown: boolean;
}) {
  if (!shown) return null;
  return (
    <div
      data-ds="v2"
      data-testid="comment-lane"
      className="grid shrink-0 grid-cols-[260px_minmax(0,1fr)] bg-daw-surface-1 shadow-[inset_0_-1px_0_var(--daw-hairline)]"
      style={{ height: COMMENT_LANE_PX }}
    >
      <div
        className={cn(
          TYPE_CLASS.micro,
          'flex items-center border-r border-daw-hairline px-2 text-daw-text-3',
        )}
      >
        Comments
      </div>
      <div className="relative min-w-0" />
    </div>
  );
});
