import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { isDrumTrack } from '@/daw/shell/canvas/clipMenu/clipActions';
import { selectEffectiveKey } from '@/daw/harmony/effectiveKey';
import { sectionAt, type SongSection } from '@/daw/model/sections';
import type { AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import {
  barStartTick,
  ticksPerBar,
  tickToBar,
  timeSignatureOf,
} from '@/daw/time/timeModel';
import { resolveTrackRole } from '@/daw/utils/trackRole';
import type {
  PartContext,
  PromptPart,
} from '@/features/promptSong/buildPromptPart';

// ── The spot a prompt acts on (owner, 2026-10-23) ──────────────────────────
//
// "Select a spot in the timeline and ask me to add a part." The spot is, in
// order:
//   1. a lane the student right-clicked → "Add a part here…": four bars
//      from that bar, on that track (or a section's whole length);
//   2. bars dragged out in empty lane space (the timeline's marquee),
//      snapped to whole bars, on the lane the drag started in — below the
//      last lane, a new track;
//   3. the loop, while it's on (dragged on the ruler): its bars, on the
//      selected track;
//   4. else four bars from the playhead's bar, on the selected track.
// A part goes on the spot's track when it is that kind of track, else on
// a track of its own. The spot knows the song section it is (Verse,
// Chorus, Bridge…): the chip names it, and a prompt that names a section
// the song has ("write chords for the bridge") takes that section as its
// spot. New chords stand apart from the song's other sections'.

/** Bars a prompt fills when nothing longer is selected. */
export const DEFAULT_SPOT_BARS = 4;

export interface PromptSpot {
  startTick: number;
  lengthTicks: number;
  trackId: string | null;
  from: 'lane' | 'selection' | 'loop' | 'playhead' | 'section';
  /** The song section the spot starts in, if any. */
  section: SongSection | null;
  /**
   * Bars the student highlighted on a track (dragged out, or a lane
   * right-clicked): a prompt writes that track's part into it, the
   * suggestions are for that part (owner, 2026-10-24).
   */
  highlighted?: boolean;
}

/** Bars dragged out on the timeline, on a lane's track (null: a new one). */
export interface TimelineSelection {
  startTick: number;
  endTick: number;
  trackId: string | null;
}

/**
 * The bars a drag from `fromTick` to `toTick` covers: every bar it touches,
 * whole, and at least one.
 */
export function selectionOfDrag(
  fromTick: number,
  toTick: number,
  barTicks: number,
  trackId: string | null,
): TimelineSelection {
  const lo = Math.max(0, Math.min(fromTick, toTick));
  const hi = Math.max(fromTick, toTick);
  const startTick = Math.floor(lo / barTicks) * barTicks;
  const endTick = Math.max(
    startTick + barTicks,
    Math.ceil(hi / barTicks) * barTicks,
  );
  return { startTick, endTick, trackId };
}

/** A lane or section right-clicked for the prompt bar: where, and on which
 *  track; a section brings its own length. */
export interface LaneSpot {
  tick: number;
  trackId: string | null;
  lengthTicks?: number;
}

type SpotState = Pick<
  AllSlices,
  | 'sections'
  | 'loopEnabled'
  | 'loopStart'
  | 'loopEnd'
  | 'selectedTrackId'
  | 'timeSignatureNumerator'
  | 'timeSignatureDenominator'
>;

export function promptSpotOf(
  state: SpotState,
  lane: LaneSpot | null,
  playheadTick: number = getPlayheadTick(),
  selection: TimelineSelection | null = null,
): PromptSpot {
  const ts = timeSignatureOf(state);
  const bars = DEFAULT_SPOT_BARS * ticksPerBar(ts);
  const withSection = (spot: Omit<PromptSpot, 'section'>): PromptSpot => ({
    ...spot,
    section: sectionAt(state.sections, spot.startTick) ?? null,
  });
  if (lane) {
    return withSection({
      startTick: lane.lengthTicks ? lane.tick : barStartTick(lane.tick, ts),
      lengthTicks: lane.lengthTicks ?? bars,
      trackId: lane.trackId,
      from: lane.lengthTicks ? 'section' : 'lane',
      highlighted: !lane.lengthTicks && lane.trackId !== null,
    });
  }
  if (selection && selection.endTick > selection.startTick) {
    return withSection({
      startTick: selection.startTick,
      lengthTicks: selection.endTick - selection.startTick,
      trackId: selection.trackId,
      from: 'selection',
      highlighted: selection.trackId !== null,
    });
  }
  if (state.loopEnabled && state.loopEnd > state.loopStart) {
    return withSection({
      startTick: state.loopStart,
      lengthTicks: state.loopEnd - state.loopStart,
      trackId: state.selectedTrackId,
      from: 'loop',
    });
  }
  return withSection({
    startTick: barStartTick(Math.max(0, playheadTick), ts),
    lengthTicks: bars,
    trackId: state.selectedTrackId,
    from: 'playhead',
  });
}

/**
 * The bars the canvas menu's Prism highlights on a track (owner,
 * 2026-10-24: the prompt bar is the new Prism): the bars already dragged
 * out on that track when they hold the bar right-clicked, else four bars
 * from that bar.
 */
export function prismSelectionAt(
  state: Pick<SpotState, 'timeSignatureNumerator' | 'timeSignatureDenominator'>,
  tick: number,
  trackId: string,
  current: TimelineSelection | null,
): TimelineSelection {
  if (
    current &&
    current.trackId === trackId &&
    current.startTick <= tick &&
    tick < current.endTick
  ) {
    return current;
  }
  const ts = timeSignatureOf(state);
  const startTick = barStartTick(Math.max(0, tick), ts);
  return {
    startTick,
    endTick: startTick + DEFAULT_SPOT_BARS * ticksPerBar(ts),
    trackId,
  };
}

/** Bars a new section gets when the prompt asks for one ("a new chorus"). */
export const NEW_SECTION_BARS = 8;

/** Where the song ends: its last section, clip or chord, on a bar line. */
export function songEndTick(
  state: Pick<
    AllSlices,
    | 'sections'
    | 'tracks'
    | 'chordRegions'
    | 'timeSignatureNumerator'
    | 'timeSignatureDenominator'
  >,
): number {
  let end = 0;
  for (const s of state.sections) end = Math.max(end, s.endTick);
  for (const r of state.chordRegions) end = Math.max(end, r.endTick);
  for (const t of state.tracks) {
    for (const c of t.midiClips) {
      end = Math.max(end, c.startTick + (c.durationTicks ?? 0));
      for (const e of c.events) {
        end = Math.max(end, c.startTick + e.startTick + e.durationTicks);
      }
    }
    for (const c of t.audioClips) end = Math.max(end, c.startTick + c.duration);
  }
  const bar = ticksPerBar(timeSignatureOf(state));
  return Math.ceil(end / bar) * bar;
}

/**
 * The spot a prompt acts on, once its words are read:
 * - a new section asked for ("a bass line for a new chorus part") goes
 *   after the song's end, eight bars, on the spot's track — unless the
 *   student dragged out or right-clicked the spot themselves;
 * - a section the text names that the song has ("chords for the bridge")
 *   is the spot — the one under the spot already when it is that kind,
 *   else the song's first of that kind;
 * - otherwise the spot stays.
 */
export function spotForText(
  state: Pick<
    AllSlices,
    | 'sections'
    | 'tracks'
    | 'chordRegions'
    | 'timeSignatureNumerator'
    | 'timeSignatureDenominator'
  >,
  spot: PromptSpot,
  request: { type: string; isNew: boolean } | null,
): PromptSpot {
  if (!request) return spot;
  if (request.isNew) {
    if (spot.from === 'selection' || spot.from === 'lane') return spot;
    const bar = ticksPerBar(timeSignatureOf(state));
    return {
      startTick: songEndTick(state),
      lengthTicks: NEW_SECTION_BARS * bar,
      trackId: spot.trackId,
      from: 'section',
      section: null,
    };
  }
  if (spot.section?.type === request.type) return spot;
  const named = state.sections.find((s) => s.type === request.type);
  if (!named) return spot;
  return {
    startTick: named.startTick,
    lengthTicks: named.endTick - named.startTick,
    trackId: spot.trackId,
    from: 'section',
    section: named,
    highlighted: spot.highlighted,
  };
}

/** The part a track plays, when it plays one a prompt can add. */
export function trackPartOf(
  track: Pick<
    Track,
    'type' | 'instrument' | 'name' | 'trackRole' | 'gmProgram'
  >,
): PromptPart | null {
  if (track.type !== 'midi') return null;
  if (isDrumTrack(track)) return 'drums';
  const role = resolveTrackRole(track);
  if (role === 'bass') return 'bass';
  if (
    track.instrument === 'soundfont' &&
    track.gmProgram !== undefined &&
    track.gmProgram >= 32 &&
    track.gmProgram <= 39
  )
    return 'bass';
  if (role === 'chords') return 'chords';
  return null;
}

/** The chip's words for the spot: "Bridge · Bars 9–16", "Bars 5–8". */
export function spotLabel(
  spot: PromptSpot,
  state: Pick<SpotState, 'timeSignatureNumerator' | 'timeSignatureDenominator'>,
): string {
  const bars = barsLabel(spot, state);
  return spot.section ? `${spot.section.label} · ${bars}` : bars;
}

/** "Bars 5–8", "Bar 3", from the spot's ticks. */
export function barsLabel(
  spot: Pick<PromptSpot, 'startTick' | 'lengthTicks'>,
  state: Pick<SpotState, 'timeSignatureNumerator' | 'timeSignatureDenominator'>,
): string {
  const ts = timeSignatureOf(state);
  const first = tickToBar(spot.startTick, ts) + 1;
  const count = Math.max(1, Math.round(spot.lengthTicks / ticksPerBar(ts)));
  return count === 1 ? `Bar ${first}` : `Bars ${first}–${first + count - 1}`;
}

/** A chord region's letter name as the band engine reads it: 'Ab7', 'F#m'. */
const ascii = (name: string) => name.replace(/♭/g, 'b').replace(/♯/g, '#');

type ContextState = SpotState &
  Pick<
    AllSlices,
    | 'rootNote'
    | 'mode'
    | 'bpm'
    | 'chordRegions'
    | 'genre'
    | 'tracks'
    | 'projectName'
    | 'detectedKeyRootPc'
    | 'detectedMode'
  >;

const LETTER_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** The key a chord name points to: its root, minor for a minor chord. */
function keyOfChordName(
  name: string,
): { tonicPc: number; mode: string } | null {
  const m = /^([A-G])([b#♭♯]?)(m(?!aj))?/.exec(name);
  if (!m) return null;
  const shift = m[2] === 'b' || m[2] === '♭' ? -1 : m[2] ? 1 : 0;
  return {
    tonicPc: (LETTER_PC[m[1]] + shift + 12) % 12,
    mode: m[3] ? 'aeolian' : 'ionian',
  };
}

/**
 * The key a part is written in (owner, 2026-10-23): the song's key center;
 * without one, the key the Studio hears in the song's notes; without that,
 * the key the chord ruler's first chord points to. Null when the song has
 * none of them: the part picks a key and mode that suit its style.
 */
export function partKeyOf(
  state: Pick<
    ContextState,
    'rootNote' | 'mode' | 'detectedKeyRootPc' | 'detectedMode' | 'chordRegions'
  >,
): { tonicPc: number; mode: string } | null {
  const key = selectEffectiveKey(state);
  if (key) return { tonicPc: key.rootPc, mode: key.mode };
  const first = [...state.chordRegions]
    .sort((a, b) => a.startTick - b.startTick)
    .find((r) => r.noteName);
  return first ? keyOfChordName(first.noteName) : null;
}

/** The chord lane's symbols between two ticks, a repeat in a row once. */
function symbolsIn(
  regions: AllSlices['chordRegions'],
  from: number,
  to: number,
): string[] {
  const out: string[] = [];
  for (const r of [...regions].sort((a, b) => a.startTick - b.startTick)) {
    if (r.endTick <= from || r.startTick >= to || !r.noteName) continue;
    const symbol = ascii(r.noteName);
    if (out.at(-1) !== symbol) out.push(symbol);
  }
  return out;
}

/**
 * The song's other progressions, for new chords to stand apart from: each
 * other section's chords, or, in a song with no sections, the lane's chords
 * outside the spot.
 */
export function otherProgressionsOf(
  state: Pick<AllSlices, 'chordRegions' | 'sections'>,
  spot: Pick<PromptSpot, 'startTick' | 'lengthTicks'>,
): string[][] {
  const end = spot.startTick + spot.lengthTicks;
  const outside = (from: number, to: number) =>
    to <= spot.startTick || from >= end;
  if (state.sections.length) {
    return state.sections
      .filter((s) => outside(s.startTick, s.endTick))
      .map((s) => symbolsIn(state.chordRegions, s.startTick, s.endTick))
      .filter((list) => list.length > 0);
  }
  const before = symbolsIn(state.chordRegions, 0, spot.startTick);
  const after = symbolsIn(state.chordRegions, end, Number.POSITIVE_INFINITY);
  return [before, after].filter((list) => list.length > 0);
}

/** What plays around the spot: the key, the tempo, the lane's chords. */
export function partContextOf(
  state: ContextState,
  spot: PromptSpot,
  sessionPrompt: string | null = null,
): PartContext {
  const end = spot.startTick + spot.lengthTicks;
  const chords = state.chordRegions
    .filter(
      (r) => r.endTick > spot.startTick && r.startTick < end && r.noteName,
    )
    .sort((a, b) => a.startTick - b.startTick)
    .map((r) => ({
      tick: Math.max(0, r.startTick - spot.startTick),
      symbol: ascii(r.noteName),
    }));
  const track = spot.trackId
    ? state.tracks.find((t) => t.id === spot.trackId)
    : undefined;
  const key = partKeyOf(state);
  return {
    startTick: spot.startTick,
    lengthTicks: spot.lengthTicks,
    sectionType: spot.section?.type ?? null,
    otherProgressions: otherProgressionsOf(state, spot),
    trackPart: track ? trackPartOf(track) : null,
    trackHighlighted: !!spot.highlighted && !!track,
    tonicPc: key?.tonicPc ?? null,
    mode: key?.mode ?? null,
    bpm: state.bpm,
    timeSignature: [
      state.timeSignatureNumerator,
      state.timeSignatureDenominator,
    ],
    chords,
    projectGenre: state.genre ?? null,
    blank: !state.tracks.some((t) => t.midiClips.length || t.audioClips.length),
    sessionText: sessionPrompt ?? state.projectName ?? null,
  };
}
