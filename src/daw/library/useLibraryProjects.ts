import { useEffect, useMemo, useState } from 'react';
import { SESSION_SCHEMA_VERSION } from '@/daw/persistence/projectDocument/codec';
import { getSessionDeps } from '@/daw/session/sessionDeps';
import { useSessionStore } from '@/daw/session/sessionStore';
import { useCloudProjectList } from '@/daw/shell/projects/cloudProjectList';
import {
  buildProjectRows,
  type ProjectRow,
} from '@/daw/shell/projects/projectRows';
import { useStore } from '@/daw/store';

/** What the draft port lists for a user (its own type is inline there). */
type DraftLists = Awaited<
  ReturnType<
    NonNullable<ReturnType<typeof getSessionDeps>>['drafts']['listDrafts']
  >
>;

/**
 * The Library's Projects: this user's projects on this device and in their
 * account, as the Projects dialog lists them (the same rows, so Open opens
 * what the dialog's Open would), newest first in one list. The dialog's
 * housekeeping (claims, quarantine, Delete) stays in the dialog.
 */
export function useLibraryProjects(
  open: boolean,
  query = '',
): { rows: ProjectRow[]; loading: boolean } {
  const [lists, setLists] = useState<DraftLists | null>(null);
  const [loading, setLoading] = useState(true);
  const cloud = useCloudProjectList(open);
  const inRoom = useStore((s) => s.roomId !== null);
  const liveProjectId = useStore((s) => s.projectId);
  const sessionDraftId = useSessionStore((s) => s.draftId);

  useEffect(() => {
    if (!open) return;
    const deps = getSessionDeps();
    const user = deps?.user() ?? null;
    if (!deps || !user) {
      setLoading(false);
      return;
    }
    let live = true;
    deps.drafts
      .listDrafts(user)
      .then((found) => live && setLists(found))
      .catch((err: unknown) =>
        console.warn('[library] Drafts could not be listed:', err),
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // A new session (another project opened) lists them again.
  }, [open, sessionDraftId]);

  const activeDraftId =
    getSessionDeps()?.drafts.activeDraftId() ?? sessionDraftId;

  const rows = useMemo(() => {
    const sections = buildProjectRows({
      mine: lists?.mine ?? [],
      device: lists?.device ?? [],
      cloud: cloud.list,
      cloudFresh: cloud.status === 'ready',
      locked: lists?.locked ?? new Set(),
      activeDraftId,
      liveProjectId,
      inRoom,
      schemaVersion: SESSION_SCHEMA_VERSION,
      query,
      sortBy: 'recent',
    });
    return [...sections.device, ...sections.account, ...sections.found].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }, [
    lists,
    cloud.list,
    cloud.status,
    activeDraftId,
    liveProjectId,
    inRoom,
    query,
  ]);

  return { rows, loading: loading && cloud.status !== 'ready' };
}
