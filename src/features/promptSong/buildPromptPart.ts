import type { ChordProgressionEntry } from '@/curriculum/data/chordProgressionLibrary';
import { loadChordProgressions } from '@/curriculum/data/loaders';
import { echoRandom } from '@/curriculum/engine/echo/random';
import type { ChordChange } from '@/curriculum/engine/genreGeneration/chordTimeline';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { MidiClip } from '@/daw/store/tracksSlice';
import {
  BAND_SECTION,
  loadV2Flow,
  type FlowLoader,
} from '@/features/practiceTracks/genre/bandPracticeTrack';
import {
  buildGenrePracticeTrack,
  type GenrePracticeTrackResult,
} from '@/features/practiceTracks/genre/buildGenrePracticeTrack';
import { backingPartSound } from '@/features/practiceTracks/genre/seedStudioFromGenrePracticeTrack';
import { withSeededRandom } from '@/lib/random/withSeededRandom';
import { MODE_NAMES, styleNameOf, tempoFor } from './buildPromptSong';
import {
  parseMusicPrompt,
  type MusicPrompt,
  type PromptMode,
} from './parseMusicPrompt';
import {
  asksForMelody,
  ORDER,
  partsOf,
  sectionRequest,
  type PromptPart,
} from './partWords';
import { pickProgression } from './pickProgression';
import { planPrompt } from './planPrompt';
import {
  drumsFor,
  loadGroove as loadLibraryGroove,
  tempoInGroove,
  tileGroove,
  type GrooveLoader,
} from './promptGroove';
import { recipeFor } from './promptRecipes';

export {
  asksForMelody,
  partsOf,
  sectionOf,
  sectionRequest,
  type PromptPart,
} from './partWords';

// ── A part for a spot on the timeline (owner, 2026-10-23) ──────────────────
//
// The Studio's prompt bar: the student picks a spot (the loop, or bars from
// the playhead, or a lane they right-clicked) and asks for a part — "add a
// bass line", "a funk beat here", "chords for these bars". The part is the
// console band's (promptRecipes.ts), in the project's key and tempo, over
// the chords the chord lane already has there; a lane with none there gets
// a progression the library tags for the prompt (pickProgression.ts),
// written to the lane with the part.

/** Where the part goes and what plays around it. */
export interface PartContext {
  startTick: number;
  lengthTicks: number;
  /** The part the selected track plays, when it plays one of them. */
  trackPart: PromptPart | null;
  /** The project's key; null when it has none yet. */
  tonicPc: number | null;
  mode: string | null;
  bpm: number;
  timeSignature: [number, number];
  /** The chord lane's changes in the spot, in ticks from its start. */
  chords: readonly ChordChange[];
  /** The project's genre ('Pop', 'Hip Hop', 'R&B'…), the style by default. */
  projectGenre: string | null;
  /**
   * What the session's style was named by: the prompt it started from, else
   * the project's name ("R&B Ballad in Eb major"). A prompt that names no
   * style of its own ("chords for a new chorus") keeps to it.
   */
  sessionText?: string | null;
  /**
   * The project has nothing on it yet: the part sets its tempo — within
   * its groove's range (promptGroove.ts), else the style's — unless the
   * prompt names one.
   */
  blank?: boolean;
  /** The song section the spot is ('bridge', 'chorus'…), if it is one. */
  sectionType?: string | null;
  /**
   * The song's other progressions, as chord symbols (its other sections'):
   * new chords stand apart from them.
   */
  otherProgressions?: readonly (readonly string[])[];
}

export interface BuiltPart {
  part: PromptPart;
  /** The clip's and a new track's name: 'Funk Bass', 'Trap Drums'. */
  name: string;
  /** A sound string (daw/instruments/soundString.ts) for a new track. */
  sound: string;
  /** 0–1, a band layer's own level. */
  volume?: number;
  /** Notes from the spot's start; as long as the spot. */
  clip: MidiClip;
}

export interface PromptPartResult {
  parts: BuiltPart[];
  /**
   * The chords the part was written over, a region a bar, in ticks from the
   * spot's start: for the chord lane when it had none there; null when the
   * part followed the lane's own.
   */
  chordRegions: ChordRegion[] | null;
  /** The key the part is in, for a project that had none yet. */
  newKey: { tonicPc: number; mode: PromptMode } | null;
  /** The tempo the part is at, for a blank project; null keeps the song's. */
  newBpm: number | null;
  /** The song section the prompt named ('bridge'), to mark the spot with. */
  section: string | null;
  /** The engine's build, for the parts' sounds. */
  track: GenrePracticeTrackResult;
  seed: number;
  reading: {
    styleName: string;
    keyName: string;
    chords: string[];
    bars: number;
    parts: PromptPart[];
    matched: string[];
    /** The Grooves library's groove the drums play, if they play one. */
    groove: string | null;
  };
}

/** Why a prompt can't add a part: the bar says so. */
export class PromptPartRefusal extends Error {
  constructor(
    readonly reason: 'meter' | 'melody' | 'nothing',
    message: string,
  ) {
    super(message);
  }
}

/** The longest spot a prompt fills: the engine writes sixteen bars. */
export const MAX_PART_BARS = 16;

/** Each tonic as the circle of fifths spells its key. */
const KEY_LABELS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

const DIATONIC: readonly PromptMode[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
];

/** The project's mode as one the engine plays: a scale with a minor third
 *  is read as minor, any other as major. */
function engineMode(mode: string | null): PromptMode {
  if (mode && (DIATONIC as readonly string[]).includes(mode)) {
    return mode as PromptMode;
  }
  return mode && /minor|locrian|phrygian/i.test(mode) ? 'aeolian' : 'ionian';
}

/** The symbol sounding at the start of each bar of the spot. */
function chordPerBar(
  changes: readonly ChordChange[],
  bars: number,
  barTicks: number,
): string[] {
  const out: string[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const at = bar * barTicks;
    const sounding = [...changes].reverse().find((c) => c.tick <= at);
    out.push((sounding ?? changes[0]).symbol);
  }
  return out;
}

const PART_NOUN: Record<PromptPart, string> = {
  drums: 'Drums',
  bass: 'Bass',
  chords: 'Chords',
};

/** A clip's notes cut to the spot. */
function cutToSpot(clip: MidiClip, name: string, length: number): MidiClip {
  return {
    ...clip,
    id: crypto.randomUUID(),
    name,
    startTick: 0,
    durationTicks: length,
    events: clip.events
      .filter((e) => e.startTick < length)
      .map((e) => ({
        ...e,
        durationTicks: Math.min(e.durationTicks, length - e.startTick),
      })),
  };
}

export interface BuildPromptPartOptions {
  seed: number;
  loadFlow?: FlowLoader;
  loadLibrary?: () => Promise<readonly ChordProgressionEntry[]>;
  loadGroove?: GrooveLoader;
}

/**
 * The part a prompt asks for at a spot. Async for the loading only; the
 * build is synchronous, under the seed. Throws PromptPartRefusal when the
 * bar can't add it (a metre other than 4/4, a melody, nothing to play).
 */
export async function buildPromptPart(
  text: string,
  context: PartContext,
  {
    seed,
    loadFlow = loadV2Flow,
    loadLibrary = loadChordProgressions,
    loadGroove = loadLibraryGroove,
  }: BuildPromptPartOptions,
): Promise<PromptPartResult> {
  const [num, den] = context.timeSignature;
  if (num !== 4 || den !== 4) {
    throw new PromptPartRefusal(
      'meter',
      `Parts are written in 4/4 for now; this song is in ${num}/${den}.`,
    );
  }
  const asked = partsOf(text);
  const request = sectionRequest(text);
  const named = request?.type ?? null;
  if (!asked && asksForMelody(text)) {
    throw new PromptPartRefusal(
      'melody',
      'Melodies aren’t ready yet. Try drums, a bass line or chords.',
    );
  }
  // "Write a bridge": a section named with no part is its chords.
  const parts =
    asked ??
    (named ? ['chords'] : context.trackPart ? [context.trackPart] : ORDER);
  // Chords asked for, or a section, are new chords for the spot, whatever
  // the lane has there; drums or a bass line follow the lane's.
  const wantsChords =
    (asked?.includes('chords') ?? false) || (!asked && !!named);
  const role = named ?? context.sectionType ?? null;

  // The style the prompt names, else the project's genre; the key the
  // project is in, else the prompt's or the style's.
  const read = parseMusicPrompt(text);
  const session = context.sessionText
    ? parseMusicPrompt(context.sessionText)
    : null;
  const sessionStyled = !read.genre && !!session?.genre;
  const projectKey = context.tonicPc !== null;
  const prompt: MusicPrompt = {
    ...read,
    genre:
      read.genre ??
      session?.genre ??
      (context.projectGenre
        ? parseMusicPrompt(context.projectGenre).genre
        : null),
    flavor: read.flavor ?? (sessionStyled ? session!.flavor : null),
    vibes: read.vibes.length || !sessionStyled ? read.vibes : session!.vibes,
    tonicPc: projectKey ? context.tonicPc : read.tonicPc,
    tonicLabel: projectKey ? KEY_LABELS[context.tonicPc!] : read.tonicLabel,
    mode: projectKey ? engineMode(context.mode) : read.mode,
  };
  const rng = echoRandom(seed);
  const plan = planPrompt(prompt, rng);
  const [library, recipe] = await Promise.all([
    loadLibrary(),
    pairingsReady.then(() => recipeFor(plan, rng, loadFlow)),
  ]);
  if (!recipe) {
    throw new PromptPartRefusal(
      'nothing',
      'Nothing in the library plays that.',
    );
  }
  const flow = await (recipe.kind === 'band'
    ? loadFlow(recipe.style.genre, recipe.style.level)
    : loadFlow(recipe.host.genre, recipe.host.level));
  if (!flow) {
    throw new PromptPartRefusal(
      'nothing',
      'Nothing in the library plays that.',
    );
  }

  // The groove the drums will play, picked before the tempo: on a blank
  // project the tempo is one the groove was written for, the style's and
  // the mood's pulling within that, unless the prompt names one; on a song
  // that has a tempo, the groove nearest it.
  const wanted = context.blank
    ? (read.bpm ?? tempoFor(plan, recipe))
    : context.bpm;
  const groove = parts.includes('drums')
    ? drumsFor(text, plan.genre, plan.flavor, wanted, rng)
    : null;
  const bpm = context.blank
    ? (read.bpm ?? (groove ? tempoInGroove(groove, wanted) : wanted))
    : context.bpm;

  const barTicks = 1920;
  const length = Math.min(
    MAX_PART_BARS * barTicks,
    Math.max(barTicks, Math.round(context.lengthTicks / barTicks) * barTicks),
  );
  const bars = length / barTicks;

  // The lane's chords where it has them and new ones weren't asked for;
  // else a progression for the prompt, apart from the song's others.
  const followsLane = context.chords.length > 0 && !wantsChords;
  const offBar = context.chords.some((c) => c.tick % barTicks !== 0);
  const chords = followsLane
    ? chordPerBar(context.chords, bars, barTicks)
    : pickProgression(library, plan, rng, undefined, {
        avoid: context.otherProgressions ?? [],
        role,
      }).chords;

  const built = withSeededRandom(seed ^ 0x9e3779b9, () =>
    buildGenrePracticeTrack(flow, BAND_SECTION, {
      chords,
      key: { tonicPc: plan.tonicPc, mode: plan.mode, label: plan.tonicLabel },
      bpm,
      followChords: true,
      ...(followsLane && offBar
        ? { timedChords: { changes: context.chords, length } }
        : {}),
      ...(recipe.kind === 'band'
        ? {
            styleId: recipe.style.styleId,
            band: { id: recipe.bandId, variation: recipe.style.variation },
          }
        : { playableBand: recipe.band, swing: 50 }),
    }),
  );
  if (!built) {
    throw new PromptPartRefusal(
      'nothing',
      'Nothing in the library plays that.',
    );
  }

  const styleName = styleNameOf(plan, recipe);
  const out: BuiltPart[] = [];
  for (const part of parts) {
    const own = built.clips[part];
    if (own?.events.length) {
      const name = `${styleName} ${PART_NOUN[part]}`;
      out.push({
        part,
        name,
        sound: backingPartSound(part, built),
        clip: cutToSpot(own, name, length),
      });
    }
    for (const layer of built.layerClips) {
      if (layer.part !== part || !layer.clip.events.length) continue;
      const name = `${styleName} ${layer.name}`;
      out.push({
        part,
        name,
        sound: layer.sound,
        volume: layer.volume,
        clip: cutToSpot(layer.clip, name, length),
      });
    }
  }
  // The drums: a groove of the style from the Grooves library, repeated
  // over the spot, in place of the band's (promptGroove.ts).
  let grooveName: string | null = null;
  if (groove) {
    const events = await loadGroove(groove.id);
    if (events?.length) {
      grooveName = groove.name;
      const drums: BuiltPart = {
        part: 'drums',
        name: `${styleName} Drums`,
        sound: backingPartSound('drums', built),
        clip: {
          id: crypto.randomUUID(),
          name: groove.name,
          startTick: 0,
          durationTicks: length,
          events: tileGroove(events, length, barTicks),
        },
      };
      const rest = out.filter((p) => p.part !== 'drums');
      out.length = 0;
      out.push(drums, ...rest);
    }
  }
  if (!out.length) {
    throw new PromptPartRefusal(
      'nothing',
      'Nothing in the library plays that.',
    );
  }

  return {
    parts: out,
    chordRegions: followsLane ? null : built.chordRegions.slice(0, bars),
    // Marked when its chords were written, or a new one was asked for ("a
    // bass line for a new chorus part"); "drop it here" names none.
    section: wantsChords || request?.isNew ? named : null,
    newKey: projectKey ? null : { tonicPc: plan.tonicPc, mode: plan.mode },
    newBpm: context.blank && bpm !== context.bpm ? bpm : null,
    track: built,
    seed,
    reading: {
      styleName,
      keyName: `${built.keyLabel} ${MODE_NAMES[plan.mode]}`,
      chords: followsLane
        ? chords
        : chords.slice(0, Math.min(bars, chords.length)),
      bars,
      parts,
      matched: read.matched,
      groove: grooveName,
    },
  };
}
