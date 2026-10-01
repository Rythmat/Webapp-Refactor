import { motion } from 'framer-motion';
import {
  ChevronDown,
  Piano,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type { StudioState } from './studioScript';
import {
  PRESS,
  PRISM_ICON_PATH,
  STUDIO,
  STUDIO_ACCENT,
  type StudioLayout,
} from './studioTokens';

type Dock = StudioState['dock'];

/** `ChannelStrip.tsx`'s outline-triangle Prism icon. */
const PrismIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinejoin="round"
    className={className}
  >
    <path d={PRISM_ICON_PATH} />
  </svg>
);

const TAB = 'flex items-center gap-1.5 rounded-md uppercase tracking-wider';

/**
 * The bottom dock (`ChannelStrip`): the tab bar — CONTROLS / FX (decor),
 * PRISM and PIANO ROLL (the tour's `roll` target) with the teal icon on the
 * active tab only — the selected track's info and a NOW PLAYING chip, over
 * the active tab's body (fades in on switch). Compact keeps the two real tabs.
 */
export const StudioDock = ({
  layout,
  compact,
  staticMode,
  dock,
  pressRoll,
  trackColor,
  nowPlaying,
  onDock,
  children,
}: {
  layout: StudioLayout;
  compact: boolean;
  staticMode: boolean;
  dock: Dock;
  /** The auto cursor's press on PIANO ROLL. */
  pressRoll: boolean;
  trackColor: string;
  nowPlaying: { label: string; color: string } | null;
  onDock: (dock: Dock) => void;
  children: ReactNode;
}) => {
  const tabs: {
    id: Dock;
    label: string;
    Icon: LucideIcon | typeof PrismIcon;
  }[] = [
    { id: 'prism', label: 'Prism', Icon: PrismIcon },
    { id: 'roll', label: 'Piano roll', Icon: Piano },
  ];
  const decor: { label: string; Icon: LucideIcon }[] = [
    { label: 'Controls', Icon: Zap },
    { label: 'FX', Icon: Sparkles },
  ];
  const size = compact ? 'px-3 py-1.5 text-[13px]' : 'px-2.5 py-1 text-[10px]';
  const icon = compact ? 'size-4' : 'size-3';

  return (
    <>
      <div
        className="absolute inset-x-0 flex items-center gap-1 border-t px-2"
        style={{
          top: layout.dockTabs.top,
          height: layout.dockTabs.h,
          background: STUDIO.surface,
          borderColor: STUDIO.border,
        }}
      >
        {!compact &&
          decor.map(({ label, Icon }) => (
            <span
              key={label}
              aria-hidden
              className={cn(TAB, size)}
              style={{ color: STUDIO.textDim }}
            >
              <Icon className={icon} />
              {label}
            </span>
          ))}
        {tabs.map(({ id, label, Icon }) => {
          const on = dock === id;
          const pressed = id === 'roll' && pressRoll;
          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={on}
              data-tour-target={id === 'roll' ? 'roll' : undefined}
              onClick={() => onDock(id)}
              className={cn(
                TAB,
                size,
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                !on && 'hover:bg-white/[0.05]',
              )}
              style={{
                background: pressed
                  ? PRESS.overlay
                  : on
                    ? STUDIO.surface3
                    : undefined,
                color: on ? STUDIO.text : STUDIO.textDim,
                transform: pressed ? `scale(${PRESS.scale})` : undefined,
              }}
            >
              <span
                aria-hidden
                className="flex"
                style={{ color: on ? STUDIO_ACCENT : undefined }}
              >
                <Icon className={icon} />
              </span>
              {label}
            </button>
          );
        })}
        {!compact && (
          <>
            <span
              aria-hidden
              className="ml-3 flex items-center gap-1.5 text-[10px]"
              style={{ color: STUDIO.text }}
            >
              <span
                className="size-2 rounded-full transition-colors duration-300"
                style={{ background: trackColor }}
              />
              Chords
              <span
                className="rounded px-1 py-px text-[9px] uppercase"
                style={{ background: STUDIO.surface2, color: STUDIO.textDim }}
              >
                Keys
              </span>
            </span>
            {nowPlaying && (
              <span
                className="ml-3 flex items-center gap-1.5 rounded-md px-2 py-0.5"
                style={{ background: STUDIO.surface2 }}
              >
                <span
                  className="text-[9px] uppercase tracking-wider"
                  style={{ color: STUDIO.textDim }}
                >
                  Now playing
                </span>
                <motion.span
                  key={nowPlaying.label}
                  className="text-[11px]"
                  style={{ color: nowPlaying.color }}
                  initial={staticMode ? false : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {nowPlaying.label}
                </motion.span>
              </span>
            )}
            <ChevronDown
              aria-hidden
              className="ml-auto size-3.5"
              style={{ color: STUDIO.textDim }}
            />
          </>
        )}
      </div>
      <motion.div
        key={dock}
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ top: layout.dockBody.top, background: STUDIO.surface }}
        initial={staticMode ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </>
  );
};
