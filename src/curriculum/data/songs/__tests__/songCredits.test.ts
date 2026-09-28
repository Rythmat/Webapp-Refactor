import { describe, expect, it } from 'vitest';
import { WORLD_INSTRUMENTS } from '@/components/ClassroomLayout/globe/data/instruments';
import {
  getInstrument,
  SESSION_INSTRUMENTS,
} from '@/curriculum/data/instruments';
import type { Song } from '@/curriculum/types/songLibrary';

/**
 * Recording credits are the vocabulary the Globe constellation walks, so the
 * ids have to resolve. A credit naming an instrument that isn't in
 * SESSION_INSTRUMENTS would render a blank pill and link nowhere.
 *
 * Globs the song files directly, like songDegrees.test.ts, so charts that are
 * not in the bundle yet are checked too.
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

describe('session instrument vocabulary', () => {
  it('has unique ids', () => {
    const ids = SESSION_INSTRUMENTS.map((i) => i.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('cross-links only to instruments the globe actually has', () => {
    const worldIds = new Set(WORLD_INSTRUMENTS.map((i) => i.id));
    const broken = SESSION_INSTRUMENTS.filter(
      (i) => i.worldInstrumentId && !worldIds.has(i.worldInstrumentId),
    ).map((i) => `${i.id} → ${i.worldInstrumentId}`);
    expect(broken).toEqual([]);
  });
});

describe('song recording credits', () => {
  it('names an instrument the vocabulary knows', () => {
    const unknown: string[] = [];
    for (const song of songs)
      for (const credit of song.credits ?? [])
        if (credit.instrument && !getInstrument(credit.instrument))
          unknown.push(`${song.id}: ${credit.name} → '${credit.instrument}'`);
    expect(unknown).toEqual([]);
  });

  it('only puts an instrument on a performer', () => {
    const misplaced: string[] = [];
    for (const song of songs)
      for (const credit of song.credits ?? [])
        if (credit.instrument && credit.role !== 'performer')
          misplaced.push(`${song.id}: ${credit.name} (${credit.role})`);
    expect(misplaced).toEqual([]);
  });

  it('points relatedRecordings at songs that exist here', () => {
    const ids = new Set(songs.map((s) => s.id));
    const dangling: string[] = [];
    for (const song of songs)
      for (const rel of song.relatedRecordings ?? [])
        if (rel.songId && !ids.has(rel.songId))
          dangling.push(`${song.id} → ${rel.songId}`);
    expect(dangling).toEqual([]);
  });

  it('never leaves a credit nameless', () => {
    const blank = songs.flatMap((song) =>
      (song.credits ?? [])
        .filter((c) => !c.name.trim())
        .map(() => `${song.id}: empty credit name`),
    );
    expect(blank).toEqual([]);
  });
});
