/* eslint-disable react/jsx-sort-props */
/**
 * The comping grid. A pattern is a rhythm, not pitches — the realizer voices
 * whatever chord is sounding — so there are three rows, one per kind of hit:
 * the full chord, the chord without its root, and the voicing's top note.
 * The preview's chords run along the top to keep that concrete.
 *
 * Click to add a hit; keep the button down and drag to lengthen. Click a hit
 * to select it, again to step its loudness. Drag to move (snapped), drag its
 * right edge to resize, right-click to delete. Arrows nudge (left/right a
 * step, up/down a row); shift-left/right resize; Delete removes.
 */

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { TimeSignature } from '@/curriculum/engine/meter';
import { approachHint, approachLabel } from '../approach/approachEdit';
import { CONSOLE_LABEL } from '../ui/styles';
import {
  hitQ,
  movedHit,
  newHit,
  nextVelocity,
  resizedDur,
  rowOfTones,
  TONE_ROWS,
  type EditorHit,
  type RollGeometry,
} from './compingGrid';

const ROW_H = 34;
const LABEL_W = 124;
const CHORD_H = 24;
const ROLL_H = ROW_H * TONE_ROWS.length;
const PLAYHEAD = '#f43f5e';
const ROW_COLORS = ['#60a5fa', '#a78bfa', '#fbbf24'];

export interface ChordMark {
  q: number;
  end: number;
  label: string;
}

interface Props {
  hits: EditorHit[];
  timeSignature: TimeSignature;
  geometry: RollGeometry;
  cellW: number;
  chords: ChordMark[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  /** An edit; `transient` continues the current drag's undo step. */
  edit: (fn: (hits: EditorHit[]) => EditorHit[], transient?: boolean) => void;
  /** Quarter the transport is on, folded into the pattern's length. */
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

export const CompingRoll = ({
  hits,
  timeSignature: ts,
  geometry: g,
  cellW,
  chords,
  selected,
  onSelect,
  edit,
  playheadQ,
}: Props) => {
  const width = g.totalSteps * cellW;
  const xOfQ = (q: number) => (q / g.stepQ) * cellW;

  const rollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [lastDur, setLastDur] = useState<number | null>(null);

  const patch = (id: number, p: Partial<EditorHit>) =>
    edit((hs) => hs.map((h) => (h._id === id ? { ...h, ...p } : h)));
  const remove = (id: number) => {
    edit((hs) => hs.filter((h) => h._id !== id));
    onSelect(null);
  };

  const pointAt = (e: PointerEvent | React.MouseEvent) => {
    const r = rollRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    return {
      x,
      step: Math.max(0, Math.min(g.totalSteps - 1, Math.floor(x / cellW))),
      row: Math.max(0, Math.min(TONE_ROWS.length - 1, Math.floor(y / ROW_H))),
    };
  };
  const hitAt = (p: { x: number; row: number }) =>
    [...hits].reverse().find((h) => {
      const x0 = xOfQ(hitQ(h, ts));
      return (
        rowOfTones(h.tones) === p.row &&
        p.x >= x0 &&
        p.x <= x0 + Math.max(6, xOfQ(h.dur))
      );
    });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const p = pointAt(e);
    const hit = hitAt(p);
    rollRef.current!.setPointerCapture(e.pointerId);
    if (hit) {
      const q = hitQ(hit, ts);
      const x1 = xOfQ(q) + Math.max(6, xOfQ(hit.dur));
      const wasSelected = hit._id === selected;
      onSelect(hit._id);
      drag.current = {
        mode: x1 - p.x < 7 ? 'resize' : 'move',
        id: hit._id,
        step: p.step,
        row: p.row,
        origQ: q,
        origRow: rowOfTones(hit.tones),
        moved: false,
        wasSelected,
      };
    } else {
      const h = newHit(p.step, p.row, g, ts, lastDur ?? undefined);
      edit((hs) => [...hs, h]);
      onSelect(h._id);
      drag.current = {
        mode: 'draw',
        id: h._id,
        step: p.step,
        row: p.row,
        origQ: p.step * g.stepQ,
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
    // A drag on a hit that was only clicked starts its own undo step.
    const transient = d.moved || d.mode === 'draw';
    d.moved = true;
    edit(
      (hs) =>
        hs.map((h) => {
          if (h._id !== d.id) return h;
          if (d.mode === 'move')
            return movedHit(h, d.origQ, d.origRow, dStep, dRow, g, ts);
          return { ...h, dur: resizedDur(d.origQ, p.step, g) };
        }),
      transient,
    );
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const h = hits.find((x) => x._id === d.id);
    if ((d.mode === 'resize' || d.mode === 'draw') && d.moved && h)
      setLastDur(h.dur);
    // A plain click on an already-selected hit steps its loudness.
    if (d.mode === 'move' && !d.moved && d.wasSelected && h)
      patch(h._id, { velocity: nextVelocity(h.velocity) });
  };

  // Arrows nudge the selected hit; Delete removes it; Escape deselects.
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
      const h = hits.find((x) => x._id === selected);
      if (!h) return;
      const q = hitQ(h, ts);
      const row = rowOfTones(h.tones);
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove(h._id);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = movedHit(
          h,
          q,
          row,
          0,
          e.key === 'ArrowUp' ? -1 : 1,
          g,
          ts,
        );
        edit((hs) => hs.map((x) => (x._id === h._id ? next : x)));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        if (e.shiftKey)
          patch(h._id, {
            dur: Math.max(
              g.stepQ * 0.25,
              Number((h.dur + dir * g.stepQ).toFixed(4)),
            ),
          });
        else {
          const next = movedHit(h, q, row, dir, 0, g, ts);
          edit((hs) => hs.map((x) => (x._id === h._id ? next : x)));
        }
      } else if (e.key === 'Escape') onSelect(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Grid lines as backgrounds: long patterns stay cheap.
  const pxPerQ = cellW / g.stepQ;
  const gridBackground = [
    `repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0 1px, transparent 1px ${cellW * g.stepsPerBar}px)`,
    `repeating-linear-gradient(90deg, rgba(255,255,255,0.13) 0 1px, transparent 1px ${pxPerQ * g.beatQ}px)`,
    `repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px ${cellW}px)`,
  ].join(', ');

  const beatsPerBar = Math.max(1, Math.round(g.barQ / g.beatQ));
  const showBeatNumbers = pxPerQ * g.beatQ >= 22;
  const beatLabels: { left: number; label: string; bar: boolean }[] = [];
  for (let b = 0; b < Math.round(g.totalQ / g.beatQ); b++) {
    const bar = b % beatsPerBar === 0;
    if (!bar && !showBeatNumbers) continue;
    beatLabels.push({
      left: xOfQ(b * g.beatQ),
      label: bar
        ? String(Math.floor(b / beatsPerBar) + 1)
        : `.${(b % beatsPerBar) + 1}`,
      bar,
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
      <div style={{ minWidth: LABEL_W + width }}>
        {/* the preview's chords, along the top */}
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
          <div style={{ width: LABEL_W, flexShrink: 0, height: ROLL_H }}>
            {TONE_ROWS.map((r, i) => (
              <div
                key={r.tones}
                title={r.hint}
                className="flex items-center text-xs font-bold tracking-[0.04em]"
                style={{ height: ROW_H, color: ROW_COLORS[i] }}
              >
                {r.label}
              </div>
            ))}
          </div>

          {/* grid + hits */}
          <div
            ref={rollRef}
            role="application"
            aria-label="Chord comping grid"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onContextMenu={(e) => {
              e.preventDefault();
              const hit = hitAt(pointAt(e));
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
            {TONE_ROWS.map((r, i) => (
              <div
                key={r.tones}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: i * ROW_H,
                  height: ROW_H,
                  background:
                    i === 0
                      ? 'rgba(96,165,250,0.08)'
                      : i % 2
                        ? 'rgba(255,255,255,0.025)'
                        : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
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
            {hits.map((h) => {
              const row = rowOfTones(h.tones);
              const q = hitQ(h, ts);
              const isSel = h._id === selected;
              return (
                <div
                  key={h._id}
                  title={`${h.approach ? approachHint(h) : TONE_ROWS[row].label} · ${h.time} · ${h.dur} beats · velocity ${Math.round(h.velocity * 100)}`}
                  style={{
                    position: 'absolute',
                    top: row * ROW_H + 4,
                    height: ROW_H - 8,
                    left: xOfQ(q) + 1,
                    width: Math.max(6, xOfQ(h.dur) - 2),
                    background: ROW_COLORS[row],
                    opacity: q >= g.totalQ ? 0.15 : 0.3 + 0.7 * h.velocity,
                    borderRadius: 4,
                    outline: isSel ? '2px solid #fff' : 'none',
                    outlineOffset: 1,
                    overflow: 'hidden',
                  }}
                >
                  {h.approach && cellW >= 12 && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 4,
                        top: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        color: '#0b0d12',
                        fontSize: 11,
                        fontWeight: 700,
                        zIndex: 1,
                      }}
                    >
                      {approachLabel(h)}
                    </span>
                  )}
                  {/* loudness, as a fill from the bottom */}
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: `${h.velocity * 100}%`,
                      background: 'rgba(0,0,0,0.18)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      cursor: 'ew-resize',
                      background: 'rgba(0,0,0,0.25)',
                    }}
                  />
                </div>
              );
            })}
            {playheadQ !== null && playheadQ < g.totalQ && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: PLAYHEAD,
                  left: xOfQ(playheadQ),
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* bar and beat numbers */}
        <div className="mt-[3px] flex">
          <div style={{ width: LABEL_W, flexShrink: 0 }} />
          <div style={{ position: 'relative', width, height: 14 }}>
            {beatLabels.map((b) => (
              <span
                key={b.left}
                className={b.bar ? 'font-bold text-white/60' : 'text-white/30'}
                style={{ position: 'absolute', left: b.left + 2, fontSize: 10 }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
