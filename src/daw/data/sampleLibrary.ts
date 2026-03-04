// ── Sample Library ─────────────────────────────────────────────────────
// Catalog of drum samples and MIDI loops available in the Library browser.

import type { InstrumentType } from '@/daw/store/tracksSlice';

export type SampleType = 'audio' | 'midi';
export type SampleSection = 'Drums' | 'MIDI Loops';

export interface SampleItem {
  id: string;
  name: string;
  section: SampleSection;
  subcategory: string;
  type: SampleType;
  url: string;
  bpm?: number;
  key?: string;
  tags: string[];
  instrument?: InstrumentType;
}

export const SAMPLE_SECTIONS: SampleSection[] = ['Drums', 'MIDI Loops'];

// ── Catalog ────────────────────────────────────────────────────────────
// Add entries here as sample files are placed in public/samples/.

export const SAMPLE_LIBRARY: SampleItem[] = [
  // Drum grooves have moved to src/data/groovesLibrary.ts (Grooves tab).
];

// ── Helpers ────────────────────────────────────────────────────────────

export function getSubcategories(section: SampleSection): string[] {
  const subs = new Set(
    SAMPLE_LIBRARY.filter((s) => s.section === section).map((s) => s.subcategory),
  );
  return Array.from(subs);
}

export function searchSamples(query: string): SampleItem[] {
  const lower = query.toLowerCase();
  return SAMPLE_LIBRARY.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.subcategory.toLowerCase().includes(lower) ||
      s.tags.some((t) => t.toLowerCase().includes(lower)),
  );
}
