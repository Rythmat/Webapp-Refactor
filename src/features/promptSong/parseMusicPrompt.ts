import type { VibeTag } from '@/curriculum/engine/progressionRules';

// ── Reading a song prompt (owner, 2026-10-23) ───────────────────────────────
//
// "Make a sad lo-fi beat in D Dorian at 80 BPM" → the genre, its flavor, the
// moods, the key and mode, the tempo, the level. The words are the curriculum
// genres and the progression library's own vibe tags with their synonyms
// (progressionRules.ts VIBE_INFO; promptSong.test.ts keeps MOOD_WORDS in step
// with it), the UNISON style parser's genre and level aliases
// (unison/engine/styleParser.ts) and the old Prism prompt parser's genre
// words (lib/promptParser.ts), plus the styles students name (lo-fi, trap,
// reggaeton). Matched longest phrase first, as styleParser matches.
//
// No runtime imports: the Home prompt bar loads this to tell a song prompt
// (`looksLikeMusicPrompt`) from a question, and must stay light.

/** The longest prompt read; the Home bar and the Studio link cut to it. */
export const PROMPT_TEXT_MAX = 280;

/** The curriculum genres a prompt's song can be in. */
export type PromptGenre =
  | 'pop'
  | 'rock'
  | 'hip-hop'
  | 'rnb'
  | 'jazz'
  | 'blues'
  | 'folk'
  | 'funk'
  | 'neo-soul'
  | 'electronic'
  | 'latin'
  | 'reggae'
  | 'jam-band'
  | 'african';

/** A style within a genre that picks its band or its groove. */
export type PromptFlavor =
  | 'lofi'
  | 'trap'
  | 'boom-bap'
  | 'house'
  | 'dnb'
  | 'punk'
  | 'indie'
  | 'ballad'
  | 'dance'
  | 'gospel'
  | 'reggaeton'
  | 'cumbia'
  | 'bossa'
  | 'salsa'
  | 'merengue';

export type PromptMode =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian';

/** How the app names each genre. */
export const GENRE_LABELS: Record<PromptGenre, string> = {
  pop: 'Pop',
  rock: 'Rock',
  'hip-hop': 'Hip Hop',
  rnb: 'R&B',
  jazz: 'Jazz',
  blues: 'Blues',
  folk: 'Folk',
  funk: 'Funk',
  'neo-soul': 'Neo-Soul',
  electronic: 'Electronic',
  latin: 'Latin',
  reggae: 'Reggae',
  'jam-band': 'Jam Band',
  african: 'African',
};

/** How the app names each flavor. */
export const FLAVOR_LABELS: Partial<Record<PromptFlavor, string>> = {
  lofi: 'Lo-fi',
  trap: 'Trap',
  'boom-bap': 'Boom Bap',
  house: 'House',
  dnb: 'Drum and Bass',
  punk: 'Punk',
  indie: 'Indie',
  ballad: 'Ballad',
  dance: 'Dance Pop',
  gospel: 'Gospel',
  reggaeton: 'Reggaeton',
  cumbia: 'Cumbia',
  bossa: 'Bossa Nova',
  salsa: 'Salsa',
  merengue: 'Merengue',
};

export interface MusicPrompt {
  text: string;
  /** The last genre named, as styleParser reads a blend's lead. */
  genre: PromptGenre | null;
  flavor: PromptFlavor | null;
  /** The moods, as the progression library tags them, in order, once each:
   *  those named and those a style carries (lo-fi is cool). */
  vibes: VibeTag[];
  /** The moods named in so many words ("sad", "chill"). */
  namedMoods: VibeTag[];
  level: 1 | 2 | 3 | null;
  tonicPc: number | null;
  /** The tonic as written, in ASCII: 'Bb', 'F#'. */
  tonicLabel: string | null;
  mode: PromptMode | null;
  bpm: number | null;
  tempoWord: 'slow' | 'fast' | null;
  /** A meter other than 4/4 asked for (the song stays in 4/4 for now). */
  timeSignature: [number, number] | null;
  form: '12-bar' | null;
  /** Every word or phrase read, as it was matched. */
  matched: string[];
}

interface GenreWord {
  genre: PromptGenre;
  flavor?: PromptFlavor;
  vibe?: VibeTag;
}

const g = (
  genre: PromptGenre,
  flavor?: PromptFlavor,
  vibe?: VibeTag,
): GenreWord => ({
  genre,
  ...(flavor && { flavor }),
  ...(vibe && { vibe }),
});

/** Genre words, the styles students name included. */
export const GENRE_WORDS: Readonly<Record<string, GenreWord>> = {
  pop: g('pop'),
  rock: g('rock'),
  jazz: g('jazz'),
  funk: g('funk'),
  funky: g('funk'),
  blues: g('blues'),
  bluesy: g('blues'),
  reggae: g('reggae'),
  folk: g('folk'),
  latin: g('latin'),
  electronic: g('electronic'),
  african: g('african'),
  'hip hop': g('hip-hop'),
  'hip-hop': g('hip-hop'),
  hiphop: g('hip-hop'),
  rap: g('hip-hop'),
  'neo soul': g('neo-soul'),
  'neo-soul': g('neo-soul'),
  neosoul: g('neo-soul'),
  'jam band': g('jam-band'),
  'jam-band': g('jam-band'),
  jamband: g('jam-band'),
  'r&b': g('rnb'),
  rnb: g('rnb'),
  'r and b': g('rnb'),
  'rhythm and blues': g('rnb'),
  soul: g('rnb'),
  soulful: g('rnb'),
  motown: g('rnb'),
  gospel: g('rnb', 'gospel', 'spiritual'),
  'lo-fi': g('hip-hop', 'lofi', 'cool'),
  lofi: g('hip-hop', 'lofi', 'cool'),
  'lo fi': g('hip-hop', 'lofi', 'cool'),
  chillhop: g('hip-hop', 'lofi', 'cool'),
  trap: g('hip-hop', 'trap'),
  drill: g('hip-hop', 'trap', 'dark'),
  'boom bap': g('hip-hop', 'boom-bap'),
  'boom-bap': g('hip-hop', 'boom-bap'),
  boombap: g('hip-hop', 'boom-bap'),
  edm: g('electronic', 'house'),
  house: g('electronic', 'house'),
  techno: g('electronic', 'house', 'hypnotic'),
  dance: g('electronic', 'house'),
  synthwave: g('electronic', undefined, 'dreamy'),
  dnb: g('electronic', 'dnb'),
  'drum and bass': g('electronic', 'dnb'),
  "drum 'n' bass": g('electronic', 'dnb'),
  jungle: g('electronic', 'dnb'),
  punk: g('rock', 'punk', 'rebellious'),
  'pop punk': g('rock', 'punk'),
  indie: g('rock', 'indie'),
  grunge: g('rock', undefined, 'dark'),
  metal: g('rock', undefined, 'aggressive'),
  country: g('folk'),
  bluegrass: g('folk'),
  acoustic: g('folk'),
  'singer-songwriter': g('folk'),
  afrobeat: g('african'),
  afrobeats: g('african'),
  highlife: g('african'),
  dancehall: g('reggae'),
  ska: g('reggae', undefined, 'fun'),
  dub: g('reggae', undefined, 'hypnotic'),
  reggaeton: g('latin', 'reggaeton'),
  dembow: g('latin', 'reggaeton'),
  cumbia: g('latin', 'cumbia'),
  bossa: g('latin', 'bossa'),
  'bossa nova': g('latin', 'bossa'),
  samba: g('latin', 'bossa'),
  salsa: g('latin', 'salsa'),
  merengue: g('latin', 'merengue'),
  ballad: g('pop', 'ballad'),
  disco: g('pop', 'dance', 'fun'),
};

/**
 * The progression library's vibe tags and their synonyms (VIBE_INFO), and a
 * few words students use for them.
 */
export const MOOD_WORDS: Readonly<Record<string, VibeTag>> = {
  cool: 'cool',
  chill: 'cool',
  smooth: 'cool',
  relaxed: 'cool',
  sexy: 'sexy',
  sultry: 'sexy',
  seductive: 'sexy',
  sensual: 'sexy',
  intriguing: 'intriguing',
  mysterious: 'intriguing',
  curious: 'intriguing',
  enigmatic: 'intriguing',
  dark: 'dark',
  ominous: 'dark',
  heavy: 'dark',
  brooding: 'dark',
  emotional: 'emotional',
  moving: 'emotional',
  heartfelt: 'emotional',
  bittersweet: 'emotional',
  sophisticated: 'sophisticated',
  elegant: 'sophisticated',
  complex: 'sophisticated',
  refined: 'sophisticated',
  jazzy: 'sophisticated',
  fun: 'fun',
  playful: 'fun',
  lighthearted: 'fun',
  bouncy: 'fun',
  happy: 'happy',
  joyful: 'happy',
  uplifting: 'happy',
  bright: 'happy',
  melancholic: 'melancholic',
  sad: 'melancholic',
  wistful: 'melancholic',
  nostalgic: 'melancholic',
  aggressive: 'aggressive',
  intense: 'aggressive',
  powerful: 'aggressive',
  driving: 'aggressive',
  dreamy: 'dreamy',
  ethereal: 'dreamy',
  floating: 'dreamy',
  atmospheric: 'dreamy',
  hypnotic: 'hypnotic',
  'trance-like': 'hypnotic',
  repetitive: 'hypnotic',
  meditative: 'hypnotic',
  triumphant: 'triumphant',
  epic: 'triumphant',
  victorious: 'triumphant',
  anthemic: 'triumphant',
  spiritual: 'spiritual',
  transcendent: 'spiritual',
  sacred: 'spiritual',
  devotional: 'spiritual',
  rebellious: 'rebellious',
  defiant: 'rebellious',
  punk: 'rebellious',
  'anti-establishment': 'rebellious',
  romantic: 'romantic',
  tender: 'romantic',
  loving: 'romantic',
  intimate: 'romantic',
};

/** The level words styleParser reads (LEVEL_ALIASES). */
export const LEVEL_WORDS: Readonly<Record<string, 1 | 2 | 3>> = {
  beginner: 1,
  easy: 1,
  starter: 1,
  intro: 1,
  introductory: 1,
  basic: 1,
  simple: 1,
  novice: 1,
  l1: 1,
  'level 1': 1,
  intermediate: 2,
  medium: 2,
  mid: 2,
  standard: 2,
  l2: 2,
  'level 2': 2,
  advanced: 3,
  hard: 3,
  expert: 3,
  pro: 3,
  professional: 3,
  complex: 3,
  l3: 3,
  'level 3': 3,
};

const TEMPO_WORDS: Readonly<Record<string, 'slow' | 'fast'>> = {
  slow: 'slow',
  'laid-back': 'slow',
  'laid back': 'slow',
  mellow: 'slow',
  fast: 'fast',
  upbeat: 'fast',
  energetic: 'fast',
  driving: 'fast',
  uptempo: 'fast',
};

const FORM_WORDS: Readonly<Record<string, '12-bar'>> = {
  '12-bar': '12-bar',
  '12 bar': '12-bar',
  'twelve bar': '12-bar',
  'twelve-bar': '12-bar',
};

const MODE_WORDS: Readonly<Record<string, PromptMode>> = {
  major: 'ionian',
  maj: 'ionian',
  ionian: 'ionian',
  minor: 'aeolian',
  min: 'aeolian',
  m: 'aeolian',
  aeolian: 'aeolian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  // The library writes diatonic loops: the nearest of those.
  locrian: 'aeolian',
  'harmonic minor': 'aeolian',
  'melodic minor': 'aeolian',
  pentatonic: 'aeolian',
};

/** Verbs that ask for something made. */
const MAKE_VERBS = [
  'make',
  'write',
  'build',
  'start',
  'create',
  'compose',
  'produce',
  'generate',
  'lay down',
  'cook up',
  'give me',
  'craft',
];

/** What can be made. */
const MUSIC_NOUNS = [
  'beat',
  'beats',
  'groove',
  'song',
  'track',
  'tune',
  'progression',
  'chords',
  'riff',
  'loop',
  'jam',
  'idea',
  'instrumental',
  'vamp',
  'banger',
];

// ── Tokens ───────────────────────────────────────────────────────────────────

const MAX_NGRAM = 4;

function tokensOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9&'\-\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

type Hit =
  | { kind: 'genre'; word: GenreWord }
  | { kind: 'mood'; vibe: VibeTag }
  | { kind: 'level'; level: 1 | 2 | 3 }
  | { kind: 'tempo'; tempo: 'slow' | 'fast' }
  | { kind: 'form'; form: '12-bar' };

/**
 * A phrase's reading. A word on two lists reads as the first: "punk" a
 * genre (which carries rebellious), "complex" a level (as styleParser reads
 * it), "driving" a tempo.
 */
function lookup(phrase: string): Hit | null {
  if (phrase in GENRE_WORDS)
    return { kind: 'genre', word: GENRE_WORDS[phrase] };
  if (phrase in LEVEL_WORDS)
    return { kind: 'level', level: LEVEL_WORDS[phrase] };
  if (phrase in TEMPO_WORDS)
    return { kind: 'tempo', tempo: TEMPO_WORDS[phrase] };
  if (phrase in MOOD_WORDS) return { kind: 'mood', vibe: MOOD_WORDS[phrase] };
  if (phrase in FORM_WORDS) return { kind: 'form', form: FORM_WORDS[phrase] };
  return null;
}

/** Every phrase matched, longest first at each word, left to right. */
function hitsOf(tokens: string[]): { phrase: string; hit: Hit }[] {
  const hits: { phrase: string; hit: Hit }[] = [];
  let i = 0;
  while (i < tokens.length) {
    let found = false;
    for (let n = Math.min(MAX_NGRAM, tokens.length - i); n >= 1; n--) {
      const phrase = tokens.slice(i, i + n).join(' ');
      const hit = lookup(phrase);
      if (hit) {
        hits.push({ phrase, hit });
        i += n;
        found = true;
        break;
      }
    }
    if (!found) i++;
  }
  return hits;
}

// ── Key, tempo, meter ────────────────────────────────────────────────────────

const LETTER_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** 'sharp' / '#' / '♯' → 1, 'flat' / 'b' / '♭' → -1. */
function accidentalOf(raw: string | undefined): number {
  if (!raw) return 0;
  const a = raw.trim().toLowerCase();
  if (a === '#' || a === '♯' || a === 'sharp' || a === '-sharp') return 1;
  if (a === 'b' || a === '♭' || a === 'flat' || a === '-flat') return -1;
  return 0;
}

interface KeyRead {
  tonicPc: number | null;
  tonicLabel: string | null;
  mode: PromptMode | null;
  phrase: string;
}

function keyOf(letter: string, accidental: string | undefined, mode?: string) {
  const L = letter.toUpperCase();
  const shift = accidentalOf(accidental);
  const tonicPc = (((LETTER_PC[L] + shift) % 12) + 12) % 12;
  const tonicLabel = L + (shift === 1 ? '#' : shift === -1 ? 'b' : '');
  const m = mode?.trim().toLowerCase();
  return {
    tonicPc,
    tonicLabel,
    mode: m ? (MODE_WORDS[m] ?? null) : null,
  };
}

const ACC = String.raw`(#|♯|b|♭|-?sharp|-?flat|\s+sharp|\s+flat)?`;

/** Mode words a key can carry, longest first ('harmonic minor' before 'minor'). */
const MODE_ALT = Object.keys(MODE_WORDS)
  .filter((w) => w !== 'm')
  .sort((a, b) => b.length - a.length)
  .join('|');

/** Mode words read on their own, without a tonic: not 'min' ("3 min") or 'maj'. */
const MODE_ONLY_ALT = Object.keys(MODE_WORDS)
  .filter((w) => w !== 'm' && w !== 'min' && w !== 'maj')
  .sort((a, b) => b.length - a.length)
  .join('|');

const IN_KEY = new RegExp(
  String.raw`\b(?:in|key of)\s+([A-Ga-g])${ACC}(?:\s*(${MODE_ALT}|m))?(?![A-Za-z#♯♭])`,
  'i',
);
const NAMED_KEY = new RegExp(
  String.raw`\b([A-G])(#|♯|b|♭)?\s*(${MODE_ALT})(?![a-z])`,
);
const CHORD_LIKE = /(?:^|[^A-Za-z'])([A-G])(#|♯|b|♭)?(m)?(?![A-Za-z#♯♭])/g;
const MODE_ONLY = new RegExp(String.raw`\b(${MODE_ONLY_ALT})\b`, 'i');
const MODE_WORD_ANY = new RegExp(String.raw`\b(${MODE_ALT})\b`, 'gi');

/**
 * The key named: "in D Dorian", "in a minor", "key of Bb", "F#m", "Eb
 * major". A lone "a" or "b" is never a key ("make a beat"): a lowercase
 * letter needs a mode word after it, and a capital on its own outside "in …"
 * needs an accidental or an "m". "In Brazil" is not B.
 */
function readKey(raw: string): KeyRead | null {
  // Mode words in any case ("C Minor"), the note letters as written.
  const text = raw.replace(MODE_WORD_ANY, (w) => w.toLowerCase());
  const inKey = IN_KEY.exec(text);
  if (inKey) {
    const [phrase, letter, acc, mode] = inKey;
    const lower = letter === letter.toLowerCase();
    if (!lower || (mode && mode !== 'm')) {
      return { ...keyOf(letter, acc, mode), phrase: phrase.trim() };
    }
  }
  const named = NAMED_KEY.exec(text);
  if (named) {
    const [phrase, letter, acc, mode] = named;
    return { ...keyOf(letter, acc, mode), phrase: phrase.trim() };
  }
  for (const m of text.matchAll(CHORD_LIKE)) {
    const [, letter, acc, minor] = m;
    if (!acc && !minor) continue;
    return {
      ...keyOf(letter, acc, minor ? 'minor' : undefined),
      phrase: `${letter}${acc ?? ''}${minor ?? ''}`,
    };
  }
  const modeOnly = MODE_ONLY.exec(text);
  if (modeOnly) {
    return {
      tonicPc: null,
      tonicLabel: null,
      mode: MODE_WORDS[modeOnly[1].toLowerCase()] ?? null,
      phrase: modeOnly[1],
    };
  }
  return null;
}

const BPM_MIN = 40;
const BPM_MAX = 220;

/** "80 BPM", "at 92": a number of beats, never a decade ("80s"). */
function readBpm(text: string): { bpm: number; phrase: string } | null {
  const m =
    /\b(\d{2,3})\s*(?:bpm|beats per minute)\b/i.exec(text) ??
    /\bat\s+(\d{2,3})\b(?!\s*(?:s\b|'s|%))/i.exec(text);
  if (!m) return null;
  const bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Number(m[1])));
  return { bpm, phrase: m[0] };
}

function readMeter(text: string): [number, number] | null {
  if (/\b3\/4\b|\bwaltz\b/i.test(text)) return [3, 4];
  if (/\b6\/8\b/i.test(text)) return [6, 8];
  return null;
}

// ── The reading ──────────────────────────────────────────────────────────────

export function parseMusicPrompt(raw: string): MusicPrompt {
  const text = raw.trim().slice(0, PROMPT_TEXT_MAX);
  const matched: string[] = [];
  let genre: PromptGenre | null = null;
  let flavor: PromptFlavor | null = null;
  const vibes: VibeTag[] = [];
  const namedMoods: VibeTag[] = [];
  let level: 1 | 2 | 3 | null = null;
  let tempoWord: 'slow' | 'fast' | null = null;
  let form: '12-bar' | null = null;
  const addVibe = (v: VibeTag) => {
    if (!vibes.includes(v)) vibes.push(v);
  };

  for (const { phrase, hit } of hitsOf(tokensOf(text))) {
    matched.push(phrase);
    switch (hit.kind) {
      case 'genre':
        // A ballad is a feel within the genre named ("gospel ballad",
        // "jazz ballad"); on its own, a pop ballad.
        if (hit.word.flavor === 'ballad' && genre) {
          flavor ??= 'ballad';
          break;
        }
        genre = hit.word.genre;
        if (hit.word.flavor) flavor = hit.word.flavor;
        if (hit.word.vibe) addVibe(hit.word.vibe);
        break;
      case 'mood':
        addVibe(hit.vibe);
        if (!namedMoods.includes(hit.vibe)) namedMoods.push(hit.vibe);
        break;
      case 'level':
        level = hit.level;
        break;
      case 'tempo':
        tempoWord = hit.tempo;
        break;
      case 'form':
        form = hit.form;
        break;
    }
  }
  // A 12-bar is a blues unless another genre is named.
  if (form === '12-bar' && !genre) genre = 'blues';

  const key = readKey(text);
  if (key) matched.push(key.phrase);
  const bpm = readBpm(text);
  if (bpm) matched.push(bpm.phrase);
  const timeSignature = readMeter(text);

  return {
    text,
    genre,
    flavor,
    vibes,
    namedMoods,
    level,
    tonicPc: key?.tonicPc ?? null,
    tonicLabel: key?.tonicLabel ?? null,
    mode: key?.mode ?? null,
    bpm: bpm?.bpm ?? null,
    tempoWord,
    timeSignature,
    form,
    matched,
  };
}

/** Whether anything in the text was read: a genre, mood, key, tempo… */
export const readsAnything = (p: MusicPrompt): boolean => p.matched.length > 0;

function hasPhrase(text: string, phrases: readonly string[]): boolean {
  const padded = ` ${tokensOf(text).join(' ')} `;
  return phrases.some((p) => padded.includes(` ${p} `));
}

/**
 * Whether the text asks for music to be made (a song prompt for the
 * Studio), not a question to answer: a making verb with something to make
 * ("write a 12-bar blues", "make a sad beat"), a genre or mood with
 * something to make ("a chill pop song") or with a key or tempo ("funk in E
 * at 100 bpm"). "Teach me funk" and "where did reggae come from?" are not.
 */
export function looksLikeMusicPrompt(text: string): boolean {
  const p = parseMusicPrompt(text);
  const styled = p.genre !== null || p.vibes.length > 0 || p.form !== null;
  const noun = hasPhrase(text, MUSIC_NOUNS);
  if (hasPhrase(text, MAKE_VERBS)) return styled || noun;
  return styled && (noun || p.tonicPc !== null || p.bpm !== null);
}
