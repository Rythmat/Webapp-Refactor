import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CONTENT_KEY } from '@/hooks/data/admin/useAdminContent';

/**
 * Repo mode (DEV only): when the repo's data files change outside the
 * console (a hand edit, `git checkout`, the bulk import), the dev server
 * reloads its store and says so on Vite's HMR channel
 * (`repo-content:changed`, scripts/vite/repoContentPlugin.ts). This
 * refetches every content query then, so the Table, the mind map and
 * Integrity show the files as they are now.
 *
 * The console's own saves need none of it: each one invalidates the
 * content queries itself, and the dev server lets it cause no HMR.
 *
 * Loaded only through a dynamic import behind a literal
 * `import.meta.env.DEV && CONTENT_REPO`, so a production build never
 * contains it, or the event's name.
 */
export function useRepoContentSync(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    const hot = import.meta.hot;
    if (!import.meta.env.DEV || !hot) return;
    const refetch = () => {
      void queryClient.invalidateQueries({ queryKey: [...CONTENT_KEY] });
    };
    hot.on('repo-content:changed', refetch);
    return () => hot.off('repo-content:changed', refetch);
  }, [queryClient]);
}

/** The hook as a component, for a lazy mount: renders nothing. */
export const RepoContentSync = () => {
  useRepoContentSync();
  return null;
};
