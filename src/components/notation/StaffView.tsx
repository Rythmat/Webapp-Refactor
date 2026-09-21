import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import type {
  NotationItem,
  NotationKey,
  NotationMeasure,
  NotationScore,
  StaffId,
} from '@/lib/notation';
import {
  contentWidth as pageContentWidth,
  fitScale,
  pageScale,
  pageTops,
  paginate,
  uniformSystemNeed,
  type PageSpec,
} from '@/lib/notation/pageLayout';
import { planSystemsOver, type SystemMarks } from '@/lib/notation/systemPlan';
import './grandStaff.css';

// ── Staff renderer ─────────────────────────────────────────────────────────
// Draws one or more parts — a lesson's grand staff, a Studio clip, or every
// track of a score stacked into systems — with VexFlow, which loads only when
// a staff first shows. Systems wrap to the container width and every part
// shares the same barlines. Theme and highlights are CSS (grandStaff.css).

type VexFlowModule = typeof import('vexflow/bravura');
type StaveNote = InstanceType<VexFlowModule['StaveNote']>;
type Note = InstanceType<VexFlowModule['Note']>;
type Voice = InstanceType<VexFlowModule['Voice']>;
type Beam = InstanceType<VexFlowModule['Beam']>;
type Tuplet = InstanceType<VexFlowModule['Tuplet']>;
type Stave = InstanceType<VexFlowModule['Stave']>;

let vexflowPromise: Promise<VexFlowModule> | null = null;
export function loadVexFlow(): Promise<VexFlowModule> {
  vexflowPromise ??= import('vexflow/bravura').then(async (vf) => {
    try {
      // Glyphs are measured as text; draw only once the font is in.
      await document.fonts.load('30px Bravura');
    } catch {
      // Draw anyway; spacing may be slightly off.
    }
    return vf;
  });
  return vexflowPromise;
}

export interface NoteStyle {
  /** Note color (CSS color). */
  color?: string;
  /** Soft glow in the note's color — the note to play now. */
  glow?: boolean;
  /** Faded — not reached yet. */
  dim?: boolean;
}

export interface ScorePart {
  id: string;
  /** Shown at the left of each system when there is more than one part. */
  name?: string;
  score: NotationScore;
}

/** Where a barline sits on screen, in scaled px, for overlays and clicks. */
export interface BarlinePosition {
  /** The measure it precedes; the measure count for the final barline. */
  measureIndex: number;
  /** True for the barline drawn at the right edge of a system. */
  atSystemEnd: boolean;
  system: number;
  x: number;
  y: number;
  height: number;
}

/** One part's slice of a drawn measure, in scaled px, with its ticks. */
export interface MeasureBox {
  measureIndex: number;
  /** Which part this box belongs to; measures are selected per instrument. */
  partIndex: number;
  system: number;
  x: number;
  y: number;
  width: number;
  height: number;
  startTick: number;
  endTick: number;
}

/** Where a drawn note sits, for range selection. */
export interface NoteInfo {
  id: string;
  partIndex: number;
  measureIndex: number;
  tick: number;
  /** Centre of the notehead, scaled. */
  x: number;
  y: number;
  /** Half a staff space, scaled — the unit marks are placed by. */
  space: number;
  /** Which way the stem points, or null on a note drawn without one. */
  stem: 'up' | 'down' | null;
  /** How the note is written: 'c' … 'b', its octave, and its alteration. */
  letter: string;
  octave: number;
  /** Semitones from the plain letter, whether or not a sign is printed. */
  alteration: number;
  /**
   * Staff line the notehead sits on: 0 is the bottom line, 2 the middle one,
   * 4 the top. Halves are the spaces, and it keeps counting into ledger lines.
   */
  line: number;
}

/** A drawn rest, which can be picked up and written over like a note. */
export interface RestInfo {
  /** `rest|part|tick` — what a selection stores. */
  key: string;
  partIndex: number;
  measureIndex: number;
  tick: number;
  durationTicks: number;
  x: number;
  y: number;
}

export interface StaffLayout {
  barlines: BarlinePosition[];
  measures: MeasureBox[];
  notes: NoteInfo[];
  rests: RestInfo[];
  scale: number;
  /** Height of one system, scaled. */
  systemHeight: number;
  /** Vertical distance of one staff step (a line to its next space). */
  stepPx: number;
}

export interface StaffViewProps {
  parts: ScorePart[];
  /** Styles by note id. Ids must be unique across parts. */
  noteStyles?: ReadonlyMap<string, NoteStyle>;
  /** Live nudge while dragging, in scaled px, by note id. */
  noteOffsets?: ReadonlyMap<string, { x: number; y: number }>;
  /** Tick to draw the playhead at; none when null/undefined. */
  playheadTick?: number | null;
  /** Shrink (down to 70%) so every system fits the height when possible. */
  fitHeight?: boolean;
  /**
   * Lay the score onto paper of this size, scaled to fit the width on screen,
   * instead of filling the container. Keeps a system the same size whatever
   * the window is doing, and matches what will print.
   */
  page?: PageSpec;
  /**
   * With `page`, room to keep at the top of page 1 when printing, for the
   * title block the host prints there (page pixels).
   */
  printTitleInset?: number;
  /** Bars per system. Without it, systems fill the width. */
  measuresPerSystem?: number;
  /** Measures that must begin a new system. */
  /**
   * Where system breaks, made-up systems and page breaks fall. Without it a
   * score flows at `measuresPerSystem` bars a line.
   */
  systemMarks?: SystemMarks;
  /** Measures that open a repeat. */
  repeatStarts?: ReadonlySet<number>;
  /** Measures that close a repeat. */
  repeatEnds?: ReadonlySet<number>;
  /**
   * Extra room above every system for what the overlay draws there — a row
   * of rehearsal marks standing over the chord symbols, say.
   */
  headroom?: number;
  /**
   * Bars written as one multi-bar rest: the bar it starts on, and how many
   * bars it swallows. The bars it covers are not drawn.
   */
  multiRests?: ReadonlyMap<number, number>;
  /** Called with the drawn layout, for positioning an overlay. */
  onLayout?: (layout: StaffLayout | null) => void;
  /** Drawn over the staves, scrolling with them. */
  overlay?: ReactNode;
  /**
   * A note was pressed. `noteId` is the single notehead under the pointer when
   * there is one, else the chord's lowest note; `noteIds` is the whole chord.
   */
  onNotePointerDown?: (
    note: { noteId: string; noteIds: string[] },
    event: ReactPointerEvent,
  ) => void;
  /** A measure was pressed away from any note, in one part's staff. */
  onMeasurePointerDown?: (
    target: { measureIndex: number; partIndex: number },
    event: ReactPointerEvent,
  ) => void;
  /** A rest was pressed. */
  onRestPointerDown?: (restKey: string, event: ReactPointerEvent) => void;
  /** The page was pressed away from any measure. */
  onBackgroundPointerDown?: (event: ReactPointerEvent) => void;
  className?: string;
  style?: CSSProperties;
}

// Layout, in unscaled px. Stave y is the top of its space above the lines;
// the top line sits 40px below it.
const RIGHT = 6;
const BRACE_WIDTH = 18;
const NAME_GAP = 10;
/** Distance between two staves of the same part. */
const STAFF_SLOT = 100;
/** A line to its neighbouring space: VexFlow draws staff lines 10px apart. */
const STAFF_STEP = 5;
/** Half a notehead, so a mark can be centred over one. */
const NOTEHEAD_HALF = 5.9;
/** A staff's own drawn height below its y. */
const STAFF_BODY = 80;
/** Space between parts. */
const PART_GAP = 56;
/** Space below a system. */
const SYSTEM_GAP = 40;
/** Headroom above each system for chord symbols and rehearsal marks. */
const SYSTEM_TOP = 28;
/** A staff line to the next, in unscaled px. */
const LINE_GAP = 10;
/** The top staff line sits this far below the stave's y. */
const TOP_LINE_DROP = 40;
/** Room a chord symbol and its clearance need above the music. */
const CHORD_ROOM = 24;
/** Bottom line of each clef, as an absolute diatonic step. */
const BOTTOM_LINE: Partial<Record<StaffId, number>> = {
  // E4 and G2.
  treble: 4 * 7 + 2,
  bass: 2 * 7 + 4,
};

/**
 * How far above the top part's stave the music itself climbs: ledger lines
 * reach into the space chord symbols and rehearsal marks live in, and the
 * system has to grow rather than let them collide or be clipped away.
 */
function inkAboveStave(parts: ScorePart[]): number {
  const part = parts[0];
  const staff = part?.score.staves[0];
  const bottom = staff ? BOTTOM_LINE[staff] : undefined;
  if (!part || !staff || bottom === undefined) return 0;
  let highest = 4; // the top line, until something is written above it
  for (const measure of part.score.measures) {
    for (const voice of measure.staves[staff] ?? []) {
      for (const item of voice.items) {
        for (const key of item.keys) {
          const step = key.octave * 7 + 'cdefgab'.indexOf(key.letter);
          highest = Math.max(highest, (step - bottom) / 2);
        }
      }
    }
  }
  // Two staff spaces over the notehead's centre: its own top, and room for
  // an articulation sitting above it — the same allowance the editor makes.
  return Math.max(0, (highest - 4) * LINE_GAP - TOP_LINE_DROP + 2 * LINE_GAP);
}
const MIN_MEASURE_WIDTH = 90;
/** A multi-bar rest needs room for the thick bar and the count above it. */
const MULTI_REST_WIDTH = 150;
const NOTE_PADDING = 28;
const MIN_SCALE = 0.7;
/**
 * How small the notation may get so a crowded system still fits its page.
 * Below this it would stop being readable, and the system is allowed to run
 * wide instead — the view scrolls sideways to reach it.
 */
const MIN_CONTENT_SCALE = 0.45;
/** Space shown between two pages in the scroll. */
const PAGE_GAP = 24;

const KEY_SPECS: Record<number, string> = {
  [-7]: 'Cb',
  [-6]: 'Gb',
  [-5]: 'Db',
  [-4]: 'Ab',
  [-3]: 'Eb',
  [-2]: 'Bb',
  [-1]: 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
};

const REST_KEY: Record<StaffId, string> = {
  treble: 'b/4',
  bass: 'd/3',
  percussion: 'b/4',
};

/**
 * A drumset staff writes hands up and feet down even in a bar where only one
 * limb plays, so a reader always knows which is which.
 */
function drumStem(vf: VexFlowModule, voiceIndex: 0 | 1) {
  return voiceIndex === 0 ? vf.Stem.UP : vf.Stem.DOWN;
}

/** VexFlow takes a notehead as a third path component: 'g/5/x2' for a cymbal. */
function vexKey(key: NotationKey): string {
  const base = `${key.letter}/${key.octave}`;
  return key.notehead && key.notehead !== 'normal'
    ? `${base}/${key.notehead}`
    : base;
}

interface DrawnItem {
  item: NotationItem;
  note: Note;
  staff: StaffId;
}

interface BuiltMeasure {
  voices: Map<StaffId, Voice[]>;
  beams: Beam[];
  tuplets: Tuplet[];
  drawn: DrawnItem[];
}

/** VexFlow notes, voices, beams and tuplets for one measure of one part. */
function buildMeasure(
  vf: VexFlowModule,
  measure: NotationMeasure,
  score: NotationScore,
): BuiltMeasure {
  const [numerator, denominator] = score.timeSignature;
  const voices = new Map<StaffId, Voice[]>();
  const beams: Beam[] = [];
  const tuplets: Tuplet[] = [];
  const drawn: DrawnItem[] = [];
  const beamGroup = new vf.Fraction(
    score.beatTicks,
    score.ticksPerQuarter * 4,
  ).simplify();

  for (const staff of score.staves) {
    const staffVoices = measure.staves[staff] ?? [];
    const twoVoices = staffVoices.length > 1;
    voices.set(staff, []);
    for (const { index, items } of staffVoices) {
      const stem =
        staff === 'percussion'
          ? drumStem(vf, index)
          : twoVoices
            ? index === 0
              ? vf.Stem.UP
              : vf.Stem.DOWN
            : undefined;
      const notes: Note[] = items.map((item) => {
        let note: Note;
        if (item.hidden) {
          note = new vf.GhostNote({ duration: item.value, dots: item.dots });
        } else if (item.wholeMeasure) {
          note = new vf.StaveNote({
            keys: [REST_KEY[staff]],
            duration: 'wr',
            clef: staff,
            alignCenter: true,
          });
        } else {
          // Rhythmic notation: a slashed chord is one slash on the middle
          // line, so the rhythm reads without any pitch.
          const slashed =
            item.kind === 'note' && item.keys.some((key) => key.slash);
          const staveNote = new vf.StaveNote({
            keys:
              item.kind === 'rest'
                ? [REST_KEY[staff]]
                : slashed
                  ? [`${REST_KEY[staff]}/s`]
                  : item.keys.map(vexKey),
            duration: `${item.value}${item.kind === 'rest' ? 'r' : ''}`,
            dots: item.dots,
            clef: staff,
            ...(stem === undefined
              ? { autoStem: true }
              : { stemDirection: stem }),
          });
          if (!slashed) {
            item.keys.forEach((key, i) => {
              if (key.accidental) {
                staveNote.addModifier(new vf.Accidental(key.accidental), i);
              }
              if (key.articulation === 'open') {
                staveNote.addModifier(new vf.Articulation('ah'), i);
              }
            });
          }
          if (slashed) {
            // A slash is its own notehead: the stem leaves from its corner
            // rather than running through the middle of it.
            staveNote.getStem()?.setOptions({
              stemUpYOffset: STAFF_STEP,
              stemDownYOffset: STAFF_STEP,
            });
          }
          if (item.dots) vf.Dot.buildAndAttach([staveNote], { all: true });
          note = staveNote;
        }
        drawn.push({ item, note, staff });
        return note;
      });

      // Triplets: consecutive items sharing a beat.
      let group: Note[] = [];
      let groupStart: number | undefined;
      const flush = () => {
        if (group.length > 0) {
          tuplets.push(
            new vf.Tuplet(group, {
              numNotes: 3,
              notesOccupied: 2,
              bracketed: false,
              ratioed: false,
            }),
          );
        }
        group = [];
      };
      items.forEach((item, i) => {
        if (item.tupletStart !== groupStart) flush();
        groupStart = item.tupletStart;
        if (item.tupletStart !== undefined) group.push(notes[i]);
      });
      flush();

      const voice = new vf.Voice({
        numBeats: numerator,
        beatValue: denominator,
      }).setMode(vf.Voice.Mode.SOFT);
      voice.addTickables(notes);
      voices.get(staff)!.push(voice);

      const beamable = notes.filter(
        (n): n is StaveNote => n instanceof vf.StaveNote,
      );
      beams.push(
        ...vf.Beam.generateBeams(beamable, {
          groups: [beamGroup],
          maintainStemDirections: twoVoices,
        }),
      );
    }
  }
  return { voices, beams, tuplets, drawn };
}

function allVoices(built: BuiltMeasure): Voice[] {
  return [...built.voices.values()].flat();
}

/**
 * A part's bar at this index. Parts can end at different bars, and a staff
 * left blank in a system reads as a mistake, so a part that has stopped is
 * written out with a bar of rest.
 */
function measureOf(score: NotationScore, index: number): NotationMeasure {
  const existing = score.measures[index];
  if (existing) return existing;
  const startTick = score.originTick + index * score.ticksPerMeasure;
  const staves = {} as NotationMeasure['staves'];
  for (const staff of score.staves) {
    staves[staff] = [
      {
        index: 0,
        items: [
          {
            kind: 'rest',
            startTick,
            durationTicks: score.ticksPerMeasure,
            value: 'w',
            dots: 0,
            wholeMeasure: true,
            keys: [],
            tieFromPrev: false,
            tieToNext: false,
          },
        ],
      },
    ];
  }
  return {
    index,
    number: (score.measures[0]?.number ?? 1) + index,
    startTick,
    endTick: startTick + score.ticksPerMeasure,
    staves,
  };
}

/** Widest minimum width this measure needs across every part. */
function measureMinWidth(
  vf: VexFlowModule,
  parts: ScorePart[],
  measureIndex: number,
): number {
  let widest = MIN_MEASURE_WIDTH;
  for (const part of parts) {
    const measure = measureOf(part.score, measureIndex);
    const built = buildMeasure(vf, measure, part.score);
    const formatter = new vf.Formatter();
    for (const voices of built.voices.values()) {
      if (voices.length > 0) formatter.joinVoices(voices);
    }
    widest = Math.max(
      widest,
      formatter.preCalculateMinTotalWidth(allVoices(built)) + NOTE_PADDING,
    );
  }
  return widest;
}

/** Width of clef + key (+ time) at the start of a system. */
function headerWidth(
  vf: VexFlowModule,
  parts: ScorePart[],
  withTime: boolean,
): number {
  let widest = 0;
  for (const part of parts) {
    for (const clef of part.score.staves) {
      const stave = new vf.Stave(0, 0, 500).addClef(clef);
      if (clef !== 'percussion') {
        stave.addKeySignature(KEY_SPECS[part.score.keyFifths] ?? 'C');
      }
      if (withTime) {
        stave.addTimeSignature(part.score.timeSignature.join('/'));
      }
      widest = Math.max(widest, stave.getNoteStartX());
    }
  }
  // Minus the padding an unadorned stave has anyway.
  return widest - new vf.Stave(0, 0, 500).getNoteStartX();
}

interface SystemLayout {
  measures: number[];
  widths: number[];
  /** True when this system has to open a page. */
  startsPage?: boolean;
}

interface Grouping {
  perSystem?: number;
  /** Where breaks, runs and page breaks fall. */
  marks?: SystemMarks;
  /** Give every bar in a system the same width, whatever is written in it. */
  uniform?: boolean;
}

function layoutSystems(
  minWidths: number[],
  slots: number[],
  available: number,
  headerFirst: number,
  headerRest: number,
  grouping?: Grouping,
): SystemLayout[] {
  const planned = planSystemsOver(
    slots,
    grouping?.perSystem ?? Number.POSITIVE_INFINITY,
    grouping?.marks,
  );
  const systems: SystemLayout[] = planned.map((system) => ({
    measures: [...system.measures],
    widths: system.measures.map((index) => minWidths[index]),
    startsPage: system.startsPage,
  }));

  // How many bars a full system holds, so a short last line keeps their size
  // instead of stretching one bar across the page.
  const fullCount =
    grouping?.perSystem ??
    Math.max(1, ...systems.map((system) => system.measures.length));

  systems.forEach((system, i) => {
    const header = i === 0 ? headerFirst : headerRest;
    const count = system.widths.length;

    if (grouping?.uniform) {
      // Every bar in a system the same width, whatever is in it. Sharing the
      // room out in proportion to what each bar needs — the other branch —
      // makes a bar of sixteenths several times the width of a bar of rests,
      // which squeezes the sparse bars, reads badly, and makes the playhead
      // speed up and slow down across the system instead of moving evenly.
      const short = i === systems.length - 1 && count < fullCount;
      const each = short
        ? (available - headerRest) / fullCount
        : (available - header) / count;
      system.widths = system.widths.map(() =>
        Math.max(MIN_MEASURE_WIDTH, each),
      );
      return;
    }

    // Stretch each system to the full width; a short last line stays short.
    const natural = system.widths.reduce((a, b) => a + b, 0);
    const room = available - header - natural;
    const isShortLast =
      i === systems.length - 1 &&
      systems.length > 1 &&
      natural < available * 0.6;
    if (room <= 0 || isShortLast) return;
    system.widths = system.widths.map((w) => w + (room * w) / natural);
  });
  return systems;
}

interface Anchor {
  tick: number;
  x: number;
}

interface Rendered {
  scale: number;
  /** Drawn width in px, so a page narrower than the view can be centred. */
  width: number;
  /** Paper behind the music, in scaled px; empty when not laid out on pages. */
  pages: Array<{ top: number; height: number }>;
  height: number;
  systemHeight: number;
  barlines: BarlinePosition[];
  measures: MeasureBox[];
  notes: NoteInfo[];
  rests: RestInfo[];
  /** Each note's own notehead, so one note of a chord can be picked. */
  noteheads: Map<string, SVGElement>;
  /** Which rest each drawn rest element is, for hit-testing. */
  restElements: Map<SVGElement, string>;
  playheadTop: number;
  playheadHeight: number;
  systems: Array<{
    y: number;
    startTick: number;
    endTick: number;
    anchors: Anchor[];
  }>;
  groups: Map<string, SVGElement[]>;
}

/** Vertical offset of every staff within a system, and the system's height. */
function stackParts(parts: ScorePart[]) {
  const offsets: Array<Map<StaffId, number>> = [];
  let y = 0;
  parts.forEach((part, i) => {
    const map = new Map<StaffId, number>();
    part.score.staves.forEach((staff, j) => {
      map.set(staff, y + j * STAFF_SLOT);
    });
    offsets.push(map);
    y += (part.score.staves.length - 1) * STAFF_SLOT + STAFF_BODY;
    if (i < parts.length - 1) y += PART_GAP;
  });
  return { offsets, contentHeight: y };
}

interface RenderOptions {
  fitHeight: boolean;
  /** Extra room above every system, for an overlay's own marks. */
  headroom?: number;
  /** Draw onto paper of this size; without it the score fills the container. */
  page?: PageSpec;
  measuresPerSystem?: number;
  systemMarks?: SystemMarks;
  repeatStarts?: ReadonlySet<number>;
  repeatEnds?: ReadonlySet<number>;
  /** Bars to draw as a multi-bar rest, by the measure each one starts on. */
  multiRests?: ReadonlyMap<number, number>;
  /**
   * Printing: pages at their true size, one after another with no gap, so
   * each drawn page is exactly one printed sheet.
   */
  printing?: boolean;
  titleInset?: number;
}

function render(
  vf: VexFlowModule,
  host: HTMLDivElement,
  parts: ScorePart[],
  width: number,
  height: number,
  options: RenderOptions,
): Rendered {
  const { fitHeight } = options;
  host.innerHTML = '';
  const lead = parts[0].score;
  const measureCount = Math.max(...parts.map((p) => p.score.measures.length));
  const minWidths = Array.from({ length: measureCount }, (_, i) =>
    measureMinWidth(vf, parts, i),
  );
  // A multi-bar rest is written as one bar and eats the ones it covers, so
  // the page is laid out over these slots rather than over every bar.
  const multiRests = options.multiRests;
  const restBarsAt = (index: number) => {
    const bars = multiRests?.get(index) ?? 0;
    return bars > 1 ? Math.min(bars, measureCount - index) : 0;
  };
  const slots: number[] = [];
  for (let i = 0; i < measureCount; i += 1) {
    slots.push(i);
    const bars = restBarsAt(i);
    if (bars > 0) {
      // One bar's worth of room is too tight for the symbol and its count.
      minWidths[i] = Math.max(minWidths[i], MULTI_REST_WIDTH);
      i += bars - 1;
    }
  }
  const headerFirst = headerWidth(vf, parts, true);
  const headerRest = headerWidth(vf, parts, false);
  const { offsets, contentHeight } = stackParts(parts);
  // The system opens far enough below its own top for whatever stands there:
  // chord symbols, rehearsal marks, and any ledger lines reaching up to them.
  const systemTop =
    Math.max(SYSTEM_TOP, inkAboveStave(parts) + CHORD_ROOM) +
    (options.headroom ?? 0);
  const systemHeight = contentHeight + SYSTEM_GAP + (systemTop - SYSTEM_TOP);

  const renderer = new vf.Renderer(host, vf.Renderer.Backends.SVG);
  renderer.resize(width, 10);
  const ctx = renderer.getContext();

  // Part names sit left of the first measure of every system.
  const showNames = parts.length > 1;
  let nameWidth = 0;
  if (showNames) {
    ctx.setFont('Arial', 11);
    for (const part of parts) {
      if (part.name) {
        nameWidth = Math.max(nameWidth, ctx.measureText(part.name).width);
      }
    }
    if (nameWidth > 0) nameWidth += NAME_GAP;
  }
  const left = nameWidth + BRACE_WIDTH;

  // On a page, systems lay out into the paper's content width — a fixed size
  // — and the whole page is then scaled to the space on screen. That is what
  // keeps a four-bar system four bars of the same size whatever the window is
  // doing, and it resizes staves, notes and symbols together because the
  // scaling happens on the canvas rather than in the layout.
  const page = options.page;
  const grouping = {
    ...(options.measuresPerSystem !== undefined
      ? { perSystem: options.measuresPerSystem }
      : {}),
    ...(options.systemMarks ? { marks: options.systemMarks } : {}),
    // A page is engraved with bars of one size; a lesson staff keeps the
    // proportional spacing it has always had.
    ...(options.page ? { uniform: true } : {}),
  };
  const layoutAt = (scale: number) =>
    layoutSystems(
      minWidths,
      slots,
      (page ? pageContentWidth(page) / scale : width / scale) - left - RIGHT,
      headerFirst,
      headerRest,
      grouping,
    );

  /** The room a system has for bars, in music units, at a given shrink. */
  const musicRoom = (k: number) =>
    (page ? pageContentWidth(page) / k : width / k) - left - RIGHT;

  /**
   * The widest a system actually needs. With uniform bars every bar in a
   * system is as wide as its busiest one, so the system needs that width
   * times its bar count — more than the sum of what each bar would take on
   * its own, and the number the shrink has to satisfy.
   */
  const widestNeed = (laid: SystemLayout[]) => {
    let worst = 0;
    laid.forEach((system, index) => {
      const header = index === 0 ? headerFirst : headerRest;
      const need = uniformSystemNeed(
        system.measures.map((measureIndex) => minWidths[measureIndex]),
        header,
      );
      worst = Math.max(worst, need);
    });
    return worst;
  };

  let scale = 1;
  let systems = layoutAt(1);
  // How far the notation has to shrink for the busiest system to fit. A bar
  // of sixteenths needs far more room than a bar of rests, so with a fixed
  // bar count some systems ask for more width than the page has. Stretching
  // simply gave up on those and let them run off the edge; shrinking the
  // notation is what makes a four-bar system hold four bars whatever is in
  // them. Systems that already fit are untouched — this only ever shrinks.
  let contentScale = 1;
  if (page) {
    for (let pass = 0; pass < 6; pass++) {
      const need = widestNeed(systems);
      const room = musicRoom(contentScale);
      if (need <= room + 0.5) break;
      const next = fitScale(
        need + left + RIGHT,
        pageContentWidth(page),
        MIN_CONTENT_SCALE,
      );
      if (next >= contentScale) break;
      contentScale = next;
      systems = layoutAt(contentScale);
    }
    scale = contentScale * (options.printing ? 1 : pageScale(width, page));
  } else if (fitHeight && height > 0) {
    for (let s = 1; s >= MIN_SCALE - 1e-6; s -= 0.05) {
      const candidate = layoutAt(s);
      scale = s;
      systems = candidate;
      if (candidate.length * systemHeight * s <= height) break;
    }
  }

  // Pagination counts in page pixels, so a system takes the room it will
  // actually occupy once the notation has been shrunk.
  const forcedPageStarts = new Set(
    systems.flatMap((system, index) => (system.startsPage ? [index] : [])),
  );
  const pageGap = options.printing ? 0 : PAGE_GAP;
  const paged = page
    ? paginate(
        systems.length,
        systemHeight * contentScale,
        page,
        pageGap,
        forcedPageStarts,
        options.printing ? (options.titleInset ?? 0) : 0,
      )
    : null;
  const viewScale = page
    ? options.printing
      ? 1
      : pageScale(width, page)
    : scale;
  const totalHeight = paged ? paged.totalHeight : systems.length * systemHeight;
  renderer.resize(
    (page ? page.width : width) * viewScale,
    totalHeight * (page ? viewScale : scale),
  );
  ctx.scale(scale, scale);
  // Drawing happens in music units, so a position on the page divides by the
  // shrink to land where it belongs once `scale` has been applied.
  const toMusic = (pagePx: number) => pagePx / contentScale;

  const groups = new Map<string, SVGElement[]>();
  const pendingTies = new Map<
    string,
    { note: Note; index: number; system: number }
  >();
  const ties: Array<InstanceType<VexFlowModule['StaveTie']>> = [];
  const rendered: Rendered = {
    scale,
    // The paper scales with the view alone; only the music inside it carries
    // the extra shrink that makes a crowded system fit.
    width: (page ? page.width : width) * viewScale,
    pages:
      page && paged
        ? pageTops(paged.pageCount, page, pageGap).map((top) => ({
            top: top * viewScale,
            height: page.height * viewScale,
          }))
        : [],
    height: totalHeight * (page ? viewScale : scale),
    systemHeight,
    barlines: [],
    measures: [],
    notes: [],
    rests: [],
    noteheads: new Map(),
    restElements: new Map(),
    playheadTop: systemTop + 28,
    playheadHeight: contentHeight - 28 + 10,
    systems: [],
    groups,
  };
  const lastMeasure = measureCount - 1;

  systems.forEach((system, systemIndex) => {
    // On a page a system sits inside the margins of whichever page it fell on.
    const systemY = paged
      ? toMusic(paged.systems[systemIndex].y)
      : systemIndex * systemHeight;
    const y = systemY + systemTop;
    let x = (page ? toMusic(page.margin) : 0) + left;
    const anchors: Anchor[] = [];

    system.measures.forEach((measureIndex, j) => {
      const first = j === 0;
      // A slot is one bar, or the run of bars a multi-bar rest stands for.
      const restBars = restBarsAt(measureIndex);
      const slotEnd = measureIndex + Math.max(0, restBars - 1);
      const header = first ? (systemIndex === 0 ? headerFirst : headerRest) : 0;
      const staveWidth = system.widths[j] + header;
      const partStaves: Array<Map<StaffId, Stave>> = [];

      // 1. Staves for every part, stacked.
      parts.forEach((part, partIndex) => {
        const staves = new Map<StaffId, Stave>();
        for (const staff of part.score.staves) {
          const stave = new vf.Stave(
            x,
            y + offsets[partIndex].get(staff)!,
            staveWidth,
          );
          if (first) {
            stave.addClef(staff);
            if (staff !== 'percussion') {
              stave.addKeySignature(KEY_SPECS[part.score.keyFifths] ?? 'C');
            }
            if (systemIndex === 0) {
              stave.addTimeSignature(part.score.timeSignature.join('/'));
            }
          }
          if (options.repeatStarts?.has(measureIndex)) {
            stave.setBegBarType(vf.Barline.type.REPEAT_BEGIN);
          }
          if (options.repeatEnds?.has(slotEnd)) {
            stave.setEndBarType(vf.Barline.type.REPEAT_END);
          } else if (slotEnd === lastMeasure) {
            stave.setEndBarType(vf.Barline.type.END);
          }
          stave.setContext(ctx).draw();
          staves.set(staff, stave);
        }
        partStaves.push(staves);
      });

      // 2. Line every part up on the same note start.
      const noteStart = Math.max(
        ...partStaves.flatMap((staves) =>
          [...staves.values()].map((s) => s.getNoteStartX()),
        ),
      );
      for (const staves of partStaves) {
        for (const stave of staves.values()) stave.setNoteStartX(noteStart);
      }

      // 3. Braces, brackets and barlines through each part.
      parts.forEach((part, partIndex) => {
        const staves = [...partStaves[partIndex].values()];
        const top = staves[0];
        const bottom = staves[staves.length - 1];
        if (first && staves.length > 1) {
          new vf.StaveConnector(top, bottom)
            .setType('brace')
            .setContext(ctx)
            .draw();
        }
        if (first) {
          new vf.StaveConnector(top, bottom)
            .setType('singleLeft')
            .setContext(ctx)
            .draw();
          if (showNames && part.name) {
            ctx.openGroup('part-name');
            ctx.setFont('Arial', 11);
            // Right-justified so every name ends just before the brace,
            // rather than starting at the page edge and leaving a ragged gap.
            // `nameWidth` already carries NAME_GAP, which belongs between the
            // name and the brace — so the text ends before it, not on it.
            const nameRight =
              (page ? toMusic(page.margin) : 0) + nameWidth - NAME_GAP;
            ctx.fillText(
              part.name,
              Math.max(0, nameRight - ctx.measureText(part.name).width),
              top.getYForLine(2) + ((staves.length - 1) * STAFF_SLOT) / 2 + 4,
            );
            ctx.closeGroup();
          }
        }
        new vf.StaveConnector(top, bottom)
          .setType(slotEnd === lastMeasure ? 'boldDoubleRight' : 'singleRight')
          .setContext(ctx)
          .draw();
      });

      // 4. A bracket down the whole system, and the bar number.
      if (first) {
        const top = [...partStaves[0].values()][0];
        const bottom = [...partStaves[parts.length - 1].values()].at(-1)!;
        if (parts.length > 1) {
          new vf.StaveConnector(top, bottom)
            .setType('bracket')
            .setContext(ctx)
            .draw();
        }
        ctx.openGroup('measure-number');
        ctx.setFont('Arial', 10);
        ctx.fillText(
          String(measureOf(lead, measureIndex).number),
          x + 2,
          y + 26,
        );
        ctx.closeGroup();
      }

      // 5. Notes — or, over a run of empty bars, the multi-bar rest itself.
      if (restBars > 0) {
        for (const staves of partStaves) {
          for (const stave of staves.values()) {
            new vf.MultiMeasureRest(restBars, { numberOfMeasures: restBars })
              .setStave(stave)
              .setContext(ctx)
              .draw();
          }
        }
      }
      parts.forEach((part, partIndex) => {
        const measure = measureOf(part.score, measureIndex);
        // The bars a multi-bar rest covers are not written out.
        if (restBars > 0) return;
        const staves = partStaves[partIndex];
        const built = buildMeasure(vf, measure, part.score);
        const formatter = new vf.Formatter();
        for (const [staff, voices] of built.voices) {
          for (const voice of voices) voice.setStave(staves.get(staff)!);
          if (voices.length > 0) formatter.joinVoices(voices);
        }
        const anyStave = staves.values().next().value!;
        formatter.format(
          allVoices(built),
          anyStave.getNoteEndX() - noteStart - 12,
        );
        for (const [staff, voices] of built.voices) {
          for (const voice of voices) voice.draw(ctx, staves.get(staff)!);
        }
        for (const beam of built.beams) beam.setContext(ctx).draw();
        for (const tuplet of built.tuplets) tuplet.setContext(ctx).draw();

        const drawn = [...built.drawn].sort(
          (a, b) => a.item.startTick - b.item.startTick,
        );
        for (const { item, note, staff } of drawn) {
          if (item.kind === 'rest' && !item.hidden) {
            // Rests are pickable too: a note can be written over one.
            const element = note.getSVGElement();
            const key = `rest|${partIndex}|${item.startTick}`;
            const glyphText = element?.querySelector(
              '.vf-notehead text',
            ) as SVGTextElement | null;
            const glyph = glyphText?.getAttribute('y');
            // Centre of the rest glyph, so a chord symbol sits over the beat.
            const half = glyphText?.getComputedTextLength
              ? glyphText.getComputedTextLength() / 2
              : 0;
            if (element) rendered.restElements.set(element, key);
            rendered.rests.push({
              key,
              partIndex,
              measureIndex,
              tick: item.startTick,
              durationTicks: item.durationTicks,
              x: (note.getAbsoluteX() + half) * scale,
              y: (glyph ? Number(glyph) : 0) * scale,
            });
            if (element) rendered.noteheads.set(key, element);
          }
          if (item.kind !== 'note') continue;
          const element = note.getSVGElement();
          if (element) {
            for (const key of item.keys) {
              const list = groups.get(key.noteId) ?? [];
              list.push(element);
              groups.set(key.noteId, list);
            }
          }
          // Each key's own notehead, so a single note of a chord is pickable.
          const staveNote = note instanceof vf.StaveNote ? note : undefined;
          const heads = staveNote?.noteHeads;
          const keyProps = staveNote?.getKeyProps();
          const stem: 'up' | 'down' | null = !staveNote?.hasStem()
            ? null
            : staveNote.getStemDirection() === vf.Stem.DOWN
              ? 'down'
              : 'up';
          item.keys.forEach((key, keyIndex) => {
            const head = heads?.[keyIndex]?.getSVGElement();
            if (head) rendered.noteheads.set(key.noteId, head);
            // The notehead glyph's own baseline is its vertical position; it
            // is drawn in unscaled units, like every other box recorded here.
            const glyphY = head?.querySelector('text')?.getAttribute('y');
            // The glyph's x is its left edge; marks and slurs want its centre.
            const glyphX = head?.querySelector('text')?.getAttribute('x');
            const centreX =
              (glyphX ? Number(glyphX) : note.getAbsoluteX()) + NOTEHEAD_HALF;
            rendered.notes.push({
              id: key.noteId,
              partIndex,
              measureIndex,
              tick: item.startTick,
              x: centreX * scale,
              space: STAFF_STEP * scale,
              stem,
              letter: key.letter,
              octave: key.octave,
              alteration: key.alteration,
              line: keyProps?.[keyIndex]?.line ?? 2,
              y: (glyphY ? Number(glyphY) : 0) * scale,
            });
          });
          // Ties are matched by pitch, so they cross voices, bars and systems.
          item.keys.forEach((key, index) => {
            const slot = `${part.id}:${staff}:${key.midi}`;
            const from = item.tieFromPrev ? pendingTies.get(slot) : undefined;
            if (from) {
              if (from.system === systemIndex) {
                ties.push(
                  new vf.StaveTie({
                    firstNote: from.note,
                    lastNote: note,
                    firstIndexes: [from.index],
                    lastIndexes: [index],
                  }),
                );
              } else {
                ties.push(
                  new vf.StaveTie({
                    firstNote: from.note,
                    firstIndexes: [from.index],
                  }),
                  new vf.StaveTie({ lastNote: note, lastIndexes: [index] }),
                );
              }
              pendingTies.delete(slot);
            }
            if (item.tieToNext) {
              pendingTies.set(slot, { note, index, system: systemIndex });
            }
          });
        }
      });

      const measure = measureOf(lead, measureIndex);
      const slotEndTick = measureOf(lead, slotEnd).endTick;
      if (measure) {
        anchors.push({ tick: measure.startTick, x: noteStart });
        anchors.push({ tick: slotEndTick!, x: x + staveWidth - 4 });
      }
      rendered.barlines.push({
        measureIndex,
        atSystemEnd: false,
        system: systemIndex,
        x: x * scale,
        y: (systemY + systemTop) * scale,
        height: contentHeight * scale,
      });
      if (measure) {
        // One box per part: a measure is selected per instrument.
        parts.forEach((part, partIndex) => {
          const staffOffsets = part.score.staves.map(
            (staff) => offsets[partIndex].get(staff)!,
          );
          const top = Math.min(...staffOffsets);
          const bottom = Math.max(...staffOffsets) + STAFF_BODY;
          rendered.measures.push({
            measureIndex,
            partIndex,
            system: systemIndex,
            x: x * scale,
            y: (y + top) * scale,
            width: staveWidth * scale,
            height: (bottom - top) * scale,
            startTick: measure.startTick,
            endTick: slotEndTick!,
          });
        });
      }
      x += staveWidth;
      if (j === system.measures.length - 1) {
        // A line's closing barline is the same roadmap point as the next
        // measure's opening one, and is clickable in both places.
        rendered.barlines.push({
          measureIndex: measureIndex + 1,
          atSystemEnd: true,
          system: systemIndex,
          x: x * scale,
          y: (systemY + systemTop) * scale,
          height: contentHeight * scale,
        });
      }
    });

    // Anchors must rise with time; keep the leftmost x per tick.
    anchors.sort((a, b) => a.tick - b.tick || a.x - b.x);
    const unique = anchors.filter(
      (a, i) => i === 0 || a.tick !== anchors[i - 1].tick,
    );
    for (let i = 1; i < unique.length; i++) {
      unique[i].x = Math.max(unique[i].x, unique[i - 1].x);
    }
    const firstMeasure = measureOf(lead, system.measures[0]);
    const lastOfSystem = measureOf(lead, system.measures.at(-1)!);
    rendered.systems.push({
      y: systemY,
      startTick: firstMeasure?.startTick ?? 0,
      endTick: lastOfSystem?.endTick ?? 0,
      anchors: unique,
    });
  });
  for (const tie of ties) tie.setContext(ctx).draw();
  return rendered;
}

/** Playhead position (unscaled px) for a tick, or null outside the score. */
/**
 * Where the playhead sits for a tick — linear in time across the whole system.
 *
 * WHY NOT FOLLOW THE NOTEHEADS
 * Notation spacing is not proportional to duration: a whole note is nowhere
 * near four times the width of a quarter, and a justified system widens a busy
 * bar over a sparse one holding the same amount of time. Interpolating between
 * noteheads — which this used to do — made the playhead crawl across long notes
 * and bolt across short ones, so the one thing on screen that is supposed to
 * BE the flow of time was the thing moving unevenly.
 *
 * Mapping the system's tick span onto its drawn span instead gives a constant
 * velocity, and the rhythm of the notes is then read against that even sweep —
 * which is the point of a playhead. The cost is that it does not sit exactly on
 * each notehead; the notes keep their engraved spacing and the clock stays
 * honest.
 *
 * The first and last anchors are the system's musical edges: the x where its
 * first bar's notes begin (after the clef and key) and the x where its last bar
 * ends.
 */
export function playheadX(
  anchors: readonly { tick: number; x: number }[],
  tick: number,
): number | null {
  if (anchors.length < 2) return null;
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  const span = last.tick - first.tick;
  if (span <= 0) return first.x;
  const t = Math.min(1, Math.max(0, (tick - first.tick) / span));
  return first.x + (last.x - first.x) * t;
}

function locate(rendered: Rendered, tick: number) {
  const index = rendered.systems.findIndex(
    (s) => tick >= s.startTick && tick <= s.endTick,
  );
  if (index === -1) return null;
  const { anchors, y } = rendered.systems[index];
  const x = playheadX(anchors, tick);
  return x === null ? null : { system: index, x, y };
}

/**
 * True while the document is being printed. `beforeprint` is flushed
 * synchronously so the print layout is on the page before the browser takes
 * its snapshot; the print media query covers print emulation. Only a paged
 * score cares, so a lesson staff never re-renders for it.
 */
function usePrinting(enabled: boolean): boolean {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const query = window.matchMedia('print');
    const set = (value: boolean) => flushSync(() => setPrinting(value));
    const onChange = (event: MediaQueryListEvent) => set(event.matches);
    const onBefore = () => set(true);
    const onAfter = () => set(false);
    query.addEventListener('change', onChange);
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      query.removeEventListener('change', onChange);
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
    };
  }, [enabled]);
  return printing;
}

export function StaffView({
  parts,
  noteStyles,
  noteOffsets,
  playheadTick,
  fitHeight = false,
  page,
  printTitleInset,
  measuresPerSystem,
  systemMarks,
  repeatStarts,
  repeatEnds,
  headroom,
  multiRests,
  onLayout,
  overlay,
  onNotePointerDown,
  onMeasurePointerDown,
  onRestPointerDown,
  onBackgroundPointerDown,
  className,
  style,
}: StaffViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  /** Which page the view is looking at, for the navigation at the bottom. */
  const [visiblePage, setVisiblePage] = useState(0);
  const [vf, setVf] = useState<VexFlowModule | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    loadVexFlow().then(
      (module) => alive && setVf(module),
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width: Math.floor(width), height: Math.floor(height) },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const printing = usePrinting(page !== undefined);
  const layoutHeight = fitHeight ? size.height : 0;
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!vf || !host || size.width < 50 || parts.length === 0) return;
    try {
      setRendered(
        render(vf, host, parts, size.width, layoutHeight, {
          fitHeight,
          page,
          measuresPerSystem,
          systemMarks,
          repeatStarts,
          repeatEnds,
          headroom,
          multiRests,
          printing,
          titleInset: printTitleInset,
        }),
      );
    } catch (err) {
      if (import.meta.env.DEV) console.error('[StaffView] render failed', err);
      setError(true);
    }
  }, [
    vf,
    parts,
    size.width,
    layoutHeight,
    fitHeight,
    page,
    measuresPerSystem,
    systemMarks,
    repeatStarts,
    repeatEnds,
    headroom,
    multiRests,
    printing,
    printTitleInset,
  ]);

  useEffect(() => {
    onLayout?.(
      rendered
        ? {
            barlines: rendered.barlines,
            measures: rendered.measures,
            notes: rendered.notes,
            rests: rendered.rests,
            scale: rendered.scale,
            systemHeight: rendered.systemHeight * rendered.scale,
            stepPx: STAFF_STEP * rendered.scale,
          }
        : null,
    );
  }, [rendered, onLayout]);

  // Highlights: restyle in place — no re-render. A chord is painted as a
  // whole only when all of its notes agree; otherwise each notehead carries
  // its own style, so one note of a chord can be selected on its own.
  useEffect(() => {
    if (!rendered) return;
    const key = (style?: NoteStyle) =>
      `${style?.color ?? ''}|${style?.glow ? 1 : 0}|${style?.dim ? 1 : 0}`;
    const idsByElement = new Map<SVGElement, string[]>();
    for (const [id, elements] of rendered.groups) {
      for (const element of elements) {
        idsByElement.set(element, [...(idsByElement.get(element) ?? []), id]);
      }
    }
    const paint = (element: SVGElement, style?: NoteStyle) => {
      const color = style?.color ?? '';
      if (element.style.color !== color) element.style.color = color;
      element.classList.toggle('ma-note-glow', !!style?.glow);
      element.classList.toggle('ma-note-dim', !!style?.dim);
    };
    for (const [element, ids] of idsByElement) {
      const first = noteStyles?.get(ids[0]);
      const uniform = ids.every(
        (id) => key(noteStyles?.get(id)) === key(first),
      );
      paint(element, uniform ? first : undefined);
    }
    for (const [id, head] of rendered.noteheads) {
      paint(head, noteStyles?.get(id));
    }
  }, [rendered, noteStyles]);

  // Live drag feedback: nudge the drawn chords themselves.
  useEffect(() => {
    if (!rendered) return;
    const moved = new Map<SVGElement, string>();
    for (const [id, elements] of rendered.groups) {
      const offset = noteOffsets?.get(id);
      const transform =
        offset && (offset.x !== 0 || offset.y !== 0)
          ? `translate(${offset.x}px, ${offset.y}px)`
          : '';
      for (const element of elements) {
        if (transform) moved.set(element, transform);
        else if (!moved.has(element)) moved.set(element, '');
      }
    }
    for (const [element, transform] of moved) {
      if (element.style.transform !== transform) {
        element.style.transform = transform;
      }
    }
  }, [rendered, noteOffsets]);

  // Which note ids each drawn chord carries, and which note each notehead is.
  const notesByElement = useMemo(() => {
    const map = new Map<SVGElement, string[]>();
    if (!rendered) return map;
    for (const [id, elements] of rendered.groups) {
      for (const element of elements) {
        map.set(element, [...(map.get(element) ?? []), id]);
      }
    }
    return map;
  }, [rendered]);

  const noteById = useMemo(() => {
    const map = new Map<string, NoteInfo>();
    for (const info of rendered?.notes ?? []) map.set(info.id, info);
    return map;
  }, [rendered]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!rendered) return;
    const target = event.target as Element | null;
    const chord = target?.closest?.('.vf-stavenote') as SVGElement | null;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const restKey = chord ? rendered.restElements.get(chord) : undefined;
    if (restKey) {
      onRestPointerDown?.(restKey, event);
      return;
    }
    const ids = chord ? notesByElement.get(chord) : undefined;
    if (ids && ids.length > 0) {
      // A chord is one hit area, so the note picked is the one whose head the
      // pointer is nearest vertically.
      let noteId = ids[0];
      let nearest = Infinity;
      for (const id of ids) {
        const info = noteById.get(id);
        if (!info) continue;
        const distance = Math.abs(info.y - y);
        if (distance < nearest) {
          nearest = distance;
          noteId = id;
        }
      }
      onNotePointerDown?.({ noteId, noteIds: ids }, event);
      return;
    }
    const measure = rendered.measures.find(
      (m) => x >= m.x && x <= m.x + m.width && y >= m.y && y <= m.y + m.height,
    );
    if (measure) {
      onMeasurePointerDown?.(
        { measureIndex: measure.measureIndex, partIndex: measure.partIndex },
        event,
      );
    } else onBackgroundPointerDown?.(event);
  };

  const playhead =
    rendered && playheadTick != null ? locate(rendered, playheadTick) : null;

  // Keep the playhead's system in view.
  const playheadSystem = playhead?.system;
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !rendered || playheadSystem === undefined) return;
    const top = rendered.systems[playheadSystem].y * rendered.scale;
    const bottom = top + rendered.systemHeight * rendered.scale;
    if (
      top < container.scrollTop ||
      bottom > container.scrollTop + container.clientHeight
    ) {
      container.scrollTo({ top, behavior: 'smooth' });
    }
  }, [playheadSystem, rendered]);

  const pages = rendered?.pages ?? [];
  const goToPage = (index: number) => {
    const container = containerRef.current;
    const sheet = pages[index];
    if (!container || !sheet) return;
    container.scrollTo({ top: sheet.top, behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      className={`ma-grand-staff relative overflow-y-auto ${page ? 'overflow-x-auto' : 'overflow-x-hidden'} ${className ?? ''}`}
      style={style}
      onScroll={(event) => {
        if (pages.length < 2) return;
        // The page whose top has most recently passed the top of the view.
        const top = event.currentTarget.scrollTop + 4;
        let at = 0;
        pages.forEach((sheet, index) => {
          if (sheet.top <= top) at = index;
        });
        setVisiblePage(at);
      }}
    >
      {error ? (
        <div className="p-4 text-xs" style={{ color: 'var(--color-text-dim)' }}>
          Notation couldn&apos;t be drawn.
        </div>
      ) : (
        !rendered && (
          <div
            className="p-4 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Loading notation…
          </div>
        )
      )}
      <div
        className="relative"
        style={{
          height: rendered?.height,
          width: rendered?.width,
          margin: '0 auto',
        }}
        onPointerDown={handlePointerDown}
      >
        {rendered?.pages.map((sheet, i) => (
          <div
            key={`page-${i}`}
            className="ma-staff-page"
            style={{
              position: 'absolute',
              left: 0,
              top: sheet.top,
              width: '100%',
              height: sheet.height,
            }}
          />
        ))}
        <div ref={hostRef} className="relative" />
        {rendered && overlay}
        {rendered && playhead && (
          <div
            className="ma-playhead pointer-events-none"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 2,
              height: rendered.playheadHeight * rendered.scale,
              transform: `translate(${playhead.x * rendered.scale}px, ${(playhead.y + rendered.playheadTop) * rendered.scale}px)`,
              background: 'var(--ma-playhead, rgba(126, 207, 207, 0.85))',
              boxShadow: '0 0 6px rgba(126, 207, 207, 0.6)',
              willChange: 'transform',
            }}
          />
        )}
      </div>

      {/* Page navigation — only worth showing once there is more than one. */}
      {pages.length > 1 && (
        <div
          className="ma-staff-controls pointer-events-none sticky bottom-0 left-0 flex w-full justify-center pb-2 pt-3"
          style={{ zIndex: 20 }}
        >
          <div
            className="pointer-events-auto flex items-center gap-1 rounded-full border px-1.5 py-1 text-[11px] shadow-lg"
            style={{
              background: 'var(--color-surface-2)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <button
              onClick={() => goToPage(visiblePage - 1)}
              disabled={visiblePage === 0}
              title="Previous page"
              aria-label="Previous page"
              className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              style={{ opacity: visiblePage === 0 ? 0.35 : 1 }}
            >
              ‹
            </button>
            <span className="px-1 tabular-nums">
              Page {Math.min(visiblePage + 1, pages.length)} of {pages.length}
            </span>
            <button
              onClick={() => goToPage(visiblePage + 1)}
              disabled={visiblePage >= pages.length - 1}
              title="Next page"
              aria-label="Next page"
              className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              style={{
                opacity: visiblePage >= pages.length - 1 ? 0.35 : 1,
              }}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
