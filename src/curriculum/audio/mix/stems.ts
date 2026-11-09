import { GROOVE_STATS } from './grooveStats';

// ── What the lessons play ──────────────────────────────────────────────────
// Stems rendered by scripts/audio/renderGroove.mjs, all the same length, so that
// they stay locked together. A stem the owner supplies, a vocal say, is one more
// entry here. A lesson names the stems it needs, and a test fails if one is gone.

const BASE = '/audio-lab/groove-96-v1';

export type StemId = keyof typeof GROOVE_STATS.stems;

export interface Stem {
  id: StemId;
  label: string;
  url: string;
  peakDb: number;
  rmsDb: number;
  /** Whose it is. `cc-by` needs a credit shown wherever it plays. */
  license: 'owner' | 'cc0' | 'cc-by';
  credit?: string;
}

const stem = (id: StemId, label: string, license: Stem['license']): Stem => ({
  id,
  label,
  url: `${BASE}/${id}.flac`,
  peakDb: GROOVE_STATS.stems[id].peakDb,
  rmsDb: GROOVE_STATS.stems[id].rmsDb,
  license,
});

export const STEMS: readonly Stem[] = [
  stem('kick', 'Kick', 'owner'),
  stem('snare', 'Snare', 'owner'),
  stem('hats', 'Hats', 'owner'),
  stem('bass', 'Bass', 'cc0'),
];

export const stemNamed = (id: StemId): Stem =>
  STEMS.find((s) => s.id === id) ?? STEMS[0];

/** The whole groove's peak with every fader at 0 dB, in dBFS. */
export const MIX_PEAK_DB = GROOVE_STATS.mixPeakDb;
