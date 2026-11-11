import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  dismissToast,
  showError,
  showLoading,
  showSuccess,
} from '@/components/utils/toast';
import { LibraryRoutes } from '@/constants/routes';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { getDraftSessionPort } from '@/daw/persistence/drafts/draftSessionPort';
import { confirmDialog, promptDialog } from '@/daw/ui/DialogHost';
import { getLocalStoreUserKey } from '@/lib/local-store/userScope';
import { getDraftStore } from '@/lib/studio-projects/drafts/draftStore';
import {
  studioProjectsApi,
  type StudioProjectLibraryMeta,
} from '@/lib/studio-projects/projectsClient';
import type { LibraryItem, ProjectEntry } from './libraryItems';
import { toggleFavorite } from './libraryLocalMeta';
import {
  addToProject,
  createProject,
  deleteProject,
  removeFromProjects,
  renameProject,
  UNTITLED_PROJECT,
} from './libraryProjects';
import {
  mixItem,
  projectHrefOf,
  studioHrefOf,
  type PlayItem,
} from './libraryTypes';
import { playerActions } from './player/libraryPlayer';
import { dropPreviews } from './preview/previewCache';

// ── What the Library's menus do ────────────────────────────────────────────
// A session: play, queue, open in the Studio, copy its link, favourite, put
// it in a project, file it (genre and status, saved sessions only:
// patchMeta), download a WAV, delete. Rename, Duplicate and Set artist
// wait for the API (owner, 2026-11-11). A project (a folder of sessions):
// play them all, queue them, rename, copy its link, favourite, delete (its
// sessions stay).

export interface LibraryActions {
  play(item: LibraryItem): void;
  queue(item: LibraryItem): void;
  open(item: LibraryItem): void;
  copyLink(item: LibraryItem): void;
  /** Favourite a session, or a project (by its projectKey). */
  favorite(item: { key: string }): void;
  setMeta(item: LibraryItem, meta: Partial<StudioProjectLibraryMeta>): void;
  /** A WAV of the mix, or of one track (a stem's queue item). */
  download(item: PlayItem): void;
  remove(item: LibraryItem): void;
  /** Put sessions in a project, out of any other. */
  addToProject(projectId: string, items: readonly LibraryItem[]): void;
  /** A new project (its name asked for), holding `items`. */
  newProject(items?: readonly LibraryItem[]): void;
  removeFromProject(item: LibraryItem): void;
  playProject(entry: ProjectEntry, start?: number): void;
  queueProject(entry: ProjectEntry): void;
  renameProject(entry: ProjectEntry): void;
  copyProjectLink(entry: ProjectEntry): void;
  deleteProject(entry: ProjectEntry): void;
}

/** A session's mix to play; `context`, the project it is played from. */
export const playItemOf = (item: LibraryItem, context?: string): PlayItem =>
  mixItem(item.source, item.name, item.version, context);

function copy(path: string): void {
  navigator.clipboard
    ?.writeText(`${window.location.origin}${path}`)
    .then(() => showSuccess('Link copied'))
    .catch(() => showError('The link couldn’t be copied'));
}

export function useLibraryActions(onChanged: () => void): LibraryActions {
  const token = useAuthToken();
  const navigate = useNavigate();

  const play = useCallback(
    (item: LibraryItem) => playerActions.playItem(playItemOf(item)),
    [],
  );
  const queue = useCallback((item: LibraryItem) => {
    playerActions.addToQueue(playItemOf(item));
    showSuccess(`“${item.name}” is in the queue`);
  }, []);
  const open = useCallback(
    (item: LibraryItem) => navigate(studioHrefOf(item.source)),
    [navigate],
  );
  const copyLink = useCallback(
    (item: LibraryItem) => copy(studioHrefOf(item.source)),
    [],
  );
  const favorite = useCallback(
    (item: { key: string }) => toggleFavorite(item.key),
    [],
  );

  const setMeta = useCallback(
    (item: LibraryItem, meta: Partial<StudioProjectLibraryMeta>) => {
      if (item.source.kind !== 'cloud' || !token) return;
      studioProjectsApi
        .patchMeta(token, item.source.projectId, meta)
        .then(onChanged)
        .catch((err: unknown) => {
          console.warn('[library] Tags not saved', err);
          showError('That didn’t save. Check your connection and try again.');
        });
    },
    [token, onChanged],
  );

  const download = useCallback(
    (playItem: PlayItem) => {
      const toast = showLoading(`Making a WAV of “${playItem.title}”…`);
      void (async () => {
        try {
          const [{ renderDownload }, { downloadAudioBlob }] = await Promise.all(
            [
              import('./preview/renderPreview'),
              import('@/daw/audio/exportAudio'),
            ],
          );
          const { blob, filename } = await renderDownload(playItem, { token });
          downloadAudioBlob(blob, filename);
          dismissToast(toast);
          showSuccess('Downloaded');
        } catch (err) {
          console.warn('[library] Download failed', err);
          dismissToast(toast);
          showError('The WAV couldn’t be made. Try again.');
        }
      })();
    },
    [token],
  );

  const remove = useCallback(
    (item: LibraryItem) => {
      void (async () => {
        const saved = item.source.kind === 'cloud';
        const confirmed = await confirmDialog({
          title: `Delete “${item.name}”?`,
          description: saved
            ? 'It is removed from your account for good. Work on this device that isn’t saved stays here.'
            : 'It is only on this device, so deleting it removes the only copy.',
          confirmLabel: 'Delete',
          danger: true,
        });
        if (!confirmed) return;
        const userKey = getLocalStoreUserKey() ?? 'anon';
        try {
          if (item.source.kind === 'cloud') {
            if (!token) throw new Error('signed out');
            const projectId = item.source.projectId;
            await studioProjectsApi.remove(token, projectId);
            // A draft that pointed at it no longer does, so opening it
            // never re-creates the project (as File ▸ Delete leaves it).
            const port = getDraftSessionPort();
            const drafts = await getDraftStore().list(userKey);
            for (const meta of drafts) {
              if (meta.projectId === projectId) {
                void port.patchCloud(meta.draftId, {
                  projectId: null,
                  cloud: null,
                });
              }
            }
          } else {
            const result = await getDraftSessionPort().deleteDraft(
              item.source.draftId,
            );
            if (result === 'refused') {
              showError(
                'It’s open in the Studio right now, so it wasn’t deleted.',
              );
              return;
            }
          }
        } catch (err) {
          console.warn('[library] Delete failed', err);
          showError(
            'It couldn’t be deleted. Check your connection and try again.',
          );
          return;
        }
        playerActions.forget(item.key);
        removeFromProjects([item.key]);
        void dropPreviews(userKey, item.key);
        showSuccess('Deleted');
        onChanged();
      })();
    },
    [token, onChanged],
  );

  const project = useMemo(
    () => ({
      addToProject(projectId: string, items: readonly LibraryItem[]) {
        addToProject(
          projectId,
          items.map((i) => i.key),
        );
      },
      newProject(items: readonly LibraryItem[] = []) {
        void (async () => {
          const name = await promptDialog({
            title: 'New project',
            label: 'Project name',
            placeholder: UNTITLED_PROJECT,
            confirmLabel: 'Create project',
            maxLength: 80,
          });
          if (name === null) return;
          const id = createProject(
            name,
            items.map((i) => i.key),
          );
          if (id) navigate(projectHrefOf(id));
        })();
      },
      removeFromProject(item: LibraryItem) {
        removeFromProjects([item.key]);
      },
      playProject(entry: ProjectEntry, start = 0) {
        playerActions.playItems(
          entry.sessions.map((i) => playItemOf(i, entry.name)),
          start,
        );
      },
      queueProject(entry: ProjectEntry) {
        for (const item of entry.sessions) {
          playerActions.addToQueue(playItemOf(item, entry.name));
        }
        if (entry.sessions.length) {
          showSuccess(`“${entry.name}” is in the queue`);
        }
      },
      renameProject(entry: ProjectEntry) {
        void (async () => {
          const name = await promptDialog({
            title: 'Rename project',
            label: 'Project name',
            defaultValue: entry.name,
            confirmLabel: 'Rename',
            maxLength: 80,
          });
          if (name !== null) renameProject(entry.project.id, name);
        })();
      },
      copyProjectLink(entry: ProjectEntry) {
        copy(projectHrefOf(entry.project.id));
      },
      deleteProject(entry: ProjectEntry) {
        void (async () => {
          const confirmed = await confirmDialog({
            title: `Delete “${entry.name}”?`,
            description: 'The project goes. Its sessions stay in your Library.',
            confirmLabel: 'Delete project',
            danger: true,
          });
          if (!confirmed) return;
          deleteProject(entry.project.id);
          navigate(LibraryRoutes.root());
        })();
      },
    }),
    [navigate],
  );

  return {
    play,
    queue,
    open,
    copyLink,
    favorite,
    setMeta,
    download,
    remove,
    ...project,
  };
}
