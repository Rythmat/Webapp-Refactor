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
import { MUSICAL_ERAS } from './musicalEras';
import type { StreamId } from './streamIds';
import {
  STREAMS,
  classifyGenre,
  getStream,
  primaryStream,
  streamsOf,
} from './streams';

/**
 * The stream table against the bundled events, and the report the owner
 * signs it off from: docs/globe-redesign/streams-calibration.md. A change to
 * the table that moves the numbers fails here until the report is rewritten
 * (`npx vitest run -u src/components/atlas/data/streams.calibration.test.ts`),
 * so the committed report always matches the code.
 */

/** Each authored file, and the stream its events should mostly land in. */
const SOURCES: [string, HistoricalEvent[], StreamId][] = [
  ['african', AFRICAN_EVENTS, 'roots'],
  ['blues', BLUES_EVENTS, 'blues-jazz-soul'],
  ['classical', CLASSICAL_EVENTS, 'classical'],
  ['electronic', ELECTRONIC_EVENTS, 'beats'],
  ['folk', FOLK_EVENTS, 'roots'],
  ['hiphop', HIPHOP_EVENTS, 'beats'],
  ['jamband', JAMBAND_EVENTS, 'rock-pop'],
  ['jazz', JAZZ_EVENTS, 'blues-jazz-soul'],
  ['latin', LATIN_EVENTS, 'roots'],
  ['musicForMedia', MUSICFORMEDIA_EVENTS, 'classical'],
  ['pop', POP_EVENTS, 'rock-pop'],
  ['reggae', REGGAE_EVENTS, 'roots'],
  ['rnbSoulFunk', RNBSOULFUNK_EVENTS, 'blues-jazz-soul'],
  ['rock', ROCK_EVENTS, 'rock-pop'],
];

const pct = (n: number, of: number) => `${((100 * n) / of).toFixed(1)}%`;
const count = <K>(map: Map<K, number>, key: K) =>
  map.set(key, (map.get(key) ?? 0) + 1);
const top = (map: Map<string, number>, n: number) =>
  [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);

const events = BUNDLED_MUSIC_HISTORY;
const byStream = new Map<StreamId, HistoricalEvent[]>(
  STREAMS.map((s) => [s.id, []]),
);
for (const e of events) byStream.get(primaryStream(e))!.push(e);

const agreement = SOURCES.map(([name, list, want]) => {
  const elsewhere = new Map<string, number>();
  let hits = 0;
  for (const e of list) {
    const got = primaryStream(e);
    if (got === want) hits += 1;
    else count(elsewhere, got);
  }
  return { name, total: list.length, want, hits, elsewhere };
});

function report(): string {
  const lines: string[] = [
    '# Music streams — calibration report',
    '',
    'Written by `src/components/atlas/data/streams.calibration.test.ts` from the',
    'bundled globe events. The streams are the lanes of the Globe’s timeline;',
    'an event is drawn in the stream of its first genre that one claims.',
    'Edit the table in `src/components/atlas/data/streams.ts`, then rewrite',
    'this file with `npx vitest run -u src/components/atlas/data/streams.calibration.test.ts`.',
    '',
    `Events: ${events.length}. In more than one stream: ${events.filter((e) => streamsOf(e).length > 1).length} (${pct(events.filter((e) => streamsOf(e).length > 1).length, events.length)}).`,
    '',
    '## Streams',
    '',
    '| Stream | Courses | Events | Share | Top genres |',
    '| --- | --- | ---: | ---: | --- |',
  ];
  for (const stream of STREAMS) {
    const list = byStream.get(stream.id)!;
    const genres = new Map<string, number>();
    for (const e of list) for (const g of e.genre) count(genres, g);
    lines.push(
      `| ${stream.label} | ${stream.courses.join(', ')} | ${list.length} | ${pct(list.length, events.length)} | ${top(
        genres,
        6,
      )
        .map(([g, n]) => `${g} (${n})`)
        .join(', ')} |`,
    );
  }

  lines.push(
    '',
    '## Streams by era',
    '',
    `| Stream | ${MUSICAL_ERAS.map((e) => e.label).join(' | ')} |`,
    `| --- |${MUSICAL_ERAS.map(() => ' ---: |').join('')}`,
  );
  for (const stream of STREAMS) {
    const list = byStream.get(stream.id)!;
    lines.push(
      `| ${stream.label} | ${MUSICAL_ERAS.map(
        (era) =>
          list.filter((e) => e.year >= era.yearStart && e.year <= era.yearEnd)
            .length,
      ).join(' | ')} |`,
    );
  }

  lines.push(
    '',
    '## Agreement with the authored files',
    '',
    'Each events file was written around one genre; this is how many of its',
    'events land in that genre’s stream, and where the rest go.',
    '',
    '| File | Events | Expected stream | Agreement | Elsewhere |',
    '| --- | ---: | --- | ---: | --- |',
  );
  for (const a of agreement) {
    lines.push(
      `| ${a.name} | ${a.total} | ${getStream(a.want).label} | ${pct(a.hits, a.total)} | ${
        [...a.elsewhere]
          .map(([s, n]) => `${getStream(s as StreamId).short} (${n})`)
          .join(', ') || '—'
      } |`,
    );
  }

  const unmapped = new Map<string, number>();
  for (const e of events) {
    for (const g of e.genre) if (!classifyGenre(g)) count(unmapped, g);
  }
  lines.push(
    '',
    '## Genres no stream claims',
    '',
    'Only ever an event’s secondary genres: every event has a first genre a',
    'stream claims. Add one to `STREAM_OVERRIDES` to file it.',
    '',
    top(unmapped, 200)
      .map(([g, n]) => `${g} (${n})`)
      .join(', ') || '—',
    '',
    '## For the owner',
    '',
    '- **Latin and Reggae** flow into Roots & Folk. They could be a lane of',
    '  their own (“Caribbean & Latin”), at the cost of a sixth lane.',
    '- **Gospel** flows into Blues, Jazz & Soul (through R&B), not Classical.',
    '- **Film scoring, musical theatre and jingles** share the Classical lane;',
    '  on their own they would be a thin lane of about 55 events.',
    '- **Funk and Disco** sit with Blues, Jazz & Soul, not Rock & Pop.',
    '',
  );
  return lines.join('\n');
}

describe('the stream table on the bundled events', () => {
  it('draws every event in a stream', () => {
    for (const e of events) expect(primaryStream(e)).toBeTruthy();
  });

  it('keeps every stream between 3% and 45% of the events', () => {
    for (const stream of STREAMS) {
      const share = byStream.get(stream.id)!.length / events.length;
      expect(share, stream.id).toBeGreaterThanOrEqual(0.03);
      expect(share, stream.id).toBeLessThanOrEqual(0.45);
    }
  });

  it('agrees with the genre each events file was written around', () => {
    for (const a of agreement) {
      expect(a.hits / a.total, a.name).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('matches the committed calibration report', async () => {
    await expect(report()).toMatchFileSnapshot(
      '../../../../docs/globe-redesign/streams-calibration.md',
    );
  });
});
