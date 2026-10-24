import { useEffect, useState } from 'react';
import { StudioRoutes } from '@/constants/routes';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import type { ActivityItem } from '@/hooks/data';
// The REST client alone: api.ts is the editor's save path, with the store.
import { studioProjectsApi } from '@/lib/studio-projects/projectsClient';
import { useStudioSession } from './useStudioSession';

const MAX_PROJECTS = 5;

/**
 * Home's Projects column: the student's cloud Studio projects
 * (`studioProjectsApi.list`) plus the unsaved session on this device
 * (useStudioSession), newest first. `projects` is null while the cloud list
 * is loading.
 */
export function useHomeProjects(): { projects: ActivityItem[] | null } {
  const token = useAuthToken();
  const session = useStudioSession();
  const [cloud, setCloud] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    if (!token) {
      setCloud([]);
      return;
    }
    setCloud(null);
    let cancelled = false;
    studioProjectsApi
      .list(token)
      .then((list) => {
        if (cancelled) return;
        setCloud(
          list.map((p) => ({
            id: `project:${p.id}`,
            kind: 'project' as const,
            category: 'Studio Project',
            title: p.name || 'Untitled Project',
            subtitle: p.composerName || `${p.bpm ?? '—'} BPM`,
            route: `${StudioRoutes.editor.definition}?project=${encodeURIComponent(p.id)}`,
            touchedAt: new Date(p.updatedAt).getTime() || 0,
          })),
        );
      })
      .catch((err: unknown) => {
        console.error('Failed to load studio projects', err);
        if (!cancelled) setCloud([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (cloud === null) return { projects: null };
  const all = session ? [session, ...cloud] : cloud;
  return {
    projects: all
      .sort((a, b) => b.touchedAt - a.touchedAt)
      .slice(0, MAX_PROJECTS),
  };
}
