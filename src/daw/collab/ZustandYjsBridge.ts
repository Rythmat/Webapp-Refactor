// ── Zustand ↔ Yjs Bridge ─────────────────────────────────────────────────
// Bidirectional sync between the Zustand DAW store and the Yjs CRDT document.
// Uses transaction origin tags and suppression flags to prevent infinite loops.

import * as Y from 'yjs';
import type { AllSlices } from '@/daw/store/index';
import { diffAndApply } from './diffEngine';
import {
  observeYjsAndPushToStore,
  type YjsObserverDisposer,
} from './yjsToZustand';
import { ORIGIN_LOCAL } from './types';

/**
 * The bridge manages bidirectional state flow:
 *
 *   Local user action → Zustand set() → collabMiddleware →
 *     bridge.syncToYjs(prev, next) → Yjs doc
 *
 *   Remote Yjs change → observeDeep → bridge pushes → useStore.setState()
 *
 * Loop prevention:
 *   - `suppressStoreToYjs`: when true, the middleware skips Yjs writes.
 *     Set to true while applying remote Yjs changes to the store.
 *   - `suppressYjsToStore`: when true, Yjs observers skip store writes.
 *     Set to true while applying local Zustand changes to Yjs.
 */
export class ZustandYjsBridge {
  private doc: Y.Doc;
  private setState: (partial: Partial<AllSlices>) => void;
  private disposeObservers: YjsObserverDisposer | null = null;

  /**
   * When true, the collab middleware should NOT propagate Zustand changes
   * to Yjs (because the current setState was triggered by a remote Yjs
   * update, not a local user action).
   */
  suppressStoreToYjs = false;

  /**
   * When true, Yjs observers should NOT push changes to the Zustand store
   * (because the current Yjs mutation was triggered by a local Zustand
   * change, not a remote peer).
   */
  private suppressYjsToStore = false;

  constructor(
    doc: Y.Doc,
    setState: (partial: Partial<AllSlices>) => void,
  ) {
    this.doc = doc;
    this.setState = setState;
  }

  /**
   * Start observing Yjs for remote changes and pushing them to Zustand.
   * Call this once after the PartyKit provider has connected and the doc
   * is synced.
   */
  startObserving(): void {
    if (this.disposeObservers) return; // already observing
    this.disposeObservers = observeYjsAndPushToStore(
      this.doc,
      (partial) => {
        this.suppressStoreToYjs = true;
        try {
          this.setState(partial);
        } finally {
          this.suppressStoreToYjs = false;
        }
      },
      () => this.suppressYjsToStore,
    );
  }

  /**
   * Stop observing. Called when leaving a collaborative session.
   */
  stopObserving(): void {
    this.disposeObservers?.();
    this.disposeObservers = null;
  }

  /**
   * Called by the collab middleware when a local Zustand set() produces a
   * state change. Diffs the previous and next state and writes the
   * minimal delta to the Yjs doc.
   */
  syncToYjs(prev: AllSlices, next: AllSlices): void {
    if (this.suppressStoreToYjs) return;

    this.suppressYjsToStore = true;
    try {
      this.doc.transact(() => {
        diffAndApply(this.doc, prev, next);
      }, ORIGIN_LOCAL);
    } finally {
      this.suppressYjsToStore = false;
    }
  }

  destroy(): void {
    this.stopObserving();
  }
}
