import { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2,
  Pencil,
  Eraser,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  noteNameInKey,
  getScaleSpellings,
  type MidiNoteEvent,
} from '@prism/engine';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  GRID_VALUES,
  quantizeEvents,
  snapToGrid,
  type GridSize,
} from '@/daw/utils/quantize';
import { alternatingBarGroup } from '@/daw/utils/timelineScale';

type Tool = 'select' | 'draw' | 'erase';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function resolveNoteColor(
  ev: { startTick: number },
  clipColor: string,
  chordRegions: ChordRegion[],
  useChordColors: boolean,
): [number, number, number] {
  const [r, g, b] = hexToRgb(clipColor);
  if (!useChordColors) return [r, g, b];
  for (let j = chordRegions.length - 1; j >= 0; j--) {
    if (
      ev.startTick >=
      (chordRegions[j].rawStartTick ?? chordRegions[j].startTick)
    ) {
      return chordRegions[j].color;
    }
  }
  return [r, g, b];
}

// ── Constants ───────────────────────────────────────────────────────────────
const KEYS_WIDTH = 48; // px for piano key column
const RULER_H = 24; // px for top ruler
const TOOLBAR_H = 36; // px for toolbar
const ROW_H = 12; // px per pitch row
const VEL_LANE_H = 60; // px height for velocity lane
const VEL_CIRCLE_R = 4; // px radius of draggable velocity circle
const VEL_CIRCLE_HIT_R = 7; // px hit test radius (circle + tolerance)
const TICKS_PER_BEAT = 480;
// Dragging vertically on the bar-number ruler scales the piano roll (horizontal
// zoom, up = in). Horizontal movement is ignored — the piano roll has no
// drag-to-pan.
const RULER_DRAG_THRESHOLD = 3; // px before a ruler press becomes a zoom drag
const RULER_ZOOM_SENSITIVITY = 0.01; // zoom delta per px of vertical movement

// Fixed view range (full keyboard C1–C7)
const VIEW_MIN = 24; // C1
const VIEW_MAX = 96; // C7
const VIEW_RANGE = VIEW_MAX - VIEW_MIN + 1; // 73 notes

// ── Theme colors (read CSS variables for canvas drawing) ────────────────────
function getThemeColors(el: HTMLElement) {
  const s = getComputedStyle(el);
  const get = (v: string, fb: string) => s.getPropertyValue(v).trim() || fb;
  return {
    bg: get('--color-bg', '#363636'),
    border: get('--color-border', 'rgba(255,255,255,0.08)'),
    textDim: get('--color-text-dim', '#6b6b80'),
  };
}

// ── Custom cursors (inline SVG data URIs) ───────────────────────────────────
const PENCIL_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/></svg>") 2 18, crosshair`;
const ERASER_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/><path d='M22 21H7'/><path d='m5 11 9 9'/></svg>") 2 18, pointer`;

// ── Note helpers ────────────────────────────────────────────────────────────
function noteName(
  midi: number,
  keyPc: number,
  spellings: Map<number, string> | null,
): string {
  const pc = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const raw = spellings?.has(pc)
    ? `${spellings.get(pc)}${octave}`
    : `${noteNameInKey(pc, keyPc)}${octave}`;
  return displayAccidentals(raw);
}
function isBlackKey(midi: number): boolean {
  const n = midi % 12;
  return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
}

// ── Drag mode ───────────────────────────────────────────────────────────────
// A drag operates on the whole current selection. `originals` snapshots every
// selected note at grab time (keyed by index) so deltas apply relative to the
// starting state; `anchorIndex` is the note actually grabbed.
interface NoteDrag {
  mode: 'move' | 'resize';
  anchorIndex: number;
  grabTickOffset: number; // tick offset of the cursor within the anchor note
  originals: Map<number, MidiNoteEvent>;
}

// Marquee (rubber-band) selection rectangle, in grid-canvas content coords.
interface MarqueeRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ── Props ───────────────────────────────────────────────────────────────────
interface PianoRollProps {
  events: MidiNoteEvent[];
  clipStartTick: number;
  clipColor: string;
  onChange: (events: MidiNoteEvent[]) => void;
}

export function PianoRoll({
  events,
  clipStartTick,
  clipColor,
  onChange,
}: PianoRollProps) {
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const chordRegions = useStore((s) => s.chordRegions);
  const clipColorMode = useStore((s) => s.clipColorMode);

  const beatsPerBar = tsNum;

  // Refs — container + 3 canvases + 3 scroll containers
  const containerRef = useRef<HTMLDivElement>(null);
  const pianoCanvasRef = useRef<HTMLCanvasElement>(null);
  const rulerCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const pianoScrollRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const velCanvasRef = useRef<HTMLCanvasElement>(null);
  const velScrollRef = useRef<HTMLDivElement>(null);

  // Default to a quarter-note grid so every drawn beat line is a snap target.
  // A coarser default (e.g. 1/2) leaves beats 2 and 4 of each bar unreachable
  // when dragging/drawing notes, even though their beat lines are visible.
  const [gridSize, setGridSize] = useState<GridSize>('1/4');
  const [tool, setTool] = useState<Tool>('draw');
  const [velocity, setVelocity] = useState(100);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set(),
  );
  const [velLaneOpen, setVelLaneOpen] = useState(true);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const dragRef = useRef<NoteDrag | null>(null);
  const marqueeRef = useRef<{
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const velDragRef = useRef<{ noteIndex: number } | null>(null);
  // Active ruler scale drag (vertical → horizontal zoom).
  const rulerDragRef = useRef<{
    startY: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  // Live mirrors of zoom + its lower bound so the window-level ruler drag reads
  // current values without re-attaching its listeners on every zoom step.
  const zoomRef = useRef(1);
  const minZoomRef = useRef(0.15);

  const selectSingle = useCallback((i: number | null) => {
    setSelectedIndices(i === null ? new Set() : new Set([i]));
  }, []);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const initialScrollDone = useRef(false);

  // Zoom (horizontal + vertical)
  const [zoom, setZoom] = useState(1);
  const MAX_ZOOM = 6;
  const [vZoom, setVZoom] = useState(1);
  const MIN_V_ZOOM = 0.5;
  const MAX_V_ZOOM = 4;

  // Compute horizontal extent from events (16-bar minimum)
  const MIN_TICKS = TICKS_PER_BEAT * beatsPerBar * 16;
  const maxTick = events.reduce(
    (max, e) => Math.max(max, e.startTick + e.durationTicks),
    clipStartTick + MIN_TICKS,
  );
  const totalTicks = maxTick - clipStartTick + TICKS_PER_BEAT * 4;

  // Dynamic MIN_ZOOM: stop zoom-out when content fills the viewport
  const containerW = gridScrollRef.current?.clientWidth ?? 800;
  const MIN_ZOOM = Math.max(
    0.15,
    containerW / ((totalTicks * 40) / TICKS_PER_BEAT),
  );
  zoomRef.current = zoom;
  minZoomRef.current = MIN_ZOOM;

  // Pixel scale (zoom-dependent)
  const pixelsPerTick = (40 * zoom) / TICKS_PER_BEAT;
  const gridW = totalTicks * pixelsPerTick;
  const rowH = ROW_H * vZoom;
  const gridH = VIEW_RANGE * rowH;

  // ── Draw Piano Keys ─────────────────────────────────────────────────────
  const drawPiano = useCallback(() => {
    const canvas = pianoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = containerRef.current
      ? getThemeColors(containerRef.current)
      : { bg: '#363636', border: 'rgba(255,255,255,0.08)', textDim: '#6b6b80' };

    const dpr = window.devicePixelRatio || 1;
    const w = KEYS_WIDTH;
    const h = gridH;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Background — matches theme
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    const spellings =
      rootNote !== null ? getScaleSpellings(rootNote, mode) : null;

    for (let i = 0; i < VIEW_RANGE; i++) {
      const midiNote = VIEW_MAX - i;
      const rowY = i * rowH;
      const black = isBlackKey(midiNote);
      const isC = midiNote % 12 === 0;

      // White key background
      if (!black) {
        ctx.fillStyle = isC ? '#5a5a62' : '#505058';
        ctx.fillRect(0, rowY, w, rowH);
      } else {
        // Black key
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(0, rowY, w * 0.65, rowH);
        // Right portion (gap)
        ctx.fillStyle = '#2a2a32';
        ctx.fillRect(w * 0.65, rowY, w * 0.35, rowH);
      }

      // Row separator
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowY + rowH);
      ctx.lineTo(w, rowY + rowH);
      ctx.stroke();

      // C note octave highlight
      if (isC) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, rowY);
        ctx.lineTo(w, rowY);
        ctx.stroke();
      }

      // Note labels — progressive: C always, white keys at 1.2x+, black keys at 1.7x+
      const showAllWhite = rowH >= 14;
      const showBlack = rowH >= 20;
      const showLabel = isC || (showAllWhite && !black) || (showBlack && black);

      if (showLabel) {
        const fontSize = Math.max(7, Math.round(8 * vZoom));
        ctx.fillStyle = isC
          ? 'rgba(255, 255, 255, 0.6)'
          : black
            ? 'rgba(255, 255, 255, 0.3)'
            : 'rgba(255, 255, 255, 0.4)';
        ctx.font = `${isC ? 'bold ' : ''}${fontSize}px Inter, monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillText(
          noteName(midiNote, rootNote ?? 0, spellings),
          w - 4,
          rowY + rowH / 2,
        );
      }
    }

    // Right edge separator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w - 0.5, 0);
    ctx.lineTo(w - 0.5, h);
    ctx.stroke();
  }, [gridH, rowH, vZoom, rootNote, mode]);

  // ── Draw Ruler ──────────────────────────────────────────────────────────
  const drawRuler = useCallback(() => {
    const canvas = rulerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = containerRef.current
      ? getThemeColors(containerRef.current)
      : { bg: '#363636', border: 'rgba(255,255,255,0.08)', textDim: '#6b6b80' };

    const dpr = window.devicePixelRatio || 1;
    const rulerContainer = rulerScrollRef.current;
    const w = rulerContainer
      ? Math.max(rulerContainer.clientWidth, gridW)
      : gridW;
    const h = RULER_H;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Ruler background overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, 0, w, h);

    const totalBeats = Math.ceil(totalTicks / TICKS_PER_BEAT);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beat * TICKS_PER_BEAT * pixelsPerTick;
      const isBar = beat % beatsPerBar === 0;

      // Tick mark
      ctx.strokeStyle = isBar
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, isBar ? 0 : h * 0.5);
      ctx.lineTo(x, h);
      ctx.stroke();

      if (isBar) {
        const barNum = beat / beatsPerBar + 1;
        ctx.fillStyle = colors.textDim;
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(String(barNum), x + 4, h / 2);
      }
    }

    // Bottom border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5);
    ctx.lineTo(w, h - 0.5);
    ctx.stroke();
  }, [gridW, totalTicks, pixelsPerTick]);

  // ── Draw Grid + Notes ───────────────────────────────────────────────────
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = gridScrollRef.current;
    if (!container) return;

    const colors = containerRef.current
      ? getThemeColors(containerRef.current)
      : { bg: '#363636', border: 'rgba(255,255,255,0.08)', textDim: '#6b6b80' };

    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(container.clientWidth, gridW);
    const h = gridH;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Clear — matches theme
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // ── Row backgrounds + horizontal grid lines ────────────────────────
    for (let i = 0; i < VIEW_RANGE; i++) {
      const midiNote = VIEW_MAX - i;
      const rowY = i * rowH;
      const black = isBlackKey(midiNote);

      if (black) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, rowY, w, rowH);
      }

      ctx.strokeStyle =
        midiNote % 12 === 0
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowY);
      ctx.lineTo(w, rowY);
      ctx.stroke();
    }

    // ── Alternating bar shading ─────────────────────────────────────────
    const barGroup = alternatingBarGroup(zoom);
    const barGroupTicks = barGroup * beatsPerBar * TICKS_PER_BEAT;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    const totalBarGroups = Math.ceil(totalTicks / barGroupTicks);
    for (let g = 0; g <= totalBarGroups; g++) {
      if (g % 2 === 0) continue;
      const x1 = g * barGroupTicks * pixelsPerTick;
      const x2 = (g + 1) * barGroupTicks * pixelsPerTick;
      ctx.fillRect(x1, 0, x2 - x1, h);
    }

    // ── Vertical grid lines (beats + bars) ─────────────────────────────
    const totalBeats = Math.ceil(totalTicks / TICKS_PER_BEAT);
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beat * TICKS_PER_BEAT * pixelsPerTick;
      const isBar = beat % beatsPerBar === 0;

      ctx.strokeStyle = isBar
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = isBar ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Sub-grid lines
    const gridTicks = GRID_VALUES[gridSize];
    if (gridTicks < TICKS_PER_BEAT) {
      const totalGridLines = Math.ceil(totalTicks / gridTicks);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 0.5;
      for (let g = 0; g <= totalGridLines; g++) {
        const tick = g * gridTicks;
        if (tick % TICKS_PER_BEAT === 0) continue;
        const x = tick * pixelsPerTick;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    // ── Note bars ──────────────────────────────────────────────────────
    const currentEvents = eventsRef.current;
    for (let i = 0; i < currentEvents.length; i++) {
      const ev = currentEvents[i];
      const relTick = ev.startTick - clipStartTick;
      const x = relTick * pixelsPerTick;
      const noteW = Math.max(3, ev.durationTicks * pixelsPerTick);
      const pitchIdx = VIEW_MAX - ev.note;
      const noteY = pitchIdx * rowH;

      // Skip notes outside view range
      if (ev.note < VIEW_MIN || ev.note > VIEW_MAX) continue;

      const isSelected = selectedIndices.has(i);
      const alpha = 0.7 + (ev.velocity / 127) * 0.3;
      const useChordColors =
        clipColorMode === 'prism' && chordRegions.length > 0;
      const [nr, ng, nb] = resolveNoteColor(
        ev,
        clipColor,
        chordRegions,
        useChordColors,
      );

      ctx.fillStyle = isSelected
        ? `rgb(${nr}, ${ng}, ${nb})`
        : `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(x, noteY + 1, noteW, rowH - 2, 2);
      ctx.fill();

      // Show note name when zoomed in enough
      if (rowH >= 14 && noteW >= 24) {
        const noteName = displayAccidentals(
          noteNameInKey(ev.note, rootNote ?? 0),
        );
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = `${Math.min(rowH - 4, 11)}px Inter, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(noteName, x + 3, noteY + rowH / 2);
      }

      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, noteY + 1, noteW, rowH - 2, 2);
        ctx.stroke();
      }
    }

    // ── Marquee selection rectangle ────────────────────────────────────
    if (marqueeRect) {
      const { x1, y1, x2, y2 } = marqueeRect;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x1 + 0.5, y1 + 0.5, x2 - x1, y2 - y1);
    }
  }, [
    events,
    clipStartTick,
    clipColor,
    chordRegions,
    clipColorMode,
    rootNote,
    gridSize,
    selectedIndices,
    marqueeRect,
    gridW,
    gridH,
    rowH,
    totalTicks,
    pixelsPerTick,
  ]);

  // ── Draw Velocity Lane ──────────────────────────────────────────────────
  const drawVelLane = useCallback(() => {
    const canvas = velCanvasRef.current;
    if (!canvas || !velLaneOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = containerRef.current
      ? getThemeColors(containerRef.current)
      : { bg: '#363636', border: 'rgba(255,255,255,0.08)', textDim: '#6b6b80' };
    const dpr = window.devicePixelRatio || 1;
    const velContainer = velScrollRef.current;
    const w = velContainer ? Math.max(velContainer.clientWidth, gridW) : gridW;
    const h = VEL_LANE_H;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Top border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(w, 0.5);
    ctx.stroke();

    // Guide lines at 25%, 50%, 75%
    const maxStemH = h - VEL_CIRCLE_R - 4;
    for (const frac of [0.25, 0.5, 0.75]) {
      const y = h - frac * maxStemH - 2;
      ctx.strokeStyle =
        frac === 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Velocity stems + circles
    const currentEvents = eventsRef.current;

    // Draw unselected first, then selected on top
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < currentEvents.length; i++) {
        const isSelected = selectedIndices.has(i);
        if ((pass === 0 && isSelected) || (pass === 1 && !isSelected)) continue;

        const ev = currentEvents[i];
        if (ev.note < VIEW_MIN || ev.note > VIEW_MAX) continue;

        const relTick = ev.startTick - clipStartTick;
        const x =
          relTick * pixelsPerTick + (ev.durationTicks * pixelsPerTick) / 2;
        const stemH = (ev.velocity / 127) * maxStemH;
        const circleY = h - stemH - 2;

        const alpha = 0.5 + (ev.velocity / 127) * 0.5;
        const useChordColors =
          clipColorMode === 'prism' && chordRegions.length > 0;
        const [nr, ng, nb] = resolveNoteColor(
          ev,
          clipColor,
          chordRegions,
          useChordColors,
        );
        const stemColor = isSelected
          ? '#ffffff'
          : `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;

        // Stem line
        ctx.strokeStyle = stemColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, h - 2);
        ctx.lineTo(x, circleY);
        ctx.stroke();

        // Circle
        ctx.fillStyle = isSelected ? '#ffffff' : `rgb(${nr}, ${ng}, ${nb})`;
        ctx.globalAlpha = isSelected ? 1 : alpha;
        ctx.beginPath();
        ctx.arc(x, circleY, VEL_CIRCLE_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Selected circle outline
        if (isSelected) {
          ctx.strokeStyle = clipColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, circleY, VEL_CIRCLE_R + 1, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }, [
    events,
    clipStartTick,
    clipColor,
    chordRegions,
    clipColorMode,
    selectedIndices,
    gridW,
    pixelsPerTick,
    velLaneOpen,
  ]);

  // ── Velocity lane mouse handlers ──────────────────────────────────────
  const handleVelMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = velCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const h = VEL_LANE_H;
      const maxStemH = h - VEL_CIRCLE_R - 4;

      const currentEvents = eventsRef.current;
      let hitIdx: number | null = null;
      let closestIdx: number | null = null;
      let closestDist = Infinity;

      for (let i = 0; i < currentEvents.length; i++) {
        const ev = currentEvents[i];
        if (ev.note < VIEW_MIN || ev.note > VIEW_MAX) continue;

        const relTick = ev.startTick - clipStartTick;
        const cx =
          relTick * pixelsPerTick + (ev.durationTicks * pixelsPerTick) / 2;
        const stemH = (ev.velocity / 127) * maxStemH;
        const circleY = h - stemH - 2;

        // Circle hit test
        const dist = Math.sqrt((mx - cx) ** 2 + (my - circleY) ** 2);
        if (dist <= VEL_CIRCLE_HIT_R) {
          hitIdx = i;
          break;
        }

        // Track closest for stem-area click
        const xDist = Math.abs(mx - cx);
        if (xDist < 20 && xDist < closestDist) {
          closestDist = xDist;
          closestIdx = i;
        }
      }

      const targetIdx = hitIdx ?? closestIdx;
      if (targetIdx !== null) {
        selectSingle(targetIdx);
        velDragRef.current = { noteIndex: targetIdx };

        const newVel = Math.max(
          1,
          Math.min(127, Math.round(((h - 2 - my) / maxStemH) * 127)),
        );
        const updated = [...currentEvents];
        updated[targetIdx] = { ...updated[targetIdx], velocity: newVel };
        onChange(updated);
      }
    },
    [clipStartTick, pixelsPerTick, onChange, selectSingle],
  );

  const handleVelMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!velDragRef.current) return;
      const canvas = velCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const my = e.clientY - rect.top;
      const h = VEL_LANE_H;
      const maxStemH = h - VEL_CIRCLE_R - 4;

      const newVel = Math.max(
        1,
        Math.min(127, Math.round(((h - 2 - my) / maxStemH) * 127)),
      );
      const currentEvents = [...eventsRef.current];
      const idx = velDragRef.current.noteIndex;
      currentEvents[idx] = { ...currentEvents[idx], velocity: newVel };
      onChange(currentEvents);
    },
    [onChange],
  );

  const handleVelMouseUp = useCallback(() => {
    velDragRef.current = null;
  }, []);

  // ── Draw all canvases ───────────────────────────────────────────────────
  useEffect(() => {
    drawPiano();
  }, [drawPiano]);
  useEffect(() => {
    drawRuler();
  }, [drawRuler]);
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);
  useEffect(() => {
    drawVelLane();
  }, [drawVelLane]);

  // ── Auto-scroll to notes on mount ───────────────────────────────────────
  useEffect(() => {
    if (initialScrollDone.current) return;
    const grid = gridScrollRef.current;
    if (!grid) return;

    // Wait a frame for layout to settle
    requestAnimationFrame(() => {
      let centerNote = 60; // default C4
      if (events.length > 0) {
        let minN = 127,
          maxN = 0;
        for (const ev of events) {
          if (ev.note < minN) minN = ev.note;
          if (ev.note > maxN) maxN = ev.note;
        }
        centerNote = Math.floor((minN + maxN) / 2);
      }
      const centerRow = VIEW_MAX - centerNote;
      const targetScroll = centerRow * rowH - grid.clientHeight / 2;
      grid.scrollTop = Math.max(0, targetScroll);
      initialScrollDone.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync scroll ─────────────────────────────────────────────────────────
  const handleGridScroll = useCallback(() => {
    const grid = gridScrollRef.current;
    if (!grid) return;
    if (pianoScrollRef.current)
      pianoScrollRef.current.scrollTop = grid.scrollTop;
    if (rulerScrollRef.current)
      rulerScrollRef.current.scrollLeft = grid.scrollLeft;
    if (velScrollRef.current) velScrollRef.current.scrollLeft = grid.scrollLeft;
  }, []);

  // ── Canvas coords (relative to grid canvas) ────────────────────────────
  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // ── Hit test ────────────────────────────────────────────────────────────
  const hitTestNote = useCallback(
    (canvasX: number, canvasY: number): number | null => {
      const currentEvents = eventsRef.current;
      for (let i = currentEvents.length - 1; i >= 0; i--) {
        const ev = currentEvents[i];
        const relTick = ev.startTick - clipStartTick;
        const x = relTick * pixelsPerTick;
        const w = Math.max(3, ev.durationTicks * pixelsPerTick);
        const pitchIdx = VIEW_MAX - ev.note;
        const noteY = pitchIdx * rowH;

        if (
          canvasX >= x &&
          canvasX <= x + w &&
          canvasY >= noteY &&
          canvasY <= noteY + rowH
        ) {
          return i;
        }
      }
      return null;
    },
    [clipStartTick, pixelsPerTick, rowH],
  );

  // ── Mouse down ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      if (x < 0 || y < 0) return;

      const noteIdx = hitTestNote(x, y);
      const currentEvents = eventsRef.current;

      switch (tool) {
        case 'draw': {
          if (noteIdx !== null) {
            // In draw mode, clicking an existing note selects it (for velocity editing)
            selectSingle(noteIdx);
            return;
          }
          selectSingle(null);
          const gridTicks = GRID_VALUES[gridSize];
          const clickTick = x / pixelsPerTick + clipStartTick;
          const snappedTick = snapToGrid(clickTick, gridSize);
          const pitch = VIEW_MAX - Math.floor(y / rowH);

          if (pitch >= VIEW_MIN && pitch <= VIEW_MAX) {
            const newNote: MidiNoteEvent = {
              note: pitch,
              velocity,
              startTick: snappedTick,
              durationTicks: gridTicks,
              channel: 0,
            };
            const newEvents = [...currentEvents, newNote].sort(
              (a, b) => a.startTick - b.startTick,
            );
            onChange(newEvents);
            const addedIdx = newEvents.findIndex(
              (n) =>
                n.startTick === snappedTick &&
                n.note === pitch &&
                n.durationTicks === gridTicks,
            );
            selectSingle(addedIdx >= 0 ? addedIdx : null);
          }
          break;
        }

        case 'select': {
          if (noteIdx !== null) {
            // Drag the whole selection if the grabbed note is part of an
            // existing multi-selection; otherwise grab just this note.
            let indices: Set<number>;
            if (selectedIndices.has(noteIdx) && selectedIndices.size > 1) {
              indices = selectedIndices;
            } else {
              indices = new Set([noteIdx]);
              setSelectedIndices(indices);
            }

            const ev = currentEvents[noteIdx];
            const relTick = ev.startTick - clipStartTick;
            const noteX = relTick * pixelsPerTick;
            const noteW = Math.max(3, ev.durationTicks * pixelsPerTick);
            const nearRightEdge = x >= noteX + noteW - 6;

            const originals = new Map<number, MidiNoteEvent>();
            for (const i of indices) originals.set(i, { ...currentEvents[i] });

            dragRef.current = {
              mode: nearRightEdge ? 'resize' : 'move',
              anchorIndex: noteIdx,
              grabTickOffset: Math.round((x - noteX) / pixelsPerTick),
              originals,
            };
          } else {
            // Empty space: start a marquee. Selection is cleared now so that a
            // plain click (no drag) deselects everything, while a drag rebuilds
            // the selection live in handleMouseMove.
            setSelectedIndices(new Set());
            marqueeRef.current = { originX: x, originY: y, moved: false };
            setMarqueeRect(null);
          }
          break;
        }

        case 'erase': {
          if (noteIdx !== null) {
            const newEvents = currentEvents.filter((_, i) => i !== noteIdx);
            onChange(newEvents);
            selectSingle(null);
          }
          break;
        }
      }
    },
    [
      tool,
      velocity,
      getCanvasCoords,
      hitTestNote,
      clipStartTick,
      pixelsPerTick,
      gridSize,
      onChange,
      selectSingle,
      selectedIndices,
    ],
  );

  // ── Mouse move ──────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // ── Marquee in progress: rebuild selection from notes inside the rect ──
      if (marqueeRef.current) {
        const { x, y } = getCanvasCoords(e);
        const m = marqueeRef.current;
        m.moved = true;
        const rect: MarqueeRect = {
          x1: Math.min(m.originX, x),
          y1: Math.min(m.originY, y),
          x2: Math.max(m.originX, x),
          y2: Math.max(m.originY, y),
        };
        setMarqueeRect(rect);

        const sel = new Set<number>();
        const evs = eventsRef.current;
        for (let i = 0; i < evs.length; i++) {
          const ev = evs[i];
          if (ev.note < VIEW_MIN || ev.note > VIEW_MAX) continue;
          const nx = (ev.startTick - clipStartTick) * pixelsPerTick;
          const nw = Math.max(3, ev.durationTicks * pixelsPerTick);
          const ny = (VIEW_MAX - ev.note) * rowH;
          // Select on any overlap between the note bar and the marquee rect.
          if (
            nx <= rect.x2 &&
            nx + nw >= rect.x1 &&
            ny <= rect.y2 &&
            ny + rowH >= rect.y1
          ) {
            sel.add(i);
          }
        }
        setSelectedIndices(sel);
        return;
      }

      const drag = dragRef.current;
      if (!drag) {
        const canvas = gridCanvasRef.current;
        if (!canvas) return;

        switch (tool) {
          case 'draw':
            canvas.style.cursor = PENCIL_CURSOR;
            break;
          case 'erase':
            canvas.style.cursor = ERASER_CURSOR;
            break;
          case 'select': {
            const { x, y } = getCanvasCoords(e);
            const noteIdx = hitTestNote(x, y);
            if (noteIdx !== null) {
              const ev = eventsRef.current[noteIdx];
              const relTick = ev.startTick - clipStartTick;
              const noteX = relTick * pixelsPerTick;
              const noteW = Math.max(3, ev.durationTicks * pixelsPerTick);
              canvas.style.cursor =
                x >= noteX + noteW - 6 ? 'col-resize' : 'grab';
            } else {
              canvas.style.cursor = 'crosshair';
            }
            break;
          }
        }
        return;
      }

      const { x, y } = getCanvasCoords(e);
      const currentEvents = [...eventsRef.current];
      const anchorOrig = drag.originals.get(drag.anchorIndex);
      if (!anchorOrig) return;

      if (drag.mode === 'move') {
        // Derive the anchor's snapped delta, then shift the whole group by it.
        const rawTick = x / pixelsPerTick + clipStartTick - drag.grabTickOffset;
        const snappedTick = snapToGrid(rawTick, gridSize);
        let tickDelta = snappedTick - anchorOrig.startTick;
        const pitch = VIEW_MAX - Math.floor(y / rowH);
        let pitchDelta = pitch - anchorOrig.note;

        // Clamp the deltas so no note in the group leaves valid bounds.
        let minStart = Infinity;
        let minPitch = Infinity;
        let maxPitch = -Infinity;
        for (const o of drag.originals.values()) {
          if (o.startTick < minStart) minStart = o.startTick;
          if (o.note < minPitch) minPitch = o.note;
          if (o.note > maxPitch) maxPitch = o.note;
        }
        if (minStart + tickDelta < 0) tickDelta = -minStart;
        if (minPitch + pitchDelta < 0) pitchDelta = -minPitch;
        if (maxPitch + pitchDelta > 127) pitchDelta = 127 - maxPitch;

        for (const [idx, o] of drag.originals) {
          currentEvents[idx] = {
            ...currentEvents[idx],
            startTick: o.startTick + tickDelta,
            note: o.note + pitchDelta,
          };
        }
      } else if (drag.mode === 'resize') {
        // Derive the anchor's snapped duration delta, then stretch every
        // selected note by the same amount (clamped to the grid minimum).
        const endTick = x / pixelsPerTick + clipStartTick;
        const snappedEnd = snapToGrid(endTick, gridSize);
        const newAnchorDur = Math.max(
          GRID_VALUES[gridSize],
          snappedEnd - anchorOrig.startTick,
        );
        const durDelta = newAnchorDur - anchorOrig.durationTicks;

        for (const [idx, o] of drag.originals) {
          currentEvents[idx] = {
            ...currentEvents[idx],
            durationTicks: Math.max(
              GRID_VALUES[gridSize],
              o.durationTicks + durDelta,
            ),
          };
        }
      }

      onChange(currentEvents);
    },
    [
      tool,
      getCanvasCoords,
      hitTestNote,
      clipStartTick,
      pixelsPerTick,
      rowH,
      gridSize,
      onChange,
    ],
  );

  // ── Mouse up ────────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    marqueeRef.current = null;
    setMarqueeRect(null);
    if (gridCanvasRef.current) {
      gridCanvasRef.current.style.cursor =
        tool === 'draw'
          ? PENCIL_CURSOR
          : tool === 'erase'
            ? ERASER_CURSOR
            : 'default';
    }
  }, [tool]);

  useEffect(() => {
    const handler = () => {
      if (dragRef.current || marqueeRef.current) handleMouseUp();
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [handleMouseUp]);

  // ── Keyboard: Tool shortcuts + Delete ───────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') {
        setTool('select');
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        setTool('draw');
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        setTool('erase');
        return;
      }

      // Delete selected note(s)
      if (
        (e.code === 'Delete' || e.code === 'Backspace') &&
        selectedIndices.size > 0
      ) {
        e.preventDefault();
        e.stopPropagation();
        const newEvents = eventsRef.current.filter(
          (_, i) => !selectedIndices.has(i),
        );
        onChange(newEvents);
        setSelectedIndices(new Set());
      }
    },
    [selectedIndices, onChange],
  );

  // ── Quantize handler ────────────────────────────────────────────────────
  const handleQuantize = useCallback(() => {
    onChange(quantizeEvents(eventsRef.current, gridSize));
  }, [gridSize, onChange]);

  // ── Wheel zoom: Cmd/Ctrl = horizontal, Alt = vertical ──────────────
  useEffect(() => {
    const container = gridScrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Alt + wheel = vertical zoom (cursor-centered)
      if (e.altKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseY = e.clientY - rect.top + container.scrollTop;
        const noteAtMouse = mouseY / rowH;

        const factor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
        const newVZoom = Math.min(
          MAX_V_ZOOM,
          Math.max(MIN_V_ZOOM, vZoom * factor),
        );

        const newRowH = ROW_H * newVZoom;
        const newMouseY = noteAtMouse * newRowH;
        const newScrollTop = newMouseY - (e.clientY - rect.top);

        setVZoom(newVZoom);
        requestAnimationFrame(() => {
          container.scrollTop = Math.max(0, newScrollTop);
          if (pianoScrollRef.current)
            pianoScrollRef.current.scrollTop = Math.max(0, newScrollTop);
        });
        return;
      }

      // Cmd/Ctrl + wheel = horizontal zoom (cursor-centered)
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + container.scrollLeft;
      const tickAtMouse = mouseX / pixelsPerTick;

      const zoomFactor = e.deltaY < 0 ? 1.05 : 1 / 1.05;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomFactor));

      const newPixelsPerTick = (40 * newZoom) / TICKS_PER_BEAT;
      const newMouseX = tickAtMouse * newPixelsPerTick;
      const newScrollLeft = newMouseX - (e.clientX - rect.left);

      setZoom(newZoom);
      requestAnimationFrame(() => {
        container.scrollLeft = Math.max(0, newScrollLeft);
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, pixelsPerTick, vZoom, rowH]);

  // ── Ruler scale drag: vertical → horizontal zoom ─────────────────────────
  // Mirrors the timeline's bar-ruler scale drag. Movement is tracked at the
  // window level so the gesture continues even when the cursor leaves the ruler
  // (e.g. dragging up into the toolbar to keep scaling — no ceiling). The piano
  // roll has no drag-to-pan; horizontal movement here is ignored.
  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      rulerDragRef.current = {
        startY: e.clientY,
        lastY: e.clientY,
        moved: false,
      };
      if (rulerCanvasRef.current)
        rulerCanvasRef.current.style.cursor = 'ns-resize';

      const onMove = (me: MouseEvent) => {
        const d = rulerDragRef.current;
        const container = gridScrollRef.current;
        if (!d || !container) return;

        if (!d.moved) {
          if (Math.abs(me.clientY - d.startY) <= RULER_DRAG_THRESHOLD) return;
          d.moved = true;
          d.lastY = me.clientY;
        }

        const dy = d.lastY - me.clientY; // up → positive → zoom in
        d.lastY = me.clientY;
        if (dy === 0) return;

        const rect = container.getBoundingClientRect();
        const localX = me.clientX - rect.left;
        const curZoom = zoomRef.current;
        const ppt = (40 * curZoom) / TICKS_PER_BEAT;
        const tickAtMouse = (localX + container.scrollLeft) / ppt;
        const newZoom = Math.min(
          MAX_ZOOM,
          Math.max(
            minZoomRef.current,
            curZoom * (1 + dy * RULER_ZOOM_SENSITIVITY),
          ),
        );
        zoomRef.current = newZoom; // update now so rapid moves don't compound
        const newScrollLeft =
          tickAtMouse * ((40 * newZoom) / TICKS_PER_BEAT) - localX;
        setZoom(newZoom);
        requestAnimationFrame(() => {
          if (gridScrollRef.current)
            gridScrollRef.current.scrollLeft = Math.max(0, newScrollLeft);
        });
      };
      const onUp = () => {
        rulerDragRef.current = null;
        if (rulerCanvasRef.current)
          rulerCanvasRef.current.style.cursor = 'ns-resize';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [MAX_ZOOM],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  // Velocity control reflects the selection: shows the first selected note's
  // value and applies edits to every selected note.
  const selectedArr = Array.from(selectedIndices);
  const velRefIdx = selectedArr.length > 0 ? selectedArr[0] : null;
  const velDisplay =
    velRefIdx !== null
      ? (eventsRef.current[velRefIdx]?.velocity ?? velocity)
      : velocity;

  return (
    <div
      ref={containerRef}
      className="flex flex-col"
      style={{ height: '100%' }}
    >
      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center gap-2 px-3"
        style={{
          height: TOOLBAR_H,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Tool mode buttons */}
        <div className="flex gap-0.5">
          {(
            [
              {
                id: 'select' as Tool,
                icon: <MousePointer2 className="size-3.5" />,
                label: 'Select',
                shortcut: 'V',
              },
              {
                id: 'draw' as Tool,
                icon: <Pencil className="size-3.5" />,
                label: 'Draw',
                shortcut: 'D',
              },
              {
                id: 'erase' as Tool,
                icon: <Eraser className="size-3.5" />,
                label: 'Erase',
                shortcut: 'E',
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`flex h-6 items-center gap-1 rounded px-2 text-[10px] font-semibold transition-colors ${
                tool === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/60'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-white/10" />

        {/* Grid dropdown */}
        <label
          className="flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Grid
          <select
            value={gridSize}
            onChange={(e) => setGridSize(e.target.value as GridSize)}
            className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs outline-none"
            style={{ color: 'var(--color-text)' }}
          >
            {Object.keys(GRID_VALUES).map((g) => (
              <option
                key={g}
                value={g}
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                {g}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleQuantize}
          className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs transition-colors hover:bg-white/10"
          style={{ color: 'var(--color-text)' }}
        >
          Quantize
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-white/10" />

        {/* Velocity control */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold uppercase text-white/30">
            {selectedArr.length > 0 ? 'Sel Vel' : 'Vel'}
          </span>
          <input
            type="range"
            min={1}
            max={127}
            value={velDisplay}
            onChange={(e) => {
              const val = Math.max(1, Math.min(127, Number(e.target.value)));
              if (selectedArr.length > 0) {
                const updated = [...eventsRef.current];
                for (const idx of selectedArr) {
                  if (updated[idx]) {
                    updated[idx] = { ...updated[idx], velocity: val };
                  }
                }
                onChange(updated);
              } else {
                setVelocity(val);
              }
            }}
            className="h-1 w-16 accent-white/50"
          />
          <span className="w-6 text-right font-mono text-[10px] text-white/40">
            {velDisplay}
          </span>
        </div>

        {/* Note count + zoom */}
        <span
          className="ml-auto text-xs"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {events.length} notes
        </span>
        <span
          className="font-mono text-[10px]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          H:{Math.round(zoom * 100)}% V:{Math.round(vZoom * 100)}%
        </span>
      </div>

      {/* Piano roll body — synced layout + velocity lane */}
      <div
        className="flex flex-1 flex-col overflow-hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Main grid area */}
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Left column: corner spacer + piano keys */}
          <div className="flex shrink-0 flex-col" style={{ width: KEYS_WIDTH }}>
            {/* Corner spacer */}
            <div
              style={{
                height: RULER_H,
                flexShrink: 0,
                backgroundColor: 'var(--color-bg)',
                borderBottom: '1px solid var(--color-border)',
                borderRight: '1px solid var(--color-border)',
              }}
            />
            {/* Piano keys — syncs vertically with grid */}
            <div
              ref={pianoScrollRef}
              style={{ flex: 1, overflowY: 'hidden', overflowX: 'hidden' }}
            >
              <canvas ref={pianoCanvasRef} className="block" />
            </div>
          </div>

          {/* Right column: ruler + grid */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Ruler — syncs horizontally with grid; drag to scale/pan */}
            <div
              ref={rulerScrollRef}
              style={{
                height: RULER_H,
                flexShrink: 0,
                overflowX: 'hidden',
                overflowY: 'hidden',
              }}
            >
              <canvas
                ref={rulerCanvasRef}
                className="block"
                style={{ cursor: 'ns-resize' }}
                onMouseDown={handleRulerMouseDown}
              />
            </div>
            {/* Grid — scroll master */}
            <div
              ref={gridScrollRef}
              className="flex-1 overflow-auto"
              onScroll={handleGridScroll}
              style={{ scrollbarWidth: 'thin' }}
            >
              <canvas
                ref={gridCanvasRef}
                className="block"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />
            </div>
          </div>
        </div>

        {/* Velocity lane */}
        <div className="shrink-0">
          <div className="flex">
            {/* Toggle button aligned with piano keys */}
            <button
              onClick={() => setVelLaneOpen((o) => !o)}
              className="flex shrink-0 cursor-pointer items-center justify-center gap-1"
              style={{
                width: KEYS_WIDTH,
                height: 18,
                background: 'none',
                border: 'none',
                borderTop: '1px solid var(--color-border)',
                borderRight: '1px solid var(--color-border)',
                color: 'var(--color-text-dim)',
              }}
            >
              {velLaneOpen ? (
                <ChevronDown size={9} />
              ) : (
                <ChevronRight size={9} />
              )}
              <span className="text-[8px] font-semibold uppercase tracking-wider">
                Vel
              </span>
            </button>
            <div
              className="flex-1"
              style={{
                height: 18,
                borderTop: '1px solid var(--color-border)',
              }}
            />
          </div>
          <AnimatePresence>
            {velLaneOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: VEL_LANE_H }}
                exit={{ height: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="flex overflow-hidden"
              >
                {/* Vel label area (aligned with piano keys) */}
                <div
                  className="shrink-0"
                  style={{
                    width: KEYS_WIDTH,
                    height: VEL_LANE_H,
                    borderRight: '1px solid var(--color-border)',
                  }}
                />
                {/* Vel canvas */}
                <div
                  ref={velScrollRef}
                  className="flex-1"
                  style={{
                    overflowX: 'hidden',
                    overflowY: 'hidden',
                    height: VEL_LANE_H,
                  }}
                >
                  <canvas
                    ref={velCanvasRef}
                    className="block"
                    style={{ cursor: 'ns-resize' }}
                    onMouseDown={handleVelMouseDown}
                    onMouseMove={handleVelMouseMove}
                    onMouseUp={handleVelMouseUp}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
