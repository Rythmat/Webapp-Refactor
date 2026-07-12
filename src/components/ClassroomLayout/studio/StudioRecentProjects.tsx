import { AudioWaveform, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { StudioRoutes } from '@/constants/routes';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import {
  studioProjectsApi,
  type StudioProjectSummary,
} from '@/lib/studio-projects/api';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';

const MAX_PROJECTS = 8;

/**
 * The same interactive honeycomb tile the Home Recent Activity feed uses for a
 * studio project: a deterministic SVG from the project seed, painted onto the
 * interactive `HexWaveBackground` canvas. Memoised so the SVG is stable per seed.
 */
const ProjectHexTile = ({ seed }: { seed: string }) => {
  const svg = useMemo(() => generateStudioTileSvg(seed), [seed]);
  return (
    <HexWaveBackground
      src={svg}
      drain={false}
      ambient
      colorThreshold={0.05}
      brushRadius={40}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};

/**
 * Recent Projects section — the user's cloud studio projects (most-recently
 * touched first, via `studioProjectsApi.list`). A tile opens that project in the
 * DAW editor (`/studio/editor?project=<id>`).
 */
interface StudioRecentProjectsProps {
  /** When set, show a "View Project Library +" pill linking here (dashboard use). */
  viewAllTo?: string;
}

export const StudioRecentProjects = ({
  viewAllTo,
}: StudioRecentProjectsProps = {}) => {
  const token = useAuthToken();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<StudioProjectSummary[] | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await studioProjectsApi.list(token);
        if (!cancelled) setProjects(list);
      } catch (err) {
        console.error('Failed to load studio projects', err);
        if (!cancelled) setProjects([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const openProject = (id: string) =>
    navigate(
      `${StudioRoutes.editor.definition}?project=${encodeURIComponent(id)}`,
    );

  return (
    <section
      aria-label="Recent Projects"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <AudioWaveform className="h-7 w-7 text-white/85 md:h-8 md:w-8" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Recent Projects
          </h2>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
          >
            <span>View Project Library</span>
            <Plus className="h-5 w-5" />
          </Link>
        )}
      </div>

      {projects === null ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/60">
          No saved projects yet — start one from “New Project” above.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {projects.slice(0, MAX_PROJECTS).map((p) => {
            const title = p.name || 'Untitled Project';
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openProject(p.id)}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
              >
                <div className="relative size-14 flex-shrink-0 overflow-hidden rounded-xl bg-black/30">
                  <ProjectHexTile seed={`project:${p.id}`} />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">
                    {title}
                  </span>
                  <span className="block truncate text-xs text-white/55">
                    {p.composerName || `${p.bpm ?? '—'} BPM`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
