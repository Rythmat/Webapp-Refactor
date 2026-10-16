import { memo } from 'react';
import { useStore, type ViewType } from '@/daw/store';
import { preloadView } from '@/daw/shell/lazyParts';
import { Tab, TabList, Tabs } from '@/daw/ui/Tabs';

// ── The view tabs (milestone 2.5) ──────────────────────────────────────────
//
// Create · Mix · Score · Lead sheet, and Practice first while a Practice
// Track session exists. 'Mix' was 'Master'; the view ids and the
// view-switch-* lesson anchors are unchanged. The tabs control the shell's
// main region (MAIN_REGION_ID), which shows the view.

export const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'arrange', label: 'Create' },
  { id: 'studio', label: 'Mix' },
  { id: 'score', label: 'Score' },
  { id: 'leadsheet', label: 'Lead sheet' },
];

// A Practice Track session adds a way back to its one-purpose screen.
export const PRACTICE_VIEW = { id: 'practice' as ViewType, label: 'Practice' };

/** The shell's main region (StudioShell's MAIN_REGION_ID). */
const MAIN_REGION = 'daw-main-region';

export const ViewTabs = memo(function ViewTabs({
  tight = false,
}: {
  /** The folded top bar's tighter padding. */
  tight?: boolean;
}) {
  const currentView = useStore((s) => s.currentView);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const hasPracticeSession = useStore((s) => s.practiceSession !== null);
  const views = hasPracticeSession ? [PRACTICE_VIEW, ...VIEWS] : VIEWS;

  return (
    <Tabs
      value={currentView}
      onValueChange={(view) => setCurrentView(view as ViewType)}
      activationMode="manual"
    >
      <TabList aria-label="Views" className="gap-0.5">
        {views.map((v) => (
          <Tab
            key={v.id}
            value={v.id}
            data-tutorial-id={`view-switch-${v.id}`}
            aria-controls={MAIN_REGION}
            // Each view but Create is its own chunk (1.12a): fetched on a
            // pointer over or a focus, so a click usually finds it there.
            onPointerEnter={() => preloadView(v.id)}
            onFocus={() => preloadView(v.id)}
            className={`shrink-0 whitespace-nowrap ${tight ? 'px-1.5' : 'px-2.5'}`}
          >
            {v.label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
});
