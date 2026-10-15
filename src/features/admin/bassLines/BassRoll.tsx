/* eslint-disable react/jsx-sort-props */
/**
 * The bass line piano roll, ported from ICP Studio's editor. The rows aren't
 * pitches: a line plays over any chart in any key, so each row is a role
 * (root, third, an approach into the next chord, a walking passing tone) and
 * the generator turns roles into notes. To keep that concrete, the chart's
 * chords run along the top and each row is labelled with the note it becomes
 * over the first chord.
 *
 * Click to draw, drag to lengthen. Click a note to select it, again to step
 * its loudness. Drag to move, drag its right edge to resize, right-click to
 * delete. Arrows nudge; shift-left/right resize; shift-up/down change
 * loudness. Below it, a velocity lane: click a bar, or drag across to shape
 * a phrase.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import {
  DEGREES,
  quartersToTime,
  timeToQuarters,
  type BassDegree,
  type BassLineNote,
} from '@/curriculum/engine/bassLines/bassLine';
import type { TimeSignature } from '@/curriculum/engine/bassLines/harmony';
import { CONSOLE_LABEL } from '../ui/styles';

export interface EditorNote extends BassLineNote {
  _id: number;
}

let nextId = 1;
export const withIds = (notes: readonly BassLineNote[] = []): EditorNote[] =>
  notes.map((nt) => ({ ...nt, _id: nextId++ }));
export const withoutIds = (notes: readonly EditorNote[]): BassLineNote[] =>
  notes.map(({ _id, ...nt }) => nt);

/**
 * Chord tones warm, colour tones green, generated ones neutral — so a line's
 * shape reads at a glance. Brightened for the console's dark ground.
 */
const DEGREE_COLORS: Record<string, string> = {
  R: '#60a5fa',
  8: '#60a5fa',
  5: '#a78bfa',
  '5-': '#a78bfa',
  3: '#fbbf24',
  7: '#fb7185',
  '7-': '#fb7185',
  2: '#4ade80',
  4: '#4ade80',
  6: '#4ade80',
  A: '#d4a27f',
  W: '#2dd4bf',
  X: '#9ca3af',
};
export const colorFor = (d: string) => DEGREE_COLORS[d] ?? '#9ca3af';

const ROW_H = 26;
const SPECIAL_GAP = 10;
export const LABEL_W = 104;
const LANE_H = 80;
const CHORD_H = 24;
export const MIN_VELOCITY = 0.05;
const PLAYHEAD = '#f43f5e';

/** Clicking a selected note steps it through these (soft, medium, normal, accent). */
const VELOCITY_STEPS = [0.3, 0.5, 0.75, 0.95];
const nextVelocity = (v: number) =>
  VELOCITY_STEPS.find((s) => s > (v ?? 0.8) + 0.02) ?? VELOCITY_STEPS[0];

const rowTop = (i: number) =>
  i * ROW_H + (DEGREES[i].special ? SPECIAL_GAP : 0);
const ROLL_H = rowTop(DEGREES.length - 1) + ROW_H;
const rowAt = (y: number) => {
  for (let i = DEGREES.length - 1; i >= 0; i -= 1) if (y >= rowTop(i)) return i;
  return 0;
};
const rowOf = (degree: BassDegree) => DEGREES.findIndex((d) => d.id === degree);

export interface ChordMark {
  q: number;
  end: number;
  label: string;
}

interface Props {
  notes: EditorNote[];
  timeSignature: TimeSignature;
  bars: number;
  perBeat: number;
  cellW: number;
  chords: ChordMark[];
  /** The note a row becomes over the first chord, or null. */
  rowLabel: (degree: BassDegree) => string | null;
  selected: number | null;
  onSelect: (id: number | null) => void;
  /** An edit; `transient` continues the current drag's undo step. */
  edit: (
    fn: (notes: EditorNote[]) => EditorNote[],
    transient?: boolean,
  ) => void;
  /** Quarter the transport is on, already folded into the line's length. */
  playheadQ: number | null;
}

interface Drag {
  mode: 'draw' | 'move' | 'resize';
  id: number;
  step: number;
  row: number;
  origQ: number;
  origRow: number;
  moved: boolean;
  wasSelected: boolean;
}

export const BassRoll = ({
  notes,
  timeSignature: ts,
  bars,
  perBeat,
  cellW,
  chords,
  rowLabel,
  selected,
  onSelect,
  edit,
  playheadQ,
}: Props) => {
  const qpb = ts[0] / (ts[1] / 4);
  const stepQ = 1 / perBeat;
  const stepsPerBar = Math.round(qpb * perBeat);
  const totalSteps = bars * stepsPerBar;
  const width = totalSteps * cellW;
  const lineQ = bars * qpb;
  const xOfQ = (q: number) => (q / stepQ) * cellW;
  const noteQ = (nt: BassLineNote) => timeToQuarters(nt.time, ts);

  const rollRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const laneDragging = useRef(false);
  const [lastDur, setLastDur] = useState<number | null>(null);

  const patch = (id: number, p: Partial<BassLineNote>, transient = false) =>
    edit(
      (ns) => ns.map((nt) => (nt._id === id ? { ...nt, ...p } : nt)),
      transient,
    );
  const remove = (id: number) => {
    edit((ns) => ns.filter((nt) => nt._id !== id));
    onSelect(null);
  };

  const pointAt = (e: PointerEvent | React.MouseEvent) => {
    const r = rollRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    return {
      x,
      step: Math.max(0, Math.min(totalSteps - 1, Math.floor(x / cellW))),
      row: rowAt(y),
    };
  };
  const noteAt = (p: { x: number; row: number }) =>
    [...notes].reverse().find((nt) => {
      const x0 = xOfQ(noteQ(nt));
      return (
        rowOf(nt.degree) === p.row && p.x >= x0 && p.x <= x0 + xOfQ(nt.dur)
      );
    });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const p = pointAt(e);
    const hit = noteAt(p);
    rollRef.current!.setPointerCapture(e.pointerId);
    if (hit) {
      const x1 = xOfQ(noteQ(hit) + hit.dur);
      const wasSelected = hit._id === selected;
      onSelect(hit._id);
      drag.current = {
        mode: x1 - p.x < 8 ? 'resize' : 'move',
        id: hit._id,
        step: p.step,
        row: p.row,
        origQ: noteQ(hit),
        origRow: rowOf(hit.degree),
        moved: false,
        wasSelected,
      };
    } else {
      // Draw a note; keep the button down to drag it longer.
      const q = p.step * stepQ;
      const nt: EditorNote = {
        time: quartersToTime(q, ts),
        degree: DEGREES[p.row].id,
        dur: Math.min(lastDur ?? stepQ * 0.92, lineQ - q),
        velocity: 0.8,
        _id: nextId++,
      };
      edit((ns) => [...ns, nt]);
      onSelect(nt._id);
      drag.current = {
        mode: 'draw',
        id: nt._id,
        step: p.step,
        row: p.row,
        origQ: q,
        origRow: p.row,
        moved: false,
        wasSelected: false,
      };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = pointAt(e);
    const dStep = p.step - d.step;
    const dRow = p.row - d.row;
    if (!dStep && !dRow && !d.moved) return;
    // A drag on a note that was only clicked starts its own undo step.
    const transient = d.moved || d.mode === 'draw';
    d.moved = true;
    edit(
      (ns) =>
        ns.map((nt) => {
          if (nt._id !== d.id) return nt;
          if (d.mode === 'move') {
            const q = Math.max(
              0,
              Math.min(lineQ - stepQ, d.origQ + dStep * stepQ),
            );
            const row = Math.max(
              0,
              Math.min(DEGREES.length - 1, d.origRow + dRow),
            );
            return {
              ...nt,
              time: quartersToTime(q, ts),
              degree: DEGREES[row].id,
            };
          }
          const end = Math.max(d.origQ + stepQ, (p.step + 1) * stepQ);
          const dur = Math.min(lineQ - d.origQ, end - d.origQ) - stepQ * 0.08;
          return { ...nt, dur: Number(dur.toFixed(4)) };
        }),
      transient,
    );
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const nt = notes.find((x) => x._id === d.id);
    if ((d.mode === 'resize' || d.mode === 'draw') && d.moved && nt)
      setLastDur(nt.dur);
    // A plain click on an already-selected note steps its loudness.
    if (d.mode === 'move' && !d.moved && d.wasSelected && nt)
      patch(nt._id, { velocity: nextVelocity(nt.velocity) });
  };

  const setVelocityAt = (
    e: PointerEvent<HTMLDivElement>,
    transient: boolean,
  ) => {
    const r = laneRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const v = Number(
      Math.max(
        MIN_VELOCITY,
        Math.min(1, 1 - (e.clientY - r.top - 1) / LANE_H),
      ).toFixed(2),
    );
    let best: EditorNote | null = null;
    let bestD = Infinity;
    notes.forEach((nt) => {
      const dist =
        Math.abs(xOfQ(noteQ(nt)) - x) - (nt._id === selected ? 0.5 : 0);
      if (dist < bestD) {
        bestD = dist;
        best = nt;
      }
    });
    const hit = best as EditorNote | null;
    if (!hit || bestD > Math.max(8, cellW * 0.5)) return;
    if (hit._id !== selected) onSelect(hit._id);
    if (hit.velocity !== v) patch(hit._id, { velocity: v }, transient);
  };

  // Arrows nudge the selected note; Delete removes it; Escape deselects.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName ?? '';
      if (
        selected === null ||
        e.metaKey ||
        e.ctrlKey ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)
      )
        return;
      const nt = notes.find((x) => x._id === selected);
      if (!nt) return;
      const q = noteQ(nt);
      const row = rowOf(nt.degree);
      const vertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove(nt._id);
      } else if (vertical && e.shiftKey) {
        e.preventDefault();
        const v = (nt.velocity ?? 0.8) + (e.key === 'ArrowUp' ? 0.05 : -0.05);
        patch(nt._id, {
          velocity: Number(Math.max(MIN_VELOCITY, Math.min(1, v)).toFixed(2)),
        });
      } else if (e.key === 'ArrowUp' && row > 0) {
        e.preventDefault();
        patch(nt._id, { degree: DEGREES[row - 1].id });
      } else if (e.key === 'ArrowDown' && row < DEGREES.length - 1) {
        e.preventDefault();
        patch(nt._id, { degree: DEGREES[row + 1].id });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        if (e.shiftKey)
          patch(nt._id, {
            dur: Math.max(
              stepQ * 0.25,
              Number((nt.dur + dir * stepQ).toFixed(4)),
            ),
          });
        else
          patch(nt._id, {
            time: quartersToTime(
              Math.max(0, Math.min(lineQ - stepQ, q + dir * stepQ)),
              ts,
            ),
          });
      } else if (e.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sel = notes.find((nt) => nt._id === selected) ?? null;
  // Grid lines as backgrounds: thousands of bars stay cheap.
  const gridBackground = [
    `repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0 1px, transparent 1px ${cellW * stepsPerBar}px)`,
    `repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 1px, transparent 1px ${cellW * perBeat}px)`,
    `repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px ${cellW}px)`,
  ].join(', ');
  const showBeatNumbers = cellW * perBeat >= 26;

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
      <div style={{ minWidth: LABEL_W + width }}>
        {/* the chart's chords, along the top */}
        <div className="flex">
          <div
            className={CONSOLE_LABEL}
            style={{
              width: LABEL_W,
              flexShrink: 0,
              lineHeight: `${CHORD_H}px`,
            }}
          >
            Chords
          </div>
          <div style={{ position: 'relative', width, height: CHORD_H }}>
            {chords.map((c, i) => (
              <div
                key={i}
                className="overflow-hidden whitespace-nowrap border-l-2 border-[#60a5fa] pl-1 text-[13px] text-white/85"
                style={{
                  position: 'absolute',
                  left: xOfQ(c.q),
                  width: Math.max(10, xOfQ(c.end - c.q) - 2),
                  top: 2,
                  height: CHORD_H - 4,
                }}
              >
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex">
          {/* row labels */}
          <div
            style={{
              width: LABEL_W,
              flexShrink: 0,
              position: 'relative',
              height: ROLL_H,
            }}
          >
            {DEGREES.map((d, i) => (
              <div
                key={d.id}
                title={d.hint}
                className="flex items-center justify-between"
                style={{
                  position: 'absolute',
                  top: rowTop(i),
                  height: ROW_H,
                  left: 0,
                  right: 8,
                }}
              >
                <span
                  className="text-xs font-bold tracking-[0.06em]"
                  style={{ color: colorFor(d.id) }}
                >
                  {d.label}
                </span>
                <span className="text-[13px] text-white/40">
                  {rowLabel(d.id)}
                </span>
              </div>
            ))}
          </div>

          {/* grid + notes */}
          <div
            ref={rollRef}
            role="application"
            aria-label="Bass line piano roll"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onContextMenu={(e) => {
              e.preventDefault();
              const hit = noteAt(pointAt(e));
              if (hit) remove(hit._id);
            }}
            style={{
              position: 'relative',
              width,
              height: ROLL_H,
              cursor: 'crosshair',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {DEGREES.map((d, i) => (
              <div
                key={d.id}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: rowTop(i),
                  height: ROW_H,
                  background: d.special
                    ? 'rgba(255,255,255,0.045)'
                    : d.id === 'R'
                      ? 'rgba(96,165,250,0.10)'
                      : i % 2
                        ? 'rgba(255,255,255,0.025)'
                        : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: gridBackground,
                pointerEvents: 'none',
              }}
            />
            {notes.map((nt) => {
              const row = rowOf(nt.degree);
              if (row < 0) return null;
              const isSel = nt._id === selected;
              const q = noteQ(nt);
              return (
                <div
                  key={nt._id}
                  title={`${DEGREES[row].hint} — velocity ${nt.velocity}`}
                  style={{
                    position: 'absolute',
                    top: rowTop(row) + 3,
                    height: ROW_H - 6,
                    left: xOfQ(q) + 1,
                    width: Math.max(6, xOfQ(nt.dur) - 2),
                    background: colorFor(nt.degree),
                    opacity:
                      q >= lineQ ? 0.15 : 0.35 + 0.65 * (nt.velocity ?? 0.8),
                    borderRadius: 4,
                    outline: isSel ? '2px solid #fff' : 'none',
                    outlineOffset: 1,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 4,
                    overflow: 'hidden',
                    color: '#0b0d12',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {cellW >= 16 ? DEGREES[row].label : ''}
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      cursor: 'ew-resize',
                      background: 'rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              );
            })}
            {playheadQ !== null && playheadQ < lineQ && (
              <Playhead left={xOfQ(playheadQ)} />
            )}
          </div>
        </div>

        {/* bar and beat numbers */}
        <div className="mt-[3px] flex">
          <div style={{ width: LABEL_W, flexShrink: 0 }} />
          <div style={{ position: 'relative', width, height: 14 }}>
            {Array.from({ length: totalSteps }).map((_, s) => {
              const isBar = s % stepsPerBar === 0;
              if (!(isBar || (showBeatNumbers && s % perBeat === 0)))
                return null;
              return (
                <span
                  key={s}
                  className={
                    isBar ? 'font-bold text-white/60' : 'text-white/30'
                  }
                  style={{
                    position: 'absolute',
                    left: s * cellW + 2,
                    fontSize: 10,
                  }}
                >
                  {isBar
                    ? Math.floor(s / stepsPerBar) + 1
                    : `.${(Math.floor(s / perBeat) % Math.round(qpb)) + 1}`}
                </span>
              );
            })}
          </div>
        </div>

        {/* velocity lane */}
        <div className="mt-2 flex">
          <div
            style={{
              width: LABEL_W,
              flexShrink: 0,
              position: 'relative',
              height: LANE_H,
            }}
          >
            <span className={CONSOLE_LABEL}>Velocity</span>
            {sel && (
              <div
                className="mt-0.5 text-[22px] tabular-nums"
                style={{ color: colorFor(sel.degree) }}
              >
                {Math.round((sel.velocity ?? 0.8) * 100)}
              </div>
            )}
          </div>
          <div
            ref={laneRef}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              laneRef.current!.setPointerCapture(e.pointerId);
              laneDragging.current = true;
              setVelocityAt(e, false);
            }}
            onPointerMove={(e) => {
              if (laneDragging.current) setVelocityAt(e, true);
            }}
            onPointerUp={() => {
              laneDragging.current = false;
            }}
            onPointerCancel={() => {
              laneDragging.current = false;
            }}
            title="Click a bar to set a note's velocity, or drag across to shape several"
            style={{
              position: 'relative',
              width,
              height: LANE_H,
              cursor: 'ns-resize',
              touchAction: 'none',
              userSelect: 'none',
              background: 'rgba(255,255,255,0.025)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px ${cellW * stepsPerBar}px)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: LANE_H / 2,
                height: 1,
                background: 'rgba(255,255,255,0.08)',
              }}
            />
            {notes.map((nt) => {
              const isSel = nt._id === selected;
              const stem: CSSProperties = {
                position: 'absolute',
                left: xOfQ(noteQ(nt)) + 1,
                bottom: 0,
                width: isSel ? 6 : 4,
                height: (nt.velocity ?? 0.8) * LANE_H,
                background: colorFor(nt.degree),
                opacity: isSel ? 1 : 0.75,
                pointerEvents: 'none',
              };
              return (
                <div key={nt._id} style={stem}>
                  <div
                    style={{
                      position: 'absolute',
                      top: -5,
                      left: '50%',
                      marginLeft: isSel ? -6 : -5,
                      width: isSel ? 12 : 10,
                      height: isSel ? 12 : 10,
                      borderRadius: '50%',
                      background: colorFor(nt.degree),
                      boxShadow: isSel
                        ? '0 0 0 2px #0b0d12, 0 0 0 3px #fff'
                        : 'none',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Playhead = ({ left }: { left: number }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 2,
      background: PLAYHEAD,
      left,
      pointerEvents: 'none',
    }}
  />
);
