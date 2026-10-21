import { cn } from '@/components/utilities';
import { memo, useEffect } from 'react';
import { useStore, type ViewType } from '@/daw/store';
import { hintText } from '@/daw/shell/help/hintSource';
import { preloadView } from '@/daw/shell/lazyParts';
import { Tab, TabList, Tabs } from '@/daw/ui/Tabs';

// ── The view tabs (milestone 2.5) ──────────────────────────────────────────
//
// Create · Mix · Score, and Practice first while a Practice Track session
// exists. 'Mix' was 'Master'. The Score and the Lead sheet are one page with
// two layouts since the owner's request of 2026-10-16: one Score tab, which
// is on for either view and opens the layout last shown; the page's own
// switch (ScoreLayoutSwitch) carries the view-switch-leadsheet anchor. The
// view ids are unchanged. The tabs control the shell's main region
// (MAIN_REGION_ID), which shows the view.

export const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'arrange', label: 'Create' },
  { id: 'studio', label: 'Mix' },
  { id: 'score', label: 'Score' },
];

/** The Score tab's layout: the one last shown (this session). */
let lastScoreLayout: ViewType = 'score';

/** What each view is for, for the hint line (2.11). */
const VIEW_PURPOSE: Partial<Record<ViewType, string>> = {
  arrange: 'Build the song from tracks and clips',
  studio: 'Balance the tracks’ volume, pan and effects',
  score: 'Read and write the song as sheet music',
  practice: 'Back to your practice track',
};

/** The view a tab opens: the Score tab, its last layout. */
const layoutOf = (tab: ViewType): ViewType =>
  tab === 'score' ? lastScoreLayout : tab;

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
 * pill segments, white/50 at rest, the open view's on white/20. The open
 * view is marked by its fill and by aria-selected, not colour alone.
 */
const SEGMENT =
  'h-8 rounded-full px-4 font-normal text-daw-pill-text hover:text-daw-text data-[state=active]:bg-daw-pill-on data-[state=active]:text-daw-text after:hidden';

export const ViewTabs = memo(function ViewTabs() {
  const currentView = useStore((s) => s.currentView);
  const setCurrentView = useStore((s) => s.setCurrentView);
  useEffect(() => {
    if (currentView === 'score' || currentView === 'leadsheet') {
      lastScoreLayout = currentView;
    }
  }, [currentView]);
  const hasPracticeSession = useStore((s) => s.practiceSession !== null);
  const views = hasPracticeSession ? [PRACTICE_VIEW, ...VIEWS] : VIEWS;

  return (
    <Tabs
      value={tabOf(currentView)}
      onValueChange={(view) => setCurrentView(layoutOf(view as ViewType))}
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
            onPointerEnter={() => preloadView(layoutOf(v.id))}
            onFocus={() => preloadView(layoutOf(v.id))}
            className={cn('shrink-0 whitespace-nowrap', SEGMENT)}
          >
            {v.label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
});
