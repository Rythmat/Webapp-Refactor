import { Disc3, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ProjectAvatarPattern } from '@/components/ui/ProjectAvatarPattern';
import { StudioRoutes } from '@/constants/routes';
import { DEMO_PROJECTS } from '@/daw/data/demoProjects';

interface StudioDemosProps {
  /** When set, show a "View All Demos +" pill linking here (dashboard use). */
  viewAllTo?: string;
}

/**
 * Demo Projects section — curated, fully client-side starter songs. Opening one
 * loads it into the DAW editor as an editable copy
 * (`/studio/editor?demo=<id>`): the boot path nulls the projectId so Save
 * creates a fresh project and the original demo is never overwritten.
 */
export const StudioDemos = ({ viewAllTo }: StudioDemosProps = {}) => {
  const navigate = useNavigate();

  return (
    <section
      aria-label="Demo Projects"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <Disc3 className="h-7 w-7 text-white/85 md:h-8 md:w-8" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Demo Projects
          </h2>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
          >
            <span>View All Demos</span>
            <Plus className="h-5 w-5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-5">
        {DEMO_PROJECTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() =>
              navigate(`${StudioRoutes.editor.definition}?demo=${d.id}`)
            }
            className="group flex min-w-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
          >
            <div
              className="flex size-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl"
              style={{ backgroundColor: `${d.accent}22` }}
            >
              <ProjectAvatarPattern
                projectName={d.label}
                className="h-full w-full"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-white">
                {d.label}
              </div>
              <div className="line-clamp-2 text-xs text-white/55">
                {d.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
