import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { getDraftSessionPort } from '@/daw/persistence/drafts/draftSessionPort';
import { SESSION_SCHEMA_VERSION } from '@/daw/persistence/projectDocument/codec';
import { buildProjectRows } from '@/daw/shell/projects/projectRows';
import {
  getLocalStoreUser,
  getLocalStoreUserKey,
  onLocalStoreUserChange,
} from '@/lib/local-store/userScope';
import type { DraftMeta } from '@/lib/studio-projects/drafts/types';
import {
  PROJECT_DELETED_EVENT,
  PROJECT_SAVED_EVENT,
} from '@/lib/studio-projects/projectEvents';
import {
  studioProjectsApi,
  type StudioProjectSummary,
} from '@/lib/studio-projects/projectsClient';
import { toLibraryItems, type LibraryItem } from './libraryItems';

// ── The Library's projects, loaded ─────────────────────────────────────────
// The account's list (studioProjectsApi.list, as Home reads it) and this
// user's drafts (the Studio's draft port, which works with the editor shut),
// merged by the Projects dialog's own rules. Again after a save or a delete
// anywhere in the page, and on refresh().

type Drafts = {
  mine: DraftMeta[];
  locked: ReadonlySet<string>;
};

export interface LibraryItems {
  items: LibraryItem[];
  /** Nothing to show yet: the account's list and the drafts are loading. */
  loading: boolean;
  /** The account's list couldn't be read (the device's work still shows). */
  cloudFailed: boolean;
  signedIn: boolean;
  refresh(): void;
}

export function useLibraryItems(): LibraryItems {
  const token = useAuthToken();
  const userKey = useSyncExternalStore(
    onLocalStoreUserChange,
    getLocalStoreUserKey,
  );
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const [cloud, setCloud] = useState<StudioProjectSummary[] | null>(null);
  const [cloudFailed, setCloudFailed] = useState(false);
  const [drafts, setDrafts] = useState<Drafts | null>(null);

  // A save or a delete elsewhere in the page lists them again.
  useEffect(() => {
    window.addEventListener(PROJECT_SAVED_EVENT, refresh);
    window.addEventListener(PROJECT_DELETED_EVENT, refresh);
    return () => {
      window.removeEventListener(PROJECT_SAVED_EVENT, refresh);
      window.removeEventListener(PROJECT_DELETED_EVENT, refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!token) {
      setCloud([]);
      setCloudFailed(false);
      return;
    }
    const controller = new AbortController();
    studioProjectsApi
      .list(token, { signal: controller.signal })
      .then((list) => {
        setCloud(list);
        setCloudFailed(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.warn('[library] The account’s projects could not be read', err);
        setCloud((prev) => prev ?? []);
        setCloudFailed(true);
      });
    return () => controller.abort();
  }, [token, nonce]);

  useEffect(() => {
    if (userKey === null) return;
    let live = true;
    getDraftSessionPort()
      .listDrafts({ userId: getLocalStoreUser(), userKey })
      .then((found) => {
        if (live) setDrafts({ mine: found.mine, locked: found.locked });
      })
      .catch((err: unknown) => {
        console.warn('[library] Drafts could not be listed', err);
        if (live) setDrafts({ mine: [], locked: new Set() });
      });
    return () => {
      live = false;
    };
  }, [userKey, nonce]);

  const items = useMemo(() => {
    const sections = buildProjectRows({
      mine: drafts?.mine ?? [],
      device: [],
      cloud,
      cloudFresh: cloud !== null && !cloudFailed,
      locked: drafts?.locked ?? new Set(),
      activeDraftId: getDraftSessionPort().activeDraftId(),
      liveProjectId: null,
      inRoom: false,
      schemaVersion: SESSION_SCHEMA_VERSION,
      query: '',
      sortBy: 'recent',
    });
    return toLibraryItems(sections);
  }, [drafts, cloud, cloudFailed]);

  return {
    items,
    loading: cloud === null || (userKey !== null && drafts === null),
    cloudFailed,
    signedIn: Boolean(token),
    refresh,
  };
}
