import { describe, expect, it } from 'vitest';
import { CHANNEL_STRIP_TAB_IDS, isChannelStripTabId } from '../dockTabs';

// ── The dock's tab ids ─────────────────────────────────────────────────────
// The strip and the codec check a restored channelStripTab here. The type
// keeps the list complete; these cases pin what passes the check.

describe('isChannelStripTabId', () => {
  it('knows the dock’s four tabs', () => {
    expect([...CHANNEL_STRIP_TAB_IDS].sort()).toEqual([
      'controls',
      'fx',
      'piano-roll',
      'prism',
    ]);
    for (const id of CHANNEL_STRIP_TAB_IDS) {
      expect(isChannelStripTabId(id)).toBe(true);
    }
  });

  it('rejects anything else a draft could hold', () => {
    for (const value of [
      'mixer',
      // Parts left the dock for the Library panel (2.9).
      'parts',
      // The drums' Grooves went into their Instrument tab (2026-10-22).
      'grooves',
      'Controls',
      '',
      // On the prototype of the table, not one of its tabs.
      'toString',
      'hasOwnProperty',
      null,
      undefined,
      42,
      {},
      ['fx'],
    ]) {
      expect(isChannelStripTabId(value)).toBe(false);
    }
  });
});
