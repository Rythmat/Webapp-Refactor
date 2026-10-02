// ── Fretboard ──────────────────────────────────────────────────────────────
// A horizontal neck with string 1 on top, so it lines up with the TAB. The
// fret window is fixed for a step: the geometry depends on the window only,
// never on the markers, so the neck does not zoom or jump. Every marker role
// has its own shape (dot, ring, disc, ✗ …), not just its own colour, and a
// root is drawn as a diamond. Mirroring moves geometry, never text. A marker
// can show a finger, key number (as a rounded chip) or chord tone in place of
// its note name, and brackets can mark fret pairs (half steps).
//
// The lesson variant is quieter: no board fill, frets white/15, strings
// white/30, fret numbers white/45, and the key colour on one thing only — the
// note to play now. The look-ahead, done and missed marks keep their shapes
// in neutral ink. Its labels are 12px on screen up to a 208px neck and grow
// with a larger one, so they never sit tiny inside large dots.

import { memo, useEffect, useRef } from 'react';
import { WRONG_NOTE_KEY_COLOR } from '@/components/Games/PianoRollPlay';
import type { FretWindow } from '@/lib/guitar/fretboard';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { DIAGRAM_INK, DIAGRAM_INK_DARK, MarkShape } from './FretDiagram';
import type {
  FretboardProps,
  FretBracket,
  FretMarker,
  FretMarkerRole,
} from './types';

// Geometry, in viewBox units.
const FRET_W = 40;
const STRING_GAP = 22;
/** The open-string column left of the nut (window.min === 0 only). */
const OPEN_W = 28;
const PAD_X = 12;
const PAD_TOP = 13;
const NECK_H = STRING_GAP * 5;
const LABEL_Y = PAD_TOP + NECK_H + 20;
const HEIGHT = LABEL_Y + 8;
/** The neck's height in drawing units: a board drawn `h` px tall is h / this px a unit. */
export const FRETBOARD_HEIGHT_UNITS = HEIGHT;
const MARK_R = 8.5;
const CROSS = 5;
/** A bracket's rail sits this far from its string, clear of the markers. */
const BRACKET_RISE = MARK_R + 2.5;
const BRACKET_TICK = 3;

const BOARD = 'rgba(255,255,255,0.025)';
/** Fill behind rings, so strings don't strike through their labels. */
const RING_FILL = '#1b1b20';
const WIRE = 'rgba(232,232,240,0.22)';
const STRING = 'rgba(232,232,240,0.45)';
const NUT = '#d8d6cc';
const INLAY = 'rgba(232,232,240,0.12)';
const FRET_LABEL = 'rgba(232,232,240,0.62)';

const LESSON_WIRE = 'rgba(255, 255, 255, 0.15)';
const LESSON_STRING = 'rgba(255, 255, 255, 0.3)';
const LESSON_FRET_LABEL = 'rgba(255, 255, 255, 0.45)';
/** Lesson labels, in px on screen: their size up to a 208px neck. */
const LESSON_LABEL_PX = 12;
/** A two-character label ('♭3') inside a marker may be smaller. */
const LESSON_PAIR_PX = 10;
/**
 * On a larger neck a lesson label keeps its share of the marker instead:
 * this many drawing units (12px at 208px, about 21px at 377px).
 */
const LESSON_LABEL_UNITS = 8.5;
const LESSON_PAIR_UNITS =
  (LESSON_LABEL_UNITS * LESSON_PAIR_PX) / LESSON_LABEL_PX;
/** A marker's label can't outgrow it, however short the neck is drawn. */
const LESSON_LABEL_MAX = MARK_R * 1.45;

/**
 * A lesson label's size in drawing units, drawn at `unitsPerPx`: `px` on
 * screen, or `units` once the neck is drawn large enough for that to be more.
 */
const lessonLabelSize = (unitsPerPx: number, px: number, units: number) =>
  Math.max(unitsPerPx * px, units);

/**
 * How wide a fret window draws, in the height's drawing units: the padding,
 * the open-string column when the nut shows, and each fret.
 * `height × units / FRETBOARD_HEIGHT_UNITS` is its width in px.
 */
export function fretboardWidthUnits(
  { min, max }: FretWindow,
  showsNut = min === 0,
): number {
  const frets = max - Math.max(1, min) + 1;
  return PAD_X + (showsNut ? OPEN_W : 0) + frets * FRET_W + PAD_X;
}

const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_INLAY = 12;

/** Weakest first: when two markers share a spot, the later role wins. */
const ROLE_ORDER: readonly FretMarkerRole[] = [
  'context',
  'hint',
  'next',
  'target',
  'done',
  'played',
  'wrong',
  'missed',
];

/** How each role reads aloud; context is background and not announced. */
const ROLE_WORDS: Readonly<Partial<Record<FretMarkerRole, string>>> = {
  hint: 'coming up',
  next: 'next',
  target: 'play',
  done: 'played',
  played: 'sounding',
  wrong: 'wrong',
  missed: 'missed',
};

const stringY = (string: GuitarStringNumber) =>
  PAD_TOP + (string - 1) * STRING_GAP;

function MarkerBody({
  marker,
  keyColor,
  wrongColor,
  showLabel,
  chip,
  lessonLabel,
}: {
  marker: FretMarker;
  keyColor: string;
  wrongColor: string;
  showLabel: boolean;
  chip: boolean;
  /** Lesson: drawing units per px on screen; null draws the book's look. */
  lessonLabel: number | null;
}) {
  const { role, isRoot: root } = marker;
  const text = marker.text ?? marker.label;
  const lesson = lessonLabel !== null;
  if (role === 'wrong' || role === 'missed') {
    // A missed note was a target, so it keeps the key colour; its dashes are
    // what set it apart from a wrong note's solid grey cross. In a lesson the
    // key colour is only for now, so the dashes do it in neutral ink.
    const missed = role === 'missed';
    const c = missed ? CROSS + 1 : CROSS;
    return (
      <path
        d={`M${-c} ${-c} L${c} ${c} M${c} ${-c} L${-c} ${c}`}
        stroke={missed ? (lesson ? DIAGRAM_INK : keyColor) : wrongColor}
        strokeOpacity={missed && lesson ? 0.55 : undefined}
        strokeWidth={missed ? 2 : 2.5}
        strokeDasharray={missed ? '1.8 1.8' : undefined}
        strokeLinecap={missed ? 'butt' : 'round'}
      />
    );
  }
  if (role === 'context') {
    return <MarkShape root={root} r={3} fill={DIAGRAM_INK} opacity={0.3} />;
  }

  const label = showLabel && text && (
    <text
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={
        lessonLabel !== null
          ? Math.min(
              text.length > 1
                ? lessonLabelSize(
                    lessonLabel,
                    LESSON_PAIR_PX,
                    LESSON_PAIR_UNITS,
                  )
                : lessonLabelSize(
                    lessonLabel,
                    LESSON_LABEL_PX,
                    LESSON_LABEL_UNITS,
                  ),
              LESSON_LABEL_MAX,
            )
          : role === 'played'
            ? 7.5
            : 8
      }
      fontWeight={700}
      fill={role === 'target' ? DIAGRAM_INK_DARK : DIAGRAM_INK}
      opacity={role === 'hint' ? 0.6 : undefined}
    >
      {text}
    </text>
  );
  const ring = { fill: RING_FILL, strokeWidth: 1.25 };
  return (
    <>
      {role === 'hint' && (
        <MarkShape
          root={root}
          chip={chip}
          r={MARK_R}
          {...ring}
          stroke={DIAGRAM_INK}
          strokeOpacity={0.5}
          strokeDasharray="1.5 2"
        />
      )}
      {role === 'next' && (
        <MarkShape
          root={root}
          chip={chip}
          r={MARK_R}
          {...ring}
          stroke={lesson ? DIAGRAM_INK : keyColor}
          strokeOpacity={lesson ? 0.7 : undefined}
          strokeWidth={lesson ? 1.5 : 2}
        />
      )}
      {role === 'target' && (
        <MarkShape root={root} chip={chip} r={MARK_R} fill={keyColor} />
      )}
      {role === 'done' && (
        <MarkShape
          root={root}
          chip={chip}
          r={MARK_R}
          fill={lesson ? DIAGRAM_INK : keyColor}
          fillOpacity={lesson ? 0.25 : 0.45}
        />
      )}
      {role === 'played' && (
        <>
          <MarkShape
            root={root}
            chip={chip}
            r={MARK_R + 1.25}
            {...ring}
            stroke={DIAGRAM_INK}
          />
          <MarkShape
            root={root}
            chip={chip}
            r={MARK_R - 1.5}
            fill="none"
            stroke={DIAGRAM_INK}
            strokeWidth={1.25}
          />
        </>
      )}
      {label}
      {role === 'done' && (
        <g
          data-check
          transform={`translate(${MARK_R * 0.75} ${-MARK_R * 0.75})`}
        >
          <circle r={3.8} fill={DIAGRAM_INK} />
          <path
            d="M-1.9 0.1 L-0.6 1.4 L1.9 -1.3"
            fill="none"
            stroke={DIAGRAM_INK_DARK}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </>
  );
}

/**
 * A square bracket over two frets of one string, with its label (H) on top:
 * a shape cue, not a colour. Above the string, or below it on string 1,
 * which has no room above. Mirroring moves the ends; the text stays upright.
 */
function Bracket({
  bracket,
  x1,
  x2,
  labelSize = 8,
}: {
  bracket: FretBracket;
  x1: number;
  x2: number;
  /** In drawing units; the lesson's is its label size. */
  labelSize?: number;
}) {
  const below = bracket.string === 1;
  const sign = below ? 1 : -1;
  const y = stringY(bracket.string);
  const rail = y + sign * BRACKET_RISE;
  const tick = rail - sign * BRACKET_TICK;
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  return (
    <g
      data-bracket={bracket.label}
      data-string={bracket.string}
      data-from={bracket.fromFret}
      data-to={bracket.toFret}
    >
      <path
        d={`M${left} ${tick} V${rail} H${right} V${tick}`}
        fill="none"
        stroke={DIAGRAM_INK}
        strokeOpacity={0.75}
        strokeWidth={1.1}
      />
      <text
        x={(left + right) / 2}
        y={rail + sign * 5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={labelSize}
        fontWeight={700}
        fill={DIAGRAM_INK}
        stroke={RING_FILL}
        strokeWidth={2.5}
        paintOrder="stroke"
      >
        {bracket.label}
      </text>
    </g>
  );
}

/** Roles that say where the hand is now — what a scrolling neck keeps in view. */
const FOCUS_ROLES: ReadonlySet<FretMarkerRole> = new Set([
  'target',
  'next',
  'played',
  'wrong',
]);

/** One marker per spot: the strongest role wins, markers off the window drop. */
function visibleMarkers(
  markers: readonly FretMarker[],
  min: number,
  max: number,
): FretMarker[] {
  const bySpot = new Map<string, FretMarker>();
  for (const marker of markers) {
    // The window is fixed for the step; a note outside it has nowhere to go.
    if (marker.fret < min || marker.fret > max) continue;
    const spot = `${marker.string}:${marker.fret}`;
    const held = bySpot.get(spot);
    if (
      !held ||
      ROLE_ORDER.indexOf(marker.role) > ROLE_ORDER.indexOf(held.role)
    ) {
      bySpot.set(spot, marker);
    }
  }
  return [...bySpot.values()];
}

export const Fretboard = memo(function Fretboard({
  window: { min, max },
  markers,
  keyColor,
  wrongColor = WRONG_NOTE_KEY_COLOR,
  showNoteNames = true,
  height = 150,
  mirrored = false,
  labelShape = 'dot',
  brackets = [],
  scrollable = false,
  variant = 'default',
}: FretboardProps & {
  /**
   * Keep frets at their natural size (about 40 px) and scroll sideways when
   * the window is wider than the space, following the notes being played,
   * instead of shrinking a wide window to fit. Geometry still never changes
   * within a step.
   */
  scrollable?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hasNut = min === 0;
  const firstFret = Math.max(1, min);
  const frets = Array.from(
    { length: max - firstFret + 1 },
    (_, i) => firstFret + i,
  );
  /** The nut, or the wire before the first drawn fret. */
  const edgeX = PAD_X + (hasNut ? OPEN_W : 0);
  const width = fretboardWidthUnits({ min, max }, hasNut);
  const mx = (x: number) => (mirrored ? width - x : x);
  const wireX = (fret: number) => mx(edgeX + (fret - firstFret + 1) * FRET_W);
  const fretX = (fret: number) =>
    fret === 0
      ? mx(PAD_X + OPEN_W / 2)
      : mx(edgeX + (fret - firstFret + 0.5) * FRET_W);

  const shown = visibleMarkers(markers, min, max);
  const announced = shown
    .filter((m) => ROLE_WORDS[m.role])
    .map(
      (m) =>
        `${ROLE_WORDS[m.role]} ${m.label}${m.spokenText ? `, ${m.spokenText}` : ''} on string ${m.string} fret ${m.fret}`,
    );
  const shownBrackets = brackets.filter(
    (b) =>
      Math.min(b.fromFret, b.toFret) >= min &&
      Math.max(b.fromFret, b.toFret) <= max,
  );
  const bracketWords = shownBrackets.map(
    (b) => `${b.spoken}: string ${b.string} fret ${b.fromFret} to ${b.toFret}`,
  );
  const ariaLabel = [
    `Fretboard, frets ${min} to ${max}`,
    ...announced,
    ...bracketWords,
  ].join('; ');

  // Scrolling: the neck's natural width at this height, and where the hand is.
  const pxPerUnit = height / HEIGHT;
  const lesson = variant === 'lesson';
  // Drawn at `pxPerUnit`: units per px on screen, so labels hold their size.
  const lessonLabel = lesson ? 1 / pxPerUnit : null;
  const naturalWidth = Math.round(width * pxPerUnit);
  const focusXs = shown
    .filter((m) => FOCUS_ROLES.has(m.role))
    .map((m) => fretX(m.fret));
  const focusX = focusXs.length
    ? (Math.min(...focusXs) + Math.max(...focusXs)) / 2
    : null;
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scrollable || !scroller || focusX === null) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({
      left: Math.max(0, focusX * pxPerUnit - scroller.clientWidth / 2),
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, [scrollable, focusX, pxPerUnit]);

  const svg = (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height={height}
      style={scrollable ? { minWidth: naturalWidth } : undefined}
      data-mirrored={mirrored || undefined}
      data-variant={lesson ? 'lesson' : undefined}
    >
      {!lesson && (
        <rect
          x={PAD_X}
          y={PAD_TOP}
          width={width - PAD_X * 2}
          height={NECK_H}
          fill={BOARD}
        />
      )}
      {frets.map((fret) => {
        const x = fretX(fret);
        const ys =
          fret === DOUBLE_INLAY
            ? [PAD_TOP + STRING_GAP * 1.5, PAD_TOP + STRING_GAP * 3.5]
            : SINGLE_INLAYS.has(fret)
              ? [PAD_TOP + STRING_GAP * 2.5]
              : [];
        return ys.map((y) => (
          <circle
            key={`i${fret}-${y}`}
            data-inlay={fret}
            cx={x}
            cy={y}
            r={4}
            fill={INLAY}
          />
        ));
      })}
      {frets.map((fret) => (
        <line
          key={`w${fret}`}
          x1={wireX(fret)}
          x2={wireX(fret)}
          y1={PAD_TOP}
          y2={PAD_TOP + NECK_H}
          stroke={lesson ? LESSON_WIRE : WIRE}
          strokeWidth={1.5}
        />
      ))}
      <line
        data-nut={hasNut || undefined}
        x1={mx(edgeX)}
        x2={mx(edgeX)}
        y1={PAD_TOP}
        y2={PAD_TOP + NECK_H}
        stroke={hasNut ? NUT : lesson ? LESSON_WIRE : WIRE}
        strokeWidth={hasNut ? 5 : 1.5}
      />
      {([1, 2, 3, 4, 5, 6] as const).map((string) => (
        <line
          key={`s${string}`}
          x1={mx(PAD_X)}
          x2={mx(width - PAD_X)}
          y1={stringY(string)}
          y2={stringY(string)}
          stroke={lesson ? LESSON_STRING : STRING}
          // Thicker toward the low strings, as on a guitar.
          strokeWidth={0.8 + (string - 1) * 0.25}
        />
      ))}
      {shownBrackets.map((bracket) => (
        <Bracket
          key={`br${bracket.string}-${bracket.fromFret}-${bracket.toFret}`}
          bracket={bracket}
          x1={fretX(bracket.fromFret)}
          x2={fretX(bracket.toFret)}
          {...(lessonLabel !== null
            ? {
                labelSize: Math.min(
                  lessonLabelSize(
                    lessonLabel,
                    LESSON_LABEL_PX,
                    LESSON_LABEL_UNITS,
                  ),
                  LESSON_LABEL_MAX,
                ),
              }
            : {})}
        />
      ))}
      {shown.map((marker) => (
        <g
          key={`${marker.string}:${marker.fret}`}
          data-marker
          data-string={marker.string}
          data-fret={marker.fret}
          data-midi={marker.midi}
          data-role={marker.role}
          data-root={marker.isRoot ? 'true' : undefined}
          transform={`translate(${fretX(marker.fret)} ${stringY(marker.string)})`}
        >
          <MarkerBody
            marker={marker}
            keyColor={keyColor}
            wrongColor={wrongColor}
            showLabel={showNoteNames}
            chip={labelShape === 'chip'}
            lessonLabel={lessonLabel}
          />
        </g>
      ))}
      {frets.map((fret) => (
        <text
          key={`n${fret}`}
          data-fret-label={fret}
          x={fretX(fret)}
          y={LABEL_Y}
          textAnchor="middle"
          fontSize={
            lessonLabel === null
              ? 9
              : lessonLabelSize(
                  lessonLabel,
                  LESSON_LABEL_PX,
                  LESSON_LABEL_UNITS,
                )
          }
          fill={lesson ? LESSON_FRET_LABEL : FRET_LABEL}
        >
          {fret}
        </text>
      ))}
    </svg>
  );
  if (!scrollable) return svg;
  return (
    <div
      ref={scrollerRef}
      data-fretboard-scroller
      className={
        lesson
          ? // As the lesson's chord strip: it scrolls without a bar, which
            // would otherwise sit below a neck drawn to its band's height.
            'w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none]'
          : 'w-full overflow-x-auto overflow-y-hidden [scrollbar-width:thin]'
      }
    >
      {svg}
    </div>
  );
});
