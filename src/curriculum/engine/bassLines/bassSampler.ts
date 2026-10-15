/**
 * The bass lines' sound: ICP Studio's two CC0 libraries in
 * public/samples/bass/ (see CREDITS.md there), so a line sounds here as it
 * does in ICP Studio.
 *
 * Samples are decoded once per instrument and kept; each player builds its
 * own Tone.Sampler from the decoded buffers. They're fetched and decoded by
 * hand rather than handed to Tone as URLs, because Tone's loader fails quietly
 * under the Vite dev server, and one missing file should say so rather than
 * leave a silent bass.
 */

import * as Tone from 'tone';
import { INSTRUMENTS, type BassInstrument } from './bassLine';

/**
 * The sampled notes for each instrument, by file name in scientific pitch
 * ('Cs2' is C#2). Gaps are a minor third at most, which Sampler pitch-shifts
 * across without the shift being audible.
 */
const SAMPLE_NOTES: Record<BassInstrument, string> = {
  upright: 'Ds1 Fs1 A1 C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4',
  electric:
    'B0 C1 Cs1 D1 Ds1 E1 F1 Fs1 G1 Gs1 A1 As1 B1 C2 Cs2 D2 Ds2 E2 F2 Fs2 G2 Gs2 A2 As2 B2 C3 Cs3 D3 Ds3 E3 F3 Fs3 G3 Gs3 A3 As3 B3 C4 Cs4 D4',
};

const bufferCache: Partial<
  Record<BassInstrument, Promise<Record<string, Tone.ToneAudioBuffer>>>
> = {};

export function loadBassBuffers(
  kind: BassInstrument,
): Promise<Record<string, Tone.ToneAudioBuffer>> {
  const files = (SAMPLE_NOTES[kind] ?? SAMPLE_NOTES.upright).split(' ');
  const cached = bufferCache[kind];
  if (cached) return cached;
  const load = (async () => {
    const ctx = Tone.getContext().rawContext as AudioContext;
    const out: Record<string, Tone.ToneAudioBuffer> = {};
    const failed: string[] = [];
    await Promise.all(
      files.map(async (file) => {
        try {
          const res = await fetch(`/samples/bass/${kind}/${file}.mp3`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          out[file.replace('s', '#')] = new Tone.ToneAudioBuffer(
            await ctx.decodeAudioData(await res.arrayBuffer()),
          );
        } catch {
          failed.push(file);
        }
      }),
    );
    if (failed.length)
      console.warn(`[bass] ${kind}: could not load`, failed.join(', '));
    if (!Object.keys(out).length) {
      // Let a later attempt try again rather than caching the failure forever.
      delete bufferCache[kind];
      throw new Error(`No ${kind} bass samples could be loaded.`);
    }
    return out;
  })();
  bufferCache[kind] = load;
  return load;
}

export async function createBassSampler(
  kind: BassInstrument,
  destination: Tone.InputNode,
): Promise<Tone.Sampler> {
  const buffers = await loadBassBuffers(kind);
  const inst = INSTRUMENTS[kind] ?? INSTRUMENTS.upright;
  const sampler = new Tone.Sampler({ urls: buffers, release: inst.release });
  sampler.volume.value = inst.gainDb;
  sampler.connect(destination);
  return sampler;
}
