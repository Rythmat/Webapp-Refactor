import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ClassroomRoutes } from '@/constants/routes';
import { useClassrooms } from '@/hooks/data';
import { JoinClassroomDialog } from './JoinClassroomDialog';

export const ClassroomPickerPage = () => {
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const {
    data: classrooms,
    isLoading: isClassroomsLoading,
    error: classroomsError,
  } = useClassrooms();

  const isLoading = isClassroomsLoading;
  const isError = classroomsError;
  const hasClassrooms = classrooms && classrooms.length > 0;
  const showEmptyState = !isLoading && !isError && !hasClassrooms;

  return (
    <>
      <ClassroomLayout
        isEmpty={false}
        isLoading={isLoading}
        isNotFound={!!isError}
      >
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center gap-4 pt-10 text-center">
            <h2 className="text-xl font-semibold">No classrooms yet</h2>
            <p className="text-muted-foreground">
              Join your first classroom using the code from your teacher.
            </p>
            <Button onClick={() => setIsJoinDialogOpen(true)}>
              <PlusCircle className="mr-2 size-4" /> Join Classroom
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {classrooms?.map((classroom) => (
              <Link
                key={classroom.id}
                className="group flex min-h-[200px] w-full max-w-sm flex-col rounded-xl border bg-card p-6 text-left shadow transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                to={ClassroomRoutes.home({ classroomId: classroom.id })}
              >
                <h2 className="text-xl font-semibold group-hover:underline">
                  {classroom.name}
                </h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">
                  {classroom.description || 'No description provided.'}
                </p>
                <Button
                  asChild
                  className="mt-4 w-full"
                  tabIndex={-1}
                  variant="outline"
                >
                  <span>View Classroom</span>
                </Button>
              </Link>
            ))}

            {hasClassrooms && (
              <Card
                className="group flex min-h-[200px] w-full max-w-sm cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-transparent p-6 text-center shadow transition-all hover:border-solid hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                tabIndex={0}
                onClick={() => setIsJoinDialogOpen(true)}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') &&
                  setIsJoinDialogOpen(true)
                }
              >
                <CardHeader className="p-0">
                  <CardTitle className="text-lg font-medium text-muted-foreground group-hover:text-primary">
                    <PlusCircle className="mb-2 inline-block size-6" /> <br />
                    Join New Classroom
                  </CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>
        )}
      </ClassroomLayout>

      <JoinClassroomDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
      />
    </>
  );
};
