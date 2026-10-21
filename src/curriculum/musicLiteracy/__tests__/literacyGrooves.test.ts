/**
 * The grooves a Music Literacy step can be played over: published and in
 * 4/4 only, one per id (a published designed groove replaces the code one),
 * grouped by genre with the console's names; and a groove as the run's drums.
 */

import { describe, expect, it } from 'vitest';
import { CODE_GROOVES } from '@/curriculum/engine/drumGrooves/codeGrooves';
import {
  blankGroove,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import {
  listDesignedGrooves,
  loadStudioGrooves,
} from '@/curriculum/engine/drumGrooves/registry';
import {
  designedRunGroove,
  drumsForGroove,
  grooveGroups,
  type GrooveGroup,
} from '../literacyGrooves';

const groove = (
  id: string,
  name: string,
  extra: Partial<DrumGroove> = {},
): DrumGroove => ({
  ...blankGroove(id, name),
  status: 'live',
  ...extra,
});

const ids = (groups: GrooveGroup[]) =>
  groups.flatMap((g) => g.grooves.map((o) => o.id));

describe('the grooves on offer', () => {
  it('offers published 4/4 grooves only', () => {
    const groups = grooveGroups({
      designed: [
        groove('rock_a', 'Rock A', { genre: 'rock' }),
        groove('rock_draft', 'Rock draft', { genre: 'rock', status: 'draft' }),
        groove('waltz', 'Waltz', { genre: 'jazz', timeSignature: [3, 4] }),
        groove('shuffle', 'Shuffle', { genre: 'funk', timeSignature: [12, 8] }),
        groove('samba', 'Samba', { genre: 'latin', timeSignature: [2, 4] }),
      ],
      code: [],
      studio: [
        groove('studio_rock', 'Rock 2', { genre: 'rock' }),
        groove('studio_waltz', 'Mariachi', {
          genre: 'latin',
          timeSignature: [3, 4],
        }),
      ],
    });
    expect(ids(groups).sort()).toEqual(['rock_a', 'studio_rock']);
  });

  it('offers each id once: a published designed groove replaces the code one', () => {
    const groups = grooveGroups({
      designed: [
        groove('groove_funk_01', 'Funk 01 — phrase engine', { genre: 'funk' }),
        // A draft replaces nothing: the code groove plays until it's published.
        groove('groove_ballad_01', 'Pop ballad 01', {
          genre: 'pop',
          status: 'draft',
        }),
        // Published but not in 4/4: it's what a lesson plays, so the code
        // groove is gone, and it isn't offered either.
        groove('groove_funk_02', 'Funk 02 in 12/8', {
          genre: 'funk',
          timeSignature: [12, 8],
        }),
      ],
      code: [
        { id: 'groove_funk_01', label: 'Funk 01 (code)', genre: 'funk' },
        { id: 'groove_funk_02', label: 'Funk 02 (code)', genre: 'funk' },
        { id: 'groove_ballad_01', label: 'Pop ballad 01', genre: 'pop' },
      ],
      studio: [groove('groove_funk_01', 'A Studio take', { genre: 'funk' })],
    });
    expect(groups).toEqual([
      {
        genre: 'funk',
        label: 'Funk',
        grooves: [{ id: 'groove_funk_01', name: 'Funk 01 — phrase engine' }],
      },
      {
        genre: 'pop',
        label: 'Pop',
        grooves: [{ id: 'groove_ballad_01', name: 'Pop ballad 01' }],
      },
    ]);
  });

  it('groups by genre A–Z, Other last, each by name', () => {
    const groups = grooveGroups({
      designed: [
        groove('r10', 'Rock 10', { genre: 'rock' }),
        groove('r2', 'Rock 2', { genre: 'rock' }),
        groove('nogenre', 'Theory Practice Track'),
        groove('hh', 'Boom Bap', { genre: 'hip-hop' }),
        groove('ns', 'Neo Soul 1', { genre: 'neo-soul' }),
        groove('rnb', 'R&B 1', { genre: 'rnb' }),
      ],
      code: [{ id: 'trap', label: 'Hip Hop — Trap', genre: 'hip-hop' }],
      studio: [groove('bossa', 'Bossa 1', { genre: 'latin' })],
    });
    expect(groups.map((g) => g.label)).toEqual([
      'Hip Hop',
      'Latin',
      'Neo Soul',
      'R&B',
      'Rock',
      'Other',
    ]);
    expect(groups[0].grooves.map((g) => g.name)).toEqual([
      'Boom Bap',
      'Hip Hop — Trap',
    ]);
    // Numbers in order: Rock 2 before Rock 10.
    expect(groups[4].grooves.map((g) => g.name)).toEqual(['Rock 2', 'Rock 10']);
  });

  it('offers every live 4/4 groove of the repo, and nothing else', async () => {
    const studio = await loadStudioGrooves();
    const designed = listDesignedGrooves();
    const groups = grooveGroups({ designed, code: CODE_GROOVES, studio });
    const offered = ids(groups);
    expect(new Set(offered).size).toBe(offered.length);

    const byId = new Map([...studio, ...designed].map((g) => [g.id, g]));
    for (const id of offered) {
      const g = byId.get(id);
      if (g?.status !== 'live') {
        // A code groove: no published designed groove shares its id.
        expect(CODE_GROOVES.some((c) => c.id === id)).toBe(true);
        continue;
      }
      expect(g.timeSignature).toEqual([4, 4]);
    }
    // Drafts, and the grooves in 3/4, 2/4 and 12/8, aren't offered.
    for (const id of [
      'groove_pop_02',
      'afrobeat_1_fela',
      'jazz-waltz',
      'samba',
      'partido-alto',
      'purdie-shuffle',
      'groove-latin-2',
    ]) {
      expect(offered).not.toContain(id);
    }
    // The ballad's designed file is a draft, so the code groove is offered.
    expect(offered).toContain('groove_ballad_01');
    // The Studio's performances are offered with the designed grooves.
    expect(offered).toContain('groove-rock-2');
  });
});

describe('a groove as the run’s drums', () => {
  it('loops a designed groove whole, swinging only its off-beat 16ths', () => {
    const swung = groove('swung', 'Swung', {
      bars: 2,
      swing: 66,
      hits: [
        { tick: 0, note: 36, velocity: 96 },
        { tick: 120, note: 42, velocity: 70 },
        { tick: 240, note: 42, velocity: 70 },
        { tick: 1920 + 960, note: 38, velocity: 112 },
      ],
      padGains: { 49: 0.5 },
    });
    const run = designedRunGroove(swung);
    expect(run.loopTicks).toBe(3840);
    expect(run.hits.map((h) => h.tick)).toEqual([0, 158, 240, 2880]);
    expect(run.padGains).toEqual({ 49: 0.5 });
  });

  it('plays a published groove on its own kit', async () => {
    const drums = await drumsForGroove('straight-8', 4);
    expect(drums?.kit).toBe('custom_custom_natural_01');
    // Four bars since 19 Oct 2026 (it was one).
    expect(drums?.groove.loopTicks).toBe(4 * 1920);
    expect(drums?.groove.hits.length).toBeGreaterThan(0);
  });

  it('builds a code groove as long as the run, on the natural kit', async () => {
    const drums = await drumsForGroove('groove_ballad_01', 4);
    expect(drums?.kit).toBe('natural');
    expect(drums?.groove.loopTicks).toBe(4 * 1920);
    // Its kick on every downbeat, a hair late at most (the code's jitter).
    const kicks = drums!.groove.hits.filter((h) => h.note === 36);
    expect(kicks.map((h) => Math.round(h.tick / 1920))).toEqual([0, 1, 2, 3]);
    expect(kicks.every((h) => h.tick % 1920 <= 3)).toBe(true);
  });

  it('loads a Studio groove when it’s chosen', async () => {
    const drums = await drumsForGroove('groove-rock-2', 4);
    expect(drums?.groove.hits.length).toBeGreaterThan(0);
  });

  it('plays nothing for a draft, another meter, or an id that’s gone', async () => {
    expect(await drumsForGroove('groove_pop_02', 4)).toBeNull();
    expect(await drumsForGroove('jazz-waltz', 4)).toBeNull();
    expect(await drumsForGroove('no-such-groove', 4)).toBeNull();
  });
});
