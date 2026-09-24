import { describe, expect, it } from 'vitest';
import { performedBars } from '@/curriculum/songLibrary/performance';
import { isSectionLabel } from '@/curriculum/songLibrary/sectionNames';
import type { Song } from '@/curriculum/types/songLibrary';

/**
 * Chart form rules over every song file (bundled or not): sections carry real
 * names, and each roadmap reads through to a finite performance.
 */

const modules = import.meta.glob<Record<string, unknown>>('../*.ts', {
  eager: true,
});

const songs: Song[] = Object.entries(modules)
  .filter(([path]) => !/\/(index|bundled)\.ts$/.test(path))
  .flatMap(([, mod]) =>
    Object.values(mod).filter(
      (value): value is Song =>
        typeof value === 'object' &&
        value !== null &&
        'sections' in value &&
        'keyRoot' in value,
    ),
  );

describe('song chart form', () => {
  it('names every section Intro, Verse, Pre-Chorus, Chorus, Bridge, Interlude, Tag or Outro', () => {
    const bad = songs.flatMap((song) =>
      song.sections
        .filter((section) => !isSectionLabel(section.label))
        .map((section) => `${song.id}: ${section.label}`),
    );
    expect(bad).toEqual([]);
  });

  it('plays every roadmap through, touching each written bar', () => {
    const bad: string[] = [];
    for (const song of songs) {
      const written = song.sections.reduce((n, s) => n + s.bars.length, 0);
      const played = performedBars(song);
      if (played.length >= 4000) bad.push(`${song.id}: roadmap never ends`);
      const seen = new Set(played.map((p) => p.writtenIdx));
      if (seen.size !== written)
        bad.push(
          `${song.id}: ${written - seen.size} written bars never played`,
        );
    }
    expect(bad).toEqual([]);
  });

  it('plays Close To You in the order of the record', () => {
    const song = songs.find((s) => s.id === 'they_long_to_be_close_to_you')!;
    // A new run wherever the order jumps back or a new section starts.
    const labels: string[] = [];
    let prev: { writtenIdx: number; sectionIdx: number } | null = null;
    for (const p of performedBars(song)) {
      if (
        !prev ||
        p.writtenIdx <= prev.writtenIdx ||
        p.sectionIdx !== prev.sectionIdx
      )
        labels.push(song.sections[p.sectionIdx].label);
      prev = p;
    }
    expect(labels).toEqual([
      'Intro',
      'Verse', // 1
      'Verse', // 2, into the 2nd ending
      'Bridge',
      'Verse', // 3
      'Verse', // instrumental, up a half step
      'Bridge',
      'Verse', // 4, after the D.S.
      'Tag',
      'Interlude',
      'Outro',
      'Outro', // repeat and fade
    ]);
    // Intro, Verse ×2, Bridge, Verse ×2, Bridge, Verse, Tag, Interlude, Outro ×2.
    expect(performedBars(song)).toHaveLength(
      4 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 4 + 8,
    );
  });
});
