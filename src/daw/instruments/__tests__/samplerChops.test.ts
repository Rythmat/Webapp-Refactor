import { describe, expect, it } from 'vitest';
import {
  DEMO_CHOP_SAMPLE,
  SAMPLER_MAX_FILE_BYTES,
  SAMPLER_ROOT_NOTE_OPTIONS,
  ensureSamplerSampleId,
  isValidRootNote,
  mintSamplerSampleId,
  samplerBufferKey,
  samplerContentType,
  samplerResToQ,
  samplerSampleSignature,
  samplerTrimRange,
  validateSamplerFile,
} from '../samplerChops';

describe('sampler chops helpers', () => {
  it('buffer keys are namespaced per sample identity and stable', () => {
    expect(samplerBufferKey('smp-1')).toBe('sampler:smp-1');
    expect(samplerBufferKey('smp-1')).toBe(samplerBufferKey('smp-1'));
    expect(samplerBufferKey('smp-1')).not.toBe(samplerBufferKey('smp-2'));
  });

  it('minted sample ids are unique', () => {
    expect(mintSamplerSampleId()).not.toBe(mintSamplerSampleId());
  });

  it('signature follows sample identity + root note, ignores metadata', () => {
    const base = {
      sampleId: 'smp-1',
      assetId: null,
      rootNote: 'C4',
      attack: 0,
      release: 0.2,
    };
    expect(samplerSampleSignature(base)).toBe(
      samplerSampleSignature({ ...base }),
    );
    expect(samplerSampleSignature(base)).not.toBe(
      samplerSampleSignature({ ...base, rootNote: 'D4' }),
    );
    // Two different local (un-uploaded) samples NEVER collapse — this is what
    // makes replace-before-upload visible to the engine and to collab peers.
    expect(samplerSampleSignature(base)).not.toBe(
      samplerSampleSignature({ ...base, sampleId: 'smp-2' }),
    );
    // assetId stamping and envelope/mode/gain/filter tweaks do NOT change
    // identity (no needless Tone.Sampler rebuild that would cut notes).
    expect(samplerSampleSignature(base)).toBe(
      samplerSampleSignature({ ...base, assetId: 'a1' }),
    );
    expect(samplerSampleSignature(base)).toBe(
      samplerSampleSignature({
        ...base,
        attack: 0.3,
        release: 1,
        mode: 'one-shot',
        gain: 1.5,
        filterOn: true,
        filterHz: 800,
        filterRes: 40,
      }),
    );
    // Trim changes DO change identity — the buffer must be re-sliced.
    expect(samplerSampleSignature(base)).not.toBe(
      samplerSampleSignature({ ...base, startPct: 10 }),
    );
    expect(samplerSampleSignature(base)).not.toBe(
      samplerSampleSignature({ ...base, lengthPct: 50 }),
    );
    // Explicit defaults equal omitted defaults (no spurious rebuild on the
    // first trim-row render).
    expect(samplerSampleSignature(base)).toBe(
      samplerSampleSignature({ ...base, startPct: 0, lengthPct: 100 }),
    );
  });

  it('computes clamped trim windows', () => {
    expect(samplerTrimRange(1000)).toEqual({ startFrame: 0, endFrame: 1000 });
    expect(samplerTrimRange(1000, 25, 50)).toEqual({
      startFrame: 250,
      endFrame: 750,
    });
    // Window never runs past the end…
    expect(samplerTrimRange(1000, 80, 100)).toEqual({
      startFrame: 800,
      endFrame: 1000,
    });
    // …never collapses below 1 frame…
    expect(samplerTrimRange(1000, 100, 0).endFrame).toBeGreaterThan(
      samplerTrimRange(1000, 100, 0).startFrame,
    );
    // …and out-of-range inputs clamp instead of throwing.
    expect(samplerTrimRange(1000, -50, 500)).toEqual({
      startFrame: 0,
      endFrame: 1000,
    });
  });

  it('maps Res % onto a monotonic, bounded Q', () => {
    expect(samplerResToQ(0)).toBeCloseTo(0.0001, 4);
    expect(samplerResToQ(100)).toBeCloseTo(14.0001, 3);
    expect(samplerResToQ(50)).toBeGreaterThan(samplerResToQ(25));
    expect(samplerResToQ(-10)).toBe(samplerResToQ(0));
    expect(samplerResToQ(200)).toBe(samplerResToQ(100));
  });

  it('backfills legacy records deterministically', () => {
    const legacy = {
      assetId: 'a1',
      rootNote: 'C4',
      attack: 0,
      release: 0.2,
    };
    const a = ensureSamplerSampleId(legacy);
    const b = ensureSamplerSampleId(legacy);
    expect(a.sampleId).toBe('legacy-a1');
    expect(a.sampleId).toBe(b.sampleId); // deterministic — no identity churn
    // Records that already carry an id pass through untouched
    expect(ensureSamplerSampleId(a)).toBe(a);
  });

  it('validates root notes', () => {
    for (const n of ['C4', 'F#3', 'Bb2', 'G8', 'A0']) {
      expect(isValidRootNote(n), n).toBe(true);
    }
    for (const n of ['H4', 'C', 'c4', 'C42', 'C#-1', '', 'DROP TABLE']) {
      expect(isValidRootNote(n), n).toBe(false);
    }
  });

  it('accepts common audio files and rejects others', () => {
    expect(validateSamplerFile('vox.wav', 1000)).toBeNull();
    expect(validateSamplerFile('Vox Chop.MP3', 1000)).toBeNull();
    expect(validateSamplerFile('loop.flac', 1000)).toBeNull();
    expect(validateSamplerFile('notes.txt', 1000)).toMatch(/Unsupported/);
    expect(validateSamplerFile('noextension', 1000)).toMatch(/Unsupported/);
    expect(validateSamplerFile('big.wav', SAMPLER_MAX_FILE_BYTES + 1)).toMatch(
      /too large/,
    );
  });

  it('infers content types from extension when the browser gives none', () => {
    expect(samplerContentType('a.wav')).toBe('audio/wav');
    expect(samplerContentType('a.mp3')).toBe('audio/mpeg');
    expect(samplerContentType('a.mp3', 'audio/mpeg3')).toBe('audio/mpeg3');
    expect(samplerContentType('weird.bin')).toBe('audio/wav');
  });

  it('root-note options are octave-aware, unique, and include the demo root', () => {
    expect(SAMPLER_ROOT_NOTE_OPTIONS).toHaveLength(48); // C2..B5
    expect(new Set(SAMPLER_ROOT_NOTE_OPTIONS).size).toBe(48);
    expect(SAMPLER_ROOT_NOTE_OPTIONS[0]).toBe('C2');
    expect(SAMPLER_ROOT_NOTE_OPTIONS.at(-1)).toBe('B5');
    expect(SAMPLER_ROOT_NOTE_OPTIONS).toContain(DEMO_CHOP_SAMPLE.rootNote);
  });
});
