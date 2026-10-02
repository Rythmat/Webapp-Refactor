import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import {
  type MutableRefObject,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_KEY,
  contentRequest,
  unwrapSaveResponse,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { refreshAfterDecisions } from '@/hooks/data/admin/useSuggestions';
import { isContentEditor } from '../../consoleRoles';
import { readItem } from '../../content/itemEditor/readItem';
import { useUnsavedChanges } from '../../content/mirror/UnsavedChangesGuard';
import { GUESSED_FIELDS, logWritten } from '../data/logWritten';
import { isTableId } from '../tableIds';
import { tableHref } from '../tablePaths';
import { CellEditStore } from './cellEditStore';
import { CellWriteContext } from './cellWriteContext';
import { ItemLocks } from './itemLock';
import { type WriteEvent, WriteQueue } from './writeQueue';

/**
 * The Table's cell writes, for every table: mounted by TablePage above the
 * table itself, so a write in flight survives switching tables.
 *
 * It binds the plain write queue (`writeQueue.ts`) to the page:
 *  - the network: each write reads its item whole first (`readItem`) and
 *    saves with `PUT /items`, as the viewer (an editor's save is a
 *    proposal); what it decided about the item's suggestions is logged
 *    (`logWritten`), where the server has them;
 *  - the query client: the written item's query at once, so an open row
 *    panel shows it, and everything else once the queue has been idle for
 *    a moment (`refreshAfterDecisions`);
 *  - the toasts (Sonner): each save with Undo ("Proposed: …" for an
 *    editor), each undo with Redo, a failure with Retry or Discard, a
 *    conflict with Use mine or Keep theirs, a write someone's proposal
 *    stops with its row;
 *  - the unsaved-changes guard: leaving the page, or the tab, asks first
 *    while a write is queued, in flight, or failed and not let go of.
 *
 * The grid reads each cell's state from the queue's store, the row panel
 * and Link… share its item lock, and the panel hands it its draft
 * (`cellWriteContext.ts`).
 */

/** What the queue needs of the page, as of its latest render. */
interface Live {
  token: string | null | undefined;
  role: Parameters<typeof isContentEditor>[0];
  userId: string | null | undefined;
  caps: ReturnType<typeof useCapabilities>;
}

const signedIn = (live: MutableRefObject<Live>): string => {
  const { token } = live.current;
  if (!token) throw new Error('Not signed in: nothing can be saved.');
  return token;
};

function createQueue(
  live: MutableRefObject<Live>,
  queryClient: QueryClient,
): WriteQueue {
  const locks = new ItemLocks();
  return new WriteQueue({
    store: new CellEditStore(),
    lock: locks.run,
    read: (item) =>
      readItem(
        signedIn(live),
        { kind: item.kind, slug: item.slug, id: item.id },
        live.current.caps.feature('lookup'),
      ),
    put: async (input) =>
      unwrapSaveResponse(
        await contentRequest('/items', signedIn(live), {
          method: 'PUT',
          body: JSON.stringify(input),
        }),
      ),
    viewer: () => ({
      editor: isContentEditor(live.current.role),
      userId: live.current.userId,
    }),
    canCreate: () => live.current.caps.feature('create'),
    log: async (write) =>
      live.current.caps.feature('suggestions')
        ? logWritten(signedIn(live), {
            ...write,
            guessed: GUESSED_FIELDS[write.kind],
          })
        : 0,
    invalidateItem: (id) =>
      void queryClient.invalidateQueries({
        queryKey: [...CONTENT_KEY, 'item', id],
      }),
    refresh: () => refreshAfterDecisions(queryClient),
  });
}

/** Problems that did not stop a save, in a line. */
const warningsLine = (warnings: readonly { detail: string }[]) =>
  warnings.length
    ? warnings.map((warning) => warning.detail).join(' ')
    : undefined;

export const CellWriteProvider = ({ children }: { children: ReactNode }) => {
  const { token, role, userId } = useAuthContext();
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const live = useRef<Live>({ token, role, userId, caps });
  useEffect(() => {
    live.current = { token, role, userId, caps };
  });
  const [queue] = useState(() => createQueue(live, queryClient));

  // What each write came to, said once.
  useEffect(() => {
    const say = (event: WriteEvent) => {
      switch (event.type) {
        case 'saved': {
          const { write, entry, proposed } = event;
          const description = warningsLine(event.warnings);
          if (write.purpose === 'undo') {
            toast(`Undone: ${write.summary}`, {
              description,
              ...(entry
                ? {
                    action: {
                      label: 'Redo',
                      onClick: () => queue.redoEntry(entry.id),
                    },
                  }
                : {}),
            });
            return;
          }
          toast(
            `${
              write.purpose === 'redo'
                ? 'Redone: '
                : proposed
                  ? 'Proposed: '
                  : ''
            }${write.summary}`,
            {
              description,
              ...(entry
                ? {
                    action: {
                      label: 'Undo',
                      onClick: () => queue.undoEntry(entry.id),
                    },
                  }
                : {}),
            },
          );
          return;
        }
        case 'not-undone':
          toast(event.message, { description: event.write.summary });
          return;
        case 'in-panel':
          toast(`${event.write.summary}: not saved yet`, {
            description: event.message,
          });
          return;
        case 'failed': {
          const { write, kind, message } = event.failed;
          // A write the queue does not hold (the panel's draft refused
          // it) has nothing to retry.
          const held = queue.failure(write.id) !== undefined;
          // Where a blocked write's row is, to open it.
          const cell = write.cells[0];
          const table = cell && isTableId(cell.table) ? cell.table : null;
          if (kind === 'conflict') {
            toast.warning(`Not saved: ${write.summary}`, {
              description: message,
              duration: 10_000,
              ...(held
                ? {
                    action: {
                      label: 'Use mine',
                      onClick: () => queue.writeMine(write.id),
                    },
                    cancel: {
                      label: 'Keep theirs',
                      onClick: () => queue.keepTheirs(write.id),
                    },
                  }
                : {}),
            });
            return;
          }
          toast.error(`Not saved: ${write.summary}`, {
            description: message,
            duration: 10_000,
            ...(held
              ? {
                  action:
                    kind === 'blocked' && table
                      ? {
                          label: 'Open row',
                          onClick: () =>
                            navigate(tableHref(table, cell.rowKey)),
                        }
                      : {
                          label: 'Retry',
                          onClick: () => queue.retry(write.id),
                        },
                  cancel: {
                    label: 'Discard',
                    onClick: () => queue.discard(write.id),
                  },
                }
              : {}),
          });
          return;
        }
        case 'unchanged':
          return;
      }
    };
    return queue.onEvent(say);
  }, [queue, navigate]);

  // Leaving with a write queued, in flight or failed asks first.
  const unsaved = useSyncExternalStore(queue.subscribe, queue.hasUnsaved);
  useUnsavedChanges(unsaved);
  useEffect(() => {
    if (!unsaved) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsaved]);

  return (
    <CellWriteContext.Provider value={queue}>
      {children}
    </CellWriteContext.Provider>
  );
};
