import { createContext, useContext, useEffect, useRef } from 'react';
import { runUnlocked, type WithItemLock } from './itemLock';
import type { PanelDraft, WriteQueue } from './writeQueue';

/**
 * How the Table's pages reach its cell writes (`CellWriteProvider`, mounted
 * by TablePage above the table): the grid commits through it, and the row
 * panel and Link… share its item lock and its view of the panel's draft.
 *
 * Kept apart from the provider and the queue, and importing them only as
 * types, so the row panel's chunk and the Link… dialog's pull in nothing
 * but React and the lock. Outside the provider (the content area, tests of
 * a lone panel) there are no cell writes: no lock is taken and no draft is
 * registered, and everything saves as it did before.
 */

export const CellWriteContext = createContext<WriteQueue | null>(null);

/** The Table's write queue, or null outside the Table. */
export const useCellWrites = (): WriteQueue | null =>
  useContext(CellWriteContext);

/**
 * The item lock the cell writes hold (`itemLock.ts`), for a save that
 * writes an item too: the row panel's, Link…'s. Runs straight away
 * outside the Table.
 */
export const useItemLock = (): WithItemLock =>
  useContext(CellWriteContext)?.lock ?? runUnlocked;

/** What the row panel's editing session offers a cell's edit. */
export interface DraftSession {
  dirty: boolean;
  body: Readonly<Record<string, unknown>> | null;
  applyBody(body: Record<string, unknown>): void;
}

/**
 * The row panel's draft of `item` (`itemKeyOf`), for the cell writes:
 * while it has unsaved changes, a cell's edit to the item goes into it and
 * its Save sends both (design §3.3); when it is saved or dropped, the cells
 * that went into it say so. One panel per item at a time.
 */
export function usePanelDraft(item: string, session: DraftSession): void {
  const writes = useCellWrites();
  // The session as of the last render, and a body laid on since: two
  // edits in one tick must build on each other, not on the same render.
  const latest = useRef(session);
  const laid = useRef<Record<string, unknown> | null>(null);
  useEffect(() => {
    latest.current = session;
    laid.current = null;
  });

  useEffect(() => {
    if (!writes) return;
    const draft: PanelDraft = {
      dirty: () => laid.current !== null || latest.current.dirty,
      body: () => laid.current ?? latest.current.body,
      applyBody: (body) => {
        laid.current = body;
        latest.current.applyBody(body);
      },
    };
    return writes.registerDraft(item, draft);
  }, [writes, item]);

  // Saved or discarded: the cells whose edits it held settle or let go.
  useEffect(() => {
    if (!session.dirty) writes?.draftChanged(item);
  }, [writes, item, session.dirty]);
}
