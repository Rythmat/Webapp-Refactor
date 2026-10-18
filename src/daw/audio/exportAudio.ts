// ── exportAudio ───────────────────────────────────────────────────────────
// File → Export Audio: render the project (loop region, or a start–end bar
// range) offline via renderProject, encode to the chosen format, and hand back
// a downloadable Blob. Encoders:
//   • WAV  — uncompressed PCM, 16- or 24-bit (audioBufferToWav).
//   • Opus — WebCodecs Opus-in-WebM, ~96 kbps (audioBufferToOpusWebm).
// Both consume the offline-rendered AudioBuffer directly (no realtime capture),
// so a bounce is deterministic and faster-than-realtime.
//
// MP3 is intentionally absent: the bundled lamejs@1.2.1 does not initialise
// under Vite (its Mp3Encoder throws "MPEGMode is not defined" — the class-per-
// file globals aren't assembled by the ESM interop, and the UMD build doesn't
// register its global either). Shipping it would be a broken button. Adding MP3
// means adopting a maintained fork (e.g. @breezystack/lamejs) — a dependency
// decision left to the product owner.
//
// ── Mastering off, one track, stems (milestone 2.15) ──────────────────────
// The mix can leave the mastering out; one track renders alone (`trackId`),
// with or without its effects (`dry`); and a stems export renders each track
// that plays in the mix alone, in turn, and zips the files (zip-store), so
// the student gets one download. Each stem keeps the song's full length, so
// the files line up when dropped into another DAW.

import { renderProject, type RenderRange } from './renderProject';
import { isTrackAudible } from './trackAudibility';
import { audioBufferToWav } from '@/lib/studio-assets/encode-wav';
import { audioBufferToOpusWebm } from '@/lib/studio-assets/encode-opus';
import { zipStore, type ZipEntry } from '@/lib/studio-assets/zip-store';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { downloadFile, fileSlug, songSlug } from '@/daw/utils/exportFiles';

export type AudioExportFormat = 'wav' | 'opus';
export type WavBitDepth = 16 | 24;

export interface AudioExportOptions {
  format: AudioExportFormat;
  range: RenderRange;
  /** Filename suffix for a custom range, e.g. 'bars-5-12'. */
  rangeLabel?: string;
  /** WAV only. */
  bitDepth?: WavBitDepth;
  /** The mastering chain on the master bus (default true). */
  mastering?: boolean;
  /** Render this track alone (even when muted), named after it. */
  trackId?: string;
  /** With `trackId` only: no effects, no sends, no mastering. */
  dry?: boolean;
}

export interface ExportProgress {
  /** 'render' while the offline mixdown runs, 'encode' while encoding. */
  stage: 'render' | 'encode';
  /** 0..1 within the current stage; render has no sub-progress (stays 0). */
  pct: number;
}

export interface AudioExportResult {
  blob: Blob;
  filename: string;
}

/** Where a stems export is: stem `index` (from 0, so also the number of stems
 *  already done) of `total`, rendering or encoding. */
export interface StemProgress {
  index: number;
  total: number;
  trackName: string;
  stage: 'render' | 'encode';
}

export interface StemsExportOptions {
  format: AudioExportFormat;
  range: RenderRange;
  /** Filename suffix for a custom range, e.g. 'bars-5-12'. */
  rangeLabel?: string;
  /** WAV only. */
  bitDepth?: WavBitDepth;
  /** The mastering chain on each stem's master bus (default true). */
  mastering?: boolean;
}

const FORMAT_EXT: Record<AudioExportFormat, string> = {
  wav: 'wav',
  opus: 'webm',
};

const FORMAT_MIME: Record<AudioExportFormat, string> = {
  wav: 'audio/wav',
  opus: 'audio/webm;codecs=opus',
};

/** The filename suffix for the range: '-loop', '-bars-5-12' or nothing. */
function rangeSuffix(range: RenderRange, rangeLabel?: string): string {
  if (range === 'loop') return '-loop';
  return typeof range === 'object' && rangeLabel ? `-${rangeLabel}` : '';
}

/** `buffer` encoded in `format`. */
async function encodeAudio(
  buffer: AudioBuffer,
  format: AudioExportFormat,
  bitDepth: WavBitDepth = 16,
): Promise<ArrayBuffer> {
  return format === 'wav'
    ? audioBufferToWav(buffer, bitDepth)
    : audioBufferToOpusWebm(buffer);
}

/**
 * Render + encode the project (or one track of it) to a downloadable Blob.
 * `onProgress` fires with the render stage first, then the encode stage.
 */
export async function exportProjectAudio(
  opts: AudioExportOptions,
  onProgress?: (p: ExportProgress) => void,
): Promise<AudioExportResult> {
  const state = useStore.getState();
  let trackPart = '';
  if (opts.trackId !== undefined) {
    const track = state.tracks.find((t) => t.id === opts.trackId);
    if (!track) throw new Error('That track is no longer in the song');
    trackPart = `-${fileSlug(track.name, 'track')}${opts.dry ? '-dry' : ''}`;
  }

  onProgress?.({ stage: 'render', pct: 0 });
  const buffer = await renderProject({
    range: opts.range,
    mastering: opts.mastering,
    onlyTrackId: opts.trackId,
    dry: opts.dry,
  });

  onProgress?.({ stage: 'encode', pct: 0 });
  const bytes = await encodeAudio(buffer, opts.format, opts.bitDepth);
  const blob = new Blob([bytes], { type: FORMAT_MIME[opts.format] });
  onProgress?.({ stage: 'encode', pct: 1 });

  const suffix = rangeSuffix(opts.range, opts.rangeLabel);
  const filename = `${songSlug(state.projectName)}${trackPart}${suffix}.${FORMAT_EXT[opts.format]}`;
  return { blob, filename };
}

/** Whether `track` holds anything to hear: a MIDI clip with notes or an audio
 *  clip, not muted. */
function holdsSound(track: Track): boolean {
  return (
    track.midiClips.some((c) => !c.muted && c.events.length > 0) ||
    track.audioClips.some((c) => !c.muted)
  );
}

/**
 * The tracks a stems export writes, in track order: those that play in the
 * mix (mute and solo as on Play) and hold something to hear.
 */
export function stemTracks(state = useStore.getState()): Track[] {
  const { tracks } = state;
  return tracks.filter(
    (track) => isTrackAudible(track, tracks) && holdsSound(track),
  );
}

/** Each stem's name in the zip: '01-bass.wav', '02-keys.wav'; a second
 *  track whose name slugs the same becomes '03-bass-2.wav'. */
function stemEntryNames(tracks: readonly Track[], ext: string): string[] {
  const used = new Set<string>();
  const width = Math.max(2, String(tracks.length).length);
  return tracks.map((track, i) => {
    const base = fileSlug(track.name, 'track');
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return `${String(i + 1).padStart(width, '0')}-${slug}.${ext}`;
  });
}

function throwIfStopped(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
}

/**
 * Render each track that plays in the mix alone, in turn, encode it, and zip
 * the files into one download. `signal` stops it between tracks (a render
 * under way can't be cut short: it holds Tone's global context), throwing an
 * AbortError.
 */
export async function exportStems(
  opts: StemsExportOptions,
  onProgress?: (p: StemProgress) => void,
  signal?: AbortSignal,
): Promise<AudioExportResult & { count: number }> {
  const state = useStore.getState();
  const tracks = stemTracks(state);
  if (tracks.length === 0) {
    throw new Error('No track plays anything to export');
  }
  const names = stemEntryNames(tracks, FORMAT_EXT[opts.format]);
  const files: ZipEntry[] = [];
  const total = tracks.length;

  for (const [index, track] of tracks.entries()) {
    throwIfStopped(signal);
    const trackName = track.name;
    onProgress?.({ index, total, trackName, stage: 'render' });
    const buffer = await renderProject({
      range: opts.range,
      onlyTrackId: track.id,
      mastering: opts.mastering,
    });
    onProgress?.({ index, total, trackName, stage: 'encode' });
    const bytes = await encodeAudio(buffer, opts.format, opts.bitDepth);
    files.push({ name: names[index], data: new Uint8Array(bytes) });
  }

  throwIfStopped(signal);
  const suffix = rangeSuffix(opts.range, opts.rangeLabel);
  return {
    blob: zipStore(files),
    filename: `${songSlug(state.projectName)}${suffix}-stems.zip`,
    count: files.length,
  };
}

/** Trigger a browser download of a Blob. */
export function downloadAudioBlob(blob: Blob, filename: string): void {
  downloadFile(blob, filename);
}
