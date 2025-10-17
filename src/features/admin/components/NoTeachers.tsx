import { Button } from '@/components/ui/button';
import { TeacherIcon } from '@/components/ui/icons/teacher-icon';

export const NoTeachers = ({
  openInviteDialog,
}: {
  openInviteDialog: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-2 rounded-full bg-black p-4">
        <TeacherIcon className="size-10 text-muted-foreground" />
      </div>
      <p className="text-3xl text-white">All quiet on the staff line</p>
      <p className="text-muted-foreground">
        No teachers on the sheet yet. Hit the right note by inviting your first
        one
      </p>
      <Button className="mt-5" onClick={openInviteDialog}>
        Invite the first teacher
      </Button>
    </div>
  );
};
