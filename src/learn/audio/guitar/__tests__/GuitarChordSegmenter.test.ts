/**
 * Audio strums → chord events: onset timing, identity by a local vote over
 * raw detector frames (not the lagging smoothed vote), unclear strums,
 * a fresh strumId per re-strum, and offsets.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { AudioChordResult } from '@/daw/audio/AudioChordDetector';
import {
  ChordAnalysisStream,
  type ChordStreamFrame,
} from '@/daw/audio/ChordAnalysisStream';
import { createMockAnalyser } from '../../v2/__tests__/testUtils';
import { GuitarChordSegmenter } from '../GuitarChordSegmenter';
import type { GuitarChordEvent } from '../types';

const C = { rootPc: 0, quality: 'major', confidence: 1 };
const AM = { rootPc: 9, quality: 'minor', confidence: 1 };
const CHROMA = new Float64Array(12).fill(0.25);

let events: GuitarChordEvent[];
let seg: GuitarChordSegmenter;

beforeEach(() => {
  events = [];
  seg = new GuitarChordSegmenter((e) => events.push(e));
});

/** Frames every 50 ms over [from, to), each naming `match`. */
function frames(from: number, to: number, match: AudioChordResult | null) {
  for (let t = from; t < to; t += 50) {
    seg.pushFrame(t, match, match ? CHROMA : null);
  }
}

const brief = (e: GuitarChordEvent) =>
  `${e.phase} #${e.strumId} ${e.unclear ? 'unclear' : `${e.rootPc}:${e.quality}`}`;

describe('onsets and identity', () => {
  it('times the strum from its onset and names it from the frames after', () => {
    seg.pushOnset(1000);
    frames(1050, 1150, C); // 1050 is inside the attack and doesn't vote
    expect(events).toEqual([]);
    frames(1150, 1200, C);
    expect(events).toEqual([
      {
        phase: 'on',
        strumId: 1,
        rootPc: 0,
        quality: 'major',
        pcs: [0, 4, 7],
        confidence: 1,
        onsetPerfMs: 1000,
        source: 'audio',
        chroma: CHROMA,
      },
    ]);
  });

  it('ignores frames inside the attack', () => {
    seg.pushOnset(1000);
    seg.pushFrame(1010, AM, CHROMA);
    seg.pushFrame(1050, AM, CHROMA); // both before onset + 60 ms
    seg.pushOnset(1100);
    frames(1150, 1400, C);
    expect(events.map(brief)).toEqual(['on #1 unclear', 'on #2 0:major']);
  });

  it('merges onsets under 90 ms apart into one strum', () => {
    seg.pushOnset(1000);
    seg.pushOnset(1030);
    seg.pushOnset(1080);
    frames(1100, 1700, C);
    expect(events.map(brief)).toEqual(['on #1 0:major']);
    expect(events[0].onsetPerfMs).toBe(1000);
  });

  it('revises the strum while its window is open', () => {
    seg.pushOnset(1000);
    frames(1100, 1200, C);
    frames(1200, 1600, AM);
    expect(events.map(brief)).toEqual(['on #1 0:major', 'change #1 9:minor']);
    expect(events[1].onsetPerfMs).toBe(1000);
  });

  it('stops listening for identity 600 ms after the onset', () => {
    seg.pushOnset(1000);
    frames(1100, 1600, C);
    frames(1600, 2500, AM); // the chord changed without an attack
    expect(events.map(brief)).toEqual(['on #1 0:major']);
  });

  it('gives each re-strum of the same chord its own strumId', () => {
    for (const onset of [1000, 1500, 2000]) {
      seg.pushOnset(onset);
      frames(onset + 50, onset + 500, C);
    }
    expect(events.map(brief)).toEqual([
      'on #1 0:major',
      'on #2 0:major',
      'on #3 0:major',
    ]);
    expect(events.map((e) => e.onsetPerfMs)).toEqual([1000, 1500, 2000]);
  });

  it('weights later frames: the old chord still in the window loses', () => {
    seg.pushOnset(1000);
    frames(1100, 1200, C); // the previous chord's tail, early in the window
    frames(1200, 1300, AM);
    seg.pushOnset(1300); // the next strum closes the window
    expect(events.map(brief)).toEqual(['on #1 0:major', 'change #1 9:minor']);
  });
});

describe('unclear strums', () => {
  it('sends an attack without a confident chord as unclear', () => {
    seg.pushOnset(1000);
    frames(1050, 1600, null);
    seg.pushFrame(1600, null, null);
    expect(events).toEqual([
      expect.objectContaining({
        phase: 'on',
        strumId: 1,
        unclear: true,
        onsetPerfMs: 1000,
        source: 'audio',
      }),
    ]);
  });

  it('keeps the best guess and the chroma on an unclear strum', () => {
    seg.pushOnset(1000);
    seg.pushFrame(1100, C, CHROMA); // one frame is not enough
    frames(1150, 1300, null);
    seg.pushOnset(1300);
    expect(events[0]).toMatchObject({
      unclear: true,
      rootPc: 0,
      quality: 'major',
      chroma: CHROMA,
    });
    expect(events[0].confidence).toBeLessThan(0.5);
  });

  it('drops a tentative (metronome-click) onset that names no chord', () => {
    seg.pushOnset(1000, true);
    frames(1050, 1700, null);
    seg.pushOnset(2000, true);
    frames(2050, 2400, C);
    expect(events.map(brief)).toEqual(['on #1 0:major']);
    expect(events[0].onsetPerfMs).toBe(2000);
  });

  it('a real onset with a click merges into a counted strum', () => {
    seg.pushOnset(1000, true);
    seg.pushOnset(1020);
    frames(1050, 1700, null);
    expect(events.map(brief)).toEqual(['on #1 unclear']);
  });
});

describe('offsets', () => {
  it('ends the strum where the gate closed', () => {
    seg.pushOnset(1000);
    frames(1100, 1500, C);
    seg.gateClosed(1480);
    expect(events.map(brief)).toEqual(['on #1 0:major', 'off #1 0:major']);
    expect(events[1]).toMatchObject({ onsetPerfMs: 1000, offsetPerfMs: 1480 });
  });

  it('ends a named chord after three chordless frames, less the analyser lag', () => {
    seg.pushOnset(1000);
    frames(1100, 1800, C);
    frames(1800, 1900, null);
    expect(events).toHaveLength(1);
    seg.pushFrame(1900, null, null);
    expect(events[1]).toMatchObject({ phase: 'off', offsetPerfMs: 1650 });
    frames(1950, 2300, C); // no attack: still over
    expect(events).toHaveLength(2);
  });

  it('closes an unclear strum when the gate closes', () => {
    seg.pushOnset(1000);
    frames(1050, 1400, null);
    seg.gateClosed(1400);
    expect(events.map(brief)).toEqual(['on #1 unclear', 'off #1 unclear']);
  });

  it('close() ends a sounding strum and drops one not yet named', () => {
    seg.pushOnset(1000);
    frames(1100, 1300, C);
    seg.close(1300);
    expect(events.map(brief)).toEqual(['on #1 0:major', 'off #1 0:major']);

    seg.pushOnset(2000);
    seg.pushFrame(2100, C, CHROMA);
    seg.close(2120);
    frames(2150, 2700, C);
    expect(events).toHaveLength(2);
  });

  it('close() still sends a strum whose window is over', () => {
    // The take's last strum: its window ended, but no frame came to close it.
    seg.pushOnset(1000);
    frames(1050, 1600, null);
    seg.close(1620);
    expect(events.map(brief)).toEqual(['on #1 unclear', 'off #1 unclear']);
    expect(events[1].offsetPerfMs).toBe(1620);
  });
});

// ── Eighth-note changes through Studio's detector ─────────────────────────

const SR = 48000;
const FFT = 16384;
const BIN_HZ = SR / FFT;
const OPEN_C = [48, 52, 55, 60, 64];
const OPEN_AM = [45, 52, 57, 60, 64];
const BARRE_F = [41, 48, 53, 57, 60, 65];
const OPEN_G = [43, 47, 50, 55, 59, 67];

function spectrum(midis: number[]): Float32Array {
  const data = new Float32Array(FFT / 2).fill(-100);
  for (const midi of midis) {
    const hz = 440 * Math.pow(2, (midi - 69) / 12);
    data[Math.round(hz / BIN_HZ)] = -20;
    data[Math.round((2 * hz) / BIN_HZ)] = -35;
  }
  return data;
}

describe('eighth-note changes (critique H1)', () => {
  it('names every strum while the smoothed vote still names the chord before', () => {
    // C Am F G at 100 BPM eighths (300 ms). The new chord only dominates
    // the analyser's 341 ms window ~200 ms after its strum, and the
    // detector's vote needs several frames more: past the next strum.
    const onsets = [1000, 1300, 1600, 1900];
    const voicings = [OPEN_C, OPEN_AM, BARRE_F, OPEN_G];
    const analyser = createMockAnalyser({
      sampleRate: SR,
      fftSize: FFT,
      timeDomainData: new Float32Array(FFT).fill(0.1),
    });
    const voted = new Map<number, AudioChordResult | null>();
    const stream = new ChordAnalysisStream(
      analyser as unknown as AnalyserNode,
      (f: ChordStreamFrame) => {
        voted.set(f.perfMs, f.result);
        seg.pushFrame(f.perfMs, f.frameMatch, f.chroma);
      },
    );
    stream.setKeyContext(0, [0, 2, 4, 5, 7, 9, 11]);

    for (let t = 1000; t < 2200; t += 50) {
      const heard = onsets.filter((o) => o <= t - 200).length;
      analyser.setFrequencyData(spectrum(voicings[Math.max(0, heard - 1)]));
      if (onsets.includes(t)) seg.pushOnset(t);
      stream.step(t);
    }
    seg.gateClosed(2200);

    const named = new Map<number, string>();
    for (const e of events) {
      if (e.phase !== 'off') named.set(e.strumId, `${e.rootPc}:${e.quality}`);
    }
    expect([...named.values()]).toEqual([
      '0:major',
      '9:minor',
      '5:major',
      '7:major',
    ]);
    expect(
      events.filter((e) => e.phase === 'on').map((e) => e.onsetPerfMs),
    ).toEqual(onsets);

    // Studio's smoothed vote at the end of each window: still the old chord.
    const tail = (ms: number) => {
      const r = voted.get(ms);
      return r ? `${r.rootPc}:${r.quality}` : null;
    };
    expect(tail(1550)).toBe('0:major');
    expect(tail(1850)).toBe('9:minor');
    expect(tail(2150)).toBe('5:major');
  });
});
