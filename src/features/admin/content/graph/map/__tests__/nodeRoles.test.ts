import { describe, expect, it } from 'vitest';
import { ENTITY_KINDS, type EntityKind } from '@/content/graph/types';
import {
  isRegionId,
  KIND_ROLES,
  nodeRole,
  type NodeRole,
  TAG_FAMILIES,
  TAG_FAMILY_LABEL,
} from '../model/nodeRoles';

/**
 * Every kind is a note, a tag in one family, or curriculum, exactly as the
 * plan's "What gets drawn" lists them. The Record type already makes a new
 * kind fail to compile; these pin which role each kind was given.
 */

const describeRole = (role: NodeRole): string =>
  role.role === 'tag' ? `tag:${role.family}` : role.role;

const EXPECTED: Record<EntityKind, string> = {
  song: 'note',
  artist: 'note',
  event: 'note',
  place: 'note',
  release: 'note',
  label: 'note',
  studio: 'note',
  progression: 'note',
  genre: 'tag:genres',
  subgenre: 'tag:genres',
  scene: 'tag:genres',
  year: 'tag:time',
  decade: 'tag:time',
  era: 'tag:time',
  key: 'tag:theory',
  mode: 'tag:theory',
  vibe: 'tag:theory',
  instrument: 'tag:instruments',
  teach_day: 'curriculum',
  pathway: 'curriculum',
  groove: 'note',
  part: 'note',
  feel: 'tag:theory',
  patch: 'tag:instruments',
  kit: 'tag:instruments',
  lesson: 'curriculum',
};

describe('node roles', () => {
  it('gives every entity kind a role', () => {
    for (const kind of ENTITY_KINDS) {
      expect(KIND_ROLES[kind], kind).toBeDefined();
    }
    expect(Object.keys(KIND_ROLES).sort()).toEqual([...ENTITY_KINDS].sort());
  });

  it('matches the plan: notes, five tag families and curriculum', () => {
    const actual = Object.fromEntries(
      ENTITY_KINDS.map((kind) => [kind, describeRole(KIND_ROLES[kind])]),
    );
    expect(actual).toEqual(EXPECTED);
  });

  it('makes a globe region a tag and keeps a city a note', () => {
    expect(isRegionId('place:region-europe')).toBe(true);
    expect(isRegionId('place:detroit')).toBe(false);
    expect(
      nodeRole({ id: 'place:region-north-america', kind: 'place' }),
    ).toEqual({ role: 'tag', family: 'regions' });
    expect(nodeRole({ id: 'place:los-angeles', kind: 'place' })).toEqual({
      role: 'note',
    });
    // Only a place can be a region: the prefix means nothing on another kind.
    expect(nodeRole({ id: 'place:region-x', kind: 'artist' }).role).toBe(
      'note',
    );
  });

  it('reads every other node by its kind', () => {
    expect(nodeRole({ id: 'genre:rock', kind: 'genre' })).toEqual({
      role: 'tag',
      family: 'genres',
    });
    expect(nodeRole({ id: 'teach_day:aug-day-1', kind: 'teach_day' })).toEqual({
      role: 'curriculum',
    });
  });

  it('lists every tag family once, each with a label', () => {
    expect([...TAG_FAMILIES].sort()).toEqual(
      Object.keys(TAG_FAMILY_LABEL).sort(),
    );
    expect(new Set(TAG_FAMILIES).size).toBe(TAG_FAMILIES.length);
    const used = new Set(
      Object.values(KIND_ROLES).flatMap((r) =>
        r.role === 'tag' ? [r.family] : [],
      ),
    );
    // Regions come from ids, not kinds; every other family has a kind.
    expect([...used, 'regions'].sort()).toEqual([...TAG_FAMILIES].sort());
    expect(TAG_FAMILY_LABEL).toEqual({
      genres: 'Genres',
      time: 'Time',
      theory: 'Theory',
      instruments: 'Instruments',
      regions: 'Regions',
    });
  });

  it('hands out frozen roles', () => {
    expect(Object.isFrozen(KIND_ROLES.song)).toBe(true);
    expect(
      Object.isFrozen(nodeRole({ id: 'place:region-x', kind: 'place' })),
    ).toBe(true);
  });
});
