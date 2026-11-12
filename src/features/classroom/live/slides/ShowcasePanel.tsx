/**
 * ShowcasePanel — the teacher's control for a `showcase` slide. Lists the
 * student offers (identified — teacher-only) and PATCHes `state.showcase` to
 * feature one on the projector (all-role fan-out — a deliberate share). Offers
 * themselves never reach the projector (buildProjectorView refuses 'showcase').
 *
 * Work from any of the lesson's places (owner, 2026-11-11) wears its place's
 * icon. What a student sent to the teacher only is listed as theirs to see,
 * never featured.
 */
import { ArrowUpRight, Star, X } from 'lucide-react';
import { AppIcons } from '@/components/icons/appIcons';
import type { ShowcaseArtifact } from '../../types';
import type { SessionShowcase } from '../sessionsStore';

interface Offer {
  enrollmentId: string;
  displayName: string;
  artifact: ShowcaseArtifact;
}

export interface ShowcasePanelProps {
  slideId: string;
  offers: Offer[];
  showcase: SessionShowcase | null | undefined;
  onFeature: (showcase: SessionShowcase) => void;
  onClear: () => void;
}

export const ShowcasePanel = ({
  slideId,
  offers,
  showcase,
  onFeature,
  onClear,
}: ShowcasePanelProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-white/90">
          <Star className="h-4 w-4 text-white/60" />
          Shared work
        </span>
        {showcase && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/25 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Stop featuring
          </button>
        )}
      </div>

      {offers.length === 0 ? (
        <p className="text-sm text-white/50">
          Nothing shared yet — students pick their work on their device.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {offers.map((o) => {
            const featured = showcase?.enrollmentId === o.enrollmentId;
            const Icon = AppIcons[o.artifact.place ?? 'studio'];
            const forTeacher = o.artifact.audience === 'teacher';
            return (
              <li
                key={o.enrollmentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <Icon className="size-4 shrink-0 text-white/50" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                  {o.displayName}
                  <span className="text-white/40"> — {o.artifact.name}</span>
                </span>
                {forTeacher ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-xs text-white/45">Sent to you</span>
                    {o.artifact.deepLink && (
                      <a
                        href={o.artifact.deepLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-white/25 hover:text-white"
                      >
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={featured}
                    onClick={() =>
                      onFeature({
                        slideId,
                        enrollmentId: o.enrollmentId,
                        displayName: o.displayName,
                        artifact: o.artifact,
                      })
                    }
                    className={
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ' +
                      (featured
                        ? 'bg-white text-black'
                        : 'border border-white/10 text-white/80 hover:border-white/25 hover:text-white')
                    }
                  >
                    <Star className="h-3.5 w-3.5" />
                    {featured ? 'Featuring' : 'Feature'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
