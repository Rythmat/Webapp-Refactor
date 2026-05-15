import { describe, it, expect } from 'vitest';
import {
  renderBass,
  applyBass,
  listBassContours,
  listBassRhythmsForGenre,
} from '../engine/bassRenderer';
import type { UnisonChordRegion, UnisonDocument } from '../types/schema';

const PPQ = 480;
const BAR = 4 * PPQ; // 1920

function region(
  id: string,
  startBar: number,
  endBar: number,
  rootPc: number,
  quality: string,
): UnisonChordRegion {
  return {
    id,
    startTick: startBar * BAR,
    endTick: endBar * BAR,
    rootPc,
    quality,
    noteName: '',
    degree: '1',
    hybridName: `1 ${quality}`,
    romanNumeral: 'I',
    color: [0, 0, 0],
    inversion: 0,
    confidence: 1,
  };
}

function emptyDoc(timeline: UnisonChordRegion[]): UnisonDocument {
  return {
    version: '1.0.0',
    metadata: {
      title: 't',
      source: 'manual',
      createdAt: '2026-01-01T00:00:00Z',
      durationTicks: timeline[timeline.length - 1]?.endTick ?? 0,
      ticksPerQuarterNote: PPQ,
    },
    tracks: [],
    analysis: {
      key: {
        rootPc: 0,
        rootName: 'C',
        mode: 'ionian',
        modeDisplay: 'major',
        confidence: 1,
        alternateKeys: [],
      },
      chordTimeline: timeline,
      progressionMatches: [],
      vibes: [],
      styles: [],
    },
    rhythm: {
      bpm: 120,
      bpmConfidence: 1,
      timeSignatureNumerator: 4,
      timeSignatureDenominator: 4,
      subdivision: 'straight',
      swingAmount: 0,
    },
    melody: null,
    form: null,
    timbre: null,
    mix: null,
  };
}

describe('renderBass — contour + rhythm composition', () => {
  it('plays the root over a whole-note rhythm (bass_c_ped_01 + bass_r_pop_01)', () => {
    // 1-bar C major chord
    const events = renderBass(
      [region('r0', 0, 1, 0, 'major')],
      'bass_c_ped_01',
      'bass_r_pop_01',
    );
    // bass_r_pop_01 = single hit per bar; one bar → one event.
    expect(events.length).toBe(1);
    expect(events[0].pitch).toBe(36); // C2 default
    expect(events[0].startTick).toBe(0);
    expect(events[0].durationTicks).toBe(1920);
  });

  it('honours absolute P5 contour (root → fifth above)', () => {
    // bass_c_r5_04 = ['R', 'P5', 'R', 'P5']; quarter rhythm = 4 hits.
    const events = renderBass(
      [region('r0', 0, 1, 0, 'major')],
      'bass_c_r5_04',
      'bass_r_pop_03',
    );
    expect(events.length).toBe(4);
    expect(events[0].pitch).toBe(36); // C2
    expect(events[1].pitch).toBe(43); // G2 (C + 7)
    expect(events[2].pitch).toBe(36);
    expect(events[3].pitch).toBe(43);
  });

  it('honours octave contour (R → 8 == octave above)', () => {
    // bass_c_ped_02 = ['R', '8']; half-note rhythm has 2 hits.
    const events = renderBass(
      [region('r0', 0, 1, 0, 'major')],
      'bass_c_ped_02',
      'bass_r_pop_02',
    );
    expect(events.length).toBe(2);
    expect(events[0].pitch).toBe(36); // C2
    expect(events[1].pitch).toBe(48); // C3
  });

  it('uses an aeolian scale for minor chord quality (degree 3 = b3)', () => {
    // bass_c_walk_01 = ['R', '2', '3', '4']; quarter rhythm.
    // For C minor (rootPc=0, aeolian): R=0, 2=2, 3=3, 4=5.
    // MIDI from base 36: 36, 38, 39, 41.
    const events = renderBass(
      [region('r0', 0, 1, 0, 'minor')],
      'bass_c_walk_01',
      'bass_r_pop_03',
    );
    expect(events.map((e) => e.pitch)).toEqual([36, 38, 39, 41]);
  });

  it('uses a mixolydian scale for dominant chord quality (degree 7 = b7)', () => {
    // bass_c_walk_11 = ['R','2','3','4','5','6','7','8'] full ascending.
    // For C dominant7 (rootPc=0, mixolydian): scale = [0,2,4,5,7,9,10].
    // Plus '8' = +12. MIDI from base 36: 36,38,40,41,43,45,46,48.
    const events = renderBass(
      [region('r0', 0, 1, 0, 'dominant7')],
      'bass_c_walk_11',
      'bass_r_pop_04', // 8 eighth-note hits
    );
    expect(events.map((e) => e.pitch)).toEqual([
      36, 38, 40, 41, 43, 45, 46, 48,
    ]);
  });

  it('honours descending degree labels (-1, -2, -3) in major', () => {
    // bass_c_walk_07 = ['R', '-1', '-2', '-3'].
    // For C major (ionian [0,2,4,5,7,9,11]):
    //   R = 0,  -1 = scale[6]-12 = 11-12 = -1,  -2 = 9-12 = -3,  -3 = 7-12 = -5
    // MIDI from base 36: 36, 35, 33, 31.
    const events = renderBass(
      [region('r0', 0, 1, 0, 'major')],
      'bass_c_walk_07',
      'bass_r_pop_03',
    );
    expect(events.map((e) => e.pitch)).toEqual([36, 35, 33, 31]);
  });

  it('transposes correctly for non-C roots (G major root → G2)', () => {
    // R, P5 for G major: 43 (G2), 50 (D3).
    const events = renderBass(
      [region('r0', 0, 1, 7, 'major')],
      'bass_c_r5_01',
      'bass_r_pop_02',
    );
    expect(events[0].pitch).toBe(43);
    expect(events[1].pitch).toBe(50);
  });

  it('loops a short contour across more rhythm hits', () => {
    // bass_c_ped_01 = ['R', 'R'] (2 pitches).
    // 8 eighth-note hits → contour loops 4 times. All notes should be 36 (R).
    const events = renderBass(
      [region('r0', 0, 1, 0, 'major')],
      'bass_c_ped_01',
      'bass_r_pop_04',
    );
    expect(events.length).toBe(8);
    expect(events.every((e) => e.pitch === 36)).toBe(true);
  });

  it('tiles rhythm across a multi-bar chord region', () => {
    // 4-bar chord, whole-note rhythm → 4 events.
    const events = renderBass(
      [region('r0', 0, 4, 0, 'major')],
      'bass_c_ped_01',
      'bass_r_pop_01',
    );
    expect(events.length).toBe(4);
    const starts = events.map((e) => e.startTick);
    expect(starts).toEqual([0, 1920, 3840, 5760]);
  });

  it('honours custom velocity, channel, and baseMidi', () => {
    const events = renderBass(
      [region('r0', 0, 1, 0, 'major')],
      'bass_c_ped_01',
      'bass_r_pop_01',
      { velocity: 70, channel: 5, baseMidi: 48 },
    );
    expect(events[0].velocity).toBe(70);
    expect(events[0].channel).toBe(5);
    expect(events[0].pitch).toBe(48); // C3 instead of C2
  });

  it('returns empty array for unknown contour or rhythm ids', () => {
    const tl = [region('r0', 0, 1, 0, 'major')];
    expect(renderBass(tl, 'bass_c_nope', 'bass_r_pop_01')).toEqual([]);
    expect(renderBass(tl, 'bass_c_ped_01', 'bass_r_nope')).toEqual([]);
  });
});

describe('applyBass', () => {
  it('adds a bass track without mutating the input document', () => {
    const doc = emptyDoc([region('r0', 0, 1, 0, 'major')]);
    const beforeCount = doc.tracks.length;

    const out = applyBass(doc, 'bass_c_ped_01', 'bass_r_pop_03');
    expect(out.tracks.length).toBe(beforeCount + 1);
    expect(doc.tracks.length).toBe(beforeCount);

    const added = out.tracks[out.tracks.length - 1];
    expect(added.role).toBe('bass');
    expect(added.id).toBe('unison-bass-bass_c_ped_01-bass_r_pop_03');
    expect(added.events.length).toBe(4);
  });
});

describe('lookup helpers', () => {
  it('listBassContours returns the full library', () => {
    const all = listBassContours();
    expect(all.length).toBeGreaterThan(100);
    expect(all[0]).toHaveProperty('contour');
  });

  it('listBassRhythmsForGenre matches the Pop section', () => {
    const pop = listBassRhythmsForGenre('pop');
    expect(pop.length).toBeGreaterThan(0);
    expect(pop.some((p) => p.id === 'bass_r_pop_01')).toBe(true);
  });

  it('listBassRhythmsForGenre is case-insensitive and returns [] for unknowns', () => {
    expect(listBassRhythmsForGenre('POP').length).toBe(
      listBassRhythmsForGenre('pop').length,
    );
    expect(listBassRhythmsForGenre('klingon')).toEqual([]);
  });
});
