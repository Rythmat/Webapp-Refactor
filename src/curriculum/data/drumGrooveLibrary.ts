/**
 * Phase 6 — Drum Groove Library.
 * 36 grooves across 14+ genres, parsed from multi-row CSV format.
 */

export interface DrumGrooveHit {
  instrument: string;
  /** Grid positions where hits occur (0-indexed within the groove grid) */
  positions: number[];
}

export interface DrumGrooveEntry {
  id: string;
  swing: string;
  grid: string;
  instruments: DrumGrooveHit[];
}

export const DRUM_GROOVE_LIBRARY: DrumGrooveEntry[] = [
  // ── Pop ───────────────────────────────────────────────────────────────
  {
    id: 'groove_pop_01',
    swing: '0 (None)',
    grid: 'Straight (32 slots)',
    instruments: [
      { instrument: 'Crash', positions: [0, 1] },
      {
        instrument: 'Hi-Hat',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
        ],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ],
  },
  {
    id: 'groove_pop_02',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6] },
    ],
  },
  {
    id: 'groove_pop_03',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },

  // ── Rock ──────────────────────────────────────────────────────────────
  {
    id: 'groove_rock_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Crash', positions: [0, 1, 2] },
      {
        instrument: 'Ride',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
        ],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ],
  },
  {
    id: 'groove_rock_02',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Crash', positions: [0] },
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ],
  },
  {
    id: 'groove_rock_03',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Crash', positions: [0] },
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1] },
      { instrument: 'Kick', positions: [0, 1, 2, 3] },
    ],
  },

  // ── Hip-Hop ───────────────────────────────────────────────────────────
  {
    id: 'groove_hiphop_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Crash', positions: [0] },
      {
        instrument: 'Hi-Hat',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
        ],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ],
  },
  {
    id: 'groove_hiphop_02',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        ],
      },
      { instrument: 'Snare', positions: [0, 1] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4] },
    ],
  },

  // ── Jam Band ──────────────────────────────────────────────────────────
  {
    id: 'groove_jam_01',
    swing: '5 (Heavy)',
    grid: 'Straight (swing applied)',
    instruments: [
      { instrument: 'Crash', positions: [0, 1, 2, 3, 4] },
      {
        instrument: 'Ride',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },

  // ── Funk ──────────────────────────────────────────────────────────────
  {
    id: 'groove_funk_01',
    swing: '2 (Light)',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat (O/H)',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },
  {
    id: 'groove_funk_02',
    swing: '1 (Light)',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat (H)',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        ],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },
  {
    id: 'groove_funk_03',
    swing: '1 (Light)',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat (O/H)',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3, 4, 5] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },

  // ── Neo-Soul ──────────────────────────────────────────────────────────
  {
    id: 'groove_neosoul_01',
    swing: '7 (Hard)',
    grid: 'Straight (swing applied)',
    instruments: [
      { instrument: 'Crash', positions: [0, 1, 2] },
      {
        instrument: 'Ride',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22,
        ],
      },
      { instrument: 'Hi-Hat (O)', positions: [0] },
      { instrument: 'Snare', positions: [0, 1, 2, 3, 4, 5] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    ],
  },
  {
    id: 'groove_neosoul_02',
    swing: '8 (Hard)',
    grid: 'Straight (swing applied)',
    instruments: [
      {
        instrument: 'Ride',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Hi-Hat (O)', positions: [0] },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },

  // ── Jazz ──────────────────────────────────────────────────────────────
  {
    id: 'groove_jazz_01',
    swing: '7 (Hard)',
    grid: 'Straight (swing applied)',
    instruments: [
      { instrument: 'Ride', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      { instrument: 'Hi-Hat (F)', positions: [0, 1, 2, 3] },
      { instrument: 'Snare', positions: [0, 1] },
      { instrument: 'High Tom', positions: [0, 1, 2, 3, 4] },
    ],
  },
  {
    id: 'groove_jazz_02',
    swing: '6 (Heavy)',
    grid: 'Straight (swing applied)',
    instruments: [
      { instrument: 'Ride', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      { instrument: 'Hi-Hat (F)', positions: [0, 1, 2, 3] },
      { instrument: 'Snare', positions: [0, 1] },
      { instrument: 'Kick', positions: [0, 1] },
    ],
  },
  {
    id: 'groove_jazz_03',
    swing: '5 (Heavy)',
    grid: 'Straight (swing applied)',
    instruments: [
      {
        instrument: 'Ride',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Hi-Hat (F)', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1] },
    ],
  },

  // ── R&B ───────────────────────────────────────────────────────────────
  {
    id: 'groove_rnb_01',
    swing: '4 (Medium)',
    grid: 'Straight (swing applied)',
    instruments: [
      { instrument: 'Crash', positions: [0] },
      {
        instrument: 'Hi-Hat (x/O)',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21,
        ],
      },
      { instrument: 'Snare', positions: [0] },
      {
        instrument: 'Kick',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      },
    ],
  },
  {
    id: 'groove_rnb_02',
    swing: '3 (Medium)',
    grid: 'Straight (swing applied)',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22, 23,
        ],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ],
  },

  // ── Salsa ─────────────────────────────────────────────────────────────
  {
    id: 'groove_salsa_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Ride', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      { instrument: 'Hi-Hat (x/O)', positions: [0, 1, 2, 3] },
      { instrument: 'Cross Stick', positions: [0, 1, 2, 3, 4] },
      { instrument: 'Kick', positions: [0, 1, 2, 3] },
    ],
  },

  // ── Merengue ──────────────────────────────────────────────────────────
  {
    id: 'groove_merengue_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Hi-Hat (x/O)', positions: [0, 1, 2, 3] },
      { instrument: 'Cross Stick', positions: [0, 1, 2, 3, 4] },
      { instrument: 'High Tom', positions: [0, 1, 2, 3] },
      { instrument: 'Low Tom', positions: [0, 1, 2, 3, 4, 5] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },

  // ── Bossa Nova ────────────────────────────────────────────────────────
  {
    id: 'groove_bossa_01',
    swing: '2 (Light)',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Ride',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Hi-Hat', positions: [0, 1, 2, 3] },
      { instrument: 'Cross Stick', positions: [0, 1, 2, 3, 4] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },

  // ── Samba ─────────────────────────────────────────────────────────────
  {
    id: 'groove_samba_01',
    swing: '2 (Light)',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Cross Stick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
      { instrument: 'Low Tom', positions: [0, 1] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },

  // ── Ballad ────────────────────────────────────────────────────────────
  {
    id: 'groove_ballad_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Crash', positions: [0] },
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'High Tom', positions: [0] },
      { instrument: 'Low Tom', positions: [0] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },

  // ── Blues ──────────────────────────────────────────────────────────────
  {
    id: 'groove_blues_01',
    swing: '0 (N/A -- triplet grid, no swing needed)',
    grid: 'Triplet (24 slots)',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5] },
    ],
  },
  {
    id: 'groove_blues_02',
    swing: '0 (Triplet grid)',
    grid: 'Triplet (24 slots)',
    instruments: [
      {
        instrument: 'Ride',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Hi-Hat (O)', positions: [0] },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5] },
    ],
  },

  // ── Folk ──────────────────────────────────────────────────────────────
  {
    id: 'groove_folk_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Shaker',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Cross Stick', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3] },
    ],
  },
  {
    id: 'groove_folk_02',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Tambourine',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Cross Stick', positions: [0, 1, 2] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5] },
    ],
  },

  // ── Electronic ────────────────────────────────────────────────────────
  {
    id: 'groove_electronic_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Clap/Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },
  {
    id: 'groove_electronic_02',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Clap/Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },
  {
    id: 'groove_electronic_03',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
          20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        ],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3, 4] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ],
  },

  // ── Afrobeat ──────────────────────────────────────────────────────────
  {
    id: 'groove_afrobeat_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat (O/H)',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3, 4] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },
  {
    id: 'groove_afrobeat_02',
    swing: '0',
    grid: 'Straight',
    instruments: [
      {
        instrument: 'Hi-Hat',
        positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6] },
    ],
  },

  // ── Reggae ────────────────────────────────────────────────────────────
  {
    id: 'groove_reggae_01',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Hi-Hat', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
      { instrument: 'Cross Stick', positions: [0, 1] },
      { instrument: 'Kick', positions: [0, 1] },
    ],
  },
  {
    id: 'groove_reggae_02',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Hi-Hat', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
      { instrument: 'Snare', positions: [0, 1, 2, 3] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },
  {
    id: 'groove_reggae_03',
    swing: '0',
    grid: 'Straight',
    instruments: [
      { instrument: 'Hi-Hat', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
      { instrument: 'Snare', positions: [0, 1, 2, 3, 4] },
      { instrument: 'Kick', positions: [0, 1, 2, 3, 4, 5, 6, 7] },
    ],
  },
];

/** Lookup by groove ID */
export function getDrumGroove(id: string): DrumGrooveEntry | undefined {
  return DRUM_GROOVE_LIBRARY.find((g) => g.id === id);
}

/** Get all grooves matching a genre prefix (e.g., "groove_pop", "groove_jazz") */
export function getDrumGroovesForGenre(genrePrefix: string): DrumGrooveEntry[] {
  return DRUM_GROOVE_LIBRARY.filter((g) => g.id.startsWith(genrePrefix));
}
