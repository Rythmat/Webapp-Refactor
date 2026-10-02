import { describe, expect, it, vi } from 'vitest';
import { readOnlyReason, SCHEMA_STEP, waitingFor } from '../editability';

/**
 * Whether a row's item can be written here, and why not: the one rule the
 * row panel's Details and, next, the grid's cells share. The panel's own
 * tests (TableDetailPanel.test.tsx) show each reason in place; these hold
 * the rule itself.
 */

// Only the hook reads the server; the rule is given what it says.
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => {
    throw new Error('the rule itself reads no capabilities');
  },
}));

const open = {
  mode: 'working',
  kind: 'artist',
  served: true,
  known: true,
  proposal: null,
  sentBack: false,
  isEditor: false,
} as const;

describe('readOnlyReason', () => {
  it('lets a served kind in the working copy be saved', () => {
    expect(readOnlyReason(open)).toBeNull();
    // An editor's own proposal is theirs to build on.
    expect(
      readOnlyReason({ ...open, isEditor: true, proposal: 'mine' }),
    ).toBeNull();
  });

  it('says nothing yet while the capabilities load, and why otherwise', () => {
    expect(readOnlyReason({ ...open, known: false })).toBe('');
    expect(readOnlyReason({ ...open, mode: 'repo', known: false })).toBe(
      'Read-only: the rows are the repo’s snapshot, not the working copy, so nothing here is saved.',
    );
    expect(readOnlyReason({ ...open, served: false })).toBe(
      'Read-only: the content API does not serve artists yet.',
    );
  });

  it('stops every save under someone else’s proposal, waiting or sent back', () => {
    const other = { ...open, proposal: 'other' } as const;
    expect(readOnlyReason(other)).toBe(
      'Review the pending proposal first: approve or reject it above.',
    );
    expect(readOnlyReason({ ...other, sentBack: true })).toMatch(
      /^Sent back to its editor:/,
    );
    expect(readOnlyReason({ ...other, isEditor: true })).toMatch(
      /^Read-only: another editor’s proposal is waiting for review/,
    );
    expect(
      readOnlyReason({ ...other, isEditor: true, sentBack: true }),
    ).toMatch(
      /^Read-only: another editor’s proposal on this item was sent back/,
    );
  });
});

describe('waitingFor', () => {
  it('holds a field until the server’s body level for its kind takes it', () => {
    const levels: Record<string, number> = { song: 1, globe_event: 2 };
    const at = (kind: string) => levels[kind] ?? 0;
    expect(waitingFor(undefined, at)).toBeUndefined();
    expect(waitingFor('song-v2', at)).toBe('song-v2');
    expect(waitingFor('event-v2', at)).toBeUndefined();
    expect(waitingFor('artist-born', at)).toBe('artist-born');
    expect(SCHEMA_STEP['artist-born']).toBe('the artist’s Born field');
  });
});
