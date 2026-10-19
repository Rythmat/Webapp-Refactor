import { memo } from 'react';
import { useStore } from '@/daw/store';
import { Segmented } from '@/daw/ui/Segmented';

// ── Full score | Lead sheet ────────────────────────────────────────────────
// The Score and the Lead sheet are one page with two layouts (owner,
// 2026-10-16): the top bar has one Score tab, and this switch, first in the
// page's header, picks the layout. The view ids stay 'score' and
// 'leadsheet' (drafts, keymaps and the harness name them), and the Lead
// sheet segment keeps its lesson anchor, view-switch-leadsheet. The Full
// score segment has one too, view-switch-fullscore: the Score tab opens the
// layout last shown, so a lesson about the full score points here when the
// lead sheet comes up.

export type ScoreLayout = 'score' | 'leadsheet';

const LAYOUTS = [
  {
    value: 'score' as const,
    label: 'Full score',
    anchor: 'view-switch-fullscore',
  },
  {
    value: 'leadsheet' as const,
    label: 'Lead sheet',
    anchor: 'view-switch-leadsheet',
  },
];

export const ScoreLayoutSwitch = memo(function ScoreLayoutSwitch() {
  const layout = useStore(
    (s): ScoreLayout => (s.currentView === 'leadsheet' ? 'leadsheet' : 'score'),
  );
  const setCurrentView = useStore((s) => s.setCurrentView);
  return (
    <Segmented
      label="Score layout"
      options={LAYOUTS}
      value={layout}
      onValueChange={setCurrentView}
      className="score-no-print shrink-0"
    />
  );
});
