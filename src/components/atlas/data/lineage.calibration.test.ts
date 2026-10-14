import { describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import { BUNDLED_MUSIC_HISTORY } from './events';
import { AFRICAN_EVENTS } from './events/african';
import { BLUES_EVENTS } from './events/blues';
import { CLASSICAL_EVENTS } from './events/classical';
import { ELECTRONIC_EVENTS } from './events/electronic';
import { FOLK_EVENTS } from './events/folk';
import { HIPHOP_EVENTS } from './events/hiphop';
import { JAMBAND_EVENTS } from './events/jamband';
import { JAZZ_EVENTS } from './events/jazz';
import { LATIN_EVENTS } from './events/latin';
import { MUSICFORMEDIA_EVENTS } from './events/musicForMedia';
import { POP_EVENTS } from './events/pop';
import { REGGAE_EVENTS } from './events/reggae';
import { RNBSOULFUNK_EVENTS } from './events/rnbSoulFunk';
import { ROCK_EVENTS } from './events/rock';
import type { LaneId } from './laneIds';
import { LANES, genreLane, getLane, laneOf, laneOfGenre } from './lineage';
import { MUSICAL_ERAS } from './musicalEras';

/**
 * Music's family tree against the bundled events, and the report the owner
 * checks it from: docs/globe-redesign/lineage-calibration.md. A change to the
 * tree that moves the numbers fails here until the report is rewritten
 * (`npx vitest run src/components/atlas/data/lineage.calibration.test.ts --update`),
 * so the committed report always matches the code.
 */

/** Each authored file, and the lanes its events should land in. */
const SOURCES: [string, HistoricalEvent[], LaneId[]][] = [
  ['african', AFRICAN_EVENTS, ['roots']],
  ['blues', BLUES_EVENTS, ['blues']],
  ['classical', CLASSICAL_EVENTS, ['classical']],
  ['electronic', ELECTRONIC_EVENTS, ['electronic']],
  ['folk', FOLK_EVENTS, ['roots']],
  ['hiphop', HIPHOP_EVENTS, ['hip-hop']],
  ['jamband', JAMBAND_EVENTS, ['jam-band']],
  ['jazz', JAZZ_EVENTS, ['jazz']],
  ['latin', LATIN_EVENTS, ['latin']],
  [
    'musicForMedia',
    MUSICFORMEDIA_EVENTS,
    ['stage-screen', 'classical', 'electronic'],
  ],
  ['pop', POP_EVENTS, ['pop']],
  ['reggae', REGGAE_EVENTS, ['reggae']],
  ['rnbSoulFunk', RNBSOULFUNK_EVENTS, ['rnb', 'funk', 'neo-soul']],
  ['rock', ROCK_EVENTS, ['rock', 'metal']],
];

const pct = (n: number, of: number) => `${((100 * n) / of).toFixed(1)}%`;
const count = <K>(map: Map<K, number>, key: K) =>
  map.set(key, (map.get(key) ?? 0) + 1);
const top = (map: Map<string, number>, n: number) =>
  [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
const label = (id: LaneId) => getLane(id).label;

const events = BUNDLED_MUSIC_HISTORY;
const placed = new Map<LaneId, HistoricalEvent[]>(LANES.map((l) => [l.id, []]));
const early: HistoricalEvent[] = [];
for (const e of events) {
  placed.get(laneOf(e))!.push(e);
  if (laneOf(e) !== genreLane(e)) early.push(e);
}

const agreement = SOURCES.map(([name, list, want]) => {
  const elsewhere = new Map<string, number>();
  let hits = 0;
  for (const e of list) {
    const got = genreLane(e);
    if (want.includes(got)) hits += 1;
    else count(elsewhere, label(got));
  }
  return { name, total: list.length, want, hits, elsewhere };
});

function report(): string {
  const lines: string[] = [
    '# Music’s family tree — calibration report',
    '',
    'Written by `src/components/atlas/data/lineage.calibration.test.ts` from',
    'the bundled globe events. The lanes are the Globe timeline’s; each splits',
    'from, or forms where two lanes meet, at its year. An event sits in the',
    'lane its genres name — or, when it is older than that lane, on the',
    'nearest ancestor flowing in its year. Edit the tree in',
    '`src/components/atlas/data/lineage.ts`, then rewrite this file with',
    '`npx vitest run src/components/atlas/data/lineage.calibration.test.ts --update`.',
    '',
    `Events: ${events.length}. On an ancestor, being older than their own lane: ${early.length}.`,
    '',
    '## Lanes, top to bottom',
    '',
    '| Lane | Born | From | Joined later by | Genres | Events | Top genres |',
    '| --- | ---: | --- | --- | --- | ---: | --- |',
  ];
  for (const lane of LANES) {
    const list = placed.get(lane.id)!;
    const genres = new Map<string, number>();
    for (const e of list) for (const g of e.genre) count(genres, g);
    const claims = [
      ...lane.courses,
      ...(lane.match ? [`any genre matching ${lane.match}`] : []),
    ].join(', ');
    lines.push(
      `| ${lane.label} | ${lane.born} | ${
        lane.from.map(label).join(' + ') || '— (the source)'
      } | ${
        (lane.joins ?? [])
          .map((j) => `${label(j.from)} (${j.year})`)
          .join(', ') || '—'
      } | ${claims} | ${list.length} | ${top(genres, 5)
        .map(([g, n]) => `${g} (${n})`)
        .join(', ')} |`,
    );
  }

  lines.push(
    '',
    '## Lanes by era',
    '',
    `| Lane | ${MUSICAL_ERAS.map((e) => e.label).join(' | ')} |`,
    `| --- |${MUSICAL_ERAS.map(() => ' ---: |').join('')}`,
  );
  for (const lane of LANES) {
    const list = placed.get(lane.id)!;
    lines.push(
      `| ${lane.label} | ${MUSICAL_ERAS.map(
        (era) =>
          list.filter((e) => e.year >= era.yearStart && e.year <= era.yearEnd)
            .length,
      ).join(' | ')} |`,
    );
  }

  lines.push(
    '',
    '## Older than their lane',
    '',
    'Drawn on the nearest ancestor flowing in their year.',
    '',
    '| Year | Event | Genres name | Drawn on |',
    '| ---: | --- | --- | --- |',
    ...[...early]
      .sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))
      .map(
        (e) =>
          `| ${e.year} | ${e.title} | ${label(genreLane(e))} | ${label(laneOf(e))} |`,
      ),
  );

  lines.push(
    '',
    '## Agreement with the authored files',
    '',
    'Each events file was written around a genre; this is how many of its',
    'events its genres file under that genre’s lanes, and where the rest go.',
    '',
    '| File | Events | Expected | Agreement | Elsewhere |',
    '| --- | ---: | --- | ---: | --- |',
  );
  for (const a of agreement) {
    lines.push(
      `| ${a.name} | ${a.total} | ${a.want.map(label).join(', ')} | ${pct(
        a.hits,
        a.total,
      )} | ${
        [...a.elsewhere].map(([s, n]) => `${s} (${n})`).join(', ') || '—'
      } |`,
    );
  }

  const unclaimed = new Map<string, number>();
  for (const e of events) {
    for (const g of e.genre) if (!laneOfGenre(g)) count(unclaimed, g);
  }
  lines.push(
    '',
    '## Genres no lane claims',
    '',
    'Only ever an event’s secondary genres: every event has a genre a lane',
    'claims. Add one to `LANE_OVERRIDES` to file it.',
    '',
    top(unclaimed, 200)
      .map(([g, n]) => `${g} (${n})`)
      .join(', ') || '—',
    '',
  );
  return lines.join('\n');
}

describe('the family tree on the bundled events', () => {
  it('draws every event in a lane that is flowing in its year', () => {
    for (const e of events) {
      expect(e.year, e.id).toBeGreaterThanOrEqual(getLane(laneOf(e)).born);
    }
  });

  it('gives every lane events of its own', () => {
    for (const lane of LANES) {
      expect(placed.get(lane.id)!.length, lane.id).toBeGreaterThanOrEqual(10);
    }
  });

  it('puts few events on an ancestor', () => {
    expect(early.length / events.length).toBeLessThan(0.02);
  });

  it('agrees with the genre each events file was written around', () => {
    for (const a of agreement) {
      expect(a.hits / a.total, a.name).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('matches the committed calibration report', async () => {
    await expect(report()).toMatchFileSnapshot(
      '../../../../docs/globe-redesign/lineage-calibration.md',
    );
  });
});
