import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { TabItem, TabMeasure, TabScore } from '@/lib/notation';
import { planSystems } from '@/lib/notation/systemPlan';
import {
  loadVexFlow,
  playheadX,
  type BarlinePosition,
  type MeasureBox,
  type NoteInfo,
  type NoteStyle,
  type RestInfo,
  type StaffLayout,
} from './StaffView';
import './tabStaff.css';

// ── Guitar TAB renderer ────────────────────────────────────────────────────
// Six strings with the rhythm stemmed below them — stems, beams, dots and
// rests — so a student reads when to play as well as where. VexFlow's TabStave
// and TabNote do the engraving; the page around it (systems that wrap to the
// width, a linear playhead, highlights, the layout overlays read) works the
// way StaffView's does, so chord symbols sit over TAB unchanged.

type VexFlowModule = typeof import('vexflow/bravura');
type Note = InstanceType<VexFlowModule['Note']>;
type StemmableNote = InstanceType<VexFlowModule['StemmableNote']>;
type Voice = InstanceType<VexFlowModule['Voice']>;
type Beam = InstanceType<VexFlowModule['Beam']>;
type Tuplet = InstanceType<VexFlowModule['Tuplet']>;
type TimeSignature = InstanceType<VexFlowModule['TimeSignature']>;

// Layout, in unscaled px.
/** VexFlow's TabStave: six lines 13px apart. */
const LINE_GAP = 13;
/**
 * The stave's y sits one line above the top string. It is the y a measure box
 * reports, and chord symbols stand a fixed height above it, so this is what
 * keeps them clear of the top string.
 */
const HEADROOM_LINES = 1;
const TOP_LINE_DROP = HEADROOM_LINES * LINE_GAP;
const BOTTOM_LINE_DROP = TOP_LINE_DROP + 5 * LINE_GAP;
/**
 * The `topLineDrop` reported to overlays. ChordSymbolOverlay stands a symbol
 * 6px + one 16px line above the line this names; -2 keeps TAB's symbols where
 * this layout was drawn around them (top at the stave's y less 24), clear of
 * the step chips on the headroom line and beside the Music Map's job marks.
 * TOP_LINE_DROP would sit them 6px above the top string, as staves do now.
 */
const CHORD_SYMBOL_DROP = -2;
/** Room above each system for chord symbols. */
const SYSTEM_TOP = 28;
/** Stems, beams and rhythm dots hang below the bottom string. */
const STEM_ROOM = 50;
const SYSTEM_GAP = 12;
const SYSTEM_HEIGHT = SYSTEM_TOP + BOTTOM_LINE_DROP + STEM_ROOM + SYSTEM_GAP;
/** The string names' column, left of every system. */
const NAME_WIDTH = 14;
const RIGHT = 6;
/** Narrowest bar: fret digits closer than this stop reading as rhythm. */
const MIN_BAR_WIDTH = 150;
const NOTE_PADDING = 28;
/**
 * A half note's stem is drawn half length. Stemmed TAB has no hollow
 * noteheads, so this (the short-stem convention of Guitar Pro and MuseScore)
 * is what tells a half note from a quarter.
 */
const HALF_NOTE_STEM = 18;
/**
 * The fret digits are 9pt (12px) at scale 1. Scale grows them to fill a tall
 * panel, to about 24px on a one-line step. A step whose lines don't all fit
 * at scale 1 isn't shrunk to fit: it pages, a line at a time, at the largest
 * scale up to 1 where one line fits (never below what reads at arm's length).
 */
const MIN_SCALE = 0.85;
const MAX_SCALE = 2;
const PAGE_SCALE = 1;
const SCALE_STEP = 0.05;
/** Top line to bottom: string 1 (high e) to string 6. */
const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];
/**
 * String names and bar numbers: the app's type, 10 drawing units (px at
 * scale 1) but never under 12px on screen.
 */
const LABEL_FONT = 'Glacial Indifference';
const LABEL_SIZE = 10;
const LABEL_MIN_PX = 12;
/** Baseline below a string line that centres a label on it, in ems. */
const LABEL_DROP = 0.34;
/** A rest centred on six lines: the middle space, as 'b/4' is on five. */
const REST_KEY = 'a/4';

interface DrawnItem {
  item: TabItem;
  note: Note;
  voiceIndex: 0 | 1;
}

interface BuiltMeasure {
  voices: Voice[];
  beams: Beam[];
  tuplets: Tuplet[];
  drawn: DrawnItem[];
}

/** A time signature centred on six lines rather than five. */
function timeSignature(vf: VexFlowModule, score: TabScore): TimeSignature {
  const signature = new vf.TimeSignature(score.timeSignature.join('/'));
  signature.topLine += 0.5;
  signature.bottomLine += 0.5;
  return signature;
}

/** VexFlow notes, voices, beams and tuplets for one bar of TAB. */
function buildMeasure(
  vf: VexFlowModule,
  measure: TabMeasure,
  score: TabScore,
): BuiltMeasure {
  const [numerator, denominator] = score.timeSignature;
  const built: BuiltMeasure = { voices: [], beams: [], tuplets: [], drawn: [] };
  const beamGroup = new vf.Fraction(
    score.beatTicks,
    score.ticksPerQuarter * 4,
  ).simplify();

  for (const { index, items } of measure.voices) {
    // The rhythm hangs below the strings; a note held under moving ones is
    // the second voice, stemmed above them.
    const stem = index === 0 ? vf.Stem.DOWN : vf.Stem.UP;
    const notes: Note[] = items.map((item) => {
      let note: Note;
      if (item.hidden || (item.kind === 'note' && !item.positions.length)) {
        // A TabNote with no frets throws when drawn; hold the time instead.
        note = new vf.GhostNote({ duration: item.value, dots: item.dots });
      } else if (item.kind === 'rest') {
        const rest = new vf.StaveNote({
          keys: [REST_KEY],
          duration: `${item.value}r`,
          dots: item.dots,
          ...(item.wholeMeasure ? { alignCenter: true } : {}),
        });
        if (item.dots) vf.Dot.buildAndAttach([rest], { all: true });
        note = rest;
      } else {
        // A whole note is written as the fret alone.
        const tabNote = new vf.TabNote(
          {
            positions: item.positions.map((p) => ({
              str: p.string,
              fret: p.fret,
            })),
            duration: item.value,
            dots: item.dots,
            stemDirection: stem,
          },
          item.value !== 'w',
        );
        // The stem takes its length when its direction is set.
        if (item.value === 'h') {
          tabNote.setStemLength(HALF_NOTE_STEM).setStemDirection(stem);
        }
        if (item.ghost) tabNote.setGhost(true);
        if (item.dots) vf.Dot.buildAndAttach([tabNote]);
        note = tabNote;
      }
      built.drawn.push({ item, note, voiceIndex: index });
      return note;
    });

    // Triplets: consecutive items sharing a beat.
    let group: Note[] = [];
    let groupStart: number | undefined;
    const flush = () => {
      if (group.length > 0) {
        built.tuplets.push(
          new vf.Tuplet(group, {
            numNotes: 3,
            notesOccupied: 2,
            bracketed: false,
            ratioed: false,
            location:
              stem === vf.Stem.DOWN
                ? vf.Tuplet.LOCATION_BOTTOM
                : vf.Tuplet.LOCATION_TOP,
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
    built.voices.push(voice);
    built.beams.push(
      ...vf.Beam.generateBeams(
        notes.filter(
          (n): n is StemmableNote =>
            n instanceof vf.TabNote || n instanceof vf.StaveNote,
        ),
        { groups: [beamGroup], maintainStemDirections: true },
      ),
    );
  }
  return built;
}

function measureMinWidth(
  vf: VexFlowModule,
  measure: TabMeasure,
  score: TabScore,
): number {
  const { voices } = buildMeasure(vf, measure, score);
  const formatter = new vf.Formatter().joinVoices(voices);
  return formatter.preCalculateMinTotalWidth(voices) + NOTE_PADDING;
}

/** Width of the TAB clef (+ time) at the start of a system. */
function headerWidth(
  vf: VexFlowModule,
  score: TabScore,
  withTime: boolean,
): number {
  const stave = new vf.TabStave(0, 0, 500).addClef('tab');
  if (withTime) stave.addModifier(timeSignature(vf, score));
  // Minus the padding an unadorned stave has anyway.
  return stave.getNoteStartX() - new vf.TabStave(0, 0, 500).getNoteStartX();
}

interface TabSystem {
  measures: number[];
  barWidth: number;
}

interface Anchor {
  tick: number;
  x: number;
}

export interface TabRenderOptions {
  /**
   * Scale (1–2) so every system fits the height; when they can't all fit at
   * 1, page a line at a time instead (see chooseTabScale).
   */
  fitHeight: boolean;
}

/** The scales tried, largest first, in SCALE_STEP steps. */
function scalesBetween(max: number, min: number): number[] {
  const scales: number[] = [];
  for (let s = max; s >= min - 1e-6; s -= SCALE_STEP) {
    scales.push(Math.round(s * 100) / 100);
  }
  return scales;
}

export interface TabScaleChoice {
  scale: number;
  /**
   * The lines don't all fit the height: the view shows the playhead's line
   * at the top and turns to the next one as the playhead reaches it.
   */
  paged: boolean;
}

/**
 * The scale a TAB is drawn at. Fitting a height: the largest scale from 2
 * down to 1 at which every line fits; failing that, it pages — the largest
 * scale from 1 down to 0.85 at which one line fits (0.85 if none does).
 * Without a height to fit: 1, or less when a bar is too wide for the width.
 * A bar always has to fit the width.
 */
export function chooseTabScale({
  fitHeight,
  height,
  systemHeight,
  fitsWidth,
  linesAt,
}: {
  fitHeight: boolean;
  /** The panel's height, px. */
  height: number;
  /** One line's height at scale 1, px. */
  systemHeight: number;
  /** A bar fits the width at this scale. */
  fitsWidth: (scale: number) => boolean;
  /** How many lines the TAB wraps onto at this scale. */
  linesAt: (scale: number) => number;
}): TabScaleChoice {
  if (!fitHeight || height <= 0) {
    return {
      scale: fitsWidth(1)
        ? 1
        : (scalesBetween(1, MIN_SCALE).find((s) => s < 1 && fitsWidth(s)) ??
          MIN_SCALE),
      paged: false,
    };
  }
  const whole = scalesBetween(MAX_SCALE, PAGE_SCALE).find(
    (s) => fitsWidth(s) && linesAt(s) * systemHeight * s <= height,
  );
  if (whole !== undefined) return { scale: whole, paged: false };
  const page =
    scalesBetween(PAGE_SCALE, MIN_SCALE).find(
      (s) => fitsWidth(s) && systemHeight * s <= height,
    ) ?? MIN_SCALE;
  // Paged only when the lines still don't all fit: a one-line step, or one
  // held under scale 1 by its width alone, has nothing to page through.
  if (linesAt(page) * systemHeight * page <= height) {
    return { scale: page, paged: false };
  }
  // Paged: the lines that fit are drawn just large enough to fill the panel,
  // so the next line never shows cut off under the last (a phone's one-line
  // panel showed the top of line 2 under line 1). The width still decides.
  const perPage = Math.max(1, Math.floor(height / (systemHeight * page)));
  const fill = Math.min(
    MAX_SCALE,
    Math.floor((height / (perPage * systemHeight)) * 100) / 100,
  );
  const filled =
    fill > page
      ? fitsWidth(fill)
        ? fill
        : scalesBetween(fill, page).find((s) => s > page && fitsWidth(s))
      : undefined;
  return { scale: filled ?? page, paged: true };
}

export interface TabRendered {
  scale: number;
  /** One line shows at a time and the view turns to the playhead's line. */
  paged: boolean;
  height: number;
  /** Unscaled height of one system. */
  systemHeight: number;
  barlines: BarlinePosition[];
  measures: MeasureBox[];
  notes: NoteInfo[];
  rests: RestInfo[];
  playheadTop: number;
  playheadHeight: number;
  systems: Array<{
    y: number;
    startTick: number;
    endTick: number;
    anchors: Anchor[];
  }>;
  /** Each lesson note's drawn TabNotes (more than one when tied). */
  groups: Map<string, SVGElement[]>;
  /**
   * Each lesson note's own fret digits, one per drawn TabNote, so one string
   * of a chord can be lit — in every tied segment, not only the last.
   */
  digits: Map<string, SVGElement[]>;
}

/**
 * Draw the whole TAB into `host`, wrapped into systems `width` wide. Pure DOM,
 * so it can be tested without React or a layout engine.
 */
export function renderTabSystem(
  vf: VexFlowModule,
  host: HTMLDivElement,
  score: TabScore,
  width: number,
  height: number,
  options: TabRenderOptions,
): TabRendered {
  host.innerHTML = '';
  const measureCount = score.measures.length;
  const barNeed = Math.max(
    MIN_BAR_WIDTH,
    ...score.measures.map((m) => measureMinWidth(vf, m, score)),
  );
  const headerFirst = headerWidth(vf, score, true);
  const headerRest = headerWidth(vf, score, false);
  const room = (scale: number) => width / scale - NAME_WIDTH - RIGHT;
  const fitsWidth = (scale: number) => room(scale) - headerFirst >= barNeed;

  const layoutAt = (scale: number): TabSystem[] => {
    const available = room(scale);
    const most = Math.max(1, Math.floor((available - headerFirst) / barNeed));
    // Balanced lines — eight bars that fit five a line go four and four.
    const perSystem = Math.ceil(
      measureCount / Math.ceil(measureCount / Math.min(most, measureCount)),
    );
    return planSystems(measureCount, perSystem).map((system, i) => {
      const header = i === 0 ? headerFirst : headerRest;
      // Every bar in a line the same width, so the playhead sweeps at one
      // speed; a short last line keeps the bar width of the lines above.
      const full = system.measures.length === perSystem;
      return {
        measures: system.measures,
        barWidth:
          (full ? available - header : available - headerRest) / perSystem,
      };
    });
  };

  const { scale, paged } = chooseTabScale({
    fitHeight: options.fitHeight,
    height,
    systemHeight: SYSTEM_HEIGHT,
    fitsWidth,
    linesAt: (s) => layoutAt(s).length,
  });
  const systems = layoutAt(scale);

  const renderer = new vf.Renderer(host, vf.Renderer.Backends.SVG);
  renderer.resize(width, systems.length * SYSTEM_HEIGHT * scale);
  const ctx = renderer.getContext();
  ctx.scale(scale, scale);

  const rendered: TabRendered = {
    scale,
    paged,
    height: systems.length * SYSTEM_HEIGHT * scale,
    systemHeight: SYSTEM_HEIGHT,
    barlines: [],
    measures: [],
    notes: [],
    rests: [],
    playheadTop: SYSTEM_TOP + TOP_LINE_DROP - 8,
    playheadHeight: 5 * LINE_GAP + 16,
    systems: [],
    groups: new Map(),
    digits: new Map(),
  };
  const lastMeasure = measureCount - 1;
  // Drawn at `scale`: a label this size in drawing units reads at 12px or more.
  const labelSize = Math.max(LABEL_SIZE, LABEL_MIN_PX / scale);
  // In px: VexFlow reads a bare number as points.
  const labelFont = `${Math.round(labelSize * 100) / 100}px`;

  systems.forEach((system, systemIndex) => {
    const systemY = systemIndex * SYSTEM_HEIGHT;
    const staveY = systemY + SYSTEM_TOP;
    const topLine = staveY + TOP_LINE_DROP;

    // String names on every line of every system, not only the first: a
    // reader who looks down mid-piece still knows which line is which string.
    ctx.openGroup('string-names');
    ctx.setFont(LABEL_FONT, labelFont);
    STRING_NAMES.forEach((name, i) => {
      const nameWidth = ctx.measureText(name).width;
      ctx.fillText(
        name,
        (NAME_WIDTH - nameWidth) / 2,
        topLine + i * LINE_GAP + labelSize * LABEL_DROP,
      );
    });
    ctx.closeGroup();

    let x = NAME_WIDTH;
    let firstNoteX = x;
    system.measures.forEach((measureIndex, j) => {
      const measure = score.measures[measureIndex];
      const first = j === 0;
      const header = first ? (systemIndex === 0 ? headerFirst : headerRest) : 0;
      const staveWidth = system.barWidth + header;

      const stave = new vf.TabStave(x, staveY, staveWidth, {
        spaceAboveStaffLn: HEADROOM_LINES,
      });
      if (first) {
        stave.addClef('tab');
        if (systemIndex === 0) stave.addModifier(timeSignature(vf, score));
      }
      if (measureIndex === lastMeasure) {
        stave.setEndBarType(vf.Barline.type.END);
      }
      stave.setContext(ctx).draw();
      if (first) {
        firstNoteX = stave.getNoteStartX();
        ctx.openGroup('measure-number');
        ctx.setFont(LABEL_FONT, labelFont);
        ctx.fillText(String(measure.number), x + 2, topLine - 5);
        ctx.closeGroup();
      }

      const built = buildMeasure(vf, measure, score);
      for (const voice of built.voices) voice.setStave(stave);
      new vf.Formatter()
        .joinVoices(built.voices)
        .format(built.voices, stave.getNoteEndX() - stave.getNoteStartX() - 12);
      for (const voice of built.voices) voice.draw(ctx, stave);
      for (const beam of built.beams) beam.setContext(ctx).draw();
      for (const tuplet of built.tuplets) tuplet.setContext(ctx).draw();

      for (const { item, note, voiceIndex } of built.drawn) {
        if (item.hidden) continue;
        if (item.kind === 'rest') {
          rendered.rests.push({
            key: `rest|0|${item.startTick}`,
            partIndex: 0,
            measureIndex,
            tick: item.startTick,
            durationTicks: item.durationTicks,
            x: note.getAbsoluteX() * scale,
            y: (topLine + 2.5 * LINE_GAP) * scale,
          });
          continue;
        }
        const element = note.getSVGElement();
        if (!element) continue;
        // The fret digits are the group's first texts, one per position, in
        // the order they were given; the flag and dots follow them.
        const texts = [...element.children].filter(
          (child): child is SVGElement => child.tagName === 'text',
        );
        const stemmed = item.value !== 'w';
        item.positions.forEach((position, i) => {
          const list = rendered.groups.get(position.noteId) ?? [];
          list.push(element);
          rendered.groups.set(position.noteId, list);
          if (texts[i]) {
            const digits = rendered.digits.get(position.noteId) ?? [];
            digits.push(texts[i]);
            rendered.digits.set(position.noteId, digits);
          }
          rendered.notes.push({
            id: position.noteId,
            partIndex: 0,
            measureIndex,
            tick: item.startTick,
            // A TabNote's x is the centre of its digits.
            x: note.getAbsoluteX() * scale,
            y: (topLine + (position.string - 1) * LINE_GAP) * scale,
            space: (LINE_GAP / 2) * scale,
            stem: !stemmed ? null : voiceIndex === 0 ? 'down' : 'up',
            letter: position.letter,
            octave: position.octave,
            alteration: position.alteration,
            // Bottom line 0, as on a staff: string 6 is 0, string 1 is 5.
            line: 6 - position.string,
          });
        });
      }

      rendered.barlines.push({
        measureIndex,
        atSystemEnd: false,
        system: systemIndex,
        x: x * scale,
        y: staveY * scale,
        height: BOTTOM_LINE_DROP * scale,
      });
      rendered.measures.push({
        measureIndex,
        partIndex: 0,
        system: systemIndex,
        x: x * scale,
        y: staveY * scale,
        width: staveWidth * scale,
        height: (BOTTOM_LINE_DROP + STEM_ROOM) * scale,
        startTick: measure.startTick,
        endTick: measure.endTick,
      });
      x += staveWidth;
    });

    const firstMeasure = score.measures[system.measures[0]];
    const lastOfSystem = score.measures[system.measures.at(-1)!];
    rendered.barlines.push({
      measureIndex: lastOfSystem.index + 1,
      atSystemEnd: true,
      system: systemIndex,
      x: x * scale,
      y: staveY * scale,
      height: BOTTOM_LINE_DROP * scale,
    });
    // The playhead runs linearly from where the first bar's notes begin to
    // where the last bar ends — see playheadX.
    rendered.systems.push({
      y: systemY,
      startTick: firstMeasure.startTick,
      endTick: lastOfSystem.endTick,
      anchors: [
        { tick: firstMeasure.startTick, x: firstNoteX },
        { tick: lastOfSystem.endTick, x: x - 4 },
      ],
    });
  });
  return rendered;
}

function locate(rendered: TabRendered, tick: number) {
  const index = rendered.systems.findIndex(
    (s) => tick >= s.startTick && tick <= s.endTick,
  );
  if (index === -1) return null;
  const { anchors, y } = rendered.systems[index];
  const x = playheadX(anchors, tick);
  return x === null ? null : { system: index, x, y };
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export interface TabStaffViewProps {
  score: TabScore;
  /** Styles by lesson note id. */
  noteStyles?: ReadonlyMap<string, NoteStyle>;
  /** Tick to draw the playhead at; none when null/undefined. */
  playheadTick?: number | null;
  /**
   * With no playhead (out of time), the tick of the note to play next — its
   * line is kept in view so the glowing note never scrolls away.
   */
  focusTick?: number | null;
  /** Scale so every system fits the height when possible. */
  fitHeight?: boolean;
  /** Called with the drawn layout, for positioning an overlay. */
  onLayout?: (layout: StaffLayout | null) => void;
  /** Drawn over the TAB, scrolling with it — chord symbols, markers. */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function TabStaffView({
  score,
  noteStyles,
  playheadTick,
  focusTick,
  fitHeight = false,
  onLayout,
  overlay,
  className,
  style,
}: TabStaffViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [vf, setVf] = useState<VexFlowModule | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState<TabRendered | null>(null);
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

  const layoutHeight = fitHeight ? size.height : 0;
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!vf || !host || size.width < 50) return;
    try {
      setRendered(
        renderTabSystem(vf, host, score, size.width, layoutHeight, {
          fitHeight,
        }),
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[TabStaffView] render failed', err);
      }
      setError(true);
    }
  }, [vf, score, size.width, layoutHeight, fitHeight]);

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
            stepPx: (LINE_GAP / 2) * rendered.scale,
            topLineDrop: CHORD_SYMBOL_DROP * rendered.scale,
          }
        : null,
    );
  }, [rendered, onLayout]);

  // Highlights, as StaffView paints them: restyle in place, a chord as a
  // whole only when all of its notes agree, else each fret digit on its own.
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
    for (const [id, digits] of rendered.digits) {
      for (const digit of digits) paint(digit, noteStyles?.get(id));
    }
  }, [rendered, noteStyles]);

  const playhead =
    rendered && playheadTick != null ? locate(rendered, playheadTick) : null;

  // Keep the playhead's system in view — or, out of time, the next note's.
  const followTick = playheadTick ?? focusTick;
  const playheadSystem =
    rendered && followTick != null
      ? locate(rendered, followTick)?.system
      : undefined;
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !rendered || playheadSystem === undefined) return;
    const top = rendered.systems[playheadSystem].y * rendered.scale;
    const bottom = top + rendered.systemHeight * rendered.scale;
    // Paged, the line being played is always the one at the top.
    if (
      (rendered.paged && Math.abs(container.scrollTop - top) >= 1) ||
      top < container.scrollTop ||
      bottom > container.scrollTop + container.clientHeight
    ) {
      container.scrollTo({
        top,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }, [playheadSystem, rendered]);

  return (
    <div
      ref={containerRef}
      className={`ma-grand-staff ma-tab-staff relative overflow-y-auto overflow-x-hidden ${className ?? ''}`}
      style={style}
      data-tab-paged={rendered?.paged || undefined}
    >
      {error ? (
        <div className="p-4 text-xs text-white/55">
          TAB couldn&apos;t be drawn.
        </div>
      ) : (
        !rendered && (
          <div className="p-4 text-xs text-white/55">Loading TAB…</div>
        )
      )}
      <div className="relative" style={{ height: rendered?.height }}>
        {/* Read one by one, the string names and fret digits are noise; the
            TAB is announced as a whole. */}
        <div
          ref={hostRef}
          className="relative"
          role="img"
          aria-label={`Guitar TAB, ${score.measures.length} ${score.measures.length === 1 ? 'bar' : 'bars'}`}
        />
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
              // The text colour at 90%, flat: the key colour is kept for
              // the notes, and nothing on the TAB glows.
              background: 'var(--ma-playhead, rgba(232, 232, 240, 0.9))',
              willChange: 'transform',
            }}
          />
        )}
      </div>
    </div>
  );
}
