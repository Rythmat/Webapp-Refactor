import type { ChordProgressionEntry } from '@/curriculum/data/chordProgressionLibrary';
import { loadChordProgressions } from '@/curriculum/data/loaders';
import { echoRandom } from '@/curriculum/engine/echo/random';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import { VIBE_INFO, type VibeTag } from '@/curriculum/engine/progressionRules';
import {
  BAND_SECTION,
  loadV2Flow,
  type FlowLoader,
} from '@/features/practiceTracks/genre/bandPracticeTrack';
import {
  buildGenrePracticeTrack,
  type GenrePracticeTrackResult,
} from '@/features/practiceTracks/genre/buildGenrePracticeTrack';
import { withSeededRandom } from '@/lib/random/withSeededRandom';
import {
  FLAVOR_LABELS,
  GENRE_LABELS,
  parseMusicPrompt,
  type PromptGenre,
  type PromptMode,
} from './parseMusicPrompt';
import { pickProgression, type PickedProgression } from './pickProgression';
import { planPrompt, type PromptPlan } from './planPrompt';
import {
  drumsFor,
  loadGroove as loadLibraryGroove,
  tempoInGroove,
  tileGroove,
  type GrooveLoader,
} from './promptGroove';
import { recipeFor, type PromptRecipe } from './promptRecipes';

export { FLAVOR_LABELS, GENRE_LABELS } from './parseMusicPrompt';

// ── A song from a prompt (owner, 2026-10-23) ────────────────────────────────
//
// The prompt read (parseMusicPrompt), what it left out chosen (planPrompt),
// a progression the library tags for its moods and style (pickProgression),
// and the console's stylistic MIDI to play it (promptRecipes): the band's
// drums, bass and chords, built by the Practice Track engine over the
// progression in the prompt's key and tempo (buildGenrePracticeTrack). The
// same text and seed give the same song: every choice and every note goes
// through the seed.

export interface PromptSongReading {
  /** The style it plays: 'Lo-fi', 'Bossa Nova', 'The Pocket'. */
  styleName: string;
  /** 'D Dorian', 'Bb major'. */
  keyName: string;
  bpm: number;
  chords: string[];
  progressionId: number | null;
  /** The words the prompt was read by. */
  matched: string[];
  /** What the prompt didn't say and the song chose. */
  defaulted: ('genre' | 'key' | 'mode' | 'tempo')[];
  /** Nothing in the prompt was read: a starting point instead. */
  fallback: boolean;
  /** A meter asked for that the song doesn't play yet (it's in 4/4). */
  meterAsked: [number, number] | null;
  /** The Grooves library's groove the drums play, if they play one. */
  groove: string | null;
}

export interface PromptSong {
  track: GenrePracticeTrackResult;
  genre: PromptGenre;
  genreLabel: string;
  seed: number;
  /** "Melancholic Lo-fi in D Dorian". */
  projectName: string;
  /** The loop's length: 12 bars for a 12-bar blues, else the track's. */
  loopTicks: number;
  reading: PromptSongReading;
}

export interface BuildPromptSongOptions {
  seed: number;
  loadFlow?: FlowLoader;
  loadLibrary?: () => Promise<readonly ChordProgressionEntry[]>;
  loadGroove?: GrooveLoader;
}

export const MODE_NAMES: Record<PromptMode, string> = {
  ionian: 'major',
  aeolian: 'minor',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
};

const capitalized = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1);

/** What the song's style is called: the flavor asked for, else the recipe's. */
export function styleNameOf(plan: PromptPlan, recipe: PromptRecipe): string {
  if (plan.flavor && FLAVOR_LABELS[plan.flavor]) {
    // "Jazz Ballad", not "Ballad", when the ballad is jazz's.
    return plan.flavor === 'ballad' && plan.genre !== 'pop'
      ? `${GENRE_LABELS[plan.genre]} Ballad`
      : FLAVOR_LABELS[plan.flavor]!;
  }
  return recipe.kind === 'band' ? GENRE_LABELS[plan.genre] : recipe.name;
}

/** The recipe's tempo, in the first mood's range, slowed or sped as asked. */
export function tempoFor(plan: PromptPlan, recipe: PromptRecipe): number {
  const asked = plan.prompt.bpm;
  if (asked !== null) return asked;
  let [low, high] =
    recipe.kind === 'band'
      ? [recipe.style.bpm, recipe.style.bpm]
      : [recipe.tempo[0], recipe.tempo[1]];
  const vibe: VibeTag | undefined = plan.vibes[0];
  if (vibe) {
    const [vLow, vHigh] = VIBE_INFO[vibe].tempoRange;
    // Only where the mood and the style overlap; else the style's own.
    if (Math.max(low, vLow) <= Math.min(high, vHigh)) {
      low = Math.max(low, vLow);
      high = Math.min(high, vHigh);
    }
  }
  let bpm = Math.round((low + high) / 2);
  if (plan.prompt.tempoWord === 'slow') bpm = Math.round(bpm * 0.85);
  if (plan.prompt.tempoWord === 'fast') bpm = Math.round(bpm * 1.15);
  return Math.min(220, Math.max(40, bpm));
}

const MAX_TRIES = 4;

/**
 * The prompt's song, built and ready for the Studio; null when no band or
 * progression the console has could play it. Async for the loading only:
 * the build itself is synchronous, under the seed.
 */
export async function buildPromptSong(
  text: string,
  {
    seed,
    loadFlow = loadV2Flow,
    loadLibrary = loadChordProgressions,
    loadGroove = loadLibraryGroove,
  }: BuildPromptSongOptions,
): Promise<PromptSong | null> {
  const prompt = parseMusicPrompt(text);
  const rng = echoRandom(seed);
  const plan = planPrompt(prompt, rng);
  const [library, recipe] = await Promise.all([
    loadLibrary(),
    pairingsReady.then(() => recipeFor(plan, rng, loadFlow)),
  ]);
  if (!recipe) return null;
  const flow = await (recipe.kind === 'band'
    ? loadFlow(recipe.style.genre, recipe.style.level)
    : loadFlow(recipe.host.genre, recipe.host.level));
  if (!flow) return null;

  // The groove first, then the tempo: a new song plays at a tempo its
  // groove was written for (within ten percent of the groove's own), the
  // style's and the mood's tempo pulling within that, unless the prompt
  // names one.
  const wanted = tempoFor(plan, recipe);
  const groove = drumsFor(text, plan.genre, plan.flavor, wanted, rng);
  const bpm = prompt.bpm ?? (groove ? tempoInGroove(groove, wanted) : wanted);
  const tried = new Set<number>();
  let built: GenrePracticeTrackResult | null = null;
  let picked: PickedProgression | null = null;
  for (let attempt = 0; attempt < MAX_TRIES && !built; attempt++) {
    picked = pickProgression(library, plan, rng, tried);
    if (picked.id !== null) tried.add(picked.id);
    const chords = picked.chords;
    built = withSeededRandom(seed ^ 0x9e3779b9, () =>
      buildGenrePracticeTrack(flow, BAND_SECTION, {
        chords,
        key: { tonicPc: plan.tonicPc, mode: plan.mode, label: plan.tonicLabel },
        bpm,
        followChords: true,
        ...(recipe.kind === 'band'
          ? {
              styleId: recipe.style.styleId,
              band: { id: recipe.bandId, variation: recipe.style.variation },
            }
          : { playableBand: recipe.band, swing: 50 }),
      }),
    );
    // A loop the engine read only partly is another progression's turn.
    if (built && built.chordCycle.length !== chords.length) built = null;
    if (picked.id === null) break;
  }
  if (!built || !picked) return null;

  // The drums: a groove of the style from the Grooves library, over the
  // whole loop, in place of the band's (promptGroove.ts).
  const grooveEvents = groove ? await loadGroove(groove.id) : null;
  if (groove && grooveEvents?.length) {
    const barLength = built.loopTicks / 16;
    built = {
      ...built,
      clips: {
        ...built.clips,
        drums: {
          id: crypto.randomUUID(),
          name: groove.name,
          startTick: 0,
          durationTicks: built.loopTicks,
          events: tileGroove(grooveEvents, built.loopTicks, barLength),
        },
      },
      layerClips: built.layerClips.filter((l) => l.part !== 'drums'),
    };
  }

  const twelveBar = prompt.form === '12-bar';
  const styleName = twelveBar ? '12-Bar Blues' : styleNameOf(plan, recipe);
  // A 12-bar blues is in its tonic ("in E"), not in E Mixolydian.
  const keyName = twelveBar
    ? plan.tonicLabel
    : `${plan.tonicLabel} ${MODE_NAMES[plan.mode]}`;
  // The mood named ("sad"), not one the style carries (lo-fi's cool).
  const named = prompt.namedMoods[0];
  const mood = named ? `${capitalized(named)} ` : '';
  const projectName = `${mood}${styleName} in ${keyName}`.slice(0, 60);
  const barTicks = built.loopTicks / 16;
  const defaulted: PromptSongReading['defaulted'] = [...plan.defaulted];
  if (prompt.bpm === null) defaulted.push('tempo');

  return {
    track: built,
    genre: plan.genre,
    genreLabel: GENRE_LABELS[plan.genre],
    seed,
    projectName,
    loopTicks:
      prompt.form === '12-bar' ? Math.round(12 * barTicks) : built.loopTicks,
    reading: {
      styleName,
      keyName,
      bpm: built.bpm,
      chords: picked.chords,
      progressionId: picked.id,
      matched: prompt.matched,
      defaulted,
      fallback: plan.fallback,
      meterAsked: prompt.timeSignature,
      groove: groove && grooveEvents?.length ? groove.name : null,
    },
  };
}
