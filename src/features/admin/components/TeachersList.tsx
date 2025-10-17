import { format } from 'date-fns';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DeleteIcon } from '@/components/ui/icons/delete-icon';
import { Input } from '@/components/ui/input';
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
import { useTeachers } from '@/hooks/data';
import { NoTeachers } from './NoTeachers';

const DATE_FORMAT = 'MMM d, yyyy';
const DEBOUNCE_MS = 300;

interface TeachersListProps {
  onRemoveTeacher: (id: string, name: string) => void;
  openInviteDialog: () => void;
}

export const TeachersList = ({
  onRemoveTeacher,
  openInviteDialog,
}: TeachersListProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  const {
    data: teachers = [],
    isLoading,
    refetch,
  } = useTeachers({
    name: debouncedSearch || undefined,
  });

  // Refetch when search changes
  useEffect(() => {
    refetch();
  }, [debouncedSearch, refetch]);

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
  };

  return (
    <div>
      <CardHeader className="px-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Active Teachers</CardTitle>
            <CardDescription>
              Teachers who are currently active in the system
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 rounded-full pl-9"
              placeholder="Search by name"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <Button
                className="absolute right-0 top-0 h-full"
                size="icon"
                variant="ghost"
                onClick={handleClearSearch}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
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
        ) : teachers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {debouncedSearch ? (
              'No teachers found matching your search criteria'
            ) : (
              <NoTeachers openInviteDialog={openInviteDialog} />
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Classrooms</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>{teacher.fullName || teacher.nickname}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.school || '-'}</TableCell>
                  <TableCell>{teacher.classroomCount}</TableCell>
                  <TableCell>
                    {format(new Date(teacher.createdAt), DATE_FORMAT)}
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
                              onRemoveTeacher(
                                teacher.id,
                                teacher.fullName || teacher.nickname,
                              )
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
    </div>
  );
};
