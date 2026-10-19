/**
 * bandPracticeTrack.ts — Music Literacy Part 3, Hear It with Your Band: a
 * back-office Band plays the student's own chord progression, in one of its
 * styles, as a Practice Track the Studio opens on its Practice view.
 *
 * The track is a genre Practice Track (buildGenrePracticeTrack) of the
 * style's lesson level, Melody section: the band plays drums, bass and
 * chords while the student plays over them. What's the student's is put in
 * the lesson's place: the chart (their progression, spelled in their key,
 * chart.ts), the key everywhere it reaches (the Studio's key and mode, the
 * chord lane's colors, the scales lit), and the band itself, played
 * whatever the style's pairing says. Captured parts follow the chart's
 * chords (`followChords`; until that realiser lands they play as written).
 *
 * THE STYLES A BAND OFFERS
 * Every variation of a live band that plays in 4/4, both by its own meter
 * (its variation's, else the band's) and as its track comes out (a groove,
 * or the lesson's steps, can bring another), and whose lesson has a Melody
 * section to build from: Latin Band 1 offers Reggaeton and Cumbia, not
 * Mariachi (3/4), nor the Latin L2 and L3 styles, whose lessons aren't
 * written yet. A member a variation gives nothing plays as the lesson does.
 * Each style plays at its variation's tempo, else its lesson's (the tempo
 * its own steps play at, as the Practice Track picks it), else the band's.
 *
 * Loaded on demand (the Studio boot, the Part 3 page), never at the Studio's
 * start: it reaches Music Literacy's code. Nothing here writes the editor's
 * store but the swap, which is imported when a switch runs.
 */

import { getActivityFlow } from '@/curriculum/data/activityFlows';
import { getLessonStyle } from '@/curriculum/data/lessonStyles';
import {
  BAND_INSTRUMENTS,
  bandSources,
  type Band,
  type BandVariation,
} from '@/curriculum/engine/band/band';
import { getLiveBand, listBands } from '@/curriculum/engine/band/registry';
import { preloadStudioGroove } from '@/curriculum/engine/drumGrooves/registry';
import { isCommonTime, type TimeSignature } from '@/curriculum/engine/meter';
import {
  chartId,
  chartKeyName,
  chartLine,
  chartPrismMode,
  chartSymbols,
  parseChart,
  STARTER_PROGRESSION,
  type LiteracyChart,
} from '@/curriculum/engine/musicLiteracy/chart';
import { pitchClassOf } from '@/curriculum/engine/musicLiteracy/pitch';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import type {
  GenrePracticeSession,
  LiteracyBandPractice,
  LiteracyPracticeChart,
} from '@/daw/store/uiSlice';
import type { BandPracticeRef } from './bandPracticeRef';
import {
  buildGenrePracticeTrack,
  practiceTrackPlan,
  type GenrePracticeTrackResult,
} from './buildGenrePracticeTrack';
import {
  BAND_PRACTICE_RETURN,
  practiceTrackUrl,
  stashPracticeTrack,
} from './openGenrePracticeTrack';
import { scaleTonicIn } from './practiceKeyboard';

/** A genre level's flow, when it is a v2 one; null otherwise. */
export type FlowLoader = (
  genre: string,
  level: number,
) => Promise<ActivityFlowV2 | null>;

export const loadV2Flow: FlowLoader = async (genre, level) => {
  const flow = await getActivityFlow(genre, level);
  return flow && 'version' in flow && flow.version === 'v2'
    ? (flow as ActivityFlowV2)
    : null;
};

/** The section a band plays a chart in: Melody, over drums, bass and chords. */
export const BAND_SECTION: ActivitySectionId = 'A';

/** One style a band offers (THE STYLES A BAND OFFERS). */
export interface BandStyleOption {
  /** The band's variation. */
  variation: string;
  /** Its lesson style (lessonStyles.ts). */
  styleId: string;
  /** The style's own name, without its level: 'The Pocket', 'Cumbia'. */
  name: string;
  genre: string;
  level: number;
  bpm: number;
}

/** A band and the styles it offers, for Part 3's choice. */
export interface LiteracyBandOption {
  band: Band;
  styles: BandStyleOption[];
  /** What it plays, as a student names it: 'Drums', 'Bass', 'Keys', 'Guitar'. */
  instruments: string[];
}

const variationMeter = (band: Band, v: BandVariation): TimeSignature =>
  v.timeSignature ?? band.timeSignature;

/**
 * The tempo a style plays at: its variation's own, else its lesson's (what
 * the Practice Track picks for the style's steps), else the band's.
 */
export const bandStyleTempo = (
  band: Pick<Band, 'tempo'>,
  variation: Pick<BandVariation, 'tempo'>,
  lessonBpm: number | undefined,
): number => variation.tempo ?? lessonBpm ?? band.tempo;

/**
 * Loads the Studio grooves a band plays (drumGrooves/registry.ts), so the
 * synchronous build reads them: a band no lesson pairs with (Hip Hop Band
 * 1's Boom Bap) has nothing else loading them.
 */
export async function preloadBand(band: Band): Promise<void> {
  await Promise.all(
    bandSources(band)
      .filter((source) => source.kind === 'groove')
      .map((source) => preloadStudioGroove(source.id)),
  );
}

/** The styles a band offers, in its variations' order. */
export async function bandStyles(
  band: Band,
  loadFlow: FlowLoader = loadV2Flow,
): Promise<BandStyleOption[]> {
  await preloadBand(band);
  const options = await Promise.all(
    (band.variations ?? []).map(async (v): Promise<BandStyleOption | null> => {
      if (!isCommonTime(variationMeter(band, v))) return null;
      const style = v.style ? getLessonStyle(v.style) : undefined;
      if (!style) return null;
      const flow = await loadFlow(style.genre, style.level);
      const plan =
        flow &&
        practiceTrackPlan(flow, BAND_SECTION, {
          styleId: style.id,
          band: { id: band.id, variation: v.id },
        });
      if (!plan || !isCommonTime(plan.timeSignature)) return null;
      return {
        variation: v.id,
        styleId: style.id,
        name: style.name,
        genre: style.genre,
        level: style.level,
        bpm: bandStyleTempo(band, v, plan.bpm),
      };
    }),
  );
  return options.filter((o): o is BandStyleOption => o !== null);
}

/** What a band plays, as a student names the instruments, each once. */
export function bandInstruments(band: Band): string[] {
  const kinds = [...new Set(band.layers.map((l) => l.instrument))];
  return kinds.map(
    (kind) => BAND_INSTRUMENTS.find((i) => i.id === kind)?.label ?? kind,
  );
}

/** Every live band offering a style, in the library's order. */
export async function literacyBands(
  loadFlow: FlowLoader = loadV2Flow,
): Promise<LiteracyBandOption[]> {
  const live = listBands().filter((band) => band.status === 'live');
  const all = await Promise.all(
    live.map(async (band) => ({
      band,
      styles: await bandStyles(band, loadFlow),
      instruments: bandInstruments(band),
    })),
  );
  return all.filter((option) => option.styles.length > 0);
}

// ── The track ────────────────────────────────────────────────────────────────

/** A chart the switch offers, by its id (chart.ts chartId). */
export interface BandChart {
  id: string;
  chart: LiteracyChart;
}

export interface BandTrackRequest {
  band: string;
  variation: string;
  chart: LiteracyChart;
  /** Every chart of the student's the progression switch offers. */
  charts: readonly BandChart[];
  /** The tempo; the style's own when left out. */
  bpm?: number;
}

/** A built track, with what the Studio opens it with. */
export interface BuiltBandTrack {
  track: GenrePracticeTrackResult;
  literacy: LiteracyBandPractice;
  /** The genre, as the Studio names the track's origin: 'Latin'. */
  genreLabel: string;
  /** 'Practice with a Band · Latin Band 1'. */
  projectName: string;
  /** What the link to it says (bandPracticeRef.ts). */
  ref: BandPracticeRef;
  style: BandStyleOption;
}

/** The ref a chart played by a band links to. */
export const bandRefFor = (
  band: string,
  variation: string,
  chart: LiteracyChart,
): BandPracticeRef => ({
  band,
  variation,
  tonic: chart.tonic,
  mode: chart.mode,
  harmony: chart.harmony,
  chords: chart.chords.join('-'),
});

/** "1 min – 4 min – 5 min – ♭6 maj": a chart as the progression switch reads. */
const switchLabel = (chart: LiteracyChart) => chartLine(chart, ' – ');

/**
 * The band's style playing the chart, as a Practice Track, or null when the
 * band isn't live or doesn't offer that variation (a 3/4 style, a lesson
 * not written yet, a link naming something else).
 */
export async function buildBandPracticeTrack(
  request: BandTrackRequest,
  loadFlow: FlowLoader = loadV2Flow,
): Promise<BuiltBandTrack | null> {
  const band = getLiveBand(request.band);
  if (!band) return null;
  const styles = await bandStyles(band, loadFlow);
  const style = styles.find((s) => s.variation === request.variation);
  if (!style) return null;
  const flow = await loadFlow(style.genre, style.level);
  if (!flow) return null;
  const { chart } = request;
  const built = buildGenrePracticeTrack(flow, BAND_SECTION, {
    styleId: style.styleId,
    chords: chartSymbols(chart),
    key: {
      tonicPc: pitchClassOf(chart.tonic),
      mode: chartPrismMode(chart.mode),
      label: chart.tonic,
    },
    band: { id: band.id, variation: style.variation },
    followChords: true,
    bpm: request.bpm ?? style.bpm,
  });
  if (!built) return null;
  const charts = request.charts.some((c) => c.id === chartId(chart))
    ? request.charts
    : [{ id: chartId(chart), chart }, ...request.charts];
  // The band's styles and the student's progressions, in the lesson's
  // place on the Practice view's switches.
  const track: GenrePracticeTrackResult = {
    ...built,
    styles: styles.map((s) => ({ id: s.styleId, name: s.name })),
    styleId: style.styleId,
    progressions: charts.map((c) => ({
      id: c.id,
      label: switchLabel(c.chart),
      chords: chartSymbols(c.chart),
    })),
    progressionId: chartId(chart),
    sourceDirection: null,
  };
  return {
    track,
    literacy: {
      band: band.id,
      bandName: band.name,
      variation: style.variation,
      styleName: style.name,
      chart: plainChart(chart),
      keyName: chartKeyName(chart),
      charts: charts.map((c) => ({ id: c.id, chart: plainChart(c.chart) })),
    },
    genreLabel: genreLabelOf(style.styleId),
    projectName: `Practice with a Band · ${band.name}`,
    ref: bandRefFor(band.id, style.variation, chart),
    style,
  };
}

/** A chart as the session keeps it: plain fields, copied. */
const plainChart = (chart: LiteracyChart): LiteracyPracticeChart => ({
  chords: [...chart.chords],
  harmony: chart.harmony,
  tonic: chart.tonic,
  mode: chart.mode,
});

/** A chart the session kept, read back (a draft can hold anything). */
const chartOf = (stored: LiteracyPracticeChart | undefined) =>
  stored
    ? parseChart({
        tonic: stored.tonic,
        mode: stored.mode,
        harmony: stored.harmony,
        chords: stored.chords.join('-'),
      })
    : null;

const genreLabelOf = (styleId: string) =>
  getLessonStyle(styleId)?.genreName ?? 'Band';

/**
 * The track a Studio link asks for (bandPracticeRef.ts): its chart read
 * from the link (the starter where it can't be), the student's charts for
 * the switch from this device (`charts`).
 */
export function buildBandPracticeTrackFor(
  ref: BandPracticeRef,
  charts: readonly BandChart[],
  loadFlow: FlowLoader = loadV2Flow,
): Promise<BuiltBandTrack | null> {
  const chart = parseChart(ref) ?? STARTER_PROGRESSION;
  return buildBandPracticeTrack(
    { band: ref.band, variation: ref.variation, chart, charts },
    loadFlow,
  );
}

// ── Switching ────────────────────────────────────────────────────────────────

/**
 * The Practice view's switches on a band's track: another of the band's
 * styles (its level's flow loaded, at that style's tempo), or another of
 * the student's progressions (at the tempo playing). The band, and the
 * chart's key, stay; a progression saved in another key plays in its own.
 * Swaps the backing in the open Studio; null when nothing could be built.
 */
export async function switchBandPracticeTrack(
  session: GenrePracticeSession & { literacy: LiteracyBandPractice },
  choice: { styleId?: string | null; progressionId?: string },
  bpm: number,
  loadFlow: FlowLoader = loadV2Flow,
): Promise<GenrePracticeSession | null> {
  const { literacy } = session;
  const band = getLiveBand(literacy.band);
  if (!band) return null;
  const styles = await bandStyles(band, loadFlow);
  const styleId = choice.styleId ?? session.styleId;
  const style =
    styles.find((s) => s.styleId === styleId) ??
    styles.find((s) => s.variation === literacy.variation);
  if (!style) return null;
  const charts = literacy.charts.flatMap((c) => {
    const chart = chartOf(c.chart);
    return chart ? [{ id: c.id, chart }] : [];
  });
  const progressionId = choice.progressionId ?? session.progressionId;
  const chart =
    charts.find((c) => c.id === progressionId)?.chart ??
    chartOf(literacy.chart) ??
    STARTER_PROGRESSION;
  const newStyle = style.variation !== literacy.variation;
  const built = await buildBandPracticeTrack(
    {
      band: band.id,
      variation: style.variation,
      chart,
      charts,
      bpm: newStyle ? undefined : bpm,
    },
    loadFlow,
  );
  if (!built) return null;
  const { track } = built;
  // Loaded here, not at the top: the swap writes the editor's store, which
  // must stay off the pages that open a track (the 1.12a budget).
  const { swapGenrePracticeBacking } = await import(
    './seedStudioFromGenrePracticeTrack'
  );
  swapGenrePracticeBacking(track, { tempo: newStyle, band: true });
  const widest = Math.max(
    ...track.scales.map((scale) => scale.intervals[scale.intervals.length - 1]),
    11,
  );
  return {
    ...session,
    genre: track.genre,
    genreLabel: built.genreLabel,
    level: track.level,
    keyLabel: track.keyLabel,
    scales: track.scales,
    scaleTonic: scaleTonicIn(session.keyboard, track.keyRootPc, widest),
    chordCycle: track.chordCycle,
    voicingSets: track.voicingSets,
    defaultVoicing: track.defaultVoicing,
    styles: track.styles,
    styleId: track.styleId,
    progressions: track.progressions,
    progressionId: track.progressionId,
    literacy: built.literacy,
  };
}

// ── Opening one ──────────────────────────────────────────────────────────────

/**
 * Build a band's track, leave it for the Studio (openGenrePracticeTrack's
 * box) and give back the Studio URL that opens it, which can also build it
 * again on a refresh or from a shared link; null when nothing could be
 * built.
 */
export async function openBandPracticeTrack(
  request: BandTrackRequest,
  loadFlow: FlowLoader = loadV2Flow,
): Promise<string | null> {
  const built = await buildBandPracticeTrack(request, loadFlow);
  if (!built) return null;
  const { track } = built;
  stashPracticeTrack({
    genre: track.genre,
    level: track.level,
    section: BAND_SECTION,
    genreLabel: built.genreLabel,
    returnTo: BAND_PRACTICE_RETURN,
    track,
    band: {
      ref: built.ref,
      literacy: built.literacy,
      projectName: built.projectName,
    },
  });
  return practiceTrackUrl(track.genre, track.level, BAND_SECTION, built.ref);
}
