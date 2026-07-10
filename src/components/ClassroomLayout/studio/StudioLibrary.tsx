import { Library } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import {
  EMPTY_PROJECT_META,
  useProjectMetaBatch,
} from '@/hooks/data/useProjectMeta';
import {
  studioProjectsApi,
  type StudioProjectSummary,
} from '@/lib/studio-projects/api';
import { StudioLibraryCard } from './StudioLibraryCard';

/**
 * Project Library view — the user's saved cloud projects (all of them, via
 * `studioProjectsApi.list`) as a managed list. Each row can be opened, tagged
 * (genre / status / instruments), given collaborators, or deleted. Tags +
 * collaborators come from the project-meta store (`useProjectMetaBatch`).
 */
export const StudioLibrary = () => {
  const token = useAuthToken();
  const [projects, setProjects] = useState<StudioProjectSummary[] | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const list = await studioProjectsApi.list(token);
      setProjects(list);
    } catch (err) {
      console.error('Failed to load studio projects', err);
      setProjects([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const ids = useMemo(() => (projects ?? []).map((p) => p.id), [projects]);
  const { data: metas } = useProjectMetaBatch(ids);

  return (
    <section
      aria-label="Project Library"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex items-center gap-2 md:gap-3">
        <Library className="h-7 w-7 text-white/85 md:h-8 md:w-8" />
        <h2 className="text-xl font-medium text-white md:text-2xl">
          Project Library
        </h2>
      </div>

      {projects === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/60">
          No saved projects yet — start one from the “Project” tab.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((p) => (
            <StudioLibraryCard
              key={p.id}
              project={p}
              meta={metas?.[p.id] ?? EMPTY_PROJECT_META}
              onDeleted={() => {
                setProjects((prev) =>
                  prev ? prev.filter((x) => x.id !== p.id) : prev,
                );
                void load();
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
};
