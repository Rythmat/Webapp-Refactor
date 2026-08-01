/**
 * NewLessonMenu — the single "New Lesson" entry on the Lessons list. A lesson can
 * start blank or from an Interactive-Session template (Song Session / Genre
 * Lesson); the template options route into the deck wizard preselected to that
 * template (`?template=`), and every path ends in the one lesson editor. This
 * replaces the old separate "New Day" + "Interactive Session" buttons.
 */
import { Music2, PlusCircle, Sparkles, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { newBlankDay } from './newBlankDay';
import { useLocalPlan } from './useLocalPlan';

interface NewLessonMenuProps {
  classroomId: string;
}

export const NewLessonMenu = ({ classroomId }: NewLessonMenuProps) => {
  const navigate = useNavigate();
  const { saveDay } = useLocalPlan();
  const [open, setOpen] = useState(false);

  const startBlank = () => {
    const day = newBlankDay();
    saveDay(day);
    navigate(TeacherRoutes.dayEditor({ classroomId, dayId: day.id }));
  };

  const startTemplate = (template: 'song' | 'genre') => {
    navigate(
      `${TeacherRoutes.deckWizard({ classroomId })}?template=${template}`,
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
      >
        <PlusCircle className="h-4 w-4" />
        New Lesson
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 flex w-64 flex-col gap-1 rounded-2xl border border-white/10 bg-[#141416] p-1.5 shadow-xl"
          >
            <MenuItem
              icon={PlusCircle}
              label="Blank Lesson"
              desc="An empty 5-phase lesson to build from scratch"
              onClick={() => {
                setOpen(false);
                startBlank();
              }}
            />
            <MenuItem
              icon={Music2}
              label="Song Session"
              desc="Interactive lesson built around a song"
              onClick={() => {
                setOpen(false);
                startTemplate('song');
              }}
            />
            <MenuItem
              icon={Sparkles}
              label="Genre Lesson"
              desc="Guided lesson for a genre and level"
              onClick={() => {
                setOpen(false);
                startTemplate('genre');
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  desc: string;
  onClick: () => void;
}

const MenuItem = ({ icon: Icon, label, desc, onClick }: MenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
  >
    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/70" />
    <span className="flex flex-col">
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-xs text-white/50">{desc}</span>
    </span>
  </button>
);
