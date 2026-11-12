import { Check, ChevronDown, LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { CreateClassroomDialog } from '@/features/teacher/components/CreateClassroomDialog';
import { useClassroom, useMyClassrooms } from '@/hooks/data';
import { useOnClassCreated } from '../classes/useOnClassCreated';
import { ClassCover } from '../ui/ClassCover';

/**
 * The class in the top rail's crumb, as a switcher: every class the teacher
 * runs (each opens on its Overview), All classes, and New class.
 */
export const ClassSwitcher = ({ classroomId }: { classroomId: string }) => {
  const navigate = useNavigate();
  const { data: classroom } = useClassroom(classroomId);
  const { classrooms } = useMyClassrooms();
  const [createOpen, setCreateOpen] = useState(false);
  const onCreated = useOnClassCreated();
  const name = classroom?.name ?? 'Class';

  return (
    <>
      <Menu>
        <MenuTrigger
          aria-label={`${name}: switch class`}
          className={cn(
            'group inline-flex h-9 min-w-0 items-center gap-2 rounded-full bg-daw-pill pl-1.5 pr-3 text-[0.8125rem] font-bold text-daw-text hover:bg-daw-hover',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          <ClassCover
            classroomId={classroomId}
            className="size-6 rounded-full"
          />
          <span className="min-w-0 truncate">{name}</span>
          <ChevronDown
            aria-hidden
            className="size-3.5 shrink-0 text-daw-text-3 transition-transform group-data-[state=open]:rotate-180"
          />
        </MenuTrigger>
        <MenuContent align="start" sideOffset={6} className="w-64">
          <MenuLabel>Your classes</MenuLabel>
          {classrooms.map((c) => (
            <MenuItem
              key={c.id}
              icon={
                <ClassCover classroomId={c.id} className="size-4 rounded" />
              }
              onSelect={() => {
                if (c.id !== classroomId) {
                  navigate(
                    TeacherRoutes.classroomDashboard({ classroomId: c.id }),
                  );
                }
              }}
            >
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="truncate">{c.name}</span>
                {c.id === classroomId && (
                  <Check aria-label="Current" className="size-4 opacity-70" />
                )}
              </span>
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuItem
            icon={<LayoutGrid />}
            onSelect={() => navigate(OfficeRoutes.classes())}
          >
            All classes
          </MenuItem>
          <MenuItem icon={<Plus />} onSelect={() => setCreateOpen(true)}>
            New class
          </MenuItem>
        </MenuContent>
      </Menu>
      <CreateClassroomDialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onCreated}
      />
    </>
  );
};
