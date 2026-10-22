import type { DrumGrooveHit } from '../drumGrooves/drumGroove';

/**
 * The grooves Groove Lab plays, the owner's pick (Peter, 2026-10-21), each
 * from his designed grooves (data/drumGrooves), by style:
 *
 *   Latin    Cumbia, Reggaeton, Latin Rock, Bossa Nova, Samba, Salsa 2-3,
 *            Salsa 3-2, Merengue (Salsa, Merengue and Samba two bars only:
 *            the clave is a two-bar figure)
 *   Jazz     Jazz Swing (one and two bars), Boogaloo (two), Blues Shuffle
 *            (one), Poinciana (one bar of 16ths, its 4& tom a kick), New
 *            Orleans (two, without the 32nd-note snare in its second bar)
 *   Neo Soul / R&B   Neo Soul 2, Neo Soul Gospel, R&B 2 (16ths, one and two)
 *   Pop      Straight 8 (Level 1's first groove), Dance Pop (everywhere;
 *            Level 1 without its open hi-hat), Pop 01 (one bar), Punk 1
 *            (16ths), Electro Funk-Pop (16ths, one and two)
 *   Rock     Rock (one and two bars)
 *   Hip Hop  Boom Bap A (a bar of 8ths, two of 16ths), Laid Back (one and
 *            two), Swung Indie Hip Hop (its third bar, as a bar of 16ths)
 *   Funk     Funk and Four on the Floor Funk (two bars of 16ths), Funk 01
 *            and Heavy Funk (one bar of 16ths)
 *   Advanced Drum 'n' Bass and Afrobeat (two bars of 16ths)
 *
 * Each plays where it fits: an 8th-note or 16th-note groove by what its
 * hits in those bars need (levels.ts), one bar or two as listed.
 */

export interface LabGrooveEntry {
  /** Who it is in the game: one entry per version of a groove. */
  key: string;
  /** The designed groove's id (its file name). */
  id: string;
  /** Its name in the game: plain, without the designer's notes. */
  name: string;
  style: string;
  /** One bar, two bars, or both (the default). */
  bars?: readonly (1 | 2)[];
  /**
   * A two-bar figure (a clave) that stays two bars even where its kick,
   * snare and cymbal repeat.
   */
  cycle?: boolean;
  /** The advanced level's. */
  advanced?: boolean;
  /** Its first bar in the game, from 1 (Swung Indie Hip Hop: 3). */
  fromBar?: number;
  /** The finest grid it's written on in the game (Heavy Funk: 16ths). */
  grid?: '8n' | '16n';
  /** The first groove its level deals. */
  lead?: boolean;
  /** The game's changes to its hits, on the groove's own ticks. */
  edit?: (hits: readonly DrumGrooveHit[]) => DrumGrooveHit[];
}

const BAR = 1920;
const TOMS = new Set([41, 45, 48]);

/** A tom at `tick` played on the kick instead. */
const tomToKick =
  (tick: number) =>
  (hits: readonly DrumGrooveHit[]): DrumGrooveHit[] =>
    hits.map((h) =>
      h.tick === tick && TOMS.has(h.note) ? { ...h, note: 36 } : h,
    );

/** The hits on `notes` from `from` up to (not at) `to` left out. */
const without =
  (notes: readonly number[], from: number, to: number) =>
  (hits: readonly DrumGrooveHit[]): DrumGrooveHit[] =>
    hits.filter(
      (h) => !(notes.includes(h.note) && h.tick >= from && h.tick < to),
    );

export const GROOVE_LAB_GROOVES: readonly LabGrooveEntry[] = [
  // Pop
  {
    key: 'straight-8',
    id: 'straight-8',
    name: 'Straight 8',
    style: 'Pop',
    bars: [1],
    lead: true,
  },
  { key: 'pop-01', id: 'groove_pop_01', name: 'Pop', style: 'Pop', bars: [1] },
  {
    key: 'dance-pop-8ths',
    id: 'dance-pop',
    name: 'Dance Pop',
    style: 'Pop',
    bars: [1],
    // Level 1's bar of 8ths: its one 16th, an open hi-hat on 4a, left out.
    edit: without([46], 1800, 1801),
  },
  { key: 'dance-pop', id: 'dance-pop', name: 'Dance Pop', style: 'Pop' },
  { key: 'punk', id: 'groove-punk-1', name: 'Punk', style: 'Pop' },
  {
    key: 'electro-funk-pop',
    id: 'groove_funk_04',
    name: 'Electro Funk-Pop',
    style: 'Pop',
  },
  // Rock
  { key: 'rock', id: 'groove-rock-10', name: 'Rock', style: 'Rock' },
  // Hip hop
  { key: 'boom-bap', id: 'boombap_a', name: 'Boom Bap', style: 'Hip Hop' },
  { key: 'laid-back', id: 'laid_back', name: 'Laid Back', style: 'Hip Hop' },
  {
    key: 'swung-indie-hip-hop',
    id: 'groove-indie-1',
    name: 'Swung Indie Hip Hop',
    style: 'Hip Hop',
    bars: [1],
    fromBar: 3,
  },
  // Funk
  { key: 'funk', id: 'funk-16ths', name: 'Funk', style: 'Funk', bars: [2] },
  {
    key: 'four-on-the-floor-funk',
    id: 'electro_funk_copy',
    name: 'Four on the Floor Funk',
    style: 'Funk',
    bars: [2],
  },
  {
    key: 'funk-01',
    id: 'groove_funk_01',
    name: 'Funk 01',
    style: 'Funk',
    bars: [1],
  },
  {
    key: 'heavy-funk',
    id: 'heavy-funk',
    name: 'Heavy Funk',
    style: 'Funk',
    bars: [1],
    grid: '16n',
  },
  // Neo soul and R&B
  {
    key: 'neo-soul-2',
    id: 'neo_soul_gospel_copy',
    name: 'Neo Soul 2',
    style: 'Neo Soul',
  },
  {
    key: 'neo-soul-gospel',
    id: 'neo_soul_1_copy',
    name: 'Neo Soul Gospel',
    style: 'Neo Soul',
  },
  { key: 'rnb-2', id: 'groove-rnb-2', name: 'R&B 2', style: 'R&B' },
  // Jazz
  {
    key: 'jazz-swing',
    id: 'jazz-swing-modern-4-bar',
    name: 'Jazz Swing',
    style: 'Jazz',
  },
  {
    key: 'boogaloo',
    id: 'boogaloo',
    name: 'Boogaloo',
    style: 'Jazz',
    bars: [2],
  },
  {
    key: 'blues-shuffle',
    id: 'blues-shuffle',
    name: 'Blues Shuffle',
    style: 'Jazz',
    bars: [1],
  },
  {
    key: 'poinciana',
    id: 'poinciana',
    name: 'Poinciana',
    style: 'Jazz',
    bars: [1],
    // The tom on the "and" of 4 is the groove's essential hit: on the kick.
    edit: tomToKick(1680),
  },
  {
    key: 'new-orleans',
    id: 'new-orleans-second-line',
    name: 'New Orleans',
    style: 'Jazz',
    bars: [2],
    // Bar 2's closing 32nd-note snare run left out.
    edit: without([38], BAR + 1681, 2 * BAR),
  },
  // Latin
  { key: 'cumbia', id: 'groove-latin-1', name: 'Cumbia', style: 'Latin' },
  { key: 'reggaeton', id: 'reggaeton_01', name: 'Reggaeton', style: 'Latin' },
  { key: 'latin-rock', id: 'latin-rock', name: 'Latin Rock', style: 'Latin' },
  { key: 'bossa-nova', id: 'bossa-nova', name: 'Bossa Nova', style: 'Latin' },
  {
    key: 'samba',
    id: 'samba',
    name: 'Samba',
    style: 'Latin',
    bars: [2],
    cycle: true,
  },
  {
    key: 'salsa-2-3',
    id: 'salsa-2-3',
    name: 'Salsa 2-3',
    style: 'Latin',
    bars: [2],
    cycle: true,
  },
  {
    key: 'salsa-3-2',
    id: 'salsa-3-2',
    name: 'Salsa 3-2',
    style: 'Latin',
    bars: [2],
    cycle: true,
  },
  {
    key: 'merengue',
    id: 'salsa_3_2_copy',
    name: 'Merengue',
    style: 'Latin',
    bars: [2],
    cycle: true,
  },
  // Advanced
  {
    key: 'drum-n-bass',
    id: 'drum-n-bass',
    name: "Drum 'n' Bass",
    style: 'Electronic',
    bars: [2],
    advanced: true,
  },
  {
    key: 'afrobeat',
    id: 'afrobeat_1_fela',
    name: 'Afrobeat',
    style: 'Afro',
    bars: [2],
    advanced: true,
  },
];

/** Every designed groove the game needs, once. */
export const GROOVE_LAB_GROOVE_IDS: readonly string[] = [
  ...new Set(GROOVE_LAB_GROOVES.map((e) => e.id)),
];
