// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import { getBand, getLiveBand } from '@/curriculum/engine/band/registry';
import * as backing from '@/curriculum/engine/genreGeneration/backingPatterns';
import {
  pairingFor,
  pairingsReady,
} from '@/curriculum/engine/lessonPairings/registry';
import type { LiteracyChart } from '@/curriculum/engine/musicLiteracy/chart';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { useStore } from '@/daw/store';
import {
  bandInstruments,
  bandRefFor,
  bandStyles,
  bandStyleTempo,
  buildBandPracticeTrack,
  literacyBands,
  openBandPracticeTrack,
} from '../bandPracticeTrack';
import {
  buildGenrePracticeTrack,
  practiceTrackPlan,
} from '../buildGenrePracticeTrack';
import {
  peekPracticeTrack,
  practiceSessionFor,
  practiceTrackUrl,
  resolvePracticeTrack,
  switchGenrePracticeTrack,
  takePracticeTrack,
} from '../openGenrePracticeTrack';
import { applyGenrePracticeTrack } from '../seedStudioFromGenrePracticeTrack';

/**
 * Music Literacy Part 3, Hear It with Your Band: a live band's 4/4 styles,
 * each at its tempo, playing the student's chart in their key, and the
 * Practice view's switches within the band.
 */

const flow = async (genre: string, level: number) =>
  (await getActivityFlow(genre, level)) as ActivityFlowV2;

const dMinor: LiteracyChart = {
  tonic: 'D',
  mode: 'minor',
  harmony: 'triads',
  chords: ['1', '4', '5', '6'],
};
const dMinor7: LiteracyChart = { ...dMinor, harmony: 'sevenths' };

/** The same draws every time: the engine jitters and picks at random. */
function seeded(seed = 7) {
  let a = seed;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}
/** A track as data, its random ids left out. */
const plain = (value: unknown) =>
  JSON.parse(JSON.stringify(value, (k, v) => (k === 'id' ? undefined : v)));

beforeAll(() => pairingsReady);
afterEach(() => {
  vi.restoreAllMocks();
  takePracticeTrack('', 0, 'A');
});

describe('the styles a band offers', () => {
  it('lists the live bands with a 4/4 style, in the library’s order', async () => {
    const bands = await literacyBands();
    expect(bands.map((b) => b.band.id)).toEqual([
      'latin-band-1',
      'funk-band-1',
      'pop-band-1',
      'hip-hop-band-1',
    ]);
    // Jazz Band 1 is a draft: never offered.
    expect(getBand('jazz-band-1')?.status).toBe('draft');
    expect(bands.some((b) => b.band.id === 'jazz-band-1')).toBe(false);
  });

  it('leaves out Mariachi (3/4) and the Latin styles with no lesson yet', async () => {
    const styles = await bandStyles(getLiveBand('latin-band-1')!);
    expect(styles.map((s) => s.name)).toEqual(['Reggaeton', 'Cumbia']);
    expect(styles.map((s) => s.variation)).toEqual([
      'l1-reggaeton',
      'l1-cumbia',
    ]);
  });

  it('reads a style’s meter off its track too, not just its variation', async () => {
    // Mariachi's own meter is 3/4; a variation that says 4/4 but plays a
    // 3/4 groove would be left out by its track's meter all the same.
    const latin = getLiveBand('latin-band-1')!;
    const mariachi = latin.variations!.find((v) => v.id === 'l1-mariachi')!;
    expect(mariachi.timeSignature).toEqual([3, 4]);
    const plan = practiceTrackPlan(await flow('latin', 1), 'A', {
      styleId: 'latin-l1-mariachi',
      band: { id: latin.id, variation: mariachi.id },
    });
    expect(plan?.timeSignature).toEqual([3, 4]);
  });

  it('lists Hip Hop’s Boom Bap and Conscious, which no lesson pairing names', async () => {
    expect(pairingFor('hip-hop', 2, undefined)).toBeUndefined();
    expect(pairingFor('hip-hop', 3, undefined)).toBeUndefined();
    const styles = await bandStyles(getLiveBand('hip-hop-band-1')!);
    expect(styles.map((s) => [s.name, s.level])).toEqual([
      ['Trap', 1],
      ['Boom Bap', 2],
      ['Conscious', 3],
    ]);
  });

  it('names each style without its level, and the band’s instruments', async () => {
    const funk = getLiveBand('funk-band-1')!;
    expect((await bandStyles(funk)).map((s) => s.name)).toEqual([
      'The Pocket',
      'Syncopation & Sauce',
      'Deep Groove',
    ]);
    expect(bandInstruments(getLiveBand('latin-band-1')!)).toEqual([
      'Drums',
      'Bass',
      'Keys',
      'Guitar',
    ]);
  });
});

describe('a style’s tempo', () => {
  it('is the variation’s, else the lesson’s, else the band’s', () => {
    expect(bandStyleTempo({ tempo: 90 }, { tempo: 110 }, 96)).toBe(110);
    expect(bandStyleTempo({ tempo: 90 }, {}, 96)).toBe(96);
    expect(bandStyleTempo({ tempo: 90 }, {}, undefined)).toBe(90);
  });

  it('plays each style at a tempo of its own', async () => {
    const tempos = Object.fromEntries(
      (await literacyBands()).flatMap((b) =>
        b.styles.map((s) => [s.styleId, s.bpm]),
      ),
    );
    expect(tempos).toEqual({
      // Its own steps' tempo: not Mariachi's 126, the section's last.
      'latin-l1-reggaeton': 92,
      'latin-l1-cumbia': 96,
      // The level's tempo range, as its Practice Track picks it.
      'funk-l1-pocket': 92,
      'funk-l2-syncopation': 102,
      'funk-l3-deep-groove': 98,
      // Pop Band 1's styles each set their own.
      'pop-l1-singable': 96,
      'pop-l2-craft': 112,
      'pop-l3-artistry': 108,
      // Hip Hop L1's Practice Track names its bpm.
      'hip-hop-l1-trap': 72,
      'hip-hop-l2-boom-bap': 90,
      'hip-hop-l3-conscious': 77,
    });
    // A lesson's own Practice Track keeps its pick.
    expect(buildGenrePracticeTrack(await flow('latin', 1), 'A')?.bpm).toBe(126);
  });
});

describe('the builder’s key, band and follow-the-chords options', () => {
  it('plays the chart in its own key: tonic, mode, colors and scales', async () => {
    const track = buildGenrePracticeTrack(await flow('latin', 1), 'A', {
      styleId: 'latin-l1-cumbia',
      chords: ['Dm', 'Gm', 'Am', 'Bb'],
      key: { tonicPc: 2, mode: 'aeolian', label: 'D' },
    })!;
    expect(track.keyLabel).toBe('D');
    expect(track.keyRootPc).toBe(2);
    expect(track.mode).toBe('aeolian');
    expect(track.chordCycle).toEqual(['Dm', 'Gm', 'Am', 'Bb']);
    expect(track.chordRegions.slice(0, 4).map((r) => r.name)).toEqual([
      '1 min',
      '4 min',
      '5 min',
      '♭6 maj',
    ]);
    // The flow is in E: D sits in the same octave, below middle C's D.
    expect(track.chordRegions[0].midis).toEqual([50, 53, 57]);
    expect(track.scales.map((s) => [s.id, s.title, s.names.join(' ')])).toEqual(
      [
        ['minor', 'Minor', 'D E F G A B♭ C'],
        ['minor_pentatonic', 'Minor Pentatonic', 'D F G A C'],
      ],
    );
    expect(track.scales.every((s) => s.tonicPc === 2)).toBe(true);
    const major = buildGenrePracticeTrack(await flow('funk', 1), 'A', {
      key: { tonicPc: 10, mode: 'ionian' },
    })!;
    expect(major.keyLabel).toBe('Bb');
    expect(major.scales.map((s) => s.names.join(' '))).toEqual([
      'B♭ C D E♭ F G A',
      'B♭ C D F G',
    ]);
  });

  it('plays the band picked, whatever the pairing says', async () => {
    const spy = vi.spyOn(backing, 'buildBackingNotes');
    const funk1 = await flow('funk', 1);
    // Funk L1 pairs with Funk Band 1's Pocket; Hip Hop Band 1's Trap plays.
    const track = buildGenrePracticeTrack(funk1, 'A', {
      band: { id: 'hip-hop-band-1', variation: 'l1-trap' },
    })!;
    const options = spy.mock.calls[0][9];
    expect(options?.band?.id).toBe('hip-hop-band-1');
    expect(options?.band?.variation?.id).toBe('l1-trap');
    expect(options?.followChords).toBeUndefined();
    // Its own-sound layers come with it: Trap's 808 bass.
    expect(track.layerClips.map((l) => l.name)).toEqual(['Bass']);
    expect(track.drumKit).toBe('808');
    // A band that isn't live builds nothing.
    expect(
      buildGenrePracticeTrack(funk1, 'A', {
        band: { id: 'jazz-band-1', variation: 'any' },
      }),
    ).toBeNull();
    expect(
      buildGenrePracticeTrack(funk1, 'A', {
        band: { id: 'funk-band-1', variation: 'no-such-style' },
      }),
    ).toBeNull();
  });

  it('asks the band’s parts to follow the chart’s chords in its key', async () => {
    const spy = vi.spyOn(backing, 'buildBackingNotes');
    buildGenrePracticeTrack(await flow('pop', 1), 'A', {
      chords: ['Dm', 'Gm', 'Am', 'Bb'],
      key: { tonicPc: 2, mode: 'aeolian' },
      band: { id: 'pop-band-1', variation: 'l1-singable' },
      followChords: true,
    });
    expect(spy.mock.calls[0][9]?.followChords).toEqual({
      tonic: 2,
      mode: 'aeolian',
    });
    // Without a key of its own there is no chart key to follow.
    spy.mockClear();
    buildGenrePracticeTrack(await flow('pop', 1), 'A', { followChords: true });
    expect(spy.mock.calls[0][9]?.followChords).toBeUndefined();
  });

  it('leaves every lesson’s own track as it was', async () => {
    for (const [genre, level] of [
      ['funk', 2],
      ['latin', 1],
      ['hip-hop', 1],
      ['pop', 1],
    ] as const) {
      const f = await flow(genre, level);
      for (const section of ['A', 'B', 'C', 'D'] as const) {
        seeded();
        const before = plain(buildGenrePracticeTrack(f, section));
        vi.restoreAllMocks();
        seeded();
        const after = plain(
          buildGenrePracticeTrack(f, section, {
            key: undefined,
            band: undefined,
            followChords: undefined,
          }),
        );
        vi.restoreAllMocks();
        expect(after).toEqual(before);
        expect(before?.keyLabel).not.toBeUndefined();
      }
    }
  });

  it('passes nothing new to the backing unless asked', async () => {
    const spy = vi.spyOn(backing, 'buildBackingNotes');
    buildGenrePracticeTrack(await flow('latin', 1), 'A', {
      styleId: 'latin-l1-cumbia',
    });
    expect(spy.mock.calls[0][9]).toEqual({});
  });

  it('plays a pairing’s own band the same whether passed or paired', async () => {
    const f = await flow('funk', 2);
    const step = f.sections
      .flatMap((s) => s.steps)
      .find((s) => s.backing_parts?.engine_generates?.length)!;
    const band = pairingFor('funk', 2, step.styleRef, {
      section: step.section,
      stepNumber: step.stepNumber,
    })!.band;
    const build = (options?: backing.BackingOptions) => {
      seeded();
      const notes = backing.buildBackingNotes(
        step,
        57,
        2,
        step.styleRef,
        [],
        'funk',
        960,
        55,
        [4, 4],
        options,
      );
      vi.restoreAllMocks();
      return notes;
    };
    const paired = build();
    const none = build({});
    const passed = build({ band });
    expect(none).toEqual(paired);
    expect(passed).toEqual(paired);
  });
});

describe('a band’s track over the student’s chart', () => {
  it('plays Latin Band 1’s Cumbia over D minor’s 1 4 5 6', async () => {
    const built = (await buildBandPracticeTrack({
      band: 'latin-band-1',
      variation: 'l1-cumbia',
      chart: dMinor,
      charts: [],
    }))!;
    const { track, literacy } = built;
    expect(track.bpm).toBe(96);
    expect(track.timeSignature).toEqual([4, 4]);
    expect(track.chordCycle).toEqual(['Dm', 'Gm', 'Am', 'Bb']);
    expect(track.section).toBe('A');
    expect(track.studentParts).toEqual(['melody']);
    expect(Object.keys(track.clips).sort()).toEqual([
      'bass',
      'chords',
      'drums',
    ]);
    expect(track.layerClips.map((l) => l.name)).toEqual(['Guitar comping']);
    // The band's styles and the student's progressions, on the switches.
    expect(track.styles).toEqual([
      { id: 'latin-l1-reggaeton', name: 'Reggaeton' },
      { id: 'latin-l1-cumbia', name: 'Cumbia' },
    ]);
    expect(track.styleId).toBe('latin-l1-cumbia');
    expect(track.progressions).toEqual([
      {
        id: 'D.minor.triads.1-4-5-6',
        label: '1 min – 4 min – 5 min – ♭6 maj',
        chords: ['Dm', 'Gm', 'Am', 'Bb'],
      },
    ]);
    expect(literacy).toMatchObject({
      band: 'latin-band-1',
      bandName: 'Latin Band 1',
      variation: 'l1-cumbia',
      styleName: 'Cumbia',
      keyName: 'D Minor',
    });
    expect(built.projectName).toBe('Practice with a Band · Latin Band 1');
    expect(built.genreLabel).toBe('Latin');
  });

  it('builds nothing for a style the band doesn’t offer', async () => {
    const request = { chart: dMinor, charts: [] };
    expect(
      await buildBandPracticeTrack({
        ...request,
        band: 'latin-band-1',
        variation: 'l1-mariachi',
      }),
    ).toBeNull();
    expect(
      await buildBandPracticeTrack({
        ...request,
        band: 'jazz-band-1',
        variation: 'anything',
      }),
    ).toBeNull();
  });

  it('leaves it in the box under its chart, and its link builds it again', async () => {
    const url = (await openBandPracticeTrack({
      band: 'latin-band-1',
      variation: 'l1-cumbia',
      chart: dMinor,
      charts: [],
    }))!;
    const ref = bandRefFor('latin-band-1', 'l1-cumbia', dMinor);
    expect(url).toBe(practiceTrackUrl('latin', 1, 'A', ref));
    expect(url).toBe(
      '/studio/editor?practiceGenre=latin&practiceLevel=1&practiceSection=A&practiceBand=latin-band-1&practiceVariation=l1-cumbia&practiceKey=D&practiceKeyMode=minor&practiceHarmony=triads&practiceChords=1-4-5-6',
    );
    // The box is the one asked for only with the same chart.
    expect(peekPracticeTrack('latin', 1, 'A', ref)).not.toBeNull();
    expect(peekPracticeTrack('latin', 1, 'A')).toBeNull();
    expect(
      peekPracticeTrack('latin', 1, 'A', { ...ref, harmony: 'sevenths' }),
    ).toBeNull();
    const handed = (await resolvePracticeTrack('latin', 1, 'A', {
      band: ref,
    }))!;
    expect(handed.literacy?.styleName).toBe('Cumbia');
    expect(handed.returnTo).toBe(
      '/curriculum/music-literacy/hear-it-with-your-band',
    );
    // Taken, the link alone builds it again.
    takePracticeTrack('latin', 1, 'A', ref);
    const rebuilt = (await resolvePracticeTrack('latin', 1, 'A', {
      band: { ...ref, harmony: 'sevenths' },
    }))!;
    expect(rebuilt.track.chordCycle).toEqual(['Dm7', 'Gm7', 'Am7', 'Bbmaj7']);
    expect(rebuilt.projectName).toBe('Practice with a Band · Latin Band 1');
    // A chart the link can't read plays the starter.
    const starter = (await resolvePracticeTrack('latin', 1, 'A', {
      band: { ...ref, chords: '1-x' },
    }))!;
    expect(starter.track.chordCycle).toEqual(['C', 'Am', 'F', 'G']);
    // A style the band doesn't offer is nothing to open.
    expect(
      await resolvePracticeTrack('latin', 1, 'A', {
        band: { ...ref, variation: 'l1-mariachi' },
      }),
    ).toBeNull();
  });
});

describe('the Practice view’s switches on a band’s track', () => {
  const open = async () => {
    const built = (await buildBandPracticeTrack({
      band: 'funk-band-1',
      variation: 'l1-pocket',
      chart: dMinor,
      charts: [
        { id: 'D.minor.triads.1-4-5-6', chart: dMinor },
        { id: 'D.minor.sevenths.1-4-5-6', chart: dMinor7 },
      ],
    }))!;
    resetSessionToEmpty();
    resetProjectState('practice');
    const studentTrackId = applyGenrePracticeTrack(
      built.track,
      built.genreLabel,
      built.projectName,
    );
    const session = {
      ...practiceSessionFor(
        built.track,
        built.genreLabel,
        '/curriculum/music-literacy/hear-it-with-your-band',
        built.literacy,
      ),
      studentTrackId,
    };
    useStore.getState().setPracticeSession(session);
    return session;
  };

  it('opens with the band’s prompts and its styles and progressions', async () => {
    const session = await open();
    expect(useStore.getState().projectName).toBe(
      'Practice with a Band · Funk Band 1',
    );
    expect(session.prompts[0]).toBe(
      'Listen first: your band plays your progression, over and over.',
    );
    expect(session.styles?.map((s) => s.name)).toEqual([
      'The Pocket',
      'Syncopation & Sauce',
      'Deep Groove',
    ]);
    expect(session.progressions?.map((p) => p.label)).toEqual([
      '1 min – 4 min – 5 min – ♭6 maj',
      '1 min7 – 4 min7 – 5 min7 – ♭6 maj7',
    ]);
    expect(useStore.getState().bpm).toBe(92);
  });

  it('switches to a style on another level, at its tempo, keeping the band and key', async () => {
    const session = await open();
    const next = (await switchGenrePracticeTrack(
      session,
      { styleId: 'funk-l2-syncopation' },
      92,
    ))!;
    expect(next.level).toBe(2);
    expect(next.styleId).toBe('funk-l2-syncopation');
    expect(next.literacy).toMatchObject({
      band: 'funk-band-1',
      variation: 'l2-syncopation',
      styleName: 'Syncopation & Sauce',
      keyName: 'D Minor',
    });
    expect(next.chordCycle).toEqual(['Dm', 'Gm', 'Am', 'Bb']);
    expect(next.keyLabel).toBe('D');
    const state = useStore.getState();
    expect(state.bpm).toBe(102);
    expect(state.rootNote).toBe(2);
    expect(state.mode).toBe('aeolian');
    // Deep Groove has its own keyboard too (a rootless-voicings part, since
    // 2026-10-19): the band's keys play on a track of their own and the
    // lesson's chords sit out.
    await switchGenrePracticeTrack(
      next,
      { styleId: 'funk-l3-deep-groove' },
      102,
    );
    const tracks = useStore.getState().tracks;
    expect(
      tracks.find((t) => t.name === 'Keys comping (band)')?.midiClips.length,
    ).toBe(1);
    const chords = tracks.find((t) => t.name === 'Chords');
    expect(chords?.midiClips.length).toBe(0);
    expect(chords?.recordArmed).toBe(false);
    // The student's track is still the one armed.
    expect(tracks.filter((t) => t.recordArmed).map((t) => t.id)).toEqual([
      session.studentTrackId,
    ]);
  });

  it('switches to the student’s 7ths progression at the tempo playing', async () => {
    const session = await open();
    useStore.getState().setBpm(80);
    const next = (await switchGenrePracticeTrack(
      session,
      { progressionId: 'D.minor.sevenths.1-4-5-6' },
      80,
    ))!;
    expect(next.progressionId).toBe('D.minor.sevenths.1-4-5-6');
    expect(next.chordCycle).toEqual(['Dm7', 'Gm7', 'Am7', 'Bbmaj7']);
    expect(next.styleId).toBe('funk-l1-pocket');
    expect(next.literacy?.chart.harmony).toBe('sevenths');
    expect(useStore.getState().bpm).toBe(80);
    expect(
      useStore
        .getState()
        .chordRegions.slice(0, 4)
        .map((r) => r.noteName),
    ).toEqual(['Dm7', 'Gm7', 'Am7', 'B♭maj7']);
  });
});
