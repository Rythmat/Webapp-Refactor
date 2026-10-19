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
//
// ── Progress, Cancel and the encode worker (milestone 1.11) ───────────────
// The song, one track and stems are one kind of job: each takes an
// AbortSignal, which cancels the render under way (renderProject) or the
// encoding (the worker is ended) with an AbortError and no file, and each
// reports progress as a fraction of the whole job (null while the render
// can't say, for an indeterminate bar); a stem's report also says how far
// that stem is. Encoding runs in a worker (encodeAudio.ts), with the same
// WAV bytes as before.

import { renderProject, type RenderRange } from './renderProject';
import { isTrackAudible } from './trackAudibility';
import { encodeAudioBuffer } from './encodeAudio';
import { crc32, ZipWriter } from '@/lib/studio-assets/zip-store';
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
  /** The whole export, 0..1; null while the render can't say how far it
   *  is (a browser without OfflineAudioContext.suspend). */
  fraction: number | null;
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
  /** This stem, 0..1, or null while its render can't say. */
  fraction: number | null;
  /** The whole export, 0..1: the stems done and this one's share. */
  overall: number;
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

// The share of a job's bar for its render; encoding takes the rest.
const RENDER_SHARE = 0.9;

/** One file of a job: rendered, then encoded. `report` hears this file's
 *  stage and how far it is (0..1, null while the render can't say). */
async function renderAndEncode(
  render: Parameters<typeof renderProject>[0],
  format: AudioExportFormat,
  bitDepth: WavBitDepth | undefined,
  report:
    | ((stage: 'render' | 'encode', fraction: number | null) => void)
    | undefined,
  signal: AbortSignal | undefined,
): Promise<ArrayBuffer> {
  report?.('render', null);
  const buffer = await renderProject({
    ...render,
    ...(signal ? { signal } : {}),
    ...(report
      ? {
          onProgress: (f: number) => report('render', f * RENDER_SHARE),
        }
      : {}),
  });
  throwIfStopped(signal);
  report?.('encode', RENDER_SHARE);
  const bytes = await encodeAudioBuffer(buffer, format, bitDepth ?? 16, signal);
  // Cancelled while it was encoded (on the page, which can't be cut short):
  // no file.
  throwIfStopped(signal);
  report?.('encode', 1);
  return bytes;
}

/**
 * Render + encode the project (or one track of it) to a downloadable Blob.
 * `onProgress` fires with the render stage first, then the encode stage.
 * `signal` cancels it with an AbortError.
 */
export async function exportProjectAudio(
  opts: AudioExportOptions,
  onProgress?: (p: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<AudioExportResult> {
  const state = useStore.getState();
  let trackPart = '';
  if (opts.trackId !== undefined) {
    const track = state.tracks.find((t) => t.id === opts.trackId);
    if (!track) throw new Error('That track is no longer in the song');
    trackPart = `-${fileSlug(track.name, 'track')}${opts.dry ? '-dry' : ''}`;
  }

  throwIfStopped(signal);
  const bytes = await renderAndEncode(
    {
      range: opts.range,
      mastering: opts.mastering,
      onlyTrackId: opts.trackId,
      dry: opts.dry,
    },
    opts.format,
    opts.bitDepth,
    onProgress && ((stage, fraction) => onProgress({ stage, fraction })),
    signal,
  );
  const blob = new Blob([bytes], { type: FORMAT_MIME[opts.format] });

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

/** Names the stems in the zip as they are written: '01-bass.wav',
 *  '02-keys.wav'; a later track whose name slugs the same gets '-2'
 *  ('03-bass-2.wav'). */
function stemNamer(total: number, ext: string): (trackName: string) => string {
  const used = new Set<string>();
  const width = Math.max(2, String(total).length);
  return (trackName) => {
    const base = fileSlug(trackName, 'track');
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return `${String(used.size).padStart(width, '0')}-${slug}.${ext}`;
  };
}

function throwIfStopped(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
}

export interface StemsExportResult extends AudioExportResult {
  /** The number of stems in the zip. */
  count: number;
  /** The names of the tracks deleted (by a collaborator) before their turn
   *  came, so they're not in the zip. */
  skipped: string[];
}

/**
 * Render each track that plays in the mix alone, in turn, encode it, and zip
 * the files into one download. `signal` cancels it, the render or encoding
 * under way included, throwing an AbortError. A track deleted before its turn is skipped and named in
 * `skipped`; the others still make the zip.
 *
 * Each stem is kept as a Blob once encoded (its CRC taken from the bytes
 * first), and the zip is a Blob of those parts, so the export holds no more
 * than one stem's bytes at a time and the browser may keep the rest on disk.
 */
export async function exportStems(
  opts: StemsExportOptions,
  onProgress?: (p: StemProgress) => void,
  signal?: AbortSignal,
): Promise<StemsExportResult> {
  const state = useStore.getState();
  const tracks = stemTracks(state);
  if (tracks.length === 0) {
    throw new Error('No track plays anything to export');
  }
  const total = tracks.length;
  const nameStem = stemNamer(total, FORMAT_EXT[opts.format]);
  const zip = new ZipWriter();
  const skipped: string[] = [];

  for (const [index, listed] of tracks.entries()) {
    throwIfStopped(signal);
    // Read again: a collaborator may have deleted (or renamed) it meanwhile.
    const track = useStore.getState().tracks.find((t) => t.id === listed.id);
    if (!track) {
      skipped.push(listed.name);
      continue;
    }
    const trackName = track.name;
    const bytes = await renderAndEncode(
      {
        range: opts.range,
        onlyTrackId: track.id,
        mastering: opts.mastering,
      },
      opts.format,
      opts.bitDepth,
      onProgress &&
        ((stage, fraction) =>
          onProgress({
            index,
            total,
            trackName,
            stage,
            fraction,
            overall: (index + (fraction ?? 0)) / total,
          })),
      signal,
    );
    zip.add({
      name: nameStem(trackName),
      data: new Blob([bytes], { type: FORMAT_MIME[opts.format] }),
      crc: crc32(new Uint8Array(bytes)),
      size: bytes.byteLength,
    });
  }

  throwIfStopped(signal);
  const suffix = rangeSuffix(opts.range, opts.rangeLabel);
  return {
    blob: zip.finish(),
    filename: `${songSlug(state.projectName)}${suffix}-stems.zip`,
    count: zip.count,
    skipped,
  };
}

/** Trigger a browser download of a Blob. */
export function downloadAudioBlob(blob: Blob, filename: string): void {
  downloadFile(blob, filename);
}
