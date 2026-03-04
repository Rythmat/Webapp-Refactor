// ── Grooves Library ───────────────────────────────────────────────────
// Catalog of MIDI drum grooves available in the Grooves browser tab.

export interface GrooveItem {
  id: string;
  name: string;
  genre: string;
  tags: string[];
  bpm: number;
  url: string;
}

export const GROOVE_GENRES = [
  'All', 'Hip Hop', 'Trap', 'R&B', 'Neo Soul', 'Pop', 'Rock',
  'Indie', 'Punk', 'Jazz', 'House', 'Funk', 'Latin', 'Afrobeat',
] as const;

export type GrooveGenre = (typeof GROOVE_GENRES)[number];

export const GROOVES: GrooveItem[] = [
  // 60 BPM
  { id: 'groove-hiphop-1', name: 'Hip Hop 1', genre: 'Hip Hop', tags: ['Boom Bap'], bpm: 60, url: '/daw-assets/samples/midi/drum/hiphop-1-60bpm.mid' },
  { id: 'groove-hiphop-2', name: 'Hip Hop 2', genre: 'Hip Hop', tags: ['Boom Bap'], bpm: 60, url: '/daw-assets/samples/midi/drum/hiphop-2-60bpm.mid' },
  { id: 'groove-trap-1', name: 'Trap 1', genre: 'Trap', tags: ['808'], bpm: 60, url: '/daw-assets/samples/midi/drum/trap-1-60bpm.mid' },
  { id: 'groove-trap-2', name: 'Trap 2', genre: 'Trap', tags: ['Dark'], bpm: 60, url: '/daw-assets/samples/midi/drum/trap-2-60bpm.mid' },
  { id: 'groove-rnb-1', name: 'R&B 1', genre: 'R&B', tags: ['Slow'], bpm: 60, url: '/daw-assets/samples/midi/drum/rnb-1-60bpm.mid' },
  // 75 BPM
  { id: 'groove-neosoul-1', name: 'Neo Soul 1', genre: 'Neo Soul', tags: ['Groove'], bpm: 75, url: '/daw-assets/samples/midi/drum/neosoul-1-75bpm.mid' },
  { id: 'groove-rnb-2', name: 'R&B 2', genre: 'R&B', tags: ['Groove'], bpm: 75, url: '/daw-assets/samples/midi/drum/rnb-2-75bpm.mid' },
  // 90 BPM
  { id: 'groove-hiphop-3', name: 'Hip Hop 3', genre: 'Hip Hop', tags: ['Mid-Tempo'], bpm: 90, url: '/daw-assets/samples/midi/drum/hiphop-3-90bpm.mid' },
  { id: 'groove-bossa-1', name: 'Bossa 1', genre: 'Latin', tags: ['Bossa Nova'], bpm: 90, url: '/daw-assets/samples/midi/drum/bossa-1-90bpm.mid' },
  { id: 'groove-latin-1', name: 'Latin 1', genre: 'Latin', tags: ['Percussion'], bpm: 90, url: '/daw-assets/samples/midi/drum/latin-1-90bpm.mid' },
  { id: 'groove-latin-2', name: 'Latin 2', genre: 'Latin', tags: ['Percussion'], bpm: 90, url: '/daw-assets/samples/midi/drum/latin-2-90bpm.mid' },
  { id: 'groove-rock-2', name: 'Rock 2', genre: 'Rock', tags: ['Mid-Tempo'], bpm: 90, url: '/daw-assets/samples/midi/drum/rock-2-90bpm.mid' },
  { id: 'groove-rock-3', name: 'Rock 3', genre: 'Rock', tags: ['Mid-Tempo'], bpm: 90, url: '/daw-assets/samples/midi/drum/rock-3-90bpm.mid' },
  { id: 'groove-rock-4', name: 'Rock 4', genre: 'Rock', tags: ['Mid-Tempo'], bpm: 90, url: '/daw-assets/samples/midi/drum/rock-4-90bpm.mid' },
  { id: 'groove-rock-5', name: 'Rock 5', genre: 'Rock', tags: ['Mid-Tempo'], bpm: 90, url: '/daw-assets/samples/midi/drum/rock-5-90bpm.mid' },
  { id: 'groove-rock-6', name: 'Rock 6', genre: 'Rock', tags: ['Mid-Tempo'], bpm: 90, url: '/daw-assets/samples/midi/drum/rock-6-90bpm.mid' },
  { id: 'groove-train-1', name: 'Train 1', genre: 'Rock', tags: ['Train Beat'], bpm: 90, url: '/daw-assets/samples/midi/drum/train-1-90bpm.mid' },
  // 100 BPM
  { id: 'groove-funk-1', name: 'Funk 1', genre: 'Funk', tags: ['Groove'], bpm: 100, url: '/daw-assets/samples/midi/drum/funk-1-100bpm.mid' },
  { id: 'groove-indie-1', name: 'Indie 1', genre: 'Indie', tags: ['Alternative'], bpm: 100, url: '/daw-assets/samples/midi/drum/indie-1-100bpm.mid' },
  { id: 'groove-indie-2', name: 'Indie 2', genre: 'Indie', tags: ['Alternative'], bpm: 100, url: '/daw-assets/samples/midi/drum/indie-2-100bpm.mid' },
  { id: 'groove-indie-3', name: 'Indie 3', genre: 'Indie', tags: ['Alternative'], bpm: 100, url: '/daw-assets/samples/midi/drum/indie-3-100bpm.mid' },
  // 120 BPM
  { id: 'groove-funk-2', name: 'Funk 2', genre: 'Funk', tags: ['Uptempo'], bpm: 120, url: '/daw-assets/samples/midi/drum/funk-2-120bpm.mid' },
  { id: 'groove-funk-3', name: 'Funk 3', genre: 'Funk', tags: ['Uptempo'], bpm: 120, url: '/daw-assets/samples/midi/drum/funk-3-120bpm.mid' },
  { id: 'groove-punk-1', name: 'Punk 1', genre: 'Punk', tags: ['Fast'], bpm: 120, url: '/daw-assets/samples/midi/drum/punk-1-120bpm.mid' },
  { id: 'groove-punk-2', name: 'Punk 2', genre: 'Punk', tags: ['Fast'], bpm: 120, url: '/daw-assets/samples/midi/drum/punk-2-120bpm.mid' },
  { id: 'groove-rock-7', name: 'Rock 7', genre: 'Rock', tags: ['Uptempo'], bpm: 120, url: '/daw-assets/samples/midi/drum/rock-7-120bpm.mid' },
  { id: 'groove-rock-8', name: 'Rock 8', genre: 'Rock', tags: ['Uptempo'], bpm: 120, url: '/daw-assets/samples/midi/drum/rock-8-120bpm.mid' },
  { id: 'groove-rock-9', name: 'Rock 9', genre: 'Rock', tags: ['Uptempo'], bpm: 120, url: '/daw-assets/samples/midi/drum/rock-9-120bpm.mid' },
  { id: 'groove-rock-10', name: 'Rock 10', genre: 'Rock', tags: ['Uptempo'], bpm: 120, url: '/daw-assets/samples/midi/drum/rock-10-120bpm.mid' },
];

// ── Helpers ────────────────────────────────────────────────────────────

export function getUniqueBpms(): number[] {
  return [...new Set(GROOVES.map((g) => g.bpm))].sort((a, b) => a - b);
}

export function filterGrooves(genre: string, query: string, bpm?: number): GrooveItem[] {
  let items = GROOVES;
  if (genre !== 'All') {
    items = items.filter((g) => g.genre === genre);
  }
  if (bpm != null) {
    items = items.filter((g) => g.bpm === bpm);
  }
  if (query.trim()) {
    const lower = query.toLowerCase();
    items = items.filter(
      (g) =>
        g.name.toLowerCase().includes(lower) ||
        g.genre.toLowerCase().includes(lower) ||
        g.tags.some((t) => t.toLowerCase().includes(lower)),
    );
  }
  return items;
}
