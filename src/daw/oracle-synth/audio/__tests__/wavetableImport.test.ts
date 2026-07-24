import { describe, it, expect } from 'vitest';
import {
  frameToPartials,
  parseWavetableWav,
  FRAME_SIZE,
} from '../wavetableImport';

function sineFrame(harmonic: number, phase = 0): Float32Array {
  const frame = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) {
    frame[i] = Math.sin((2 * Math.PI * harmonic * i) / FRAME_SIZE + phase);
  }
  return frame;
}

describe('frameToPartials', () => {
  it('pure fundamental sine → imag[1] ≈ 1, everything else ≈ 0', () => {
    const { real, imag } = frameToPartials(sineFrame(1));
    expect(imag[1]).toBeCloseTo(1, 4);
    expect(Math.abs(real[1])).toBeLessThan(1e-4);
    for (let k = 2; k < Math.min(real.length, 32); k++) {
      expect(Math.hypot(real[k], imag[k])).toBeLessThan(1e-4);
    }
  });

  it('3rd harmonic lands in bin 3', () => {
    const { imag } = frameToPartials(sineFrame(3));
    expect(imag[3]).toBeCloseTo(1, 4);
  });

  it('cosine phase lands in real[] — phase is preserved', () => {
    const { real, imag } = frameToPartials(sineFrame(1, Math.PI / 2));
    expect(real[1]).toBeCloseTo(1, 4);
    expect(Math.abs(imag[1])).toBeLessThan(1e-4);
  });

  it('trims trailing silent harmonics', () => {
    const { real } = frameToPartials(sineFrame(2));
    expect(real.length).toBeLessThan(64);
  });
});

describe('parseWavetableWav', () => {
  function buildWav(frames: number, bits: 16 | 32): ArrayBuffer {
    const bytesPer = bits / 8;
    const dataSize = frames * FRAME_SIZE * bytesPer;
    const buf = new ArrayBuffer(44 + dataSize);
    const v = new DataView(buf);
    const w = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
    };
    w(0, 'RIFF');
    v.setUint32(4, 36 + dataSize, true);
    w(8, 'WAVE');
    w(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, bits === 32 ? 3 : 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true);
    v.setUint32(28, 44100 * bytesPer, true);
    v.setUint16(32, bytesPer, true);
    v.setUint16(34, bits, true);
    w(36, 'data');
    v.setUint32(40, dataSize, true);
    for (let f = 0; f < frames; f++) {
      for (let i = 0; i < FRAME_SIZE; i++) {
        const sample = Math.sin((2 * Math.PI * i) / FRAME_SIZE) * 0.5;
        const off = 44 + (f * FRAME_SIZE + i) * bytesPer;
        if (bits === 32) v.setFloat32(off, sample, true);
        else v.setInt16(off, Math.round(sample * 32767), true);
      }
    }
    return buf;
  }

  it('parses float32 frames', () => {
    const frames = parseWavetableWav(buildWav(3, 32));
    expect(frames.length).toBe(3);
    expect(frames[0].length).toBe(FRAME_SIZE);
    expect(frames[0][FRAME_SIZE / 4]).toBeCloseTo(0.5, 4);
  });

  it('parses 16-bit PCM frames', () => {
    const frames = parseWavetableWav(buildWav(2, 16));
    expect(frames.length).toBe(2);
    expect(frames[1][FRAME_SIZE / 4]).toBeCloseTo(0.5, 3);
  });

  it('rejects non-RIFF data', () => {
    expect(() => parseWavetableWav(new ArrayBuffer(64))).toThrow();
  });
});
