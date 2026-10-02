import { describe, expect, it, vi } from 'vitest';
import {
  influenceRefusal,
  memberRefusal,
  parentLabelRefusal,
  reaches,
} from '../refusals';

/**
 * The references a record refuses, and why: the walks REF_PATHS' `acyclic`
 * asks for (a group inside one of its own members, a label under its own
 * imprint), a reference to oneself, and one listed twice. Pure, so the
 * Table's cells can refuse alike: it loads without React.
 */

// Hoisted: the module under test must not load React, directly or not.
vi.mock('react', () => {
  throw new Error('refusals.ts loaded React');
});

describe('reaches', () => {
  const parent: Record<string, string[]> = {
    gordy: ['tamla'],
    tamla: ['motown'],
    loop1: ['loop2'],
    loop2: ['loop1'],
  };
  const next = (slug: string) => parent[slug] ?? [];

  it('follows a chain to its end', () => {
    expect(reaches('gordy', 'motown', next)).toBe(true);
    expect(reaches('motown', 'gordy', next)).toBe(false);
  });

  it('ends on a loop that is already stored', () => {
    expect(reaches('loop1', 'motown', next)).toBe(false);
  });
});

describe('memberRefusal', () => {
  // The Temptations Revue has the Temptations among its members.
  const stored: Record<string, string[]> = {
    'temptations-revue': ['the-temptations'],
  };
  const membersOf = (slug: string) => stored[slug] ?? [];
  const members = [{ artistId: 'otis-williams' }, { artistId: 'eddie' }];

  it('refuses the group itself, a member twice, and a loop', () => {
    expect(
      memberRefusal('the-temptations', members, 'the-temptations', membersOf),
    ).toBe('A group cannot be its own member.');
    expect(memberRefusal('the-temptations', members, 'eddie', membersOf)).toBe(
      'Already a member.',
    );
    expect(
      memberRefusal('the-temptations', members, 'temptations-revue', membersOf),
    ).toBe(
      'That artist already has this group among its members: it would loop.',
    );
  });

  it('lets a member be picked again in its own place, and a new one in', () => {
    expect(
      memberRefusal('the-temptations', members, 'eddie', membersOf, 1),
    ).toBeNull();
    expect(
      memberRefusal('the-temptations', members, 'david-ruffin', membersOf),
    ).toBeNull();
    // A group not saved yet has no slug to loop back to.
    expect(
      memberRefusal(undefined, [], 'temptations-revue', membersOf),
    ).toBeNull();
  });
});

describe('influenceRefusal', () => {
  const influences = [{ artistId: 'sam-cooke' }];

  it('refuses oneself and an influence listed twice', () => {
    expect(influenceRefusal('otis-redding', influences, 'otis-redding')).toBe(
      'An artist cannot influence themselves.',
    );
    expect(influenceRefusal('otis-redding', influences, 'sam-cooke')).toBe(
      'Already listed.',
    );
  });

  it('lets one be picked again in its own place, and a new one in', () => {
    expect(
      influenceRefusal('otis-redding', influences, 'sam-cooke', 0),
    ).toBeNull();
    expect(
      influenceRefusal('otis-redding', influences, 'little-richard'),
    ).toBeNull();
  });
});

describe('parentLabelRefusal', () => {
  const parents: Record<string, string[]> = {
    tamla: ['motown'],
    'tamla-soul': ['tamla'],
  };
  const parentOf = (label: string) => parents[label] ?? [];

  it('refuses the label itself, and one of its own imprints', () => {
    expect(parentLabelRefusal('motown', 'motown', parentOf)).toBe(
      'A label cannot be an imprint of itself.',
    );
    expect(parentLabelRefusal('motown', 'tamla-soul', parentOf)).toBe(
      'That label is an imprint of this one: it would loop.',
    );
  });

  it('takes any other label', () => {
    expect(parentLabelRefusal('tamla-soul', 'motown', parentOf)).toBeNull();
    expect(parentLabelRefusal(undefined, 'motown', parentOf)).toBeNull();
  });
});
