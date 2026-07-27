import { describe, expect, it } from 'vitest';
import { audioBufferToWav } from '../encode-wav';

// A minimal AudioBuffer stand-in — the encoder only reads these four members,
// so we can exercise it without Web Audio (unavailable under jsdom).
function fakeBuffer(channels: Float32Array[], sampleRate = 44100): AudioBuffer {
  return {
    numberOfChannels: channels.length,
    sampleRate,
    length: channels[0].length,
    getChannelData: (ch: number) => channels[ch],
  } as unknown as AudioBuffer;
}

const ascii = (view: DataView, offset: number, len: number) =>
  Array.from({ length: len }, (_, i) =>
    String.fromCharCode(view.getUint8(offset + i)),
  ).join('');

/** Read a 3-byte little-endian signed int at offset. */
function readInt24(view: DataView, offset: number): number {
  const b0 = view.getUint8(offset);
  const b1 = view.getUint8(offset + 1);
  const b2 = view.getUint8(offset + 2);
  const unsigned = b0 | (b1 << 8) | (b2 << 16);
  return unsigned >= 0x800000 ? unsigned - 0x1000000 : unsigned;
}

describe('audioBufferToWav — 16-bit', () => {
  it('writes a valid RIFF/WAVE PCM header for stereo', () => {
    const buf = fakeBuffer([
      new Float32Array([0, 0.5]),
      new Float32Array([0, -0.5]),
    ]);
    const view = new DataView(audioBufferToWav(buf));
    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(ascii(view, 8, 4)).toBe('WAVE');
    expect(ascii(view, 12, 4)).toBe('fmt ');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(2); // channels
    expect(view.getUint32(24, true)).toBe(44100); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(view.getUint16(32, true)).toBe(4); // blockAlign = 2ch * 2 bytes
    expect(view.getUint32(28, true)).toBe(44100 * 4); // byteRate
    expect(ascii(view, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(2 * 4); // 2 frames * blockAlign
    // Total size = 44 header + dataSize.
    expect(view.byteLength).toBe(44 + 8);
  });

  it('maps float samples to int16 with the expected asymmetric scaling', () => {
    const buf = fakeBuffer([new Float32Array([1, -1, 0, 2, -2])]);
    const view = new DataView(audioBufferToWav(buf));
    expect(view.getInt16(44, true)).toBe(32767); // +1.0
    expect(view.getInt16(46, true)).toBe(-32768); // -1.0
    expect(view.getInt16(48, true)).toBe(0); // 0
    expect(view.getInt16(50, true)).toBe(32767); // +2 clamps to +1.0
    expect(view.getInt16(52, true)).toBe(-32768); // -2 clamps to -1.0
  });
});

describe('audioBufferToWav — 24-bit', () => {
  it('writes a 24-bit header with the right block sizing', () => {
    const buf = fakeBuffer(
      [new Float32Array([0, 0.25]), new Float32Array([0, -0.25])],
      48000,
    );
    const view = new DataView(audioBufferToWav(buf, 24));
    expect(view.getUint16(34, true)).toBe(24); // bits per sample
    expect(view.getUint16(32, true)).toBe(6); // blockAlign = 2ch * 3 bytes
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint32(28, true)).toBe(48000 * 6); // byteRate
    expect(view.getUint32(40, true)).toBe(2 * 6); // dataSize
    expect(view.byteLength).toBe(44 + 12);
  });

  it('maps float samples to little-endian int24 with clamping', () => {
    const buf = fakeBuffer([new Float32Array([1, -1, 0, 2])]);
    const view = new DataView(audioBufferToWav(buf, 24));
    expect(readInt24(view, 44)).toBe(0x7fffff); // +1.0
    expect(readInt24(view, 47)).toBe(-0x800000); // -1.0
    expect(readInt24(view, 50)).toBe(0); // 0
    expect(readInt24(view, 53)).toBe(0x7fffff); // +2 clamps
  });
});
