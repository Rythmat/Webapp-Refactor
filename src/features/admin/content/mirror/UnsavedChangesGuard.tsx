import {
  createContext,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';
import { Outlet, useBlocker } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CONTENT_REPO } from '../mock/mockSwitch';

/**
 * One guard for unsaved edits anywhere in the content area and the Table.
 *
 * Every way out goes through the console's router — the sidebar, the bar, a
 * link inside a mirrored page (the mirror turns those into console
 * navigations), browser Back — so a single blocker above both catches them
 * all (`GuardOutlet`, in the console's route tree). Editors report whether
 * they hold unsaved changes with `useUnsavedChanges(dirty)`; moving within
 * the same page (a tab, a filter) never asks.
 *
 * The registry is a ref, read when a navigation is attempted, not state read
 * at the last render: a page that saves and then navigates away in the same
 * breath (Save → back to the list) calls `markClean()` first, and the guard
 * must see that at once rather than one render later, or it would stop the
 * page leaving after its own successful save.
 *
 * The question is an ordinary dialog for the keyboard: Escape means Stay,
 * as the Stay button does, and staying puts focus back where it was when
 * the question came up (the graph, or the field being typed in), so a
 * keyboard reader carries on from the same place. Leaving lets the next
 * page decide where focus goes.
 */

type Registry = { set(id: string, dirty: boolean): void };

const GuardContext = createContext<Registry | null>(null);

/**
 * Tell the content area this editor has (or no longer has) unsaved changes.
 * Returns `markClean`, for a save that navigates away before re-rendering.
 */
export function useUnsavedChanges(dirty: boolean): () => void {
  const registry = useContext(GuardContext);
  const id = useId();
  useEffect(() => {
    registry?.set(id, dirty);
    return () => registry?.set(id, false);
  }, [registry, id, dirty]);
  return useCallback(() => registry?.set(id, false), [registry, id]);
}

export const UnsavedChangesGuard = ({ children }: { children: ReactNode }) => {
  const dirtyIds = useRef(new Set<string>());
  const set = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtyIds.current.add(id);
    else dirtyIds.current.delete(id);
  }, []);
  const registry = useMemo(() => ({ set }), [set]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyIds.current.size > 0 &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  // What had focus when the question came up, and what was answered: the
  // answer is given once (a button and the dialog closing both report it).
  const returnFocus = useRef<HTMLElement | null>(null);
  const answer = useRef<'stay' | 'leave' | null>(null);
  const blocked = blocker.state === 'blocked';

  const stay = () => {
    if (answer.current) return;
    answer.current = 'stay';
    blocker.reset?.();
  };
  const leave = () => {
    if (answer.current) return;
    answer.current = 'leave';
    blocker.proceed?.();
  };

  return (
    <GuardContext.Provider value={registry}>
      {children}
      <AlertDialog
        open={blocked}
        onOpenChange={(open) => {
          // Escape (or any other way the dialog closes) is Stay.
          if (!open) stay();
        }}
      >
        <AlertDialogContent
          onOpenAutoFocus={() => {
            // A new question, not yet answered; and, before the dialog moves
            // focus to Stay, where to bring focus back to.
            answer.current = null;
            const active = document.activeElement;
            returnFocus.current =
              active instanceof HTMLElement && active !== document.body
                ? active
                : null;
          }}
          onCloseAutoFocus={(event) => {
            const back = returnFocus.current;
            returnFocus.current = null;
            if (answer.current === 'leave' || !back?.isConnected) return;
            event.preventDefault();
            back.focus({ preventScroll: true });
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes on this page have not been saved. They will be lost
              if you leave now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={stay}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={leave}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GuardContext.Provider>
  );
};

/**
 * Repo mode (DEV only): refetch the content when the repo's files change
 * outside the console (repo/useRepoContentSync.ts). The literal
 * `import.meta.env.DEV` at the import keeps its chunk out of a build.
 */
const RepoContentSync =
  import.meta.env.DEV && CONTENT_REPO
    ? lazy(() =>
        import('../repo/useRepoContentSync').then(({ RepoContentSync }) => ({
          default: RepoContentSync,
        })),
      )
    : null;

/**
 * The guard as a route element, above the content area and the Table.
 *
 * One pathless route rather than a guard in each area's layout: react-router
 * allows one blocker at a time, and a move from an unsaved song edit to the
 * Table must be asked about like any other way out. It is also the one
 * place above both where repo mode listens for edits made outside.
 */
export const GuardOutlet = () => (
  <UnsavedChangesGuard>
    <Outlet />
    {RepoContentSync && (
      <Suspense fallback={null}>
        <RepoContentSync />
      </Suspense>
    )}
  </UnsavedChangesGuard>
);
