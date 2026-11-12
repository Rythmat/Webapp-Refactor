import { GraduationCap, Library, Lightbulb, Users } from 'lucide-react';
import { cn } from '@/components/utilities';
import {
  AutomationGlyph,
  EditGlyph,
  FxGlyph,
  InstrumentGlyph,
} from '@/daw/ui/icons/frameIcons';
import { DELTA_PATH, SHELL, type ShellLayout } from './shellTokens';

const PANELS = [Lightbulb, Library, GraduationCap, Users];
const VIEWS = ['Create', 'Mix', 'Score'];

/**
 * The side rail (`daw/shell/inspector/SideRail.tsx`): ∆ Prism on top — lit,
 * as its bar is open — then Insight, Library, Lessons and Collaborate.
 * Display only; desktop only.
 */
export const StudioSideRail = ({ layout }: { layout: ShellLayout }) => (
  <div
    aria-hidden
    className="absolute right-0 flex flex-col items-center gap-1.5 pt-1"
    style={{
      top: layout.topH,
      bottom: layout.bottomH,
      width: layout.railW,
    }}
  >
    <span className="grid size-8 place-items-center rounded bg-white text-[#101012]">
      <svg
        viewBox="0 0 20 20"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      >
        <path d={DELTA_PATH} />
      </svg>
    </span>
    <span className="my-1 h-px w-6" style={{ background: SHELL.hairline }} />
    {PANELS.map((Icon, i) => (
      <span
        key={i}
        className="grid size-8 place-items-center rounded"
        style={{ color: SHELL.text2 }}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
    ))}
  </div>
);

/**
 * The bottom bar (`daw/shell/bottombar/BottomRail.tsx`): the dock's
 * Instrument · FX and Edit · Automation pills on the left, the view tabs
 * Create · Mix · Score in the centre (Create on). Display only.
 */
export const StudioBottomBar = ({
  layout,
  compact,
}: {
  layout: ShellLayout;
  compact: boolean;
}) => {
  const icon = compact ? 'size-5' : 'size-4';
  const cell = compact ? 'size-10' : 'size-8';
  const pill = (glyphs: (typeof InstrumentGlyph)[]) => (
    <span
      className="flex items-center rounded-full px-0.5"
      style={{ background: SHELL.pill, color: SHELL.pillText }}
    >
      {glyphs.map((Glyph, i) => (
        <span key={i} className={cn('grid place-items-center', cell)}>
          <Glyph className={icon} />
        </span>
      ))}
    </span>
  );
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 bottom-0 grid grid-cols-[1fr_auto_1fr] items-center px-2"
      style={{ height: layout.bottomH }}
    >
      <span className="flex items-center gap-1.5">
        {pill([InstrumentGlyph, FxGlyph])}
        {!compact && pill([EditGlyph, AutomationGlyph])}
      </span>
      <span
        className="flex items-center rounded-full p-0.5"
        style={{ background: SHELL.pill }}
      >
        {VIEWS.map((v, i) => (
          <span
            key={v}
            className={cn(
              'flex items-center rounded-full',
              compact ? 'h-9 px-4' : 'h-7 px-3.5',
              i === 0 && 'font-bold',
            )}
            style={{
              fontSize: layout.font.body,
              background: i === 0 ? SHELL.pillOn : undefined,
              color: i === 0 ? '#ffffff' : SHELL.pillText,
            }}
          >
            {v}
          </span>
        ))}
      </span>
    </div>
  );
};
