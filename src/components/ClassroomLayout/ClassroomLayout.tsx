import { ChevronLeft, QrCode } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InviteStudentDialog } from '@/features/teacher/components/InviteStudentDialog';
import { useClassroom } from '@/hooks/data';
import { FullScreenLoading } from '../FullScreenLoading';
import { Button } from '../ui/button';

/**
 * Thin wrapper for `/classrooms` and `/classrooms/:id`. Provides:
 *   - loading / not-found / empty state branches
 *   - optional slim back link + invite pill (rendered only when useful)
 *   - standard app page shell (`max-w-[1720px]` inset) around children
 *
 * The old auto-hiding top chrome (Logo, clock, avatar dropdown) and the
 * nested rounded `bg-surface-box` box were redundant with the outer app
 * chrome (`ClassroomSidebar` + `TopRail`) — they've been retired.
 */
export const ClassroomLayout = ({
  children,
  isLoading,
  isEmpty,
  isNotFound,
  back,
  classroomId,
}: {
  children: React.ReactNode;
  back?: {
    label: string;
    to: string;
  };
  isNotFound: boolean;
  isLoading: boolean;
  isEmpty: boolean;
  classroomId?: string;
}) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const { data: classroom } = useClassroom(classroomId);

  if (isLoading) {
    return <FullScreenLoading />;
  }

  if (isNotFound) {
    return (
      <div className="flex h-full w-full animate-fade-in-bottom flex-col items-center justify-center gap-4 text-center">
        <div className="text-2xl font-medium text-white">
          This lesson is not available
        </div>
        <p className="text-sm text-white/60">
          Please double-check the URL and try again.
        </p>
        {back && (
          <Button
            asChild
            className="rounded-full bg-white text-black hover:bg-white/85"
          >
            <Link to={back.to}>{back.label}</Link>
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex h-full w-full animate-fade-in-bottom flex-col items-center justify-center gap-4 text-center">
        <div className="text-2xl font-medium text-white">
          This lesson has no content.
        </div>
        <p className="text-sm text-white/60">
          If this is unexpected, please contact our support team.
        </p>
        {back && (
          <Button
            asChild
            className="rounded-full bg-white text-black hover:bg-white/85"
          >
            <Link to={back.to}>{back.label}</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 px-6 py-6 md:gap-6 md:px-10 md:py-10">
      {(back || classroom) && (
        <div className="flex items-center justify-between">
          {back ? (
            <Link
              to={back.to}
              className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              {back.label}
            </Link>
          ) : (
            <span />
          )}
          {classroom && (
            <button
              type="button"
              onClick={() => setIsInviteDialogOpen(true)}
              aria-label="Invite students"
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 px-5 py-3 text-base font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white md:px-6 md:py-3.5"
            >
              <QrCode className="h-5 w-5" />
              Invite
            </button>
          )}
        </div>
      )}

      {children}

      {classroom && classroomId && (
        <InviteStudentDialog
          classroomCode={classroom.code}
          classroomId={classroomId}
          isOpen={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
        />
      )}
    </div>
  );
};
