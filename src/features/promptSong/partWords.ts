// ── The words a Studio prompt names a part or a section by ─────────────────
//
// No runtime imports: the prompt bar reads them as the student types (its
// chip follows "…the bridge"), and the editor's start mustn't load the
// generator (buildPromptPart.ts) for that.

/** The parts a prompt can add. */
export type PromptPart = 'drums' | 'bass' | 'chords';

const PART_WORDS: Record<string, PromptPart[]> = {
  drum: ['drums'],
  drums: ['drums'],
  beat: ['drums'],
  beats: ['drums'],
  percussion: ['drums'],
  bass: ['bass'],
  bassline: ['bass'],
  'bass line': ['bass'],
  chord: ['chords'],
  chords: ['chords'],
  keys: ['chords'],
  piano: ['chords'],
  rhodes: ['chords'],
  comping: ['chords'],
  pad: ['chords'],
  pads: ['chords'],
  harmony: ['chords'],
  progression: ['chords'],
  groove: ['drums', 'bass'],
  'rhythm section': ['drums', 'bass', 'chords'],
  band: ['drums', 'bass', 'chords'],
  backing: ['drums', 'bass', 'chords'],
  accompaniment: ['drums', 'bass', 'chords'],
  jam: ['drums', 'bass', 'chords'],
};
const MELODY_WORDS = ['melody', 'lead', 'riff', 'topline', 'hook', 'solo'];

export const ORDER: PromptPart[] = ['drums', 'bass', 'chords'];

/** The parts the text names; null when it names none. */
export function partsOf(text: string): PromptPart[] | null {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const found = new Set<PromptPart>();
  for (let i = 0; i < words.length; i++) {
    const two = `${words[i]} ${words[i + 1] ?? ''}`;
    for (const part of PART_WORDS[two] ?? PART_WORDS[words[i]] ?? []) {
      found.add(part);
    }
  }
  return found.size ? ORDER.filter((p) => found.has(p)) : null;
}

/** The song sections a prompt can name, as SongSection types. */
const SECTION_WORDS: Record<string, string> = {
  intro: 'intro',
  verse: 'verse',
  'pre-chorus': 'pre-chorus',
  prechorus: 'pre-chorus',
  'pre chorus': 'pre-chorus',
  chorus: 'chorus',
  refrain: 'chorus',
  bridge: 'bridge',
  'middle eight': 'bridge',
  outro: 'outro',
  ending: 'outro',
  solo: 'solo',
  interlude: 'interlude',
  breakdown: 'breakdown',
  'build-up': 'build-up',
  buildup: 'build-up',
  drop: 'drop',
  hook: 'hook',
};

/** The song section the text names ("write a bridge"), as a section type. */
export function sectionOf(text: string): string | null {
  const t = text.toLowerCase();
  const word = Object.keys(SECTION_WORDS)
    .sort((a, b) => b.length - a.length)
    .find((w) => new RegExp(`\\b${w}\\b`).test(t));
  return word ? SECTION_WORDS[word] : null;
}

/**
 * The section the text names, and whether it asks for a new one ("a new
 * chorus part", "a new bridge"): a new one goes after the song's end.
 */
export function sectionRequest(
  text: string,
): { type: string; isNew: boolean } | null {
  const type = sectionOf(text);
  if (!type) return null;
  const words = Object.entries(SECTION_WORDS)
    .filter(([, t]) => t === type)
    .map(([w]) => w.replace(/[-\s]/g, '[-\\s]?'))
    .join('|');
  const isNew = new RegExp(
    `\\bnew\\s+(?:[a-z-]+\\s+)?(?:${words})\\b`,
    'i',
  ).test(text);
  return { type, isNew };
}

/** Whether the text asks for a melody, which the bar can't write yet. */
export const asksForMelody = (text: string): boolean =>
  new RegExp(`\\b(${MELODY_WORDS.join('|')})\\b`, 'i').test(text);
