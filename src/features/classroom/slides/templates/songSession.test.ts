import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { PHASES } from '../../phases';
import { newBlankDay } from '../../plan/newBlankDay';
import { findForbiddenSubstring, publishDay } from '../../publish/publishDay';
import type { Interaction } from '../../types';
import { findDanglingInteractionIds } from '../deck';
import { songGlobeRoute, songLessonRoute } from '../songDeepLinks';
import { enrichDayWithSongSessionDeck } from './fromPlannedDay';
import {
  SONG_SESSION_TEMPLATE_ID,
  buildSongSessionDay,
} from './songSession';

/** Minimal hand-built Song fixture — never import the 650-song library here. */
const makeSong = (overrides: Partial<Song> = {}): Song => ({
  id: 'test_groove',
  title: 'Test Groove',
  artist: 'The Fixture Band',
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['pop'],
  techniques: [],
  sections: [],
  audioSources: [
    {
      provider: 'youtube',
      uri: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      startOffsetSec: 3,
    },
  ],
  artistImageSource: 'none',
  ...overrides,
});

describe('buildSongSessionDay', () => {
  it('publishes cleanly — no forbidden substrings in en or es copy', () => {
    const day = buildSongSessionDay({ song: makeSong() });
    expect(findForbiddenSubstring(publishDay(day))).toBeNull();

    // Text-question variant publishes clean too.
    const textDay = buildSongSessionDay({
      song: makeSong(),
      params: {
        question: {
          type: 'text',
          question: { en: 'Describe the groove.', es: 'Describe el ritmo.' },
        },
      },
    });
    expect(findForbiddenSubstring(publishDay(textDay))).toBeNull();
  });

  it('every deck slide interaction id resolves in the published snapshot', () => {
    const snapshot = publishDay(buildSongSessionDay({ song: makeSong() }));
    expect(findDanglingInteractionIds(snapshot)).toEqual([]);
  });

  it('check-in interactions are shareable:false in the published snapshot', () => {
    const snapshot = publishDay(buildSongSessionDay({ song: makeSong() }));
    const checkIns = Object.values(snapshot.cells).flatMap(
      (cell) =>
        cell.presentation.interactions?.filter((i) => i.type === 'check-in') ??
        [],
    );
    expect(checkIns).toHaveLength(2); // arrival + exit feeling
    for (const interaction of checkIns) {
      expect(interaction.shareable).toBe(false);
    }
  });

  it('orders slides welcome → check-in → media → question → app-route → studio → showcase → exit with non-decreasing phases', () => {
    const day = buildSongSessionDay({ song: makeSong() });
    const deck = day.deck;
    expect(deck).toBeDefined();
    if (!deck) return;

    expect(deck.slides.map((s) => s.kind)).toEqual([
      'content',
      'interaction',
      'media',
      'interaction',
      'app-route',
      'studio-collab',
      'showcase',
      'interaction',
    ]);

    const phaseIndexes = deck.slides.map((s) => PHASES.indexOf(s.phase));
    for (let i = 1; i < phaseIndexes.length; i++) {
      expect(phaseIndexes[i]).toBeGreaterThanOrEqual(phaseIndexes[i - 1]);
    }

    expect(day.label).toBe('Test Groove');
    expect(deck.templateRef).toEqual({
      templateId: SONG_SESSION_TEMPLATE_ID,
      songId: 'test_groove',
    });

    // Media slide carries the YouTube source + featured visual (no artist
    // image on the fixture → unmarked mini-globe).
    const media = deck.slides[2];
    if (media.kind !== 'media') throw new Error('expected a media slide');
    expect(media.media).toEqual({
      type: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      startSec: 3,
    });
    expect(media.sideMedia).toEqual({ type: 'globePreview' });

    // Choice question reveals as bars; the stacked exit poll reveals as wall.
    const question = deck.slides[3];
    if (question.kind !== 'interaction') throw new Error('expected question');
    expect(question.reveal).toBe('bars');

    // App-route (Theory), studio-collab (pair up), showcase (share).
    const appRoute = deck.slides[4];
    if (appRoute.kind !== 'app-route')
      throw new Error('expected app-route slide');
    expect(appRoute.phase).toBe('creativeProjects');

    const studio = deck.slides[5];
    if (studio.kind !== 'studio-collab')
      throw new Error('expected studio-collab slide');
    expect(studio.grouping).toBe('pairs');
    expect(studio.phase).toBe('creativeProjects');

    const showcase = deck.slides[6];
    if (showcase.kind !== 'showcase')
      throw new Error('expected showcase slide');
    expect(showcase.phase).toBe('presentPerform');

    const exit = deck.slides[7];
    if (exit.kind !== 'interaction') throw new Error('expected exit poll');
    expect(exit.reveal).toBe('wall');
    expect(exit.interactionIds).toHaveLength(2);
  });

  it('emits the showcase interaction in the Share cell (type showcase, shareable:false)', () => {
    const snapshot = publishDay(buildSongSessionDay({ song: makeSong() }));
    const showcase =
      snapshot.cells.presentPerform.presentation.interactions?.[0];
    expect(showcase?.type).toBe('showcase');
    expect(showcase?.shareable).toBe(false);
  });

  it('emits the theory app-route interaction in the Create cell (atlas, shareable:false)', () => {
    const snapshot = publishDay(buildSongSessionDay({ song: makeSong() }));
    const theory =
      snapshot.cells.creativeProjects.presentation.interactions?.[0];
    expect(theory?.type).toBe('atlas');
    expect(theory?.shareable).toBe(false);
    expect(theory?.atlas).toEqual({
      module: 'learn',
      activityRef: 'song:test_groove:lesson',
      expects: 'completion',
    });
  });

  it('restores the Phase-1 shape when app-route + studio-share are off', () => {
    const day = buildSongSessionDay({
      song: makeSong(),
      params: { includeAppRoute: false, includeStudioShare: false },
    });
    expect(day.deck?.slides.map((s) => s.kind)).toEqual([
      'content',
      'interaction',
      'media',
      'interaction',
      'interaction',
    ]);
    expect(
      day.cells.creativeProjects.presentation.interactions,
    ).toBeUndefined();
    expect(
      day.cells.presentPerform.presentation.interactions,
    ).toBeUndefined();
  });

  it('uses the artist image as the featured visual when the song has one', () => {
    const day = buildSongSessionDay({
      song: makeSong({
        artistImageSource: 'commissioned',
        artistImageRef: 'the_fixture_band',
      }),
    });
    const media = day.deck?.slides[2];
    if (media?.kind !== 'media') throw new Error('expected a media slide');
    expect(media.sideMedia).toEqual({
      type: 'artistImage',
      songId: 'test_groove',
    });
  });

  it('omits the media slide when the song has no YouTube source (app-route + studio stay)', () => {
    const day = buildSongSessionDay({
      song: makeSong({
        audioSources: [{ provider: 'spotify', uri: 'spotify:track:abc123' }],
      }),
    });
    expect(day.deck?.slides.map((s) => s.kind)).toEqual([
      'content',
      'interaction',
      'interaction',
      'app-route',
      'studio-collab',
      'showcase',
      'interaction',
    ]);
    const snapshot = publishDay(day);
    expect(findForbiddenSubstring(snapshot)).toBeNull();
    expect(findDanglingInteractionIds(snapshot)).toEqual([]);
  });
});

describe('enrichDayWithSongSessionDeck', () => {
  it('appends to existing interactions and does not mutate the input Day', () => {
    const base = newBlankDay('Day 3 — Bass Culture');
    const existing: Interaction = {
      id: 'existing-1',
      type: 'choice',
      question: { en: 'Ready to warm up?', es: '¿Listos para calentar?' },
      shareable: true,
      choice: { options: [{ en: 'Yeah' }, { en: 'Not yet' }], multi: false },
    };
    base.cells.groupPractice.presentation.interactions = [existing];
    base.cells.groupPractice.presentation.title = {
      en: 'Bass Lab',
      es: 'Lab de Bajo',
    };
    const before = structuredClone(base);

    const enriched = enrichDayWithSongSessionDeck(base, {
      song: makeSong(),
      unitSlug: 'nov-jazz',
      dayStubSlug: 'nov-day-3',
      themeId: 'theme-november',
    });

    // Input untouched, output is a new Day.
    expect(base).toEqual(before);
    expect(enriched).not.toBe(base);

    // Existing interaction survives in place; the template question is appended.
    const groupPractice = enriched.cells.groupPractice.presentation.interactions;
    expect(groupPractice?.[0]).toEqual(existing);
    expect(groupPractice).toHaveLength(2);
    expect(groupPractice?.[1]?.type).toBe('choice');

    // The Phase 2 theory app-route lands in the Create cell.
    const create = enriched.cells.creativeProjects.presentation.interactions;
    expect(create).toHaveLength(1);
    expect(create?.[0]?.type).toBe('atlas');

    // Provenance carries through.
    expect(enriched.deck?.templateRef).toEqual({
      templateId: SONG_SESSION_TEMPLATE_ID,
      songId: 'test_groove',
      unitSlug: 'nov-jazz',
      dayStubSlug: 'nov-day-3',
      themeId: 'theme-november',
    });

    // Slide copy prefers the authored cell title over template copy.
    const questionSlide = enriched.deck?.slides.find(
      (s) => s.kind === 'interaction' && s.phase === 'groupPractice',
    );
    expect(questionSlide?.title).toEqual({ en: 'Bass Lab', es: 'Lab de Bajo' });

    // Enriched Day still publishes clean with fully-resolving slide refs.
    const snapshot = publishDay(enriched);
    expect(findForbiddenSubstring(snapshot)).toBeNull();
    expect(findDanglingInteractionIds(snapshot)).toEqual([]);
  });

  it('artistless flow — no song means no media/app-route, but studio + showcase stay', () => {
    const base = newBlankDay('Un día sin canción');
    const enriched = enrichDayWithSongSessionDeck(base, {});

    expect(enriched.deck?.slides.map((s) => s.kind)).toEqual([
      'content',
      'interaction',
      'interaction',
      'studio-collab',
      'showcase',
      'interaction',
    ]);
    expect(enriched.deck?.templateRef?.songId).toBeUndefined();

    // Blank cells fall back to template copy on the welcome slide.
    expect(enriched.deck?.slides[0]?.title).toEqual({
      en: 'Welcome',
      es: 'Bienvenidos',
    });

    const snapshot = publishDay(enriched);
    expect(findForbiddenSubstring(snapshot)).toBeNull();
    expect(findDanglingInteractionIds(snapshot)).toEqual([]);
  });
});

describe('songDeepLinks routes', () => {
  it('build the lesson and globe deep links openInLesson/openInGlobe use', () => {
    const song = makeSong();
    expect(songLessonRoute(song)).toBe('/learn/ionian/c');
    expect(songGlobeRoute(song)).toBe('/atlas/globe?event=song-test_groove');
  });
});
