import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutGrid,
  Library,
  ListChecks,
  Plus,
  Sun,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import { useMyClassrooms } from '@/hooks/data';
import { inspectSearch } from '../frame/useOfficeInspector';
import { OFFICE_LIBRARY_ENABLED } from '../officeFlags';
import { ClassCover } from '../ui/ClassCover';

/**
 * ⌘K in the Office, as Linear's and Khan's command bars: jump to any page,
 * any class, any lesson (it opens in the Inspector over its class's Plan),
 * or start something new. Students join it once rosters come from the
 * server for every class.
 */
export const OfficeCommandPalette = ({
  open,
  onOpenChange,
  classroomId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The class the teacher is in, if any: its actions come first. */
  classroomId: string | null;
}) => {
  const navigate = useNavigate();
  const { classrooms } = useMyClassrooms();
  const { listDays } = useLocalPlan();
  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };
  const names = new Map(classrooms.map((c) => [c.id, c.name]));
  const lessons = classrooms.flatMap((c) =>
    listDays(c.id).map((day) => ({ day, classroomId: c.id })),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Search the Office</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to a page, a class or a lesson, or start something new.
        </DialogDescription>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:size-4">
          <CommandInput placeholder="Search classes, lessons, pages…" />
          <CommandList className="max-h-[min(60vh,28rem)]">
            <CommandEmpty>Nothing matches.</CommandEmpty>
            {classroomId && (
              <CommandGroup heading="This class">
                <CommandItem
                  value="new lesson"
                  onSelect={() =>
                    go(`${TeacherRoutes.plan({ classroomId })}?new=1`)
                  }
                >
                  <Plus className="mr-2" /> New lesson
                </CommandItem>
                <CommandItem
                  value="build a live deck"
                  onSelect={() => go(TeacherRoutes.deckWizard({ classroomId }))}
                >
                  <Plus className="mr-2" /> Build a live deck
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Go to">
              <CommandItem
                value="today"
                onSelect={() => go(OfficeRoutes.root())}
              >
                <Sun className="mr-2" /> Today
              </CommandItem>
              <CommandItem
                value="classes"
                onSelect={() => go(OfficeRoutes.classes())}
              >
                <LayoutGrid className="mr-2" /> Classes
              </CommandItem>
              <CommandItem
                value="planner"
                onSelect={() => go(OfficeRoutes.planner())}
              >
                <CalendarDays className="mr-2" /> Planner
              </CommandItem>
              {OFFICE_LIBRARY_ENABLED && (
                <CommandItem
                  value="library"
                  onSelect={() => go(OfficeRoutes.library())}
                >
                  <Library className="mr-2" /> Library
                </CommandItem>
              )}
              <CommandItem
                value="review"
                onSelect={() => go(OfficeRoutes.review())}
              >
                <ListChecks className="mr-2" /> Review
              </CommandItem>
              <CommandItem
                value="new class create classroom"
                onSelect={() => go(`${OfficeRoutes.classes()}?new=1`)}
              >
                <Plus className="mr-2" /> New class
              </CommandItem>
            </CommandGroup>
            {classrooms.length > 0 && (
              <CommandGroup heading="Classes">
                {classrooms.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`class ${c.name} ${c.id}`}
                    onSelect={() =>
                      go(
                        TeacherRoutes.classroomDashboard({ classroomId: c.id }),
                      )
                    }
                  >
                    <ClassCover
                      classroomId={c.id}
                      className="mr-2 size-5 rounded"
                    />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {lessons.length > 0 && (
              <CommandGroup heading="Lessons">
                {lessons.map(({ day, classroomId: cid }) => (
                  <CommandItem
                    key={day.id}
                    value={`lesson ${day.label} ${names.get(cid) ?? ''} ${day.id}`}
                    onSelect={() =>
                      go(
                        `${TeacherRoutes.plan({ classroomId: cid })}${inspectSearch(
                          {
                            kind: 'lesson',
                            classroomId: cid,
                            id: day.id,
                          },
                        )}`,
                      )
                    }
                  >
                    <BookOpen className="mr-2" />
                    <span className="flex-1 truncate">{day.label}</span>
                    <span className="ml-2 flex items-center gap-1 text-xs text-white/45">
                      <GraduationCap className="size-3" />
                      {names.get(cid)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
