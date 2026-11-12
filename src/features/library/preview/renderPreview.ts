import { computePeaks } from '@/daw/audio/AudioBufferStore';
import { encodeAudioBuffer } from '@/daw/audio/encodeAudio';
import { renderProject } from '@/daw/audio/renderProject';
import { isOpusEncodingSupported } from '@/lib/studio-assets/encode-opus';
import { sourceKey, type PlayItem } from '../libraryTypes';
import { draftVersion, loadPreviewProject } from './loadPreviewProject';
import {
  getPreview,
  previewKey,
  putPreview,
  type CachedPreview,
} from './previewCache';

// ── Hearing a session without the Studio ───────────────────────────────────
// The kept render when there is one for this version; otherwise the session
// is read (loadPreviewProject), its mix rendered offline by the Studio's
// own renderProject, encoded on this device and kept (previewCache). Renders take Tone's global context
// for a moment, so they run one at a time.

/** Waveform resolution, enough for a 1200px-wide scrubber. */
const PEAK_COUNT = 600;

export interface PreparedPreview {
  blob: Blob;
  peaks: number[];
  duration: number;
  /** The version it is of (an item queued without one learns it here). */
  version: string;
}

export interface PrepareOptions {
  token: string | null;
  userKey: string;
  signal?: AbortSignal;
  /** 0..1 while rendering; not called for a kept render. */
  onProgress?: (fraction: number) => void;
}

let chain: Promise<unknown> = Promise.resolve();

/** Run `job` after every render queued before it. */
function serially<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job);
  chain = run.catch(() => {});
  return run;
}

function abortError(): DOMException {
  return new DOMException('Stopped', 'AbortError');
}

/** The format a render is kept in: Opus where this browser makes and plays
 *  it (a tenth of the size), else WAV. */
function keptFormat(): { format: 'opus' | 'wav'; mime: string } {
  const audio =
    typeof document === 'undefined' ? null : document.createElement('audio');
  const opus =
    isOpusEncodingSupported() &&
    Boolean(audio?.canPlayType('audio/webm;codecs=opus'));
  return opus
    ? { format: 'opus', mime: 'audio/webm;codecs=opus' }
    : { format: 'wav', mime: 'audio/wav' };
}

function fromCache(hit: CachedPreview, version: string): PreparedPreview {
  return {
    blob: hit.blob,
    peaks: hit.peaks,
    duration: hit.duration,
    version,
  };
}

/** The item's audio: kept, or rendered now and kept. */
export async function preparePreview(
  item: PlayItem,
  opts: PrepareOptions,
): Promise<PreparedPreview> {
  const { token, userKey, signal, onProgress } = opts;
  const key = sourceKey(item.source);

  // A version known without reading the project: try the cache first.
  const known =
    item.source.kind === 'draft'
      ? await draftVersion(item.source.draftId)
      : (item.version ?? null);
  if (known) {
    const hit = await getPreview(previewKey(userKey, key, known));
    if (hit) return fromCache(hit, known);
  }
  if (signal?.aborted) throw abortError();

  return serially(async () => {
    if (signal?.aborted) throw abortError();
    const loaded = await loadPreviewProject(item.source, token, signal);
    const cacheKey = previewKey(userKey, key, loaded.version);
    // The list was older than the project: this version may be kept.
    if (loaded.version !== known) {
      const hit = await getPreview(cacheKey);
      if (hit) return fromCache(hit, loaded.version);
    }
    if (signal?.aborted) throw abortError();

    const buffer = await renderProject({
      state: loaded.project,
      synthStates: loaded.synthStates,
      signal,
      onProgress: onProgress && ((f) => onProgress(f * 0.9)),
    });
    const { format, mime } = keptFormat();
    const bytes = await encodeAudioBuffer(buffer, format, 16, signal);
    onProgress?.(1);
    const blob = new Blob([bytes], { type: mime });
    const peaks = computePeaks(buffer, PEAK_COUNT);
    await putPreview({
      key: cacheKey,
      userKey,
      blob,
      peaks,
      duration: buffer.duration,
    });
    return { blob, peaks, duration: buffer.duration, version: loaded.version };
  });
}

/**
 * The item as a WAV to download: rendered fresh at full quality (the kept
 * copy is Opus), named after the session.
 */
export async function renderDownload(
  item: PlayItem,
  opts: Omit<PrepareOptions, 'userKey'>,
): Promise<{ blob: Blob; filename: string }> {
  return serially(async () => {
    const loaded = await loadPreviewProject(
      item.source,
      opts.token,
      opts.signal,
    );
    const buffer = await renderProject({
      state: loaded.project,
      synthStates: loaded.synthStates,
      signal: opts.signal,
      onProgress: opts.onProgress && ((f) => opts.onProgress?.(f * 0.9)),
    });
    const bytes = await encodeAudioBuffer(buffer, 'wav', 16, opts.signal);
    opts.onProgress?.(1);
    const slug = (text: string) =>
      text
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'song';
    return {
      blob: new Blob([bytes], { type: 'audio/wav' }),
      filename: `${slug(loaded.name)}.wav`,
    };
  });
}
