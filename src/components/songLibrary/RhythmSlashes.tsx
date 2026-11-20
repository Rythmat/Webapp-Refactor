/* eslint-disable react/jsx-sort-props */
import type { FC } from 'react';
import type { RhythmEvent } from '@/curriculum/types/songLibrary';
import {
  barQuarters,
  beamGroups,
  eventQuarters,
  eventStarts,
  VALUE_QUARTERS,
  type Meter,
} from '@/lib/chartEditor/rhythm';

/**
 * A bar's rhythm, engraved as a chart writes it (owner, 2026-11-12): slash
 * noteheads on the middle line, stems up (or down, where written so),
 * eighths beamed by the beat, flags on a lone one, dots, rests, and ties,
 * the last one reaching over the barline into the next bar. A beat left as
 * a standard slash is drawn as every chart's slash is, stemless, beside
 * the rhythm in the beats around it.
 *
 * Drawn in plain SVG rather than a music font, so the song page needs
 * nothing loaded to draw it. The positions follow time, the same scale the
 * chord symbols above use, so a chord on 4+ stands over its slash.
 */

export interface RhythmLayout {
  /** Where the bar's time starts and how wide it runs, in the bar's units. */
  x0: number;
  span: number;
  staffTop: number;
  lineSpacing: number;
}

/** A slash's notehead sits this far into its own time. */
export const NOTEHEAD_OFFSET = 10;

/**
 * Where each event stands: a notehead just into its time, a standard slash
 * in the middle of its beat, where a chart's slashes always stand.
 */
export function eventXs(
  events: readonly RhythmEvent[],
  meter: Meter,
  { x0, span }: Pick<RhythmLayout, 'x0' | 'span'>,
): number[] {
  const total = barQuarters(meter);
  return eventStarts(events).map((start, i) =>
    events[i].plain
      ? x0 + ((start + eventQuarters(events[i]) / 2) / total) * span
      : x0 + (start / total) * span + NOTEHEAD_OFFSET,
  );
}

const flagsOf = (event: RhythmEvent) =>
  VALUE_QUARTERS[event.value] <= 0.125
    ? 3
    : VALUE_QUARTERS[event.value] <= 0.25
      ? 2
      : VALUE_QUARTERS[event.value] <= 0.5
        ? 1
        : 0;

const STEM = 26;
const BEAM_GAP = 4.5;

/** The slash notehead, a slanted bar; hollow for a half or whole. */
const Notehead: FC<{ x: number; y: number; hollow: boolean }> = ({
  x,
  y,
  hollow,
}) => (
  <path
    d={`M ${x - 7.5} ${y + 4} L ${x + 4.5} ${y - 6} L ${x + 7.5} ${y - 4} L ${x - 4.5} ${y + 6} Z`}
    fill={hollow ? 'none' : 'currentColor'}
    stroke="currentColor"
    strokeWidth={hollow ? 1.4 : 0.8}
  />
);

/** A rest of the event's value, centred on `x`. */
const Rest: FC<{
  event: RhythmEvent;
  x: number;
  staffTop: number;
  lineSpacing: number;
}> = ({ event, x, staffTop, lineSpacing }) => {
  const mid = staffTop + lineSpacing * 2;
  const q = VALUE_QUARTERS[event.value];
  if (q >= 4)
    return (
      <rect
        data-rest="whole"
        x={x - 5}
        y={staffTop + lineSpacing}
        width={10}
        height={lineSpacing / 2}
      />
    );
  if (q >= 2)
    return (
      <rect
        data-rest="half"
        x={x - 5}
        y={mid - lineSpacing / 2}
        width={10}
        height={lineSpacing / 2}
      />
    );
  if (q >= 1)
    return (
      <path
        data-rest="quarter"
        d={`M ${x - 3} ${mid - 13} L ${x + 3} ${mid - 6} L ${x - 1} ${mid} L ${x + 4} ${mid + 6} Q ${x - 4} ${mid + 3} ${x - 1} ${mid + 12}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    );
  const hooks = flagsOf(event);
  return (
    <g data-rest={event.value}>
      <line
        x1={x + 3}
        y1={mid - 7}
        x2={x - 2 - hooks}
        y2={mid + 6 + hooks * 4}
        stroke="currentColor"
        strokeWidth={1.6}
      />
      {Array.from({ length: hooks }, (_, i) => (
        <g key={i}>
          <circle cx={x - 3 - i} cy={mid - 5 + i * 5} r={2.2} />
          <path
            d={`M ${x - 3 - i} ${mid - 5 + i * 5} Q ${x} ${mid - 3 + i * 5} ${x + 3 - i} ${mid - 7 + i * 5}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
          />
        </g>
      ))}
    </g>
  );
};

/** A tie from one x to another: under stems up, over stems down. */
const Tie: FC<{ from: number; to: number; y: number; above?: boolean }> = ({
  from,
  to,
  y,
  above,
}) => (
  <path
    data-tie=""
    d={`M ${from} ${y} Q ${(from + to) / 2} ${y + (above ? -8 : 8)} ${to} ${y}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.4}
    strokeLinecap="round"
  />
);

/** A standard slash, stemless, as every chart's slash is drawn. */
const PlainSlash: FC<{ x: number; y: number }> = ({ x, y }) => (
  <line
    data-plain-slash=""
    x1={x - 5}
    y1={y + 6}
    x2={x + 5}
    y2={y - 6}
    stroke="currentColor"
    strokeWidth={2}
    opacity={0.3 / 0.85}
  />
);

export const RhythmSlashes: FC<{
  events: readonly RhythmEvent[];
  meter: Meter;
  layout: RhythmLayout;
  /** The bar's width, for a tie running out over the barline. */
  width: number;
  /** The bar before was tied into this one and is not beside it on the
   *  line, so this bar draws the tie's end itself. */
  tiedIn?: boolean;
  /** The last slash's tie ends at the barline: the next bar is on the next
   *  line. */
  tieOutHalf?: boolean;
}> = ({ events, meter, layout, width, tiedIn, tieOutHalf }) => {
  const { staffTop, lineSpacing } = layout;
  const mid = staffTop + lineSpacing * 2;
  const xs = eventXs(events, meter, layout);
  const groups = beamGroups(events, meter);
  const beamed = new Map<number, number[]>();
  for (const group of groups) for (const i of group) beamed.set(i, group);
  // A beamed group's stems all go the way its first slash's does.
  const down = (i: number) => events[beamed.get(i)?.[0] ?? i]?.stem === 'down';
  const stemX = (i: number) => xs[i] + (down(i) ? -6.5 : 6.5);
  const stemFrom = (i: number) => mid + (down(i) ? 4 : -4);
  const stemEnd = (i: number) => mid + (down(i) ? 4 + STEM : -4 - STEM);
  // A tie sits away from the stems.
  const tieY = (i: number) => (down(i) ? mid - 9 : mid + 9);

  return (
    <g
      data-rhythm=""
      fill="currentColor"
      style={{ pointerEvents: 'none' }}
      opacity={0.85}
    >
      {tiedIn && xs.length > 0 && (
        <Tie from={layout.x0 + 1} to={xs[0] - 4} y={tieY(0)} above={down(0)} />
      )}
      {events.map((event, i) => {
        const x = xs[i];
        const next = xs[i + 1];
        const tie = event.tie && (
          <Tie
            from={x + 3}
            to={
              next !== undefined
                ? next - 3
                : tieOutHalf
                  ? width - 1
                  : width + NOTEHEAD_OFFSET - 2
            }
            y={tieY(i)}
            above={down(i)}
          />
        );
        if (event.plain)
          return (
            <g key={i}>
              <PlainSlash x={x} y={mid} />
              {tie}
            </g>
          );
        if (event.rest)
          return (
            <g key={i}>
              <Rest
                event={event}
                x={x}
                staffTop={staffTop}
                lineSpacing={lineSpacing}
              />
              {event.dot && (
                <circle cx={x + 9} cy={mid - lineSpacing / 2} r={1.8} />
              )}
            </g>
          );
        const q = VALUE_QUARTERS[event.value];
        const flags = flagsOf(event);
        const group = beamed.get(i);
        const flagDir = down(i) ? -1 : 1;
        return (
          <g key={i} data-stem={q < 4 ? (down(i) ? 'down' : 'up') : undefined}>
            <Notehead x={x} y={mid} hollow={q >= 2} />
            {q < 4 && (
              <line
                x1={stemX(i)}
                y1={stemFrom(i)}
                x2={stemX(i)}
                y2={stemEnd(i)}
                stroke="currentColor"
                strokeWidth={1.3}
              />
            )}
            {/* A lone eighth (or shorter) keeps its flags. */}
            {!group &&
              Array.from({ length: flags }, (_, f) => (
                <path
                  key={f}
                  data-flag=""
                  d={`M ${stemX(i)} ${stemEnd(i) + flagDir * f * BEAM_GAP} q 6 ${flagDir * 3} 5 ${flagDir * 10}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                />
              ))}
            {event.dot && (
              <circle cx={x + 11} cy={mid - lineSpacing / 2} r={1.8} />
            )}
            {tie}
          </g>
        );
      })}
      {/* Beams: the primary across each group, and the second and third
          where neighbours both have them (a stub toward its neighbour for a
          sixteenth alone among eighths). Inward from the stems' ends. */}
      {groups.map((group) => {
        const first = group[0];
        const last = group[group.length - 1];
        const y = stemEnd(first);
        const inward = down(first) ? -1 : 1;
        const segments: { from: number; to: number; level: number }[] = [];
        for (let level = 2; level <= 3; level++) {
          group.forEach((idx, k) => {
            if (flagsOf(events[idx]) < level) return;
            const right = group[k + 1];
            const left = group[k - 1];
            if (right !== undefined && flagsOf(events[right]) >= level)
              segments.push({ from: stemX(idx), to: stemX(right), level });
            else if (!(left !== undefined && flagsOf(events[left]) >= level)) {
              // Alone at this level: a stub, toward the neighbour it has.
              const toward = right !== undefined ? 6 : -6;
              segments.push({
                from: stemX(idx),
                to: stemX(idx) + toward,
                level,
              });
            }
          });
        }
        return (
          <g key={`beam-${first}`} data-beam="">
            <line
              x1={stemX(first)}
              y1={y}
              x2={stemX(last)}
              y2={y}
              stroke="currentColor"
              strokeWidth={3.5}
            />
            {segments.map((s, k) => (
              <line
                key={k}
                x1={s.from}
                y1={y + inward * ((s.level - 1) * BEAM_GAP + 1)}
                x2={s.to}
                y2={y + inward * ((s.level - 1) * BEAM_GAP + 1)}
                stroke="currentColor"
                strokeWidth={3}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
};

/** A beat as a player counts it: 4, 4+ (the and), 4e and 4a (sixteenths). */
export function beatName(beat: number): string {
  const whole = Math.floor(beat + 1e-6);
  const frac = Math.round((beat - whole) * 100) / 100;
  if (frac === 0) return String(whole);
  if (frac === 0.5) return `${whole}+`;
  if (frac === 0.25) return `${whole}e`;
  if (frac === 0.75) return `${whole}a`;
  return String(Math.round(beat * 100) / 100);
}

/** Exported for the editor's hit areas: each event's time span, in x. */
export function eventSpans(
  events: readonly RhythmEvent[],
  meter: Meter,
  { x0, span }: Pick<RhythmLayout, 'x0' | 'span'>,
): { x: number; w: number }[] {
  const total = barQuarters(meter);
  const starts = eventStarts(events);
  return events.map((event, i) => ({
    x: x0 + (starts[i] / total) * span,
    w: (eventQuarters(event) / total) * span,
  }));
}
