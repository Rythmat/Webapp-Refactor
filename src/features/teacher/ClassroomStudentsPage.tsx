import { Search, UserPlus, MoreHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClassroom, useClassroomStudents } from '@/hooks/data';
import { InviteStudentDialog } from './components/InviteStudentDialog';

export const ClassroomStudentsPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();

  const { data: classroom } = useClassroom(classroomId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'removed'
  >('active');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const {
    data: students = [],
    isLoading,
    isError,
  } = useClassroomStudents(classroomId, { status: statusFilter });

  // Filter students based on search query
  const filteredStudents = students.filter(
    (student) =>
      student.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">
            Manage students in your classroom
          </p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="mr-2 size-4" />
          Invite Student
        </Button>
      </div>

      <div>
        <CardHeader className="px-0 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Class Roster</CardTitle>
              <CardDescription>
                {filteredStudents.length} students in {classroom?.name}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-4 size-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    className="absolute right-0.5 top-0.5 size-8 p-0"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value: 'all' | 'active' | 'removed') =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-2">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                There was an error loading students. Please try again.
              </p>
              <Button className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'No students match your search criteria.'
                  : 'No students in this classroom yet.'}
              </p>
              {!searchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(true)}
                >
                  <UserPlus className="mr-2 size-4" />
                  Invite Your First Student
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.nickname}
                    </TableCell>
                    <TableCell>{student.username}</TableCell>
                    <TableCell>
                      <Badge
                        variant={student.removedAt ? 'secondary' : 'default'}
                      >
                        {student.removedAt ? 'Removed' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="size-8 p-0"
                            size="sm"
                            variant="ghost"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>View Progress</DropdownMenuItem>
                          <DropdownMenuItem>Send Message</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!student.removedAt ? (
                            <DropdownMenuItem className="text-destructive">
                              Remove from Class
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>
                              Reactivate Student
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </div>

      {classroom?.code && classroomId && (
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
