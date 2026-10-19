import { Sparkles } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { CHORD_LANE_PX, RULER_PX } from '../tracklist/rowLayout';

// ── The chord lane's analysis offer (milestone 2.7) ────────────────────────
//
// A project that opens with notes but no chord symbols used to stop the
// editor with a dialog (insight-22). Now the empty chord lane says so and
// offers it: Analyze… opens the analysis (which tracks, then the chords it
// found, before anything is written), Not now puts it away, and the draft
// remembers that for this project. It sits in the lane, sticky with it, and
// blocks nothing.

const BUTTON = cn(
  'inline-flex h-6 items-center gap-1 rounded-full px-2.5 font-bold [&_svg]:size-3.5',
  TYPE_CLASS.label,
  TRANSITION,
  FOCUS_RING,
);

export const ChordAnalysisBanner = memo(function ChordAnalysisBanner() {
  const shown = useStore(
    (s) =>
      s.chordAnalysisOffered &&
      !s.chordAnalysisDismissed &&
      s.chordRegions.length === 0,
  );
  if (!shown) return null;
  return (
    // Zero height and sticky, so it rides with the chord lane drawn on the
    // canvas without taking room in the scroller.
    <div
      className="sticky z-[var(--daw-z-sticky)] h-0"
      style={{ top: RULER_PX }}
    >
      <div
        role="status"
        data-testid="chord-analysis-banner"
        data-ds="v2"
        className="absolute inset-x-0 top-0 flex items-center gap-2 bg-daw-surface-1 px-3"
        style={{ height: CHORD_LANE_PX }}
      >
        <span className={cn(TYPE_CLASS.label, 'truncate text-daw-text-2')}>
          This song has notes but no chord symbols.
        </span>
        <button
          type="button"
          className={cn(
            BUTTON,
            'bg-daw-primary text-daw-on-primary hover:bg-daw-primary-hover',
          )}
          onClick={() => useStore.getState().openChordAnalysisPrompt()}
        >
          <Sparkles aria-hidden />
          Analyze…
        </button>
        <button
          type="button"
          className={cn(
            BUTTON,
            'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
          )}
          onClick={() => useStore.getState().dismissChordAnalysis()}
        >
          Not now
        </button>
      </div>
    </div>
  );
});
