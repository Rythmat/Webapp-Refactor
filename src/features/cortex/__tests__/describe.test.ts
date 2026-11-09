import { beforeAll, describe, expect, it } from 'vitest';
import { ARCADE_GAMES } from '@/components/Games/arcadeGames';
import { ensureSongContent } from '@/content/songStore';
import { AUDIO_MODULES } from '@/curriculum/audio/catalog';
import { CURRICULUM_GENRE_SLUGS } from '@/curriculum/bridge/genreIdMap';
import { describeActivity } from '../describe';
import { genreLessonId } from '../ids';
import type { CortexRecord } from '../ledger';
import { activityForLocation } from '../routeTable';

const REC: CortexRecord = [100, 200, 0];

// The whole song library: slow on a busy machine.
beforeAll(() => ensureSongContent(), 60_000);

const about = (id: string, ctx = {}) => describeActivity(id, REC, ctx);

describe('what the map knows about a record', () => {
  it('names a song, with what it shares', () => {
    const song = about('song:africa');
    expect(song?.label).toBe('Africa');
    expect(song?.route).toBe('/songs/africa');
    expect(song?.concepts.map((c) => c.id)).toContain('artist:toto');
  });

  it('draws nothing for what it doesn’t know', () => {
    expect(about('song:no-such-song')).toBeNull();
    expect(about('theory:piano.not-a-mode.c')).toBeNull();
    expect(about('lesson:nothing-l1')).toBeNull();
    expect(about('game:nothing')).toBeNull();
    expect(about('audio:no.lesson')).toBeNull();
    expect(about('nonsense:thing')).toBeNull();
  });

  it('names a Theory lesson and routes it back to the same address', () => {
    const lesson = about('theory:guitar.dorian.d-flat');
    expect(lesson?.label).toBe('Dorian in D♭');
    expect(lesson?.detail).toBe('Guitar');
    expect(lesson?.route).toBe('/learn/guitar/dorian/dflat');
    expect(activityForLocation(lesson!.route!, '')).toBe(
      'theory:guitar.dorian.d-flat',
    );
    const ids = lesson?.concepts.map((c) => c.id);
    expect(ids).toEqual(['mode:dorian', 'key:d-flat', 'instrument:guitar']);
  });

  it('knows every genre course, on the same id as its route', () => {
    for (const slug of Object.values(CURRICULUM_GENRE_SLUGS)) {
      const route = `/learn/keyboard/genre/${slug}/1`;
      const id = activityForLocation(route, '')!;
      expect(id, slug).toBe(genreLessonId(slug, '1'));
      const lesson = about(id);
      expect(lesson, slug).not.toBeNull();
      expect(lesson?.route, slug).toBe(route);
    }
  });

  it('files neo-soul with the R&B songs', () => {
    expect(about('lesson:neosoul-l1')?.concepts[0].id).toBe('genre:rnb');
  });

  it('knows every game the arcade lists', () => {
    for (const game of ARCADE_GAMES) {
      if (!game.route) continue;
      const entry = about(`game:${game.route}`);
      expect(entry?.label, game.title).toBe(game.title);
      expect(entry?.route, game.title).toBeTruthy();
    }
  });

  it('knows every Audio lab and Anatomy lesson, by the id its route gives', () => {
    for (const module of AUDIO_MODULES) {
      for (const lesson of module.lessons) {
        if (lesson.kind === 'arcade') continue;
        const route =
          lesson.kind === 'lab' || lesson.kind === 'guided'
            ? `/learn/audio/${module.id}/${lesson.id}`
            : lesson.route;
        const id = activityForLocation(route, '')!;
        expect(about(id)?.label, route).toBe(lesson.title);
      }
    }
  });

  it('waits for a project’s name, and forgets one that’s gone', () => {
    expect(about('project:p1')).toBeNull();
    const projects = new Map([['p1', { name: 'My Song', genre: 'funk' }]]);
    const project = about('project:p1', { projects });
    expect(project?.label).toBe('My Song');
    expect(project?.concepts.map((c) => c.id)).toEqual([
      'genre:funk',
      'group:studio',
    ]);
    expect(about('project:p2', { projects })).toBeNull();
  });

  it('folds a Globe event that’s really a song onto the song', () => {
    expect(about('event:song-africa')?.id).toBe('song:africa');
  });

  it('names a Globe event only once its data is here', () => {
    expect(about('event:evt-1')).toBeNull();
    expect(about('event:evt-1', { eventTitle: () => 'Woodstock' })?.label).toBe(
      'Woodstock',
    );
  });

  it('gives undated records no date rather than 1970', () => {
    const game = describeActivity('game:signalFlow', [0, 0, 1], {});
    expect(game?.done).toBe(true);
    expect(game?.doneAt).toBe(0);
    expect(game?.lastAt).toBe(0);
  });
});
