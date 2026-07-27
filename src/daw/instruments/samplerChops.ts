// ── Chops sampler data model ────────────────────────────────────────────
// Pure data + helpers for the "Chops" sampler instrument — no tone.js import
// so store types, persistence, and tests can depend on it without pulling in
// the audio runtime (same split as ./drumKits).

/** Note-off behavior, mirroring Ableton Simpler's Classic vs 1-Shot modes. */
export type SamplerPlaybackMode = 'classic' | 'one-shot';

/** A track's loaded one-shot sample, persisted in the track settings blob. */
export interface SamplerSampleRef {
  /**
   * Stable identity of this loaded sample, minted once per load/replace and
   * NEVER changed by metadata updates (assetId stamping, envelope/root
   * tweaks). Keys the decoded buffer in the AudioBufferStore and drives the
   * engine's rebuild decision — so replacing one un-uploaded local file with
   * another is always visible, locally and to collab peers.
   */
  sampleId: string;
  /** GCS asset id once uploaded; null while pending (or for bundled samples). */
  assetId: string | null;
  /**
   * Public URL for bundled samples (e.g. the demo chop). Rehydrated by plain
   * fetch with no auth; samples with a sourceUrl are never uploaded.
   */
  sourceUrl?: string;
  /** Root pitch of the sample as a note name, e.g. 'C4'. */
  rootNote: string;
  /** Amp envelope attack, seconds. */
  attack: number;
  /** Amp envelope release, seconds. */
  release: number;
  /** Display name (original filename or preset label). */
  name?: string;
  /** Sample length in seconds (display + upload metadata). */
  durationSeconds?: number;
  /** 'classic' = gated (note-off releases); 'one-shot' = always plays out. */
  mode?: SamplerPlaybackMode;
  /** Sample gain, linear 0–2 (default 1). */
  gain?: number;
  /** Trim start, % of the full sample (0–100, default 0). */
  startPct?: number;
  /** Trim length, % of the full sample from startPct (0–100, default 100). */
  lengthPct?: number;
  /** Instrument low-pass filter (pre-FX-rack, Simpler-style bottom strip). */
  filterOn?: boolean;
  /** Filter cutoff in Hz (default 22000 = open). */
  filterHz?: number;
  /** Filter resonance 0–100 % (default 0). */
  filterRes?: number;
}

/** Bundled demo one-shot so the lesson works offline and deterministically. */
export const DEMO_CHOP_SAMPLE: Omit<SamplerSampleRef, 'assetId' | 'sampleId'> =
  {
    sourceUrl: '/daw-assets/samples/chops/demo-vox-c4.wav',
    rootNote: 'C4',
    attack: 0.005,
    release: 0.25,
    name: 'Demo Vox (C4)',
  };

export const DEFAULT_SAMPLER_ATTACK = 0.005;
export const DEFAULT_SAMPLER_RELEASE = 0.25;
export const DEFAULT_SAMPLER_MODE: SamplerPlaybackMode = 'classic';
export const DEFAULT_SAMPLER_GAIN = 1;
export const DEFAULT_SAMPLER_FILTER_HZ = 22000;

/**
 * The trimmed sample window in absolute frames. Start/Length are both % of the
 * FULL sample (Simpler semantics); the window is clamped to at least 1 frame
 * and never runs past the buffer end.
 */
export function samplerTrimRange(
  totalFrames: number,
  startPct = 0,
  lengthPct = 100,
): { startFrame: number; endFrame: number } {
  const clampPct = (v: number) => Math.min(100, Math.max(0, v));
  const startFrame = Math.min(
    totalFrames - 1,
    Math.round((clampPct(startPct) / 100) * totalFrames),
  );
  const endFrame = Math.min(
    totalFrames,
    Math.max(
      startFrame + 1,
      startFrame + Math.round((clampPct(lengthPct) / 100) * totalFrames),
    ),
  );
  return { startFrame, endFrame };
}

/** Map the 0–100 % Res control onto a usable biquad Q range (0.0001–14). */
export function samplerResToQ(resPct: number): number {
  const t = Math.min(100, Math.max(0, resPct)) / 100;
  return 0.0001 + t * t * 14;
}

/** Mint the identity for a freshly loaded/replaced sample. */
export function mintSamplerSampleId(): string {
  return `smp-${crypto.randomUUID()}`;
}

/**
 * Backfill a sampleId for records written before the field existed.
 * Deterministic (derived from the content reference, not random) so repeated
 * deserialization — especially of remote Yjs updates — never churns identity.
 */
export function ensureSamplerSampleId(
  sample: Omit<SamplerSampleRef, 'sampleId'> & { sampleId?: string },
): SamplerSampleRef {
  if (sample.sampleId) return sample as SamplerSampleRef;
  return {
    ...sample,
    sampleId: `legacy-${sample.assetId ?? sample.sourceUrl ?? 'none'}`,
  };
}

/** AudioBufferStore key for a loaded sample (clips own plain ids). */
export function samplerBufferKey(sampleId: string): string {
  return `sampler:${sampleId}`;
}

/**
 * Identity of the audio content + mapping an engine has applied. When this
 * changes (new/replaced sample, new root note, new trim window) the
 * Tone.Sampler must be rebuilt with a re-sliced buffer; metadata-only updates
 * (assetId stamp, envelope, mode, gain, filter) leave it stable.
 */
export function samplerSampleSignature(sample: SamplerSampleRef): string {
  return `${sample.sampleId}|${sample.rootNote}|${sample.startPct ?? 0}|${sample.lengthPct ?? 100}`;
}

/** Note names Tone.Sampler accepts as a urls key, e.g. 'C4', 'F#3', 'Bb2'. */
export function isValidRootNote(note: string): boolean {
  return /^[A-G](#|b)?[0-8]$/.test(note);
}

// ── File validation ─────────────────────────────────────────────────────

export const SAMPLER_ACCEPTED_EXTENSIONS = [
  '.wav',
  '.mp3',
  '.ogg',
  '.oga',
  '.opus',
  '.webm',
  '.flac',
  '.m4a',
  '.aac',
] as const;

export const SAMPLER_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const SAMPLER_MAX_DURATION_SECONDS = 30;

const EXTENSION_MIME: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.webm': 'audio/webm',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

/** Best-effort content type for a picked file (browser type, else extension). */
export function samplerContentType(name: string, browserType?: string): string {
  if (browserType) return browserType;
  return EXTENSION_MIME[extensionOf(name)] ?? 'audio/wav';
}

/** Returns an error message for an unusable file, or null when acceptable. */
export function validateSamplerFile(
  name: string,
  sizeBytes: number,
): string | null {
  const ext = extensionOf(name);
  if (!(SAMPLER_ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Unsupported file type "${ext || name}" — drop a WAV, MP3, OGG, FLAC, or M4A file.`;
  }
  if (sizeBytes > SAMPLER_MAX_FILE_BYTES) {
    return `File is too large (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) — the limit is ${SAMPLER_MAX_FILE_BYTES / (1024 * 1024)} MB.`;
  }
  return null;
}

// ── Root-note options ───────────────────────────────────────────────────
// Octave-aware note names C2–B5: wide enough for real one-shots, small enough
// for a single dropdown. MIDI C4 = 60 (the app's notes.ts convention).

const PITCH_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const SAMPLER_ROOT_NOTE_OPTIONS: string[] = Array.from(
  { length: 4 },
  (_, octaveIdx) => PITCH_NAMES.map((p) => `${p}${octaveIdx + 2}`) as string[],
).flat();
