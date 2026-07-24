// Serum wavetable .wav handling: RIFF walk (fmt float32/int16 + `clm `
// frame-size chunk), frame extraction, uniform downsample to ≤32 frames,
// and 16-bit PCM output for the Oracle pack (with `clm ` preserved so the
// runtime knows the frame size).

import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const FRAME_SIZE = 2048;
export const MAX_PACK_FRAMES = 32;

export interface WavetableData {
  frames: Float32Array[];
  sourceFrames: number;
}

interface RiffChunk {
  id: string;
  offset: number; // data start
  size: number;
}

function walkRiff(buf: Buffer): RiffChunk[] {
  if (buf.toString('latin1', 0, 4) !== 'RIFF') throw new Error('not RIFF');
  const chunks: RiffChunk[] = [];
  let pos = 12; // RIFF + size + WAVE
  while (pos + 8 <= buf.length) {
    const id = buf.toString('latin1', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    chunks.push({ id, offset: pos + 8, size });
    pos += 8 + size + (size % 2); // chunks are word-aligned
  }
  return chunks;
}

export function parseWavetableFile(path: string): WavetableData {
  const buf = readFileSync(path);
  const chunks = walkRiff(buf);
  const fmt = chunks.find((c) => c.id === 'fmt ');
  const data = chunks.find((c) => c.id === 'data');
  if (!fmt || !data) throw new Error(`${path}: missing fmt/data chunk`);

  const format = buf.readUInt16LE(fmt.offset);
  const channels = buf.readUInt16LE(fmt.offset + 2);
  const bits = buf.readUInt16LE(fmt.offset + 14);
  if (channels !== 1)
    throw new Error(`${path}: expected mono, got ${channels}ch`);

  let samples: Float32Array;
  if (format === 3 && bits === 32) {
    // IEEE float32 (Serum's native table format)
    samples = new Float32Array(
      buf.buffer.slice(
        buf.byteOffset + data.offset,
        buf.byteOffset + data.offset + data.size,
      ),
    );
  } else if (format === 1 && bits === 16) {
    const n = data.size / 2;
    samples = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      samples[i] = buf.readInt16LE(data.offset + i * 2) / 32768;
    }
  } else {
    throw new Error(`${path}: unsupported wav format ${format}/${bits}bit`);
  }

  const frameCount = Math.floor(samples.length / FRAME_SIZE);
  if (frameCount < 1) throw new Error(`${path}: shorter than one frame`);
  const frames: Float32Array[] = [];
  for (let f = 0; f < frameCount; f++) {
    frames.push(samples.subarray(f * FRAME_SIZE, (f + 1) * FRAME_SIZE));
  }
  return { frames, sourceFrames: frameCount };
}

/** Uniformly pick ≤ max frames, always keeping first and last. */
export function downsampleFrames(
  frames: Float32Array[],
  max = MAX_PACK_FRAMES,
): Float32Array[] {
  if (frames.length <= max) return frames;
  const out: Float32Array[] = [];
  for (let i = 0; i < max; i++) {
    const src = Math.round((i / (max - 1)) * (frames.length - 1));
    out.push(frames[src]);
  }
  return out;
}

/** 16-bit PCM mono wav with Serum's `clm ` chunk (frame size marker). */
export function writePackWav(path: string, frames: Float32Array[]): void {
  const clmText = `<!>${FRAME_SIZE} 01000000 wavetable (oracle pack)`;
  const clmSize = clmText.length + (clmText.length % 2);
  const dataSize = frames.length * FRAME_SIZE * 2;
  const riffSize = 4 + 8 + 16 + 8 + clmSize + 8 + dataSize;

  const buf = Buffer.alloc(8 + riffSize);
  let pos = 0;
  buf.write('RIFF', pos);
  pos += 4;
  buf.writeUInt32LE(riffSize, pos);
  pos += 4;
  buf.write('WAVE', pos);
  pos += 4;
  // fmt
  buf.write('fmt ', pos);
  pos += 4;
  buf.writeUInt32LE(16, pos);
  pos += 4;
  buf.writeUInt16LE(1, pos);
  pos += 2; // PCM
  buf.writeUInt16LE(1, pos);
  pos += 2; // mono
  buf.writeUInt32LE(44100, pos);
  pos += 4;
  buf.writeUInt32LE(44100 * 2, pos);
  pos += 4;
  buf.writeUInt16LE(2, pos);
  pos += 2;
  buf.writeUInt16LE(16, pos);
  pos += 2;
  // clm
  buf.write('clm ', pos);
  pos += 4;
  buf.writeUInt32LE(clmSize, pos);
  pos += 4;
  buf.write(clmText, pos);
  pos += clmSize;
  // data
  buf.write('data', pos);
  pos += 4;
  buf.writeUInt32LE(dataSize, pos);
  pos += 4;
  for (const frame of frames) {
    for (let i = 0; i < FRAME_SIZE; i++) {
      const v = Math.max(-1, Math.min(1, frame[i]));
      buf.writeInt16LE(Math.round(v * 32767), pos);
      pos += 2;
    }
  }
  writeFileSync(path, buf);
}

/**
 * Resolves a preset's relativePathToWT against the two library roots:
 * "S2 Tables/…" lives under Serum 2 Presets/Tables; bare/leading-slash
 * paths under Serum Presets/Tables.
 */
export function resolveTablePath(
  relativePath: string,
  libraryRoot: string,
): string | null {
  const rel = relativePath.replace(/^\//, '');
  const candidates = [
    join(libraryRoot, 'Serum 2 Presets', 'Tables', rel),
    join(libraryRoot, 'Serum Presets', 'Tables', rel),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}
