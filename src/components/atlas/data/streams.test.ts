import { describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import { STREAM_IDS, isStreamId } from './streamIds';
import {
  STREAMS,
  classifyGenre,
  getStream,
  primaryStream,
  streamsOf,
} from './streams';

const event = (genre: string[], tags: string[] = []): HistoricalEvent => ({
  id: 'e',
  year: 1960,
  location: { lat: 0, lng: 0, city: 'Memphis', country: 'United States' },
  genre,
  tags,
  title: 't',
  description: 'd',
});

describe('streams', () => {
  it('lists every stream id once, in lane order', () => {
    expect(STREAMS.map((s) => s.id)).toEqual([...STREAM_IDS]);
    expect(isStreamId('beats')).toBe(true);
    expect(isStreamId('jazz')).toBe(false);
  });

  it('gives each curriculum course to exactly one stream', () => {
    const courses = STREAMS.flatMap((s) => s.courses);
    expect(new Set(courses).size).toBe(courses.length);
  });

  it.each([
    ['Chicago Blues', 'blues-jazz-soul'],
    ['Gospel', 'blues-jazz-soul'],
    ['Rocksteady', 'roots'],
    ['Opera', 'classical'],
    ['Film Scoring', 'classical'],
    ['Trap', 'beats'],
    ['Hip-Hop', 'beats'],
    ['Hard Bop', 'blues-jazz-soul'],
    ['Highlife', 'roots'],
    ['Britpop', 'rock-pop'],
  ] as const)('files %s under %s', (genre, stream) => {
    expect(classifyGenre(genre)).toBe(stream);
  });

  it('leaves a genre nothing claims unfiled', () => {
    expect(classifyGenre('Zzz unknown')).toBeNull();
  });

  it('draws an event in its first mapped genre’s stream', () => {
    expect(primaryStream(event(['Zzz', 'Soul', 'Rock']))).toBe(
      'blues-jazz-soul',
    );
    expect(streamsOf(event(['Soul', 'Rock', 'Funk']))).toEqual([
      'blues-jazz-soul',
      'rock-pop',
    ]);
  });

  it('falls back to the tags, then to Roots', () => {
    expect(primaryStream(event(['Zzz'], ['Techno']))).toBe('beats');
    expect(primaryStream(event([], []))).toBe('roots');
  });

  it('finds a stream by id', () => {
    expect(getStream('rock-pop').label).toBe('Rock & Pop');
  });
});
