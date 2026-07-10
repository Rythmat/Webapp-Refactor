import { History, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import { readLocalSession } from '@/lib/studio-projects/localSession';

const tileClass =
  'group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]';

/**
 * "New Project" section of the Studio Dashboard: start a blank session, and —
 * when a local autosave exists — resume the last in-progress session. Both open
 * the DAW editor (`/studio/editor`).
 */
export const StudioNewProject = () => {
  const navigate = useNavigate();
  // Read the autosave once; localStorage doesn't change under us mid-render.
  const [lastSession] = useState(() => readLocalSession());
  const lastName = lastSession?.data.projectName || 'Untitled Project';

  return (
    <section aria-label="New Project" className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center gap-2 md:gap-3">
        <img
          src="/icons/studio-icon.svg"
          alt=""
          draggable={false}
          className="h-8 w-8 md:h-10 md:w-10"
        />
        <h2 className="text-xl font-medium text-white md:text-2xl">
          New Project
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
        <button
          type="button"
          onClick={() => navigate(`${StudioRoutes.editor.definition}?new=1`)}
          className={tileClass}
        >
          <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-white/15">
            <Plus className="size-7 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-medium text-white">Blank Project</div>
            <div className="text-sm text-white/60">
              Start from an empty session
            </div>
          </div>
        </button>

        {lastSession && (
          <button
            type="button"
            onClick={() => navigate(StudioRoutes.editor.definition)}
            className={tileClass}
          >
            <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-white/15">
              <History className="size-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-medium text-white">
                Continue last session
              </div>
              <div className="truncate text-sm text-white/60">{lastName}</div>
            </div>
          </button>
        )}
      </div>
    </section>
  );
};
