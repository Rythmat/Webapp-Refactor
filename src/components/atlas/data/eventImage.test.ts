import { describe, expect, it } from 'vitest';
import { eventImage, posterUrl } from './eventImage';

describe('eventImage', () => {
  it('uses the video poster at the size asked for', () => {
    expect(posterUrl('abc', 'thumb')).toBe(
      'https://i.ytimg.com/vi/abc/default.jpg',
    );
    expect(eventImage({ videoId: 'abc' }, 'lane')).toBe(
      'https://i.ytimg.com/vi/abc/mqdefault.jpg',
    );
    expect(eventImage({ videoId: 'abc' }, 'stage')).toBe(
      'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    );
  });

  it('prefers a curated image over the poster', () => {
    expect(
      eventImage({ videoId: 'abc', image: 'https://cdn/art.webp' }, 'lane'),
    ).toBe('https://cdn/art.webp');
  });

  it('has nothing for an event with neither', () => {
    expect(eventImage({}, 'lane')).toBeUndefined();
    expect(eventImage(undefined, 'lane')).toBeUndefined();
  });
});
