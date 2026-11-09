import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { HomeGlow } from '@/components/ClassroomLayout/home/HomeGlow';
import { cn } from '@/components/utilities';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { LessonKeyboardSlotContext } from '@/learn/keyboard/lessonKeyboardSlot';
import { LessonPanelSlotContext } from './LessonInsightPanel';
import { LessonRail, LessonRailContext } from './LessonRail';
import {
  LessonSheetDockContext,
  LessonToolRail,
  type LessonTools,
} from './LessonToolRail';
import type { HeaderModel, StepNavModel } from './types';

// ── Lesson frame ───────────────────────────────────────────────────────────
// What every lesson screen (Theory, Fundamentals, guitar, piano, Music
// Literacy) sits in, in the look of Home and Learn (owner, 2026-10-26): the
// lesson rail on the left, the tool rail on the right (About, settings; the
// Studio's side rail), and the lesson between with Home's glow behind
// its top, held to the lesson's key color. The layout inside keeps its own
// scrolling column and bar; the lesson's keyboard docks on that bar
// (lessonKeyboardSlot).

const COLLAPSED_KEY = 'ma.lessonRail.collapsed';

/** The rail's collapsed state, remembered on this device. */
function useRailCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const set = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // Storage blocked: the choice lasts this visit.
    }
  };
  return [collapsed, set] as const;
}

/**
 * About this step and the settings share the panel's place: one open at a
 * time (owner, 2026-10-26). Opening either from the rail closes the other.
 */
function oneAtATime({ about, settings }: LessonTools): LessonTools {
  return {
    about: {
      ...about,
      onToggle: () => {
        if (!about.open && settings.open) settings.onToggle();
        about.onToggle();
      },
    },
    settings: {
      ...settings,
      onToggle: () => {
        if (!settings.open && about.open) about.onToggle();
        settings.onToggle();
      },
    },
  };
}

export interface LessonFrameProps extends HTMLAttributes<HTMLDivElement> {
  header: HeaderModel;
  nav: StepNavModel;
  /** About this step and the settings, on the tool rail at the right. */
  tools: LessonTools;
  children: ReactNode;
}

export function LessonFrame({
  header,
  nav,
  tools,
  className,
  children,
  ...rest
}: LessonFrameProps) {
  const [collapsed, setCollapsed] = useRailCollapsed();
  // One of About and the settings at a time, however the other was opened
  // (the settings sheet closes itself on a press outside, which can race the
  // rail's own toggles): both open, the one that was open before closes.
  const wasOpen = useRef({ about: false, settings: false });
  useEffect(() => {
    const was = wasOpen.current;
    const { about, settings } = tools;
    if (about.open && settings.open) {
      if (was.settings && !was.about) settings.onToggle();
      else if (was.about && !was.settings) about.onToggle();
    }
    wasOpen.current = { about: about.open, settings: settings.open };
  });
  // Only from `lg`: narrower, the nav's section pills do its job (and it
  // isn't in the page at all, so the sections are never listed twice).
  const wide = useMediaQuery('(min-width: 1024px)');
  // Where the lesson's keyboard docks: on the bar (GuitarActionBar).
  const [keyboardEl, setKeyboardEl] = useState<HTMLElement | null>(null);
  // Where the sheets open, beside the tool rail: the lesson's column.
  const [dockEl, setDockEl] = useState<HTMLElement | null>(null);
  // Where About this step's Insight panel goes: beside the tool rail.
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);
  const keyboardSlot = useMemo(
    () => ({ el: keyboardEl, setEl: setKeyboardEl }),
    [keyboardEl],
  );
  return (
    <div
      {...rest}
      className={cn(
        'relative flex h-full min-h-0 bg-[#101012] text-[#e8e8f0]',
        className,
      )}
    >
      {wide && (
        <LessonRail
          header={header}
          nav={nav}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />
      )}
      {/* `isolate`, so the glow's -z-10 sits behind the lesson but in front
        of the frame's background (as on Home). */}
      <div
        ref={setDockEl}
        className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <HomeGlow
          colors={[header.keyColor, header.keyColor]}
          className="inset-x-0 top-0 h-[clamp(16rem,45vh,30rem)]"
        />
        {/* Wide, the sections are the rail's alone, open or collapsed (owner,
          2026-10-26: no section pills there); narrower, the nav's pills. */}
        <LessonRailContext.Provider value={wide}>
          <LessonKeyboardSlotContext.Provider value={keyboardSlot}>
            <LessonSheetDockContext.Provider value={dockEl}>
              <LessonPanelSlotContext.Provider value={panelEl}>
                {children}
              </LessonPanelSlotContext.Provider>
            </LessonSheetDockContext.Provider>
          </LessonKeyboardSlotContext.Provider>
        </LessonRailContext.Provider>
      </div>
      {/* The Insight panel's place: over the lesson's right edge, beside
        the rail, as the settings sheet opens (owner, 2026-10-26: the lesson
        keeps its size). Empty, it takes no room. */}
      <div
        ref={setPanelEl}
        data-lesson-panel-slot
        className="absolute inset-y-0 right-12 z-40 flex py-2 pl-2 empty:hidden"
      />
      <LessonToolRail tools={oneAtATime(tools)} noteViews={nav.noteViews} />
    </div>
  );
}
