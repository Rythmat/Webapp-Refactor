// ── exportAudio ───────────────────────────────────────────────────────────
// File → Export Audio: render the project (or loop region) offline via
// renderProject, encode to the chosen format, and hand back a downloadable
// Blob. Encoders:
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

import { renderProject, type RenderRange } from './renderProject';
import { audioBufferToWav } from '@/lib/studio-assets/encode-wav';
import { audioBufferToOpusWebm } from '@/lib/studio-assets/encode-opus';
import { useStore } from '@/daw/store';

export type AudioExportFormat = 'wav' | 'opus';
export type WavBitDepth = 16 | 24;

export interface AudioExportOptions {
  format: AudioExportFormat;
  range: RenderRange;
  /** WAV only. */
  bitDepth?: WavBitDepth;
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

const FORMAT_EXT: Record<AudioExportFormat, string> = {
  wav: 'wav',
  opus: 'webm',
};

const FORMAT_MIME: Record<AudioExportFormat, string> = {
  wav: 'audio/wav',
  opus: 'audio/webm;codecs=opus',
};

/** Slugify the project name for a filename base. */
function projectSlug(): string {
  const name = useStore.getState().projectName || 'mixdown';
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'mixdown';
}

/**
 * Render + encode the project to a downloadable Blob. `onProgress` fires with
 * the render stage first, then the encode stage.
 */
export async function exportProjectAudio(
  opts: AudioExportOptions,
  onProgress?: (p: ExportProgress) => void,
): Promise<AudioExportResult> {
  onProgress?.({ stage: 'render', pct: 0 });
  const buffer = await renderProject({ range: opts.range });

  onProgress?.({ stage: 'encode', pct: 0 });
  let blob: Blob;
  if (opts.format === 'wav') {
    const wav = audioBufferToWav(buffer, opts.bitDepth ?? 16);
    blob = new Blob([wav], { type: FORMAT_MIME.wav });
  } else {
    const webm = await audioBufferToOpusWebm(buffer);
    blob = new Blob([webm], { type: FORMAT_MIME.opus });
  }
  onProgress?.({ stage: 'encode', pct: 1 });

  const suffix = opts.range === 'loop' ? '-loop' : '';
  const filename = `${projectSlug()}${suffix}.${FORMAT_EXT[opts.format]}`;
  return { blob, filename };
}

/** Trigger a browser download of a Blob. */
export function downloadAudioBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
