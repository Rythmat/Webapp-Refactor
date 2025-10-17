import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteIcon } from '@/components/ui/icons/delete-icon';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStudents } from '@/hooks/data';
import { useDeleteStudent } from '@/hooks/data/students/useDeleteStudent';
import { NoStudents } from './NoStudents';

const DATE_FORMAT = 'MMM d, yyyy';

interface StudentsListProps {
  searchQuery: string;
}

export const StudentsList = ({ searchQuery }: StudentsListProps) => {
  const [studentToDelete, setStudentToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const {
    data: students = [],
    isLoading,
    refetch,
  } = useStudents({
    name: searchQuery || undefined,
  });

  const deleteStudent = useDeleteStudent();

  // Refetch when search changes
  useEffect(() => {
    refetch();
  }, [searchQuery, refetch]);

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    await deleteStudent.mutateAsync(studentToDelete.id);
    setStudentToDelete(null);
  };

  return (
    <div>
      <CardHeader className="px-0">
        <div>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Students who are registered in the system
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex space-x-2">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {searchQuery ? (
              'No students found matching your search criteria'
            ) : (
              <NoStudents />
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Classrooms</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.nickname}</TableCell>
                  <TableCell>{student.email || '-'}</TableCell>
                  <TableCell>
                    {student.username ? `@${student.username}` : student.email}
                  </TableCell>
                  <TableCell>{student.school || '-'}</TableCell>
                  <TableCell>{student.classroomCount}</TableCell>
                  <TableCell>
                    {format(new Date(student.createdAt), DATE_FORMAT)}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="text-destructive hover:text-destructive"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setStudentToDelete({
                                id: student.id,
                                name: student.nickname,
                              })
                            }
                          >
                            <DeleteIcon className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog
        open={!!studentToDelete}
        onOpenChange={(open) => !open && setStudentToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {studentToDelete?.name}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentToDelete(null)}>
              Cancel
            </Button>
            <Button
              disabled={deleteStudent.isPending}
              variant="destructive"
              onClick={handleDeleteStudent}
            >
              {deleteStudent.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
