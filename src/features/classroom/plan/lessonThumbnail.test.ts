import { describe, expect, it } from 'vitest';
import { CITIES, REGIONS } from '@/components/atlas/data';
import type { Slide } from '../slides/types';
import type { Day, LaunchTile } from '../types';
import { lessonThumbnailSource } from './lessonThumbnail';
import { newBlankDay } from './newBlankDay';

const tile = (activityRef: string): LaunchTile => ({
  id: `t-${activityRef}`,
  module: 'globe',
  activityRef,
});

/** Blank day + optional Connect-cell song / launch tiles / a deck. */
const makeDay = (over: {
  songId?: string;
  tiles?: LaunchTile[];
  slides?: Slide[];
}): Day => {
  const day = newBlankDay('Test');
  if (over.songId)
    day.cells.connectRegulate.presentation.song = { id: over.songId };
  if (over.tiles)
    day.cells.connectRegulate.presentation.launchTiles = over.tiles;
  if (over.slides)
    day.deck = {
      id: `${day.id}-deck`,
      title: { en: 'd' },
      slides: over.slides,
    };
  return day;
};

describe('lessonThumbnailSource', () => {
  it('derives the song id from the structured presentation.song', () => {
    expect(lessonThumbnailSource(makeDay({ songId: 'nowhere_man' }))).toEqual({
      songId: 'nowhere_man',
    });
  });

  it('derives the song id from a deck slide artistImage media', () => {
    const slide: Slide = {
      id: 's1',
      kind: 'content',
      phase: 'connectRegulate',
      title: { en: '' },
      media: { type: 'artistImage', songId: 'africa' },
    };
    expect(lessonThumbnailSource(makeDay({ slides: [slide] }))).toEqual({
      songId: 'africa',
    });
  });

  it('derives the song id from a song:<id>:chart launch tile', () => {
    expect(
      lessonThumbnailSource(
        makeDay({ tiles: [tile('song:lovely_day:chart')] }),
      ),
    ).toEqual({ songId: 'lovely_day' });
  });

  it('derives a region location from a globe:region tile', () => {
    const region = REGIONS.find((r) => r.id === 'west-africa') ?? REGIONS[0];
    expect(
      lessonThumbnailSource(
        makeDay({ tiles: [tile(`globe:region:${region.id}`)] }),
      ),
    ).toEqual({ location: { center: region.center, zoom: region.zoom } });
  });

  it('derives a city location (zoom 3) from a globe:city tile', () => {
    const city = CITIES[0];
    expect(
      lessonThumbnailSource(
        makeDay({ tiles: [tile(`globe:city:${city.id}`)] }),
      ),
    ).toEqual({ location: { center: city.coordinates, zoom: 3 } });
  });

  it('returns nothing for a plain lesson (no song, no location)', () => {
    expect(lessonThumbnailSource(makeDay({}))).toEqual({});
  });

  it('returns BOTH signals when a lesson has a song and a location (render decides precedence)', () => {
    const region = REGIONS.find((r) => r.id === 'west-africa') ?? REGIONS[0];
    const src = lessonThumbnailSource(
      makeDay({ songId: 'africa', tiles: [tile(`globe:region:${region.id}`)] }),
    );
    expect(src.songId).toBe('africa');
    expect(src.location).toEqual({ center: region.center, zoom: region.zoom });
  });
});
