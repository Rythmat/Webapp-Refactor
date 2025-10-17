import { GraduationCap, LogOut, PlusCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { useAuthActions } from '@/contexts/AuthContext';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useClassrooms } from '@/hooks/data';
import { CreateClassroomDialog } from './components/CreateClassroomDialog';

export const ClassroomSelectionPage = () => {
  const navigate = useNavigate();
  const { role } = useAuthContext();
  const { signOut } = useAuthActions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: classrooms = [], isLoading } = useClassrooms();

  // Redirect if user is not a teacher
  if (role !== 'teacher') {
    navigate(TeacherRoutes.root());
    return null;
  }

  return (
    <div className="m-2 flex flex-1 flex-col rounded-2xl bg-surface-box px-32 py-8">
      <header className="flex flex-row justify-between">
        <h1 className="mb-8 text-3xl font-bold md:text-4xl">Classrooms</h1>
        <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="size-4" />
          Create Classroom
        </Button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : classrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-surface-box py-16">
          <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="size-12 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-medium">No Classrooms Yet</h3>
          <p className="mb-6 max-w-md text-center text-muted-foreground">
            You haven&apos;t created any classrooms yet. Start by creating your
            first classroom to begin managing your students.
          </p>
          <Button
            className="gap-2"
            size="lg"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <PlusCircle className="size-4" />
            Create Your First Classroom
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {classrooms.map((classroom) => (
            <Card
              key={classroom.id}
              className="group flex flex-col transition-all"
            >
              <CardHeader className="pb-2 pt-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {classroom.name}
                </CardTitle>
                <CardDescription className="line-clamp-3 text-muted-foreground">
                  {classroom.description || 'No description provided'}
                </CardDescription>
                <CardDescription className="text-muted-foreground">
                  {classroom.studentCount} students joined
                </CardDescription>
                <CardDescription>{classroom.year}</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col gap-3 pb-3">
                <Button asChild className="w-full" variant="outline">
                  <Link
                    to={ClassroomRoutes.home({ classroomId: classroom.id })}
                  >
                    Enter Classroom
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link
                    to={TeacherRoutes.students({ classroomId: classroom.id })}
                  >
                    <Users className="size-4" />
                    View students
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CreateClassroomDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <div className="mt-16 flex justify-center">
        <Button
          className="flex items-center gap-2"
          size="lg"
          variant="outline"
          onClick={() => signOut()}
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
