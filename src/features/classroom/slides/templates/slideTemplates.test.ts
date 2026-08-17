/**
 * Add-slide template builder tests. The load-bearing invariants:
 *  1. Every seeded template slide publishes clean (no firewall substring) — even
 *     when its derived copy comes from real data that contains forbidden tokens
 *     (Genre=funk's "…as important as the notes" trips `notes`).
 *  2. Every seeded layout rect stays inside the 1280×720 design canvas.
 *  3. The Song template seeds the headline trio: youtube media + artistImage
 *     side-media + a `song:<id>:chart` launch-tile pill.
 */
import { describe, expect, it } from 'vitest';
import type { PickedTile } from '../../plan/deckEditor/contentPicker/catalog';
import { newBlankDay } from '../../plan/newBlankDay';
import { findForbiddenSubstring, publishDay } from '../../publish/publishDay';
import type { Day } from '../../types';
import { SLIDE_CANVAS } from '../slideLayout';
import type { ContentSlide } from '../types';
import {
  SLIDE_TEMPLATES,
  buildTemplateSlide,
  type SlideTemplateId,
  type TemplatePick,
} from './slideTemplates';

const tile = (activityRef: string, label: string): PickedTile => ({
  module: 'globe',
  activityRef,
  label: { en: label },
});

const PICKS: Record<SlideTemplateId, TemplatePick> = {
  song: {
    tile: {
      module: 'learn',
      activityRef: 'song:africa:chart',
      label: { en: 'Africa' },
    },
    embed: {
      media: { type: 'youtube', videoId: 'FTQbiNvZqaY' },
      sideMedia: { type: 'artistImage', songId: 'africa' },
    },
  },
  theory: { tile: tile('learn:ionian:c', 'C Ionian') },
  genre: { tile: tile('curriculum:FUNK:L1', 'Funk') },
  studio: { tile: tile('studio:template:project-pop', 'Pop') },
  events: {
    tile: tile('globe:event:evt-x', 'A Historical Event'),
    embed: { media: { type: 'globePreview', markers: [{ location: [0, 0] }] } },
  },
  regionsCities: {
    tile: tile('globe:region:west-africa', 'West Africa'),
    embed: { media: { type: 'globePreview', markers: [{ location: [9, 8] }] } },
  },
  pathways: {
    tile: tile('globe:pathway:blues-to-rock', 'Blues to Rock'),
    embed: { media: { type: 'globePathway', pathwayId: 'blues-to-rock' } },
  },
  eras: { tile: tile('globe:era:postwar', 'Postwar') },
};

const dayWith = (slide: ContentSlide): Day => {
  const day = newBlankDay('Template Test');
  return {
    ...day,
    deck: { id: `${day.id}-deck`, title: { en: day.label }, slides: [slide] },
  };
};

describe('buildTemplateSlide', () => {
  it('every template seeds a content slide with a launch-tile pill', () => {
    for (const { id } of SLIDE_TEMPLATES) {
      const slide = buildTemplateSlide(id, 'connectRegulate', PICKS[id]);
      expect(slide.kind).toBe('content');
      expect(slide.launchTiles?.length).toBe(1);
      expect(slide.launchTiles?.[0].activityRef).toBe(
        PICKS[id].tile.activityRef,
      );
      expect(slide.layout).toBeDefined();
    }
  });

  it('every seeded slide publishes clean (firewall)', () => {
    for (const { id } of SLIDE_TEMPLATES) {
      const slide = buildTemplateSlide(id, 'connectRegulate', PICKS[id]);
      const snapshot = publishDay(dayWith(slide));
      expect(findForbiddenSubstring(snapshot)).toBeNull();
    }
  });

  it('drops forbidden lines from derived genre copy (funk → "notes")', () => {
    const slide = buildTemplateSlide('genre', 'connectRegulate', PICKS.genre);
    // The funk profile is real authored copy including a characteristic that
    // contains "notes" — it must be filtered out of the seeded body.
    expect(slide.body?.en).toBeTruthy();
    expect(slide.body?.en?.toLowerCase()).not.toContain('notes');
    // …and the accent comes from the genre profile.
    expect(slide.accent).toMatch(/^#/);
  });

  it('Song template seeds youtube media + artistImage side-media + chart pill', () => {
    const slide = buildTemplateSlide('song', 'connectRegulate', PICKS.song);
    expect(slide.media).toEqual({ type: 'youtube', videoId: 'FTQbiNvZqaY' });
    expect(slide.sideMedia).toEqual({ type: 'artistImage', songId: 'africa' });
    expect(slide.launchTiles?.[0].activityRef).toBe('song:africa:chart');
  });

  it('Eras template is text-forward with an era accent and no media', () => {
    const slide = buildTemplateSlide('eras', 'connectRegulate', PICKS.eras);
    expect(slide.media).toBeUndefined();
    expect(slide.accent).toBe('#60a5fa'); // postwar
    expect(slide.body?.en).toContain('–');
  });

  it('Theory template sets the key-center accent + a scaleKeyboard scale', () => {
    const slide = buildTemplateSlide('theory', 'connectRegulate', PICKS.theory);
    expect(slide.accent).toBe('#D2404A'); // C = KEY_OF_COLORS['C']
    expect(slide.media).toEqual({
      type: 'scaleKeyboard',
      mode: 'ionian',
      key: 'c',
    });
    expect(slide.layout?.prompt?.hidden).toBe(true);
  });

  it('keeps every seeded layout rect inside the 1280×720 canvas', () => {
    for (const { id } of SLIDE_TEMPLATES) {
      const slide = buildTemplateSlide(id, 'connectRegulate', PICKS[id]);
      for (const [key, rect] of Object.entries(slide.layout ?? {})) {
        if (!rect) continue;
        expect(rect.x, `${id}.${key}.x`).toBeGreaterThanOrEqual(0);
        expect(rect.y, `${id}.${key}.y`).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w, `${id}.${key}.x+w`).toBeLessThanOrEqual(
          SLIDE_CANVAS.w,
        );
        expect(rect.y + rect.h, `${id}.${key}.y+h`).toBeLessThanOrEqual(
          SLIDE_CANVAS.h,
        );
      }
    }
  });
});
