// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  BAR_TICKS,
  assembleSong,
  processTake,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import type { LiteracyKey } from '@/curriculum/engine/musicLiteracy/pitch';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { parseBootIntent } from '@/daw/session/parseBootIntent';
import { useStore } from '@/daw/store';
import { buildBandPracticeTrack } from '../bandPracticeTrack';
import {
  echoBandParts,
  echoSongOfRef,
  echoSongRefFor,
  echoSongUrl,
  openEchoSongInStudio,
  peekEchoSong,
  resolveEchoSong,
  takeEchoSong,
  type EchoSongRequest,
} from '../echoSongStudio';
import { applyEchoSong, echoChordRegions } from '../seedStudioFromEchoSong';

/**
 * Take Your Song To The Studio: the song made in Echo's Make Your Song,
 * left for the Studio with the band the student heard, its link able to
 * build it again, and the Studio seeded on the Create view with Melody,
 * Chords and the band's own tracks.
 */

const C_MAJOR: LiteracyKey = { tonic: 'C', mode: 'major' };

/** 1 maj then 6 min, a bar each; a melody of a few notes. */
function takes(level: EchoLevelNumber = 1, key = C_MAJOR) {
  const chordTake = processTake(
    [
      ...[60, 64, 67].map((midi) => ({ midi, onset: 0, duration: 1900 })),
      ...[57, 60, 64].map((midi) => ({
        midi,
        onset: BAR_TICKS,
        duration: 1900,
      })),
    ],
    { kind: 'chords', key, level },
  );
  const melodyTake = processTake(
    [
      { midi: 64, onset: 0, duration: 480 },
      { midi: 67, onset: 480, duration: 480 },
      { midi: 69, onset: BAR_TICKS, duration: 960 },
    ],
    { kind: 'melody', key, level },
  );
  return { chordTake, melodyTake };
}

const request = (extra: Partial<EchoSongRequest> = {}): EchoSongRequest => ({
  level: 1,
  key: C_MAJOR,
  ...takes(),
  band: 'pop-band-1',
  variation: 'l1-singable',
  bpm: 96,
  ...extra,
});

beforeAll(() => pairingsReady);
afterEach(() => {
  takeEchoSong(echoSongRefFor(request()));
});

describe('the link', () => {
  it('carries the song, and builds the same takes, key and tempo again', () => {
    const req = request();
    const ref = echoSongRefFor(req);
    expect(ref).toMatchObject({
      band: 'pop-band-1',
      variation: 'l1-singable',
      tonic: 'C',
      mode: 'major',
      level: '1',
      bpm: '96',
      chords: '1.0.1920_6.1920.1920',
    });
    const url = echoSongUrl(ref);
    expect(url.startsWith('/studio/editor?echoSong=pop-band-1')).toBe(true);

    // The Studio's boot reads it as the echoSong intent.
    const parsed = parseBootIntent(new URLSearchParams(url.split('?')[1]));
    expect(parsed.intent).toEqual({ kind: 'echoSong', song: ref });
    expect(parsed.consumedKeys).toContain('echoMelody');

    const original = assembleSong(1, C_MAJOR, req.chordTake, req.melodyTake, {
      tempo: 96,
    });
    const rebuilt = echoSongOfRef(ref)!;
    expect(rebuilt.tempo).toBe(96);
    expect(rebuilt.chart).toEqual(original.chart);
    expect(rebuilt.melody).toEqual(original.melody);
    expect(rebuilt.chordNotes).toEqual(original.chordNotes);
    expect(rebuilt.chords.map((c) => c.label)).toEqual(
      original.chords.map((c) => c.label),
    );
  });

  it('refuses a link it can’t read', () => {
    const ref = echoSongRefFor(request());
    expect(echoSongOfRef({ ...ref, tonic: 'H' })).toBeNull();
    expect(echoSongOfRef({ ...ref, level: '4' })).toBeNull();
    expect(echoSongOfRef({ ...ref, chords: '1.0' })).toBeNull();
    expect(echoSongOfRef({ ...ref, chords: '9.0.1920' })).toBeNull();
    expect(echoSongOfRef({ ...ref, melody: 'x.0.480' })).toBeNull();
    // An empty take is a song still: the band plays the 1 chord.
    expect(echoSongOfRef({ ...ref, chords: '' })?.chart.chords).toEqual(
      Array(8).fill('1'),
    );
  });
});

describe('the band’s tracks', () => {
  it('names each by its instrument and keeps the song’s eight bars', async () => {
    const song = assembleSong(1, C_MAJOR, takes().chordTake, null);
    // Latin Band 1's Cumbia comps on a guitar of its own besides the keys.
    const built = (await buildBandPracticeTrack({
      band: 'latin-band-1',
      variation: 'l1-cumbia',
      chart: song.chart,
      charts: [],
    }))!;
    const parts = echoBandParts(built, song.length);
    expect(parts.map((p) => p.name)).toEqual([
      'Drums',
      'Bass',
      'Keys',
      'Guitar',
    ]);
    expect(parts[0].sound).toBe(`drum-machine:${built.track.drumKit}`);
    expect(parts[1].sound).toMatch(/^bass-electric/);
    expect(parts[3].sound).toBe('sample:acoustic-guitar');
    for (const part of parts) {
      expect(part.clip.durationTicks).toBe(8 * BAR_TICKS);
      expect(
        part.clip.events.every(
          (e) => e.startTick + e.durationTicks <= 8 * BAR_TICKS,
        ),
      ).toBe(true);
    }
  });
});

describe('opening it in the Studio', () => {
  it('leaves the band the student heard in the box, and the link for it', async () => {
    const song = assembleSong(1, C_MAJOR, takes().chordTake, null, {
      tempo: 96,
    });
    const heard = (await buildBandPracticeTrack({
      band: 'pop-band-1',
      variation: 'l1-singable',
      chart: song.chart,
      charts: [],
      bpm: 96,
    }))!;
    const url = await openEchoSongInStudio(request({ built: heard }));
    const ref = echoSongRefFor(request());
    expect(url).toBe(echoSongUrl(ref));
    const boxed = peekEchoSong(ref)!;
    expect(boxed.name).toBe('My Echo Song · Pop Band 1');
    // The very performance: the drums' notes are the heard track's.
    expect(boxed.band[0].clip.events).toEqual(
      echoBandParts(heard, 8 * BAR_TICKS)[0].clip.events,
    );
    // Peeked, it stays; the open takes it.
    expect(await resolveEchoSong(ref)).toBe(boxed);
    expect(takeEchoSong(ref)).toBe(boxed);
    expect(peekEchoSong(ref)).toBeNull();
  });

  it('builds the band again when the one heard plays another chart', async () => {
    const before = (await buildBandPracticeTrack({
      band: 'pop-band-1',
      variation: 'l1-singable',
      chart: assembleSong(1, C_MAJOR, null, null).chart,
      charts: [],
    }))!;
    await openEchoSongInStudio(request({ built: before }));
    const boxed = peekEchoSong(echoSongRefFor(request()))!;
    // The bass follows the student's 1 maj, 6 min, not the 1 chord alone.
    const bass = (
      parts: { name: string; clip: { events: { note: number }[] } }[],
    ) =>
      new Set(
        parts
          .find((p) => p.name === 'Bass')!
          .clip.events.map((e) => e.note % 12),
      );
    expect(bass(echoBandParts(before, 8 * BAR_TICKS)).has(9)).toBe(false);
    expect(bass(boxed.band).has(9)).toBe(true);
  });

  it('builds the song from the link alone after a refresh', async () => {
    const ref = echoSongRefFor(request());
    expect(peekEchoSong(ref)).toBeNull();
    const song = (await resolveEchoSong(ref))!;
    expect(song.tempo).toBe(96);
    expect(song.keyName).toBe('C Major');
    expect(song.melody.events.map((e) => e.startTick)).toEqual(
      [0, 1, 2, 3].flatMap((r) =>
        [0, 480, 1920].map((t) => r * 2 * BAR_TICKS + t),
      ),
    );
    expect(song.band.length).toBeGreaterThan(0);
    // A band no longer live builds nothing.
    expect(await resolveEchoSong({ ...ref, band: 'no-band' })).toBeNull();
  });

  it('seeds the Studio on the Create view: Melody, Chords and the band', async () => {
    const song = (await resolveEchoSong(echoSongRefFor(request())))!;
    resetProjectState('test');
    const melodyId = applyEchoSong(song);
    const s = useStore.getState();
    expect(s.currentView).toBe('arrange');
    expect(s.practiceSession).toBeNull();
    expect(s.projectName).toBe('My Echo Song · Pop Band 1');
    expect(s.bpm).toBe(96);
    expect(s.rootNote).toBe(0);
    expect(s.mode).toBe('ionian');
    expect(s.selectedTrackId).toBe(melodyId);
    expect(s.loopStart).toBe(0);
    expect(s.loopEnd).toBe(8 * BAR_TICKS);
    const tracks = s.tracks.map((t) => [t.name, t.instrument]);
    expect(tracks.slice(0, 2)).toEqual([
      ['Melody', 'piano-sampler'],
      ['Chords', 'electric-piano'],
    ]);
    expect(tracks.slice(2).map(([name]) => name)).toEqual(
      song.band.map((p) => p.name),
    );
    expect(tracks[2]).toEqual(['Drums', 'drum-machine']);
    expect(s.tracks.every((t) => !t.recordArmed)).toBe(true);
    expect(s.tracks[0].midiClips[0].events).toHaveLength(12);
    expect(s.tracks[1].midiClips[0].events).toHaveLength(24);
    // The chord lane: the student's chords, as they change.
    expect(
      s.chordRegions.map((r) => [r.startTick, r.name, r.noteName]),
    ).toEqual(
      [0, 1, 2, 3].flatMap((r) => [
        [r * 2 * BAR_TICKS, '1 maj', 'C'],
        [r * 2 * BAR_TICKS + BAR_TICKS, '6 min', 'Am'],
      ]),
    );
    expect(echoChordRegions(song)).toHaveLength(8);
  });
});
