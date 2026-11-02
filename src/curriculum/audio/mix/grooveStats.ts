// Written by scripts/audio/renderGroove.mjs: what the rendered stems measure.

export const GROOVE_STATS = {
  seconds: 10,
  bpm: 96,
  mixPeakDb: -2.8,
  totalBytes: 1245082,
  stems: {
    kick: {
      peakDb: -6,
      rmsDb: -27.26,
      channels: 1,
      strongestHz: 35,
    },
    snare: {
      peakDb: -6,
      rmsDb: -31.18,
      channels: 1,
      strongestHz: 201,
    },
    hats: {
      peakDb: -18,
      rmsDb: -41.8,
      channels: 2,
      strongestHz: 5641,
    },
    bass: {
      peakDb: -9,
      rmsDb: -22.74,
      channels: 1,
      strongestHz: 130,
    },
  },
} as const;
