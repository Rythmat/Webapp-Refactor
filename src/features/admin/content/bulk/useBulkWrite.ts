import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_KEY,
  ContentApiError,
  type ContentItemDetail,
  type ContentKind,
  contentRequest,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { isContentEditor } from '../../consoleRoles';
import { isNotFound, readStoredItem } from '../itemEditor/readItem';
import { PUBLISH_ORDER } from '../publishing/publishRun';

/**
 * Many saves in a row, for the pages that write in bulk: the Links page's
 * "Apply the sure matches", and the Table's bulk accept.
 *
 * Each item is its own `PUT /items`, one at a time, validated on its own —
 * a bulk write is only many ordinary saves, so an editor's become proposals
 * and a bad one fails alone. What the loop adds:
 *
 *  - progress, and a Stop that takes effect before the next item;
 *  - a list of what failed, with the server's reason;
 *  - one invalidation at the end, not one per item (six hundred refetches of
 *    every content list would stall the page);
 *  - never writing over someone else's proposal: an editor's save replaces
 *    the item's proposal, so an editor passes over another editor's; and,
 *    when asked, an admin passes over every item with a proposal waiting,
 *    whose approval would undo the admin's write. Both are listed;
 *  - for an item planned from a value seen earlier, a re-read just before
 *    its write, so the plan is checked against what is stored now and never
 *    against what a page loaded minutes ago;
 *  - records made first, in the contract's publish order (places, labels,
 *    studios, artists, records), never over one already there; an item that
 *    needs one that was not made is held back rather than saved pointing at
 *    nothing.
 */

export interface BulkWrite {
  kind: ContentKind;
  /** The item's identity: `id` for today's kinds, `slug` for the records. */
  slug: string;
  /** What to save, as planned from what the page read. */
  body: Record<string, unknown>;
  /** The revision note: the item's history, and what a reviewer reads. */
  note?: string;
  /**
   * A record the plan needs made (a suggestion's `requires`): written before
   * everything else, in publish order, and never over a record already
   * there. Where the server offers create-only (`features.create`) it goes
   * with `create: true`; elsewhere its slug is looked up first
   * (`features.lookup`) and a record already there goes to `onSlugTaken`, as
   * a 409 would. A server with neither cannot make one safely: it is held.
   */
  makes?: boolean;
  /** The item's DB id (an `/export` row has it), for the re-read. */
  id?: string;
  /**
   * The item has a proposal awaiting review (its `editState` is `pending`).
   * An admin passes over it with `skipPending`; an editor re-reads it to see
   * whose proposal it is.
   */
  pending?: boolean;
  /**
   * The precondition. When set, the item is re-read just before its write
   * and this rebuilds the body from what is stored now — or answers why it
   * cannot (the value the plan rested on has changed), and the item is
   * listed as a conflict instead of written.
   */
  rebase?: (
    current: Record<string, unknown>,
  ) => { body: Record<string, unknown> } | { conflict: string };
  /**
   * Earlier items this one points at, as `kind:slug`: the records a
   * suggestion requires. If one of them was not written, this one waits.
   */
  needs?: string[];
}

/**
 * Where a run stands. Items are named by slug, or by `kind:slug` when the
 * run writes more than one kind (`chicago` the place, `chicago` the band).
 */
export interface BulkProgress {
  /** Items dealt with so far, whatever happened to them. */
  done: number;
  total: number;
  /** `slug: reason` for each save the server refused, or that never arrived. */
  failed: string[];
  /** Items passed over because a proposal awaits review. */
  skipped: string[];
  /** `slug: reason` for each held back: a precondition, a taken slug. */
  conflicts: string[];
}

/**
 * What to do when a record to make is already there: use it, or hold back
 * (and everything that needed it) with a reason.
 */
export type SlugTakenAnswer = 'reuse' | { held: string };

export interface BulkRunOptions {
  /**
   * As an admin, pass over (and list) the items with a proposal waiting.
   * An editor always passes over other people's proposals, and writes into
   * their own.
   */
  skipPending?: boolean;
  /**
   * The rule for a record to make that is already there (a 409 SLUG_TAKEN,
   * or a lookup hit), given that record (null when it cannot be read).
   * Default: hold it back.
   */
  onSlugTaken?: (
    write: BulkWrite,
    existing: ContentItemDetail | null,
  ) => SlugTakenAnswer;
  /**
   * After the last write, before the invalidation: a dry run can close
   * while the lists refetch.
   */
  onWritten?: (progress: BulkProgress) => void;
  /** What to refetch at the end. Default: every content query. */
  invalidate?: QueryKey;
}

/**
 * A taken slug, until the rule for reusing a record lands with bulk accept
 * (C33): an artist is the same one only with the same MusicBrainz id, a
 * place only with the same name and country within 25 km, and anything else
 * stops for a person or gets a disambiguated slug. Nothing is assumed
 * meanwhile — "bill-evans" the pianist is not "bill-evans" the saxophonist.
 */
const holdForAPerson = (): SlugTakenAnswer => ({
  held: 'a record with this id already exists; check it is the same one',
});

const keyOf = (write: Pick<BulkWrite, 'kind' | 'slug'>) =>
  `${write.kind}:${write.slug}`;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Records to make first, referenced kinds before the kinds that point at
 * them, and within a kind each after the records it needs (a group after
 * its members). Otherwise the caller's order.
 */
const inWriteOrder = (writes: readonly BulkWrite[]) => {
  const rank = (write: BulkWrite) => {
    if (!write.makes) return PUBLISH_ORDER.length + 1;
    const at = PUBLISH_ORDER.indexOf(write.kind);
    return at === -1 ? PUBLISH_ORDER.length : at;
  };
  // Stable: within a rank, the caller's order.
  const ranked = [...writes].sort((a, b) => rank(a) - rank(b));
  const out: BulkWrite[] = [];
  const placed = new Set<string>();
  for (let start = 0; start < ranked.length; ) {
    let end = start;
    while (end < ranked.length && rank(ranked[end]) === rank(ranked[start]))
      end += 1;
    const group = ranked.slice(start, end);
    const inGroup = new Set(group.map(keyOf));
    while (group.length) {
      const next = group.findIndex((write) =>
        (write.needs ?? []).every(
          (need) => !inGroup.has(need) || placed.has(need),
        ),
      );
      // A cycle: the caller's order, and `needs` holds back what it can.
      const [write] = group.splice(Math.max(next, 0), 1);
      out.push(write);
      placed.add(keyOf(write));
    }
    start = end;
  }
  return out;
};

export function useBulkWrite() {
  const { token, role, userId } = useAuthContext();
  const editor = isContentEditor(role);
  const caps = useCapabilities();
  const canCreate = caps.feature('create');
  const canLookup = caps.feature('lookup');
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);

  /** The stored item, by its DB id, or by slug where the server looks up. */
  const readItem = (
    write: Pick<BulkWrite, 'kind' | 'slug' | 'id'>,
  ): Promise<ContentItemDetail> => readStoredItem(token!, write, canLookup);

  /**
   * Whether to pass over an item, as stored now. Another editor's proposal
   * comes back to an editor hidden (`pendingBody` null), and an editor's
   * save would replace it; an admin's lands beside it, which `skipPending`
   * asks to avoid.
   */
  const passOver = (
    stored: Pick<
      ContentItemDetail,
      'editState' | 'pendingById' | 'pendingBody'
    >,
    skipPending: boolean,
  ) => {
    if (stored.editState !== 'pending') return false;
    if (!editor) return skipPending;
    return !userId || stored.pendingById !== userId || !stored.pendingBody;
  };

  const run = async (
    writes: readonly BulkWrite[],
    options: BulkRunOptions = {},
  ): Promise<BulkProgress> => {
    stopRef.current = false;
    const skipPending = !!options.skipPending;
    const state: BulkProgress = {
      done: 0,
      total: writes.length,
      failed: [],
      skipped: [],
      conflicts: [],
    };
    const report = () =>
      setProgress({
        ...state,
        failed: [...state.failed],
        skipped: [...state.skipped],
        conflicts: [...state.conflicts],
      });
    setRunning(true);
    report();

    const severalKinds = new Set(writes.map((write) => write.kind)).size > 1;
    const nameOf = (write: BulkWrite) =>
      severalKinds ? keyOf(write) : write.slug;
    const inRun = new Set(writes.map(keyOf));
    // What this run has made or found usable, for the items that need it.
    const ready = new Set<string>();
    const handled = new Set<string>();

    /** A record to make is already there: the rule decides. */
    const taken = (write: BulkWrite, existing: ContentItemDetail | null) => {
      const answer = (options.onSlugTaken ?? holdForAPerson)(write, existing);
      if (answer === 'reuse') ready.add(keyOf(write));
      else state.conflicts.push(`${nameOf(write)}: ${answer.held}`);
    };

    /** One item: written, or put on one of the lists and why. */
    const handle = async (write: BulkWrite) => {
      const key = keyOf(write);
      const name = nameOf(write);
      // Two plans for one item would each rest on the body before the
      // other: the second would silently undo the first.
      if (handled.has(key)) {
        state.conflicts.push(
          `${name}: planned twice in this run; the second was not written`,
        );
        return;
      }
      handled.add(key);
      const waiting = (write.needs ?? []).find(
        (need) => inRun.has(need) && !ready.has(need),
      );
      if (waiting) {
        state.conflicts.push(`${name}: waits for ${waiting}`);
        return;
      }

      let stored: ContentItemDetail | null = null;
      if (write.pending && !editor && skipPending) {
        state.skipped.push(name);
        return;
      }
      if (write.pending && editor) {
        // Whose proposal it is only the item can say.
        stored = await readItem(write).catch(() => null);
        if (!stored || passOver(stored, skipPending)) {
          state.skipped.push(name);
          return;
        }
      }

      let body = write.body;
      if (write.rebase) {
        stored ??= await readItem(write);
        // A proposal may have arrived since the plan was made.
        if (passOver(stored, skipPending)) {
          state.skipped.push(name);
          return;
        }
        // An editor builds on their own proposal, as the item editor does;
        // an admin on the live body.
        const rebased = write.rebase(
          editor && stored.pendingBody ? stored.pendingBody : stored.body,
        );
        if ('conflict' in rebased) {
          state.conflicts.push(`${name}: ${rebased.conflict}`);
          return;
        }
        body = rebased.body;
      }

      const createOnly = !!write.makes && canCreate;
      if (write.makes && !createOnly) {
        // No create-only here, and a plain PUT would overwrite a record with
        // this slug: find out first. A record made by someone else in the
        // one request between is the gap create-only closes.
        if (!canLookup) {
          state.conflicts.push(
            `${name}: this server can neither create-only nor look a slug up, so making it could overwrite a record`,
          );
          return;
        }
        const existing = await readItem(write).catch((error: unknown) => {
          if (isNotFound(error)) return null;
          throw error;
        });
        if (existing) {
          taken(write, existing);
          return;
        }
      }

      try {
        await contentRequest('/items', token!, {
          method: 'PUT',
          body: JSON.stringify({
            kind: write.kind,
            slug: write.slug,
            body,
            ...(write.note ? { note: write.note } : {}),
            ...(createOnly ? { create: true } : {}),
          }),
        });
      } catch (error) {
        if (
          !createOnly ||
          !(error instanceof ContentApiError) ||
          error.code !== 'SLUG_TAKEN'
        )
          throw error;
        // The 409 names the record that is there (contract, errors table).
        const id = typeof error.body.id === 'string' ? error.body.id : '';
        taken(write, await readItem({ ...write, id }).catch(() => null));
        return;
      }
      ready.add(key);
    };

    try {
      for (const write of inWriteOrder(writes)) {
        if (stopRef.current) break;
        try {
          await handle(write);
        } catch (error) {
          // Whatever throws — the server, a re-read, a rule the page passed —
          // fails this item, not the run.
          state.failed.push(`${nameOf(write)}: ${messageOf(error)}`);
        }
        state.done += 1;
        report();
      }
    } finally {
      setRunning(false);
    }

    options.onWritten?.(state);
    await queryClient.invalidateQueries({
      queryKey: options.invalidate ?? CONTENT_KEY,
    });
    return state;
  };

  return {
    run,
    progress,
    /** Finish the item in flight, then write no more. */
    stop: () => {
      stopRef.current = true;
    },
    /**
     * Writing, and not asked to stop. Read from the ref on each render, as
     * the Links page always did: the flag flips on the next progress update.
     */
    busy: running && !stopRef.current,
  };
}
