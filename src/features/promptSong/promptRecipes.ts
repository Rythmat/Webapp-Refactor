import type { PlayableBand } from '@/curriculum/engine/band/band';
import { getLiveBand, LIVE_ITEMS } from '@/curriculum/engine/band/registry';
import { preloadStudioGroove } from '@/curriculum/engine/drumGrooves/registry';
import { pickOne, type EchoRandom } from '@/curriculum/engine/echo/random';
import { isCommonTime } from '@/curriculum/engine/meter';
import {
  bandStyles,
  loadV2Flow,
  type BandStyleOption,
  type FlowLoader,
} from '@/features/practiceTracks/genre/bandPracticeTrack';
import type { PromptFlavor, PromptGenre } from './parseMusicPrompt';
import type { PromptPlan } from './planPrompt';

// ── Who plays the prompt's song (owner, 2026-10-23) ────────────────────────
//
// The console's stylistic MIDI: its Bands, and the drum grooves and bass
// lines they're made of (console → Bands, Grooves, Bass Lines).
//
//   band   a genre with a live band whose lessons are written (Pop, Funk,
//          Hip Hop, Latin L1) plays one of its styles, picked by the
//          prompt's flavor, level or mood: trap, boom bap, the pocket…
//   combo  any other genre plays a band put together from the libraries:
//          the first live groove and bass line on its list, over the host
//          lesson's chords (a genre with no lessons yet lends none of its
//          own). A groove or bass line published in the console later takes
//          its place at the front of its list with no code change.

export type PromptRecipe =
  | {
      kind: 'band';
      bandId: string;
      style: BandStyleOption;
      /** What the song's style is called: 'Trap', 'The Pocket'. */
      name: string;
    }
  | {
      kind: 'combo';
      /** The lesson whose chords and register the band plays over. */
      host: { genre: PromptGenre; level: 1 };
      band: PlayableBand;
      tempo: readonly [number, number];
      name: string;
    };

/** The live bands a genre plays, by genre. */
const GENRE_BANDS: Partial<Record<PromptGenre, string>> = {
  pop: 'pop-band-1',
  funk: 'funk-band-1',
  'hip-hop': 'hip-hop-band-1',
  latin: 'latin-band-1',
};

/** Latin flavors no written lesson plays: they're combos. */
const LATIN_COMBO_FLAVORS = new Set<PromptFlavor>([
  'bossa',
  'salsa',
  'merengue',
]);

/** The band variation a flavor, a level and a mood ask for, in order. */
function preferredVariations(plan: PromptPlan): string[] {
  const { genre, flavor, level, vibes } = plan;
  const mellow = vibes.some((v) =>
    ['cool', 'melancholic', 'dreamy', 'emotional'].includes(v),
  );
  switch (genre) {
    case 'hip-hop': {
      const byFlavor =
        flavor === 'trap'
          ? 'l1-trap'
          : flavor === 'boom-bap'
            ? 'l2-boom-bap'
            : flavor === 'lofi' || mellow
              ? 'l3-conscious'
              : null;
      const byLevel = ['l1-trap', 'l2-boom-bap', 'l3-conscious'][level - 1];
      return [byFlavor, byLevel, 'l2-boom-bap'].filter((v): v is string => !!v);
    }
    case 'pop': {
      const byFlavor =
        flavor === 'ballad'
          ? 'l1-singable'
          : flavor === 'dance'
            ? 'l2-craft'
            : null;
      const byLevel = ['l1-singable', 'l2-craft', 'l3-artistry'][level - 1];
      return [byFlavor, byLevel].filter((v): v is string => !!v);
    }
    case 'funk':
      return [['l1-pocket', 'l2-syncopation', 'l3-deep-groove'][level - 1]];
    case 'latin': {
      if (flavor === 'reggaeton') return ['l1-reggaeton'];
      if (flavor === 'cumbia') return ['l1-cumbia'];
      if (vibes.some((v) => v === 'dark' || v === 'sexy'))
        return ['l1-reggaeton'];
      if (vibes.some((v) => v === 'happy' || v === 'fun')) return ['l1-cumbia'];
      return [];
    }
    default:
      return [];
  }
}

interface ComboSpec {
  /** Grooves, best first: the first live one plays. */
  drums: readonly string[];
  /** Bass lines, best first. */
  bass: readonly string[];
  host: PromptGenre;
  tempo: readonly [number, number];
  name: string;
}

const combo = (
  name: string,
  drums: string[],
  bass: string[],
  host: PromptGenre,
  tempo: [number, number],
): ComboSpec => ({ name, drums, bass, host, tempo });

/** Band-less genres and flavors, as the console's libraries can play them. */
const COMBOS: Record<string, ComboSpec> = {
  rock: combo(
    'Rock',
    ['straight-8', 'groove-rock-2', 'groove-rock-3'],
    ['driving-eighths', 'just-roots'],
    'pop',
    [100, 140],
  ),
  'rock/punk': combo(
    'Punk',
    ['groove-punk-1', 'groove-punk-2', 'straight-8'],
    ['driving-eighths'],
    'pop',
    [160, 190],
  ),
  'rock/indie': combo(
    'Indie',
    ['groove-indie-1', 'groove-indie-2', 'straight-8'],
    ['driving-eighths', 'just-roots'],
    'pop',
    [100, 130],
  ),
  blues: combo(
    'Blues',
    ['blues-shuffle'],
    ['boogie', 'walking-1-chord-per-bar'],
    'funk',
    [70, 110],
  ),
  jazz: combo(
    'Jazz',
    ['jazz-swing-feathered', 'jazz-swing-kick-on-1'],
    ['walking-1-chord-per-bar', 'walking-2-chords-per-bar'],
    'funk',
    [100, 180],
  ),
  'jazz/ballad': combo(
    'Jazz Ballad',
    ['jazz-ballad-brushes'],
    ['two-feel'],
    'funk',
    [60, 80],
  ),
  'neo-soul': combo(
    'Neo-Soul',
    ['neo_soul_1_copy', 'groove-neosoul-1'],
    ['hip-hop-conscious', 'just-roots'],
    'funk',
    [65, 90],
  ),
  rnb: combo(
    'R&B',
    ['groove-rnb-1', 'groove-rnb-2', 'neo_soul_1_copy'],
    ['just-roots', 'hip-hop-conscious'],
    'pop',
    [65, 100],
  ),
  'rnb/gospel': combo(
    'Gospel',
    ['neo_soul_gospel_copy', 'groove-rnb-1'],
    ['just-roots'],
    'pop',
    [65, 100],
  ),
  electronic: combo(
    'House',
    ['dance-pop'],
    ['octave-disco', 'driving-dance-pop-1-copy'],
    'pop',
    [118, 128],
  ),
  'electronic/dnb': combo(
    'Drum and Bass',
    ['drum-n-bass'],
    ['just-roots'],
    'pop',
    [160, 175],
  ),
  african: combo(
    'Afrobeat',
    ['afrobeat_1_fela'],
    ['funk', 'just-roots'],
    'funk',
    [100, 125],
  ),
  folk: combo(
    'Folk',
    ['train_1_copy', 'groove-train-1'],
    ['just-roots'],
    'pop',
    [90, 130],
  ),
  'jam-band': combo(
    'Jam Band',
    ['funk-16ths', 'straight-8'],
    ['funk', 'just-roots'],
    'funk',
    [95, 125],
  ),
  'latin/bossa': combo(
    'Bossa Nova',
    ['bossa-nova', 'groove-bossa-1'],
    ['bossa'],
    'latin',
    [110, 140],
  ),
  'latin/salsa': combo(
    'Salsa',
    ['salsa_3_2_copy', 'salsa-3-2'],
    ['cumbia-1'],
    'latin',
    [90, 120],
  ),
  'latin/merengue': combo(
    'Merengue',
    ['merengue_3_2_copy'],
    ['cumbia-1'],
    'latin',
    [120, 150],
  ),
  // No one-drop groove is in the console yet: a laid-back beat stands in
  // until 'reggae-one-drop' is published there.
  reggae: combo(
    'Reggae',
    ['reggae-one-drop', 'laid_back'],
    ['just-roots'],
    'pop',
    [70, 90],
  ),
};

const comboFor = (genre: PromptGenre, flavor: PromptFlavor | null) =>
  (flavor && COMBOS[`${genre}/${flavor}`]) ?? COMBOS[genre] ?? COMBOS.rock;

/** The first item on the list the console has published, in 4/4. */
async function firstLiveGroove(ids: readonly string[]) {
  for (const id of ids) {
    await preloadStudioGroove(id);
    const groove = LIVE_ITEMS.groove(id);
    if (groove && isCommonTime(groove.timeSignature ?? [4, 4])) return id;
  }
  return null;
}

function firstLiveBassLine(ids: readonly string[]) {
  return (
    ids.find((id) => {
      const line = LIVE_ITEMS.bassLine(id);
      return line && isCommonTime(line.timeSignature ?? [4, 4]);
    }) ?? null
  );
}

/** A band of a groove and a bass line, as a lesson's band plays. */
function comboBand(spec: ComboSpec, drums: string, bass: string): PlayableBand {
  return {
    id: `prompt-${spec.name.toLowerCase().replace(/\W+/g, '-')}`,
    name: spec.name,
    status: 'live',
    timeSignature: [4, 4],
    tempo: Math.round((spec.tempo[0] + spec.tempo[1]) / 2),
    layers: [
      {
        id: 'drums',
        name: 'Drums',
        instrument: 'drums',
        source: { kind: 'groove', id: drums },
      },
      {
        id: 'bass',
        name: 'Bass',
        instrument: 'bass',
        source: { kind: 'bassLine', id: bass },
      },
    ],
  };
}

async function comboRecipe(
  genre: PromptGenre,
  flavor: PromptFlavor | null,
): Promise<PromptRecipe | null> {
  const spec = comboFor(genre, flavor);
  const drums = await firstLiveGroove(spec.drums);
  const bass = firstLiveBassLine(spec.bass);
  if (!drums || !bass) return null;
  return {
    kind: 'combo',
    host: { genre: spec.host, level: 1 },
    band: comboBand(spec, drums, bass),
    tempo: spec.tempo,
    name: spec.name,
  };
}

/** Who plays the prompt's song; null when nothing in the console can. */
export async function recipeFor(
  plan: PromptPlan,
  rng: EchoRandom,
  loadFlow: FlowLoader = loadV2Flow,
): Promise<PromptRecipe | null> {
  const bandId = GENRE_BANDS[plan.genre];
  const latinCombo =
    plan.genre === 'latin' &&
    plan.flavor !== null &&
    LATIN_COMBO_FLAVORS.has(plan.flavor);
  const band = bandId && !latinCombo ? getLiveBand(bandId) : undefined;
  if (band) {
    const styles = await bandStyles(band, loadFlow);
    if (styles.length) {
      const wanted = preferredVariations(plan);
      const style =
        wanted
          .map((id) => styles.find((s) => s.variation === id))
          .find((s): s is BandStyleOption => !!s) ?? pickOne(rng, styles);
      return { kind: 'band', bandId: band.id, style, name: style.name };
    }
  }
  return (
    (await comboRecipe(plan.genre, plan.flavor)) ??
    (await comboRecipe('rock', null))
  );
}
