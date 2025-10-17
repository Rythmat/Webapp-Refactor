import { differenceInSeconds, format } from 'date-fns';
import { ChevronLeft, QrCode, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthActions } from '@/contexts/AuthContext';
import { InviteStudentDialog } from '@/features/teacher/components/InviteStudentDialog';
import { useClassroom } from '@/hooks/data';
import { useNow } from '@/hooks/useNow';
import { FullScreenLoading } from '../FullScreenLoading';
import { Logo } from '../Logo';
import { LogoType } from '../LogoType';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const AUTO_HIDE_HEADER_DELAY_SECONDS = 4;

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
  const [renderedAt] = useState<Date>(new Date());
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const now = useNow({ live: true });

  const { data: classroom } = useClassroom(classroomId);
  const { signOut } = useAuthActions();

  const displayHeaderAnyway = useMemo(
    () =>
      differenceInSeconds(now, renderedAt) <= AUTO_HIDE_HEADER_DELAY_SECONDS,
    [renderedAt, now],
  );

  if (isLoading) {
    return <FullScreenLoading />;
  }

  if (isNotFound) {
    return (
      <div className="flex h-dvh w-full animate-fade-in-bottom flex-col items-center justify-center gap-4">
        <LogoType className="mb-8 h-10" />
        <div className="text-2xl font-bold">This lesson is not available</div>
        <p className="relative bottom-2 text-muted-foreground">
          Please check double-check the URL and try again.
        </p>
        {back && (
          <Button asChild>
            <Link to={back.to}>{back.label}</Link>
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex h-dvh w-full animate-fade-in-bottom flex-col items-center justify-center gap-4">
        <LogoType className="mb-8 h-10" />
        <div className="text-2xl font-bold">This lesson has no content.</div>
        <p className="relative bottom-2 text-muted-foreground">
          If this is unexpected, please contact our support team.
        </p>
        {back && (
          <Button asChild>
            <Link to={back.to}>{back.label}</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-y-auto">
      <header className="group/header container flex h-20 shrink-0 animate-fade-in-bottom items-center justify-between">
        <div className="flex h-full items-center gap-4">
          <Logo className="h-10" />
          <div
            className="opacity-0 transition-opacity group-hover/header:opacity-100"
            style={{ opacity: displayHeaderAnyway ? 100 : undefined }}
          >
            {back && (
              <Button asChild variant="link">
                <Link to={back.to}>
                  <ChevronLeft className="size-4" />
                  {back.label}
                </Link>
              </Button>
            )}
          </div>
        </div>
        <div
          className="flex items-center gap-4 text-muted-foreground opacity-0 transition-opacity group-hover/header:opacity-100"
          style={{ opacity: displayHeaderAnyway ? 100 : undefined }}
        >
          <span>{format(now, 'hh:mm a')}</span>
          {classroom && (
            <Button
              className="size-8 opacity-60 hover:opacity-100"
              size="icon"
              variant="ghost"
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <QrCode className="size-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback>
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="container flex flex-1 flex-col">
        <main className="container flex-1 animate-fade-in-bottom rounded-3xl bg-surface-box p-8 opacity-0 delay-500 fill-mode-forwards">
          {children}
        </main>
      </div>

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
