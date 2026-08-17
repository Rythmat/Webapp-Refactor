import { ArrowRight, Compass, Play } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HISTORICAL_MODULES } from '@/components/atlas/data';
import { AtlasRoutes } from '@/constants/routes';
import { GlobeSectionHeader } from './GlobeSectionHeader';
import { ROOTS_AND_ROUTES } from './data/rootsAndRoutes';

// The 6 "Roots & Routes" lineages are mirrored as HistoricalModules whose ids
// match the route ids, so the "Guided Tours" grid below excludes them (they get
// their own richer shelf) and every card deep-links to /atlas/globe?pathway=<id>.
const ROOT_ROUTE_IDS = new Set(ROOTS_AND_ROUTES.map((r) => r.id));

const pathwayHref = (id: string) => `${AtlasRoutes.globe()}?pathway=${id}`;

const CARD_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf]/50';

interface GlobePathwaysProps {
  /**
   * When provided, cards act as SELECTORS (a `<button>` calling this) instead of
   * navigation `<Link>`s — reused by the lesson editor's content picker so the
   * picker shows the exact dashboard shelf. Omit for the dashboard's default
   * "open the globe" behavior.
   */
  onSelectPathway?: (id: string, title: string) => void;
}

/**
 * Shared card wrapper: a selector `<button>` in picker mode, else a navigation
 * `<Link>` to `/atlas/globe?pathway=<id>` (the dashboard default).
 */
const PathwayShell = ({
  id,
  title,
  ariaLabel,
  className,
  onSelectPathway,
  children,
}: {
  id: string;
  title: string;
  ariaLabel: string;
  className: string;
  onSelectPathway?: (id: string, title: string) => void;
  children: ReactNode;
}) =>
  onSelectPathway ? (
    <button
      type="button"
      onClick={() => onSelectPathway(id, title)}
      aria-label={ariaLabel}
      className={`${className} text-left`}
    >
      {children}
    </button>
  ) : (
    <Link to={pathwayHref(id)} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );

/**
 * Pathways tab — a launcher for the globe's guided tours. Two shelves:
 *  1. "Roots & Routes" — curated genre-genealogy lineages (rich step chains),
 *     each clickable to trace the lineage on the interactive globe.
 *  2. "Guided Tours" — the globe's event-chain modules.
 * Clicking any card opens the Main Globe and auto-starts that pathway (or, in
 * picker mode, selects it — see `onSelectPathway`).
 */
export const GlobePathways = ({ onSelectPathway }: GlobePathwaysProps = {}) => {
  const guidedTours = HISTORICAL_MODULES.filter(
    (m) => !ROOT_ROUTE_IDS.has(m.id),
  );

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      {/* ── Roots & Routes ─────────────────────────────────────────────── */}
      <section
        aria-label="Roots and Routes"
        className="flex flex-col gap-4 md:gap-6"
      >
        <div className="flex flex-col gap-2">
          <GlobeSectionHeader
            icon={
              <img
                src="/icons/pathways-icon.svg"
                alt=""
                draggable={false}
                className="h-8 w-8 md:h-10 md:w-10"
              />
            }
            title="Roots & Routes"
          />
          <p className="text-sm text-white/60 md:text-base">
            Trace how the world’s traditions flowed into one another — the
            musical family trees behind today’s genres. Pick one to follow it on
            the globe.
          </p>
        </div>

        <div className="flex flex-col gap-4 md:gap-5">
          {ROOTS_AND_ROUTES.map((route) => (
            <PathwayShell
              key={route.id}
              id={route.id}
              title={route.title}
              onSelectPathway={onSelectPathway}
              ariaLabel={
                onSelectPathway
                  ? `Add ${route.title} pathway`
                  : `Trace ${route.title} on the globe`
              }
              className={`group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05] md:p-6 ${CARD_FOCUS}`}
            >
              <h3 className="text-lg font-medium text-white md:text-xl">
                {route.title}
              </h3>
              <p className="mt-1 text-sm text-white/60">{route.overview}</p>

              <ol className="mt-4 flex flex-wrap items-stretch gap-2">
                {route.steps.map((step, i) => (
                  <Fragment key={step.label}>
                    {i > 0 && (
                      <div
                        className="flex items-center self-center text-white/30"
                        aria-hidden="true"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                    <li className="flex w-[160px] flex-col rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 md:w-[190px]">
                      <span className="text-sm font-semibold text-white">
                        {step.label}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-[#7ecfcf]">
                        {step.region}
                      </span>
                      <span className="mt-1 text-xs leading-snug text-white/55">
                        {step.note}
                      </span>
                    </li>
                  </Fragment>
                ))}
              </ol>

              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#7ecfcf]">
                <Play className="h-3.5 w-3.5 fill-current" />
                {onSelectPathway ? 'Add this pathway' : 'Trace on the globe'}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </PathwayShell>
          ))}
        </div>
      </section>

      {/* ── Guided Tours ───────────────────────────────────────────────── */}
      <section
        aria-label="Guided Tours"
        className="flex flex-col gap-4 md:gap-6"
      >
        <div className="flex flex-col gap-2">
          <GlobeSectionHeader
            icon={<Compass className="h-7 w-7 text-white/85 md:h-8 md:w-8" />}
            title="Guided Tours"
          />
          <p className="text-sm text-white/60 md:text-base">
            Fly the globe through a chain of moments in music history, stop by
            stop.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guidedTours.map((mod) => (
            <PathwayShell
              key={mod.id}
              id={mod.id}
              title={mod.title}
              onSelectPathway={onSelectPathway}
              ariaLabel={
                onSelectPathway
                  ? `Add ${mod.title} pathway`
                  : `Start ${mod.title} on the globe`
              }
              className={`group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05] ${CARD_FOCUS}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{mod.emoji}</span>
                <h3 className="min-w-0 flex-1 text-base font-medium text-white">
                  {mod.title}
                </h3>
              </div>
              <p className="mt-2 flex-1 text-sm leading-snug text-white/60">
                {mod.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
                {mod.eventIds.length} stops
                <ArrowRight className="h-3.5 w-3.5 text-[#7ecfcf] transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </PathwayShell>
          ))}
        </div>
      </section>
    </div>
  );
};
