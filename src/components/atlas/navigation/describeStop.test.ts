import { afterEach, describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { describeStop, youtubeThumb } from './describeStop';

const event: HistoricalEvent = {
  id: 'describe-stop-test',
  year: 1928,
  location: { lat: 0, lng: 0, city: 'Chicago', country: 'US' },
  genre: ['Jazz'],
  title: 'West End Blues',
  description: '',
  tags: [],
  videoId: 'abc123',
};

afterEach(() => {
  MUSIC_HISTORY.length = 0;
});

describe('describeStop', () => {
  it('uses the smallest YouTube thumbnail', () => {
    expect(youtubeThumb('abc123')).toBe(
      'https://i.ytimg.com/vi/abc123/default.jpg',
    );
  });

  it('describes an event once and reuses it', () => {
    MUSIC_HISTORY.push(event);
    const first = describeStop({ kind: 'event', eventId: event.id });
    expect(first).toMatchObject({
      title: 'West End Blues',
      subtitle: '1928 · Chicago',
      thumb: 'https://i.ytimg.com/vi/abc123/default.jpg',
    });
    expect(describeStop({ kind: 'event', eventId: event.id })).toBe(first);
  });

  it('keeps the case a search was typed in', () => {
    expect(describeStop({ kind: 'search', query: 'Jazz' }).title).toBe(
      '“Jazz”',
    );
    expect(describeStop({ kind: 'search', query: 'jazz' }).title).toBe(
      '“jazz”',
    );
  });
});
