import { cn } from '@/components/utilities';
import { memo } from 'react';
import { useStore, type ViewType } from '@/daw/store';
import { hintText } from '@/daw/shell/help/hintSource';
import { preloadView } from '@/daw/shell/lazyParts';
import { Tab, TabList, Tabs } from '@/daw/ui/Tabs';

// ── The view tabs (milestone 2.5) ──────────────────────────────────────────
//
// Create · Mix · Score, and Practice first while a Practice Track session
// exists. 'Mix' was 'Master'. The Score and the Lead sheet are one editor
// since 2026-10-21 (owner): one Score tab, one page; the old 'leadsheet'
// view id opens it too (setCurrentView). The tabs control the shell's main
// region (MAIN_REGION_ID), which shows the view.

export const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'arrange', label: 'Create' },
  { id: 'studio', label: 'Mix' },
  { id: 'score', label: 'Score' },
];

/** What each view is for, for the hint line (2.11). */
const VIEW_PURPOSE: Partial<Record<ViewType, string>> = {
  arrange: 'Build the song from tracks and clips',
  studio: 'Balance the tracks’ volume, pan and effects',
  score: 'Read and write the song as sheet music',
  practice: 'Back to your practice track',
};

/** The tab a view shows under: the Lead sheet is the Score tab's. */
export function tabOf(view: ViewType): ViewType {
  return view === 'leadsheet' ? 'score' : view;
}

// A Practice Track session adds a way back to its one-purpose screen.
export const PRACTICE_VIEW = { id: 'practice' as ViewType, label: 'Practice' };

/** The shell's main region (StudioShell's MAIN_REGION_ID). */
const MAIN_REGION = 'daw-main-region';

/**
 * The tabs as the bottom rail draws them (the floating frame, S0): 32 px
 * pill segments, white/50 at rest, the open view's on white/20 and bold:
 * the weight is the cue that is not colour alone (the underline's job in
 * Tabs).
 */
const SEGMENT =
  'h-8 rounded-full px-4 font-normal text-daw-pill-text hover:text-daw-text data-[state=active]:bg-daw-pill-on data-[state=active]:font-bold data-[state=active]:text-daw-text after:hidden';

export const ViewTabs = memo(function ViewTabs() {
  const currentView = useStore((s) => s.currentView);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const hasPracticeSession = useStore((s) => s.practiceSession !== null);
  const views = hasPracticeSession ? [PRACTICE_VIEW, ...VIEWS] : VIEWS;

  return (
    <Tabs
      value={tabOf(currentView)}
      onValueChange={(view) => setCurrentView(view as ViewType)}
      activationMode="manual"
    >
      <TabList aria-label="Views" className="h-auto gap-0.5 bg-transparent p-0">
        {views.map((v) => (
          <Tab
            key={v.id}
            value={v.id}
            data-tutorial-id={`view-switch-${v.id}`}
            data-hint={hintText(v.label, VIEW_PURPOSE[v.id])}
            aria-controls={MAIN_REGION}
            // Each view but Create is its own chunk (1.12a): fetched on a
            // pointer over or a focus, so a click usually finds it there.
            onPointerEnter={() => preloadView(v.id)}
            onFocus={() => preloadView(v.id)}
            className={cn('shrink-0 whitespace-nowrap', SEGMENT)}
          >
            {v.label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
});
