import type {
  ArtistImageSource,
  AudioSource,
  ChordBar,
  ChordHit,
  DifficultyLevel,
  Song,
  SongMode,
  SongSection,
} from '@/curriculum/types/songLibrary';

/**
 * Pure, immutable operations on a song's `sections` chart, plus the invariant
 * helpers the WYSIWYG editor enforces. Kept free of React so the reducer logic
 * is trivially testable and the editor components stay declarative.
 *
 * Schema invariants (see songLibrary.ts header): accidentals are `♭`/`♯`, never
 * `b`/`#`; `degree` (Hybrid Number System) is the source of truth and
 * `chordName` is display-only; there is no lyrics or melody field to add.
 */

/** Convert ASCII accidentals a human types to the schema's required glyphs. */
export const normalizeAccidentals = (input: string): string =>
  // Lowercase `b` is always a flat in chord/degree text (roots are uppercase);
  // `#` is only ever a sharp. `x`/`bb` for double-accidentals are left as-is.
  input.replace(/b/g, '♭').replace(/#/g, '♯');

export const DEFAULT_CHORD: ChordHit = {
  degree: '1 maj',
  chordName: '',
  beat: 1,
  duration: 4,
};

const EMPTY_BAR: ChordBar = { chords: [] };

/** A row grows as bars are added, wrapping only past this many bars. */
export const MAX_BARS_PER_ROW = 8;

/** Read the chart out of a raw content body, tolerating a partial draft. */
export const getSections = (body: Record<string, unknown>): SongSection[] =>
  Array.isArray(body.sections) ? (body.sections as SongSection[]) : [];

const uniqueSectionId = (sections: SongSection[], base = 'section'): string => {
  const taken = new Set(sections.map((s) => s.id));
  let n = sections.length + 1;
  let id = `${base}_${n}`;
  while (taken.has(id)) {
    n += 1;
    id = `${base}_${n}`;
  }
  return id;
};

const move = <T>(items: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const mapAt = <T>(items: T[], index: number, fn: (item: T) => T): T[] =>
  items.map((item, i) => (i === index ? fn(item) : item));

/* ── Section-level ─────────────────────────────────────────────────────── */

export const addSection = (sections: SongSection[]): SongSection[] => [
  ...sections,
  {
    id: uniqueSectionId(sections),
    label: '', // blank by default — an unlabeled section shows no header
    bars: Array.from({ length: 4 }, () => ({ ...EMPTY_BAR })),
  },
];

export const removeSection = (
  sections: SongSection[],
  sectionIdx: number,
): SongSection[] => sections.filter((_, i) => i !== sectionIdx);

export const moveSection = (
  sections: SongSection[],
  from: number,
  to: number,
): SongSection[] => move(sections, from, to);

export const updateSection = (
  sections: SongSection[],
  sectionIdx: number,
  patch: Partial<SongSection>,
): SongSection[] =>
  mapAt(sections, sectionIdx, (section) => ({ ...section, ...patch }));

/* ── Bar-level ─────────────────────────────────────────────────────────── */

export const addBar = (
  sections: SongSection[],
  sectionIdx: number,
): SongSection[] =>
  mapAt(sections, sectionIdx, (section) => ({
    ...section,
    bars: [...section.bars, { ...EMPTY_BAR }],
  }));

/** Insert an empty bar at a specific index (for the on-chart "+" between bars). */
export const insertBar = (
  sections: SongSection[],
  sectionIdx: number,
  atIdx: number,
): SongSection[] =>
  mapAt(sections, sectionIdx, (section) => {
    const bars = [...section.bars];
    bars.splice(Math.max(0, Math.min(atIdx, bars.length)), 0, { ...EMPTY_BAR });
    return { ...section, bars };
  });

export const removeBar = (
  sections: SongSection[],
  sectionIdx: number,
  barIdx: number,
): SongSection[] =>
  mapAt(sections, sectionIdx, (section) => ({
    ...section,
    bars: section.bars.filter((_, i) => i !== barIdx),
  }));

export const moveBar = (
  sections: SongSection[],
  sectionIdx: number,
  from: number,
  to: number,
): SongSection[] =>
  mapAt(sections, sectionIdx, (section) => ({
    ...section,
    bars: move(section.bars, from, to),
  }));

export const updateBar = (
  sections: SongSection[],
  sectionIdx: number,
  barIdx: number,
  patch: Partial<ChordBar>,
): SongSection[] =>
  mapAt(sections, sectionIdx, (section) => ({
    ...section,
    bars: mapAt(section.bars, barIdx, (bar) => ({ ...bar, ...patch })),
  }));

/* ── Chord-level ───────────────────────────────────────────────────────── */

export const addChord = (
  sections: SongSection[],
  sectionIdx: number,
  barIdx: number,
): SongSection[] =>
  updateBarChords(sections, sectionIdx, barIdx, (chords) => [
    ...chords,
    { ...DEFAULT_CHORD, beat: nextBeat(chords) },
  ]);

/** Add a chord at a specific beat (for click-a-beat-to-add); keeps beats sorted. */
export const addChordAt = (
  sections: SongSection[],
  sectionIdx: number,
  barIdx: number,
  beat: number,
): SongSection[] =>
  updateBarChords(sections, sectionIdx, barIdx, (chords) =>
    [...chords, { ...DEFAULT_CHORD, beat }].sort((a, b) => a.beat - b.beat),
  );

export const removeChord = (
  sections: SongSection[],
  sectionIdx: number,
  barIdx: number,
  chordIdx: number,
): SongSection[] =>
  updateBarChords(sections, sectionIdx, barIdx, (chords) =>
    chords.filter((_, i) => i !== chordIdx),
  );

export const updateChord = (
  sections: SongSection[],
  sectionIdx: number,
  barIdx: number,
  chordIdx: number,
  patch: Partial<ChordHit>,
): SongSection[] =>
  updateBarChords(sections, sectionIdx, barIdx, (chords) =>
    mapAt(chords, chordIdx, (chord) => ({ ...chord, ...patch })),
  );

const updateBarChords = (
  sections: SongSection[],
  sectionIdx: number,
  barIdx: number,
  fn: (chords: ChordHit[]) => ChordHit[],
): SongSection[] =>
  mapAt(sections, sectionIdx, (section) => ({
    ...section,
    bars: mapAt(section.bars, barIdx, (bar) => ({
      ...bar,
      chords: fn(bar.chords),
    })),
  }));

/** Put a new chord on the next free beat, capped at beat 4. */
const nextBeat = (chords: ChordHit[]): number => {
  if (chords.length === 0) return 1;
  const last = chords[chords.length - 1];
  return Math.min(4, Math.floor(last.beat) + 1);
};

/* ── Preview coercion ──────────────────────────────────────────────────── */

const str = (v: unknown, fallback: string): string =>
  typeof v === 'string' ? v : fallback;
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * Build a `Song` the real `ChordChart` can render from a possibly-incomplete
 * draft body. Only the fields ChordChart reads need to be sound; the rest get
 * schema-valid defaults so a half-authored new song still previews.
 */
export const coerceSongForPreview = (body: Record<string, unknown>): Song => {
  const time = Array.isArray(body.timeSignature)
    ? (body.timeSignature as [number, number])
    : [4, 4];
  return {
    id: str(body.id, 'draft'),
    title: str(body.title, ''),
    artist: str(body.artist, ''),
    key: str(body.key, 'C major'),
    keyRoot: num(body.keyRoot, 60),
    mode: str(body.mode, 'major') as SongMode,
    tempo: num(body.tempo, 120),
    timeSignature: [num(time[0], 4), num(time[1], 4)],
    difficulty: (num(body.difficulty, 1) as DifficultyLevel) ?? 1,
    genreTags: strArray(body.genreTags),
    techniques: strArray(body.techniques),
    sections: getSections(body),
    audioSources: Array.isArray(body.audioSources)
      ? (body.audioSources as AudioSource[])
      : [],
    artistImageSource: str(body.artistImageSource, 'none') as ArtistImageSource,
  };
};
