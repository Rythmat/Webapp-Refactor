import type { SamplerConfig } from './SamplerInstrument';

/**
 * Sampled instruments made in the back office from uploaded recordings: a
 * name and one or more samples, each with the note it was recorded at. The
 * sampler repitches between them, so one sample plays every note (best near
 * where it was recorded; more samples spread across the range sound truer).
 *
 * Repo files for now (./sampleInstruments/*.json, written by the dev server —
 * scripts/vite/devContentWriter.ts); commit a file and its uploads to ship it.
 * A layer names one as the sound `sample:<id>`.
 */

export interface SampleInstrumentFile {
  /** File name: lowercase, digits, _ and -. */
  id: string;
  name: string;
  /** What it is, for the sound picker: 'keys', 'guitar', 'bass'… */
  family?: string;
  /** Note name → uploaded sample URL: { "C4": "/daw-assets/samples/uploads/…" }. */
  samples: Record<string, string>;
  /** Level match in dB. */
  volumeDb?: number;
}

const files = import.meta.glob<SampleInstrumentFile>(
  './sampleInstruments/*.json',
  { eager: true, import: 'default' },
);

const BY_ID = new Map<string, SampleInstrumentFile>(
  Object.values(files).map((f) => [f.id, f]),
);

export function listSampleInstruments(): SampleInstrumentFile[] {
  return [...BY_ID.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getSampleInstrument(
  id: string,
): SampleInstrumentFile | undefined {
  return BY_ID.get(id);
}

/** The console's save, heard at once, before Vite reloads the module. */
export function rememberSampleInstrument(file: SampleInstrumentFile): void {
  BY_ID.set(file.id, file);
}

/** A sampled instrument as the Studio's sampler takes it. */
export function sampleInstrumentConfig(
  file: SampleInstrumentFile,
): SamplerConfig {
  return {
    name: file.name,
    // The samples are whole URLs.
    baseUrl: '',
    sampleMap: { ...file.samples },
    volumeDb: file.volumeDb,
  };
}
