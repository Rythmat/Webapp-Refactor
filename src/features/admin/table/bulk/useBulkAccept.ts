import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { CONTENT_KEY } from '@/hooks/data/admin/useAdminContent';
import {
  type DecisionResult,
  postDecisions,
} from '@/hooks/data/admin/useSuggestions';
import type { BulkProgress } from '../../content/bulk/useBulkWrite';
import {
  type BulkPlan,
  bulkDecisions,
  chunksOf,
  itemOutcome,
} from './bulkAccept';

/**
 * The bulk accept's run: the dry run's accepts sent to the server a few
 * items at a time, as `useBulkWrite` sends saves — progress as it goes, a
 * Stop that takes effect before the next request, what failed and why, and
 * one refetch of the content at the end, never one per item.
 *
 * Here a write is a set of decisions, not a body: the server's
 * `POST /suggestions/decisions` takes each accept `method: 'bulk'`, re-reads
 * the item, checks the accept still fits (open, sure, at the owner's
 * threshold, calibrated, resting on what stands, no proposal waiting),
 * makes the records it needs first and saves the item once, logging every
 * decision. So there is nothing to re-read or rebuild here, and nothing is
 * written that the log does not hold: a body saved first and logged after
 * would find its own value there and be refused as "already said".
 *
 * A run is several requests, each a few items, so Stop has somewhere to
 * stop and the page something to count; each request is still whole on the
 * server, records made before the items that name them.
 */

/** Items per request: small enough to stop soon, large enough not to crawl. */
export const ITEMS_PER_REQUEST = 25;

export interface BulkAcceptProgress extends BulkProgress {
  /**
   * The row each entry of `failed`, `skipped` and `conflicts` is about, by
   * its slug, index for index: the report opens it.
   */
  slugs: {
    failed: string[];
    skipped: string[];
    conflicts: string[];
  };
  /** Suggestions the server accepted: each now a decision with `method: 'bulk'`. */
  accepted: number;
  /** Items written. */
  written: number;
  /** When the run began and ended (ms since the epoch); for how long it took. */
  startedAt: number;
  finishedAt: number | null;
}

export function useBulkAccept() {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<BulkAcceptProgress | null>(null);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);

  const run = async (
    plan: BulkPlan,
    options: {
      perRequest?: number;
      /**
       * The owner's threshold the plan was made at: the server holds each
       * accept to it (never below 0.7), not to its own 0.85.
       */
      threshold?: number;
    } = {},
  ): Promise<BulkAcceptProgress> => {
    stopRef.current = false;
    const state: BulkAcceptProgress = {
      done: 0,
      total: plan.items.length,
      failed: [],
      skipped: [],
      conflicts: [],
      slugs: { failed: [], skipped: [], conflicts: [] },
      accepted: 0,
      written: 0,
      startedAt: Date.now(),
      finishedAt: null,
    };
    const note = (
      list: 'failed' | 'skipped' | 'conflicts',
      slug: string,
      line: string,
    ) => {
      state[list].push(line);
      state.slugs[list].push(slug);
    };
    const report = () =>
      setProgress({
        ...state,
        failed: [...state.failed],
        skipped: [...state.skipped],
        conflicts: [...state.conflicts],
        slugs: {
          failed: [...state.slugs.failed],
          skipped: [...state.slugs.skipped],
          conflicts: [...state.slugs.conflicts],
        },
      });
    setRunning(true);
    report();

    try {
      for (const chunk of chunksOf(
        plan.items,
        options.perRequest ?? ITEMS_PER_REQUEST,
      )) {
        if (stopRef.current) break;
        const sent = chunk.map(bulkDecisions);
        let results: DecisionResult[] | null = null;
        try {
          results = (
            await postDecisions(token!, sent.flat(), {
              threshold: options.threshold,
            })
          ).results;
        } catch (error) {
          // The request as a whole failed: none of its items is known to
          // be written, and the next request may fare better.
          const reason = error instanceof Error ? error.message : String(error);
          for (const item of chunk)
            note('failed', item.slug, `${item.label}: ${reason}`);
        }
        if (results) {
          let at = 0;
          chunk.forEach((item, index) => {
            const mine = results!.slice(at, at + sent[index].length);
            at += sent[index].length;
            const outcome = itemOutcome(mine);
            switch (outcome.state) {
              case 'written':
                state.written += 1;
                state.accepted += outcome.accepted;
                for (const reason of outcome.refused)
                  note('conflicts', item.slug, `${item.label}: ${reason}`);
                break;
              case 'skipped':
                note('skipped', item.slug, `${item.label}: ${outcome.reason}`);
                break;
              case 'conflict':
                for (const reason of outcome.reasons)
                  note('conflicts', item.slug, `${item.label}: ${reason}`);
                break;
              case 'failed':
                note('failed', item.slug, `${item.label}: ${outcome.reason}`);
                break;
            }
          });
        }
        state.done += chunk.length;
        report();
      }
    } finally {
      state.finishedAt = Date.now();
      report();
      setRunning(false);
    }

    await queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    return state;
  };

  return {
    run,
    progress,
    /** Finish the request in flight, then send no more. */
    stop: () => {
      stopRef.current = true;
    },
    busy: running && !stopRef.current,
    /** Sending, whether or not asked to stop: the request in flight still lands. */
    running,
  };
}
