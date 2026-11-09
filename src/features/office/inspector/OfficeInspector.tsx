import { X } from 'lucide-react';
import { useMediaQuery } from '@/components/atlas/hooks/useMediaQuery';
import { cn } from '@/components/utilities';
import { Sheet } from '@/daw/ui/DawDialog';
import { IconButton } from '@/daw/ui/IconButton';
import { TYPE_CLASS } from '@/daw/ui/styles';
import {
  useOfficeInspector,
  type InspectTarget,
} from '../frame/useOfficeInspector';
import { AssignmentInspector } from './AssignmentInspector';
import { LessonInspector } from './LessonInspector';
import { StudentInspector } from './StudentInspector';

const TITLE: Record<InspectTarget['kind'], string> = {
  lesson: 'Lesson',
  student: 'Student',
  assignment: 'Assignment',
};

const Body = ({ target }: { target: InspectTarget }) => {
  const key = `${target.classroomId}/${target.id}`;
  switch (target.kind) {
    case 'lesson':
      return (
        <LessonInspector
          key={key}
          classroomId={target.classroomId}
          dayId={target.id}
        />
      );
    case 'student':
      return (
        <StudentInspector
          key={key}
          classroomId={target.classroomId}
          enrollmentId={target.id}
        />
      );
    case 'assignment':
      return (
        <AssignmentInspector
          key={key}
          classroomId={target.classroomId}
          assignmentId={target.id}
        />
      );
  }
};

/**
 * The Inspector, as the Studio's: a card beside the stage with its title and
 * a close, holding whatever the URL's `?inspect=` names. On a phone it rises
 * as a sheet from the bottom instead.
 */
export const OfficeInspector = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => {
  const { target, close } = useOfficeInspector();
  const wide = useMediaQuery('(min-width: 768px)');
  if (!target) return null;
  const title = TITLE[target.kind];

  if (!wide) {
    return (
      <Sheet
        side="bottom"
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={title}
      >
        <div className="flex max-h-[70dvh] min-h-0 flex-col">
          <Body target={target} />
        </div>
      </Sheet>
    );
  }

  return (
    <aside
      aria-label={title}
      data-testid="office-inspector"
      className={cn(
        'mr-2 flex min-h-0 w-[24rem] flex-col overflow-hidden rounded-[var(--daw-radius-lg)] bg-daw-surface-1 duration-daw-fast animate-in fade-in-0 motion-reduce:animate-none',
        className,
      )}
      style={style}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-daw-hairline pl-3 pr-1.5">
        <h2 className={cn(TYPE_CLASS.title, 'flex-1 truncate text-daw-text')}>
          {title}
        </h2>
        <IconButton
          label={`Close ${title}`}
          icon={<X />}
          size="sm"
          tooltipSide="left"
          onClick={close}
        />
      </div>
      <Body target={target} />
    </aside>
  );
};
