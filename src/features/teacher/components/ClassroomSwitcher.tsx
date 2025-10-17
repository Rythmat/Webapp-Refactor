import { ChevronDown, PlusCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { useClassroom, useClassrooms } from '@/hooks/data';

export const ClassroomSwitcher = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { classroomId } = useParams<{ classroomId: string }>();

  const { data: classrooms = [], isLoading } = useClassrooms();
  const { data: classroom } = useClassroom(classroomId);

  const handleCreateClassroom = () => {
    navigate(TeacherRoutes.root());
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={false}
          aria-label="Select a classroom"
          className={cn('w-full justify-between px-3', className)}
          role="combobox"
          variant="outline"
        >
          {isLoading ? (
            <Skeleton className="h-4 w-[120px]" />
          ) : classroomId ? (
            <span className="truncate">{classroom?.name}</span>
          ) : (
            <span className="text-muted-foreground">Select a classroom</span>
          )}
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[250px] border-none p-0"
        side="right"
      >
        <Command className="bg-surface-box">
          <CommandInput placeholder="Search classroom..." />
          <CommandList>
            <CommandEmpty>No classrooms found.</CommandEmpty>
            {isLoading ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-2 py-1.5">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <CommandGroup heading="Your Classrooms">
                {classrooms.map((classroom) => (
                  <CommandItem key={classroom.id} asChild className="text-sm">
                    <Link
                      to={TeacherRoutes.students({ classroomId: classroom.id })}
                    >
                      <span className="truncate">{classroom.name}</span>
                    </Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleCreateClassroom}>
                <PlusCircle className="mr-2 size-4" />
                <span>Create New Classroom</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
