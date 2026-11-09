import type { AllSlices } from '@/daw/store';
import {
  FLAVOR_LABELS,
  GENRE_LABELS,
  parseMusicPrompt,
  type MusicPrompt,
  type PromptFlavor,
  type PromptGenre,
} from '@/features/promptSong/parseMusicPrompt';
import type { PromptPart } from '@/features/promptSong/partWords';
import { libraryNear } from '@/features/promptSong/promptGroove';
import { partContextOf, trackPartOf, type PromptSpot } from './promptSpot';

// ── What the bar suggests (owner, 2026-10-23) ──────────────────────────────
//
// Steps that fit the session: in its style — the prompt that started it
// ("Make a soulful R&B ballad"), else the project's name, which keeps the
// style ("R&B Ballad in Eb major"), else its genre — for the spot first,
// then what the song lacks: a part no track plays yet, a section it hasn't
// got ("Write an R&B bassline for a new chorus part"). Every one is
// something the bar can write: drums, a bass line, chords, for a section.
// Bars highlighted on a Drums, Bass or Chords track (owner, 2026-10-24):
// every suggestion is for that track's part, written into it.

type SuggestState = Pick<
  AllSlices,
  | 'tracks'
  | 'sections'
  | 'genre'
  | 'projectName'
  | 'rootNote'
  | 'mode'
  | 'bpm'
  | 'chordRegions'
  | 'loopEnabled'
  | 'loopStart'
  | 'loopEnd'
  | 'selectedTrackId'
  | 'timeSignatureNumerator'
  | 'timeSignatureDenominator'
  | 'detectedKeyRootPc'
  | 'detectedMode'
>;

/** The session's style, as the suggestions name it. */
export interface SessionStyle {
  /** For a part: "R&B", "Lo-fi", "Trap". */
  part: string;
  /** For a beat: "R&B ballad", "Lo-fi", "Trap". */
  groove: string;
  /** The style read, for the library's grooves of it. */
  genre: PromptGenre;
  flavor: PromptFlavor | null;
}

/** The first of the texts that names a genre, read; else the project genre. */
export function sessionStyleOf(
  texts: readonly (string | null | undefined)[],
  projectGenre: string | null,
): SessionStyle {
  let read: MusicPrompt | null = null;
  for (const text of texts) {
    if (!text) continue;
    const p = parseMusicPrompt(text);
    if (p.genre) {
      read = p;
      break;
    }
  }
  const genre =
    read?.genre ?? (projectGenre ? parseMusicPrompt(projectGenre).genre : null);
  const genreLabel = genre ? GENRE_LABELS[genre] : 'Pop';
  const flavor = read?.flavor ?? null;
  const flavorLabel = flavor ? FLAVOR_LABELS[flavor] : undefined;
  // A ballad or gospel is a feel of the genre; lo-fi, trap… are styles.
  const feel = flavor === 'ballad' || flavor === 'gospel';
  return {
    genre: genre ?? 'pop',
    flavor,
    part: flavorLabel && !feel ? flavorLabel : genreLabel,
    groove: flavorLabel
      ? feel
        ? `${genreLabel} ${flavorLabel.toLowerCase()}`
        : flavorLabel
      : genreLabel,
  };
}

/** "a" or "an" before a word, by its sound: an R&B, an EDM, a pop. */
export function article(word: string): 'a' | 'an' {
  if (/^[aeiou]/i.test(word)) return 'an';
  // An initialism read letter by letter: "an R&B", "an MC".
  if (/^[FHLMNRSX](?:[A-Z&]|$)/.test(word)) return 'an';
  return 'a';
}

const an = (word: string) => `${article(word)} ${word}`;

/** The sections a new one is suggested from, in the order songs reach them. */
const NEW_SECTIONS = ['chorus', 'bridge', 'pre-chorus', 'outro'] as const;

/**
 * Bars highlighted on a track that plays `part`: what to write into them,
 * in the session's style — the style's grooves by name for drums (the
 * library's nearest the tempo), plainer and busier takes, chords by mood.
 * Every word is one the part builder reads (parseMusicPrompt: levels,
 * moods, groove names), and none names another part.
 */
function trackSuggestions(
  part: PromptPart,
  style: SessionStyle,
  spot: PromptSpot,
  bpm: number,
): string[] {
  const P = style.part;
  const G = style.groove;
  const section = spot.section?.label.toLowerCase();
  const here = section ? `for the ${section}` : 'here';
  if (part === 'drums') {
    return [
      `Add ${an(G)} beat ${here}`,
      ...libraryNear(style.genre, style.flavor, bpm).map(
        (g) => `Add the ${g.name} beat ${here}`,
      ),
      `Add a simple ${G} beat ${here}`,
      `Add a busier ${G} beat ${here}`,
    ];
  }
  if (part === 'bass') {
    return [
      `Write ${an(P)} bassline ${section ? here : 'for these bars'}`,
      `Write a simple ${P} bassline ${here}`,
      `Write a busier ${P} bassline ${here}`,
    ];
  }
  return [
    spot.section?.type === 'bridge'
      ? 'Write chords for the bridge that take the song somewhere new'
      : `Write new ${P} chords ${section ? here : 'for these bars'}`,
    `Write dark ${P} chords ${here}`,
    `Write uplifting ${P} chords ${here}`,
    `Write dreamy ${P} chords ${here}`,
    `Write simple ${P} chords ${here}`,
  ];
}

/**
 * The bar's suggestions, the spot's first. `sessionPrompt` is the prompt
 * the session started from, if any.
 */
export function promptSuggestions(
  state: SuggestState,
  spot: PromptSpot,
  sessionPrompt: string | null = null,
): string[] {
  const style = sessionStyleOf(
    [sessionPrompt, state.projectName],
    state.genre ?? null,
  );
  const P = style.part;
  const G = style.groove;
  const out: string[] = [];
  const add = (text: string) => {
    if (!out.includes(text)) out.push(text);
  };

  const playing = (part: string) =>
    state.tracks.some(
      (t) =>
        trackPartOf(t) === part && t.midiClips.some((c) => c.events.length),
    );
  const hasDrums = playing('drums');
  const hasBass = playing('bass');
  const hasChords = playing('chords') || state.chordRegions.length > 0;
  const empty = !state.tracks.some(
    (t) => t.midiClips.length || t.audioClips.length,
  );

  // The spot first.
  const track = spot.trackId
    ? state.tracks.find((t) => t.id === spot.trackId)
    : undefined;
  const part = track ? trackPartOf(track) : null;
  if (spot.highlighted && part) {
    return trackSuggestions(part, style, spot, state.bpm);
  }
  if (empty) {
    add(`Start the song with ${G} drums, bass and chords`);
  } else if (spot.section) {
    const name = spot.section.label.toLowerCase();
    if (part === 'drums') add(`Add ${an(G)} beat to the ${name}`);
    else if (part === 'bass') add(`Write ${an(P)} bassline for the ${name}`);
    else if (spot.section.type === 'bridge')
      add('Write chords for the bridge that take the song somewhere new');
    else add(`Write new ${P} chords for the ${name}`);
  } else if (part === 'drums') {
    add(`Add ${an(G)} beat here`);
  } else if (part === 'bass') {
    add(`Write ${an(P)} bassline for these bars`);
  } else if (part === 'chords') {
    add(`Write ${P} chords for these bars`);
  } else if (!hasBass && partContextOf(state, spot).chords.length) {
    add(`Write ${an(P)} bassline for these bars`);
  } else if (!hasDrums && !hasBass && !hasChords) {
    add(`Add ${G} drums, bass and chords here`);
  }

  // What the song lacks: a part…
  const first = state.sections[0]?.label.toLowerCase();
  const where = first ? `the ${first}` : 'these bars';
  if (!hasBass) add(`Write ${an(P)} bassline for ${where}`);
  if (!hasDrums) add(`Add ${an(G)} beat to ${where}`);
  if (!hasChords) add(`Write ${P} chords for ${where}`);

  // …and a section.
  if (!empty) {
    const has = new Set(state.sections.map((s) => s.type));
    for (const type of NEW_SECTIONS) {
      if (has.has(type)) continue;
      if (type === 'chorus') {
        add(`Write ${an(P)} bassline for a new chorus part`);
        add('Write chords for a new chorus that lifts');
      } else if (type === 'bridge') {
        add('Write chords for a new bridge that leaves home');
      } else if (type === 'pre-chorus') {
        add('Write chords for a new pre-chorus that builds');
      } else {
        add(`Add ${G} drums and chords for a new outro`);
      }
    }
    // The sections it has, a part each.
    for (const section of state.sections.slice(0, 2)) {
      const name = section.label.toLowerCase();
      add(`Add ${an(G)} beat to the ${name}`);
      add(`Write ${an(P)} bassline for the ${name}`);
    }
  }
  return out;
}

/** The first suggestion: what the spot itself calls for. */
export function promptSuggestion(
  state: SuggestState,
  spot: PromptSpot,
  sessionPrompt: string | null = null,
): string {
  return promptSuggestions(state, spot, sessionPrompt)[0];
}
