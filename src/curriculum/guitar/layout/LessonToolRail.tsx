import {
  ChartNoAxesGantt,
  Lightbulb,
  Music,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { createContext, useContext, useId } from 'react';
import { cn } from '@/components/utilities';
import { Tooltip } from '@/daw/ui/Tooltip';
import {
  useFingeringDisplay,
  usePianoDisplaySettings,
} from '@/features/learn/usePianoDisplaySettings';
import { useRollView, type RollView } from '@/lib/notation';
import { HandIcon } from './HandIcon';
import type { StepNavModel } from './types';

// ── Lesson tool rail ───────────────────────────────────────────────────────
// After the Studio's side rail (SideRail; owner, 2026-10-26): a 48px column
// of icons at the lesson's right edge, About this step and the lesson's
// settings. Each opens its sheet beside the rail (lessonSheetDock), the open
// one on the white tile, and a second press closes it. Under them, on a piano
// activity, its note views (Roll, Notation, Falling) and the hands, the
// chosen ones on the white tile.

export interface LessonTools {
  about: { open: boolean; hasNews?: boolean; onToggle: () => void };
  settings: { open: boolean; onToggle: () => void };
}

/**
 * Where a lesson's sheets open: the lesson's column, beside the rail. None
 * outside a lesson (or on a phone, where they rise from the bottom).
 */
export const LessonSheetDockContext = createContext<HTMLElement | null>(null);
export const useLessonSheetDock = () => useContext(LessonSheetDockContext);

export function LessonToolRail({
  tools,
  noteViews,
}: {
  tools: LessonTools;
  noteViews?: StepNavModel['noteViews'];
}) {
  const newsId = useId();
  const { about, settings } = tools;
  return (
    <div
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Lesson tools"
      data-lesson-tools
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-white/[0.06] py-3"
    >
      <ToolButton
        icon={Lightbulb}
        label="About this step"
        open={about.open}
        onClick={about.onToggle}
        describedBy={about.hasNews ? newsId : undefined}
        dataAttr={{ 'data-guitar-about': '' }}
        dot={about.hasNews}
      />
      {about.hasNews && (
        <span id={newsId} hidden>
          New notes for this step
        </span>
      )}
      <ToolButton
        icon={SlidersHorizontal}
        label="Lesson settings"
        open={settings.open}
        onClick={settings.onToggle}
        dataAttr={{ 'data-guitar-settings': '' }}
      />
      {noteViews && (
        <>
          <div aria-hidden className="my-1.5 h-px w-6 bg-white/10" />
          <NoteViewButtons />
          {noteViews.hands && <HandsButton />}
        </>
      )}
    </div>
  );
}

const NOTE_VIEWS: {
  id: RollView;
  /** Its name (as the nav's pills had it). */
  label: string;
  /** Its tooltip. */
  hint: string;
  icon: LucideIcon;
  iconClassName?: string;
}[] = [
  { id: 'roll', label: 'Roll', hint: 'Piano roll', icon: ChartNoAxesGantt },
  { id: 'notation', label: 'Notation', hint: 'Notation', icon: Music },
  {
    id: 'cascade',
    label: 'Falling',
    hint: 'Falling notes',
    icon: ChartNoAxesGantt,
    // The roll's own bars stood upright: the same picture, falling.
    iconClassName: '[&_svg]:rotate-90',
  },
];

/** Roll / Notation / Falling, on the device's saved Learn view. */
function NoteViewButtons() {
  const [view, setView] = useRollView('learn');
  return (
    <div
      role="radiogroup"
      aria-label="Note view"
      data-roll-view-switch
      className="flex flex-col items-center gap-1"
    >
      {NOTE_VIEWS.map((option) => (
        <Tooltip key={option.id} content={option.hint} side="left">
          <button
            type="button"
            role="radio"
            aria-checked={view === option.id}
            aria-label={option.label}
            onClick={() => setView(option.id)}
            className={cn(railButton(view === option.id), option.iconClassName)}
          >
            <option.icon aria-hidden strokeWidth={1.75} />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

/** The book's hands over the keys, on or off. */
function HandsButton() {
  const { hands } = useFingeringDisplay({ hands: false });
  const setShowHands = usePianoDisplaySettings((s) => s.setShowHands);
  return (
    <Tooltip
      content={hands ? 'Hide the hands' : 'Show the hands on the keys'}
      side="left"
    >
      <button
        type="button"
        aria-label="Hands"
        aria-pressed={hands}
        data-hands-switch
        onClick={() => setShowHands(!hands)}
        className={railButton(hands)}
      >
        {/* A touch larger than the line icons: a filled drawing. */}
        <HandIcon aria-hidden className="!size-5" />
      </button>
    </Tooltip>
  );
}

/** A rail icon: the chosen or open one on the white tile (the Studio's). */
function railButton(on: boolean) {
  return cn(
    'relative flex size-8 items-center justify-center rounded-md outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40 [&_svg]:size-[18px]',
    on
      ? 'bg-white text-[#101012] hover:bg-[#E6E6E8]'
      : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
  );
}

function ToolButton({
  icon: Icon,
  label,
  open,
  onClick,
  describedBy,
  dataAttr,
  dot,
}: {
  icon: LucideIcon;
  label: string;
  open: boolean;
  onClick: () => void;
  describedBy?: string;
  dataAttr: Record<string, string>;
  dot?: boolean;
}) {
  return (
    <Tooltip content={label} side="left">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={onClick}
        {...dataAttr}
        data-unseen={dot || undefined}
        className={railButton(open)}
      >
        <Icon aria-hidden strokeWidth={1.75} />
        {dot && !open && (
          <span
            aria-hidden
            data-guitar-about-dot
            className="absolute right-1 top-1 size-1.5 rounded-full bg-white"
          />
        )}
      </button>
    </Tooltip>
  );
}
