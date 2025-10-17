import { StudentIcon } from '@/components/ui/icons/student-icon';

export const NoStudents = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-2 rounded-full bg-black p-4">
        <StudentIcon className="size-10 text-muted-foreground" />
      </div>
      <p className="text-3xl text-white">No students in sight</p>
      <p className="text-muted-foreground">
        Your classroom’s still quiet. Add your first student and let the
        learning begin.
      </p>
    </div>
  );
};
