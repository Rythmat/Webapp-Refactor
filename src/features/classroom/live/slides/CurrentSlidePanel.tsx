import { Eye, EyeOff } from 'lucide-react';
import { InteractionResponseDashboard } from '../../assignments/InteractionResponseDashboard';
import type { ResponseAggregate } from '../../assignments/buildResponseAggregate';
import type { Slide } from '../../slides/types';
import { ResponseRateRing } from '../../slides/viz/ResponseRateRing';
import { RevealViz } from '../../slides/viz/RevealViz';
import { fromResponseAggregate } from '../../slides/viz/buildVizAggregate';
import type { Interaction } from '../../types';
import type { SlideProgress, SlideProgressState } from '../buildSlideProgress';
import { AppRouteProgressStrip } from './AppRouteProgressStrip';

interface CurrentSlidePanelProps {
  slide: Slide;
  interactions: Interaction[];
  /** Aggregate rows scoped to THIS slide's interactions (identified — teacher only). */
  aggregateRows: ResponseAggregate[];
  sharedInteractionIds: string[];
  onToggleShare: (interactionId: string, on: boolean) => void;
  respondedCount: number;
  rosterCount: number;
  /** Live module progress for app-route slides (teacher-only). */
  appRouteProgress?: {
    rows: Array<{
      enrollmentId: string;
      displayName: string;
      state: SlideProgressState;
    }>;
    counts: SlideProgress['counts'];
  };
}

/**
 * The teacher's per-slide control panel: reveal toggle(s) (the existing
 * share mechanism, renamed "Reveal to class"), a response-rate ring, an
 * animated aggregate for visual parity with the projector, and the full
 * identified dashboard for this slide's interactions.
 */
export const CurrentSlidePanel = ({
  slide,
  interactions,
  aggregateRows,
  sharedInteractionIds,
  onToggleShare,
  respondedCount,
  rosterCount,
  appRouteProgress,
}: CurrentSlidePanelProps) => {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/90">
            {slide.title.en}
          </span>
          <span className="text-xs uppercase tracking-wide text-white/40">
            {slide.kind} slide
          </span>
        </div>
        {rosterCount > 0 && interactions.length > 0 && !appRouteProgress && (
          <ResponseRateRing responded={respondedCount} total={rosterCount} />
        )}
      </div>

      {appRouteProgress ? (
        <AppRouteProgressStrip
          rows={appRouteProgress.rows}
          counts={appRouteProgress.counts}
        />
      ) : interactions.length === 0 ? (
        <p className="text-sm text-white/50">
          No responses on this slide — students are watching the screen.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {interactions.map((interaction) => {
            const shared = sharedInteractionIds.includes(interaction.id);
            const canShare =
              interaction.type !== 'check-in' &&
              interaction.shareable !== false;
            return (
              <div
                key={interaction.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                  {interaction.question.en}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    canShare && onToggleShare(interaction.id, !shared)
                  }
                  disabled={!canShare}
                  title={
                    canShare
                      ? undefined
                      : interaction.type === 'check-in'
                        ? 'Check-ins are structurally teacher-only.'
                        : 'This interaction is not shareable.'
                  }
                  className={
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ' +
                    (!canShare
                      ? 'cursor-not-allowed border border-white/[0.06] text-white/30'
                      : shared
                        ? 'bg-[#7ecfcf] text-black hover:bg-[#7ecfcf]/85'
                        : 'border border-white/10 text-white/80 hover:border-white/25 hover:text-white')
                  }
                >
                  {shared ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  {shared ? 'Revealing' : 'Reveal to class'}
                </button>
              </div>
            );
          })}

          {aggregateRows.map((row) => {
            const viz = fromResponseAggregate(row, 'en');
            if (!viz) return null;
            return (
              <RevealViz
                key={row.interactionId}
                viz={viz}
                reveal={slide.kind === 'interaction' ? slide.reveal : undefined}
                size="panel"
                language="en"
              />
            );
          })}

          <InteractionResponseDashboard aggregate={aggregateRows} />
        </div>
      )}
    </div>
  );
};
