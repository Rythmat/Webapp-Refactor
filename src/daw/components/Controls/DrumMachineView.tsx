/* eslint-disable react-hooks/exhaustive-deps, sonarjs/cognitive-complexity, tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  MousePointer2,
  Pencil,
  Eraser,
} from 'lucide-react';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import {
  DrumMachineEngine,
  DRUM_KITS,
  DRUM_KIT_CONFIGS,
  DRUM_PADS,
  type DrumKitId,
} from '@/daw/instruments/DrumMachineEngine';
import type { MidiNoteEvent } from '@prism/engine';
import {
  GRID_VALUES,
  snapToGrid,
  quantizeEvents,
  type GridSize,
} from '@/daw/utils/quantize';
import { alternatingBarGroup } from '@/daw/utils/timelineScale';

// ── Types ─────────────────────────────────────────────────────────────────

type Tool = 'select' | 'draw' | 'erase';

interface NoteDrag {
  noteIndex: number;
  mode: 'move' | 'resize';
  offsetTick: number;
  originalPadIndex: number;
  originalNote: MidiNoteEvent;
}

// ── Constants ─────────────────────────────────────────────────────────────

const LABEL_W = 140;
const PAD_ROW_H = 28;
const RULER_H = 24;
const TOOLBAR_H = 36;
const NUM_PADS = DRUM_PADS.length; // 11
const GRID_H = PAD_ROW_H * NUM_PADS;
const VEL_LANE_H = 60;
const VEL_CIRCLE_R = 4;
const VEL_CIRCLE_HIT_R = 7;
const TICKS_PER_BEAT = 480;
const MIN_NOTE_W = 3;
const RESIZE_EDGE_PX = 6;
const SPRING = { type: 'spring' as const, stiffness: 350, damping: 30 };

// ── Custom cursors ────────────────────────────────────────────────────────

const PENCIL_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/></svg>") 2 18, crosshair`;
const ERASER_CURSOR = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/><path d='M22 21H7'/><path d='m5 11 9 9'/></svg>") 2 18, pointer`;

// ── Pad helpers ───────────────────────────────────────────────────────────
// Display order: index 0 = Kick at bottom, index 8 = Ride at top.
// Canvas row 0 is top of canvas = Ride (pad index 8).

/** Canvas row (0=top) → DRUM_PADS index */
function rowToPadIndex(row: number): number {
  return NUM_PADS - 1 - row;
}

/** DRUM_PADS index → canvas row (0=top) */
function padIndexToRow(padIdx: number): number {
  return NUM_PADS - 1 - padIdx;
}

/** Map any MIDI note to canonical pad note */
function canonicalNote(note: number): number {
  switch (note) {
    case 35:
    case 36:
      return 36;
    case 37:
    case 38:
    case 39:
      return 38;
    case 40:
      return 40;
    case 42:
      return 42;
    case 44:
      return 44;
    case 46:
      return 46;
    case 48:
    case 50:
      return 48;
    case 45:
    case 47:
      return 45;
    case 41:
    case 43:
      return 41;
    case 49:
    case 52:
    case 55:
    case 57:
      return 49;
    case 51:
    case 53:
      return 51;
    default:
      return 36;
  }
}

/** Find DRUM_PADS index for a MIDI note */
function padIndexForNote(note: number): number {
  const cn = canonicalNote(note);
  return DRUM_PADS.findIndex((p) => p.note === cn);
}

// ── Theme colors ──────────────────────────────────────────────────────────

function getThemeColors(el: HTMLElement) {
  const s = getComputedStyle(el);
  const get = (v: string, fb: string) => s.getPropertyValue(v).trim() || fb;
  return {
    bg: get('--color-bg', '#363636'),
    border: get('--color-border', 'rgba(255,255,255,0.08)'),
    textDim: get('--color-text-dim', '#6b6b80'),
  };
}

// ── DrumMachineView ───────────────────────────────────────────────────────

interface DrumMachineViewProps {
  trackId: string;
}

export function DrumMachineView({ trackId }: DrumMachineViewProps) {
  // ── Store ─────────────────────────────────────────────────────────────
  const track = useStore((s) => s.tracks.find((t) => t.id === trackId));
  const updateDrumPad = useStore((s) => s.updateDrumPad);
  const updateMidiClipEvents = useStore((s) => s.updateMidiClipEvents);
  const addMidiClip = useStore((s) => s.addMidiClip);
  const position = useStore((s) => s.position);
  const isPlaying = useStore((s) => s.isPlaying);

  // Time signature
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const beatsPerBar = tsNum;

  const clip = track?.midiClips[0];
  const clipStartTick = clip?.startTick ?? 0;
  const events = useMemo(() => clip?.events ?? [], [clip?.events]);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // ── Local state ───────────────────────────────────────────────────────
  const [currentKit, setCurrentKit] = useState<DrumKitId>('natural');
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedPad, setSelectedPad] = useState<number>(36);
  const [sampleEditorOpen, setSampleEditorOpen] = useState(false);
  const [velLaneOpen, setVelLaneOpen] = useState(false);

  const [tool, setTool] = useState<Tool>('draw');
  const [gridSize, setGridSize] = useState<GridSize>('1/16');
  const [velocity, setVelocity] = useState(100);
  const [selectedNoteIdx, setSelectedNoteIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const MAX_ZOOM = 6;

  // ── Refs ──────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const velCanvasRef = useRef<HTMLCanvasElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const velScrollRef = useRef<HTMLDivElement>(null);
  const labelScrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<NoteDrag | null>(null);
  const paintRef = useRef<{ padIdx: number; tick: number } | null>(null);
  const initialZoomSet = useRef(false);

  // ── Computed layout ───────────────────────────────────────────────────
  const MIN_TICKS = TICKS_PER_BEAT * beatsPerBar * 4;
  const maxTick = events.reduce(
    (max, e) => Math.max(max, e.startTick + e.durationTicks),
    clipStartTick + MIN_TICKS,
  );
  const totalTicks = maxTick - clipStartTick + TICKS_PER_BEAT * 4;

  const containerW = gridScrollRef.current?.clientWidth ?? 600;
  const MIN_ZOOM = Math.max(
    0.15,
    containerW / ((totalTicks * 40) / TICKS_PER_BEAT),
  );
  const pixelsPerTick = (40 * zoom) / TICKS_PER_BEAT;
  const gridW = totalTicks * pixelsPerTick;

  // ── Fit 4 bars to container on mount ─────────────────────────────────
  useEffect(() => {
    if (initialZoomSet.current) return;
    const container = gridScrollRef.current;
    if (!container) return;
    const fourBarPx = 4 * beatsPerBar * 40;
    const fitZoom = container.clientWidth / fourBarPx;
    setZoom(Math.max(0.15, fitZoom));
    initialZoomSet.current = true;
  }, []);

  // ── onChange helper ───────────────────────────────────────────────────
  const onChange = useCallback(
    (newEvents: MidiNoteEvent[]) => {
      if (clip) {
        updateMidiClipEvents(trackId, clip.id, newEvents);
      } else {
        addMidiClip(trackId, {
          id: `clip-drums-${crypto.randomUUID().slice(0, 8)}`,
          name: 'Drum Pattern',
          startTick: 0,
          events: newEvents,
        });
      }
    },
    [clip, trackId, updateMidiClipEvents, addMidiClip],
  );

  // ── Kit management ────────────────────────────────────────────────────
  useEffect(() => {
    const state = trackEngineRegistry.get(trackId);
    if (state?.instrument instanceof DrumMachineEngine) {
      setCurrentKit(state.instrument.getKit());
    }
  }, [trackId]);

  useEffect(() => {
    const state = trackEngineRegistry.get(trackId);
    if (!(state?.instrument instanceof DrumMachineEngine)) return;
    const engine = state.instrument;
    for (const pad of DRUM_PADS) {
      const padState = track?.drumPads?.[pad.note];
      engine.setPadVolume(pad.note, padState?.volume ?? 0.8);
      engine.setPadPan(
        pad.note,
        padState?.pan ?? engine.getDefaultPan(pad.note),
      );
    }
  }, [trackId, track?.drumPads]);

  const handleKitChange = useCallback(
    async (kitId: DrumKitId) => {
      const state = trackEngineRegistry.get(trackId);
      if (!(state?.instrument instanceof DrumMachineEngine)) return;
      setLoading(true);
      setDropdownOpen(false);
      try {
        await state.instrument.setKit(kitId);
        setCurrentKit(kitId);
      } catch (err) {
        console.error('[DrumMachineView] Failed to load kit:', err);
      } finally {
        setLoading(false);
      }
    },
    [trackId],
  );

  const handleClear = useCallback(() => {
    if (clip) updateMidiClipEvents(trackId, clip.id, []);
    setSelectedNoteIdx(null);
  }, [clip, trackId, updateMidiClipEvents]);

  const handlePadTrigger = useCallback(
    (note: number) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOn(note, 100);
    },
    [trackId],
  );

  const handleQuantize = useCallback(() => {
    onChange(quantizeEvents(eventsRef.current, gridSize));
  }, [gridSize, onChange]);

  // ── Draw Ruler ────────────────────────────────────────────────────────
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
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, w, h);

    const totalBeats = Math.ceil(totalTicks / TICKS_PER_BEAT);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beat * TICKS_PER_BEAT * pixelsPerTick;
      const isBar = beat % beatsPerBar === 0;

      ctx.strokeStyle = isBar
        ? 'rgba(255,255,255,0.15)'
        : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, isBar ? 0 : h * 0.5);
      ctx.lineTo(x, h);
      ctx.stroke();

      const bar = Math.floor(beat / beatsPerBar) + 1;
      const beatInBar = beat % beatsPerBar;
      ctx.fillStyle = colors.textDim;
      ctx.font = isBar ? '10px Inter, sans-serif' : '9px Inter, sans-serif';
      const label = isBar ? String(bar) : `${bar}.${beatInBar + 1}`;
      ctx.fillText(label, x + 4, h / 2);
    }

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5);
    ctx.lineTo(w, h - 0.5);
    ctx.stroke();
  }, [gridW, totalTicks, pixelsPerTick]);

  // ── Draw Grid + Notes ─────────────────────────────────────────────────
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
    const h = GRID_H;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Row backgrounds + horizontal dividers
    for (let row = 0; row < NUM_PADS; row++) {
      const y = row * PAD_ROW_H;
      const padIdx = rowToPadIndex(row);

      // Alternating band
      if (padIdx % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(0, y, w, PAD_ROW_H);
      }

      // Selected pad highlight
      if (DRUM_PADS[padIdx]?.note === selectedPad) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, y, w, PAD_ROW_H);
      }

      // Row divider
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + PAD_ROW_H);
      ctx.lineTo(w, y + PAD_ROW_H);
      ctx.stroke();
    }

    // Alternating bar shading
    const barGroup = alternatingBarGroup(zoom);
    const barGroupTicks = barGroup * beatsPerBar * TICKS_PER_BEAT;
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    const totalBarGroups = Math.ceil(totalTicks / barGroupTicks);
    for (let g = 0; g <= totalBarGroups; g++) {
      if (g % 2 === 0) continue;
      const x1 = g * barGroupTicks * pixelsPerTick;
      const x2 = (g + 1) * barGroupTicks * pixelsPerTick;
      ctx.fillRect(x1, 0, x2 - x1, h);
    }

    // Vertical grid lines: bars + beats
    const totalBeats = Math.ceil(totalTicks / TICKS_PER_BEAT);
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beat * TICKS_PER_BEAT * pixelsPerTick;
      const isBar = beat % beatsPerBar === 0;

      ctx.strokeStyle = isBar
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(255,255,255,0.06)';
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
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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

    // Notes
    const currentEvents = eventsRef.current;
    const trackColor = track?.color ?? '#f97316';

    for (let i = 0; i < currentEvents.length; i++) {
      const ev = currentEvents[i];
      const padIdx = padIndexForNote(ev.note);
      if (padIdx < 0) continue;

      const row = padIndexToRow(padIdx);
      const relTick = ev.startTick - clipStartTick;
      const x = relTick * pixelsPerTick;
      const noteW = Math.max(MIN_NOTE_W, ev.durationTicks * pixelsPerTick);
      const noteY = row * PAD_ROW_H;
      const isSelected = selectedNoteIdx === i;

      const alpha = 0.5 + (ev.velocity / 127) * 0.5;
      ctx.fillStyle = isSelected
        ? trackColor
        : `${trackColor}${Math.round(alpha * 255)
            .toString(16)
            .padStart(2, '0')}`;

      ctx.beginPath();
      ctx.roundRect(x, noteY + 2, noteW, PAD_ROW_H - 4, 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, noteY + 2, noteW, PAD_ROW_H - 4, 2);
        ctx.stroke();
      }
    }
  }, [
    events,
    clipStartTick,
    selectedNoteIdx,
    gridW,
    totalTicks,
    pixelsPerTick,
    gridSize,
    selectedPad,
    track?.color,
  ]);

  // ── Draw Velocity Lane ────────────────────────────────────────────────
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

    // Guide lines at 25%, 50%, 75%
    for (const frac of [0.25, 0.5, 0.75]) {
      const y = h - frac * h;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Top border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(w, 0.5);
    ctx.stroke();

    // Velocity stems + circles
    const currentEvents = eventsRef.current;
    const trackColor = track?.color ?? '#f97316';
    const maxStemH = h - VEL_CIRCLE_R - 4;

    // Draw unselected first, then selected on top
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < currentEvents.length; i++) {
        const isSelected = selectedNoteIdx === i;
        if ((pass === 0 && isSelected) || (pass === 1 && !isSelected)) continue;

        const ev = currentEvents[i];
        const relTick = ev.startTick - clipStartTick;
        const x =
          relTick * pixelsPerTick + (ev.durationTicks * pixelsPerTick) / 2;
        const stemH = (ev.velocity / 127) * maxStemH;
        const circleY = h - stemH - 2;

        const alpha = 0.5 + (ev.velocity / 127) * 0.5;
        const stemColor = isSelected
          ? '#ffffff'
          : `${trackColor}${Math.round(alpha * 255)
              .toString(16)
              .padStart(2, '0')}`;

        // Stem line
        ctx.strokeStyle = stemColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, h - 2);
        ctx.lineTo(x, circleY);
        ctx.stroke();

        // Circle
        ctx.fillStyle = isSelected ? '#ffffff' : trackColor;
        ctx.globalAlpha = isSelected ? 1 : alpha;
        ctx.beginPath();
        ctx.arc(x, circleY, VEL_CIRCLE_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Selected circle outline
        if (isSelected) {
          ctx.strokeStyle = trackColor;
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
    selectedNoteIdx,
    gridW,
    pixelsPerTick,
    velLaneOpen,
    track?.color,
  ]);

  // ── Trigger canvas redraws ────────────────────────────────────────────
  useEffect(() => {
    drawRuler();
  }, [drawRuler]);
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);
  useEffect(() => {
    drawVelLane();
  }, [drawVelLane]);

  // ── Scroll sync ───────────────────────────────────────────────────────
  const handleGridScroll = useCallback(() => {
    const grid = gridScrollRef.current;
    if (!grid) return;
    if (rulerScrollRef.current)
      rulerScrollRef.current.scrollLeft = grid.scrollLeft;
    if (velScrollRef.current) velScrollRef.current.scrollLeft = grid.scrollLeft;
    if (labelScrollRef.current)
      labelScrollRef.current.scrollTop = grid.scrollTop;
  }, []);

  // ── Canvas coords ─────────────────────────────────────────────────────
  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // ── Hit test ──────────────────────────────────────────────────────────
  const hitTestNote = useCallback(
    (cx: number, cy: number): number | null => {
      const currentEvents = eventsRef.current;
      for (let i = currentEvents.length - 1; i >= 0; i--) {
        const ev = currentEvents[i];
        const padIdx = padIndexForNote(ev.note);
        if (padIdx < 0) continue;
        const row = padIndexToRow(padIdx);
        const relTick = ev.startTick - clipStartTick;
        const x = relTick * pixelsPerTick;
        const w = Math.max(MIN_NOTE_W, ev.durationTicks * pixelsPerTick);
        const noteY = row * PAD_ROW_H;

        if (cx >= x && cx <= x + w && cy >= noteY && cy <= noteY + PAD_ROW_H) {
          return i;
        }
      }
      return null;
    },
    [clipStartTick, pixelsPerTick],
  );

  // ── Audition note ─────────────────────────────────────────────────────
  const audition = useCallback(
    (note: number, vel: number) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOn(note, vel);
    },
    [trackId],
  );

  // ── Mouse down (grid canvas) ──────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      if (x < 0 || y < 0) return;

      const row = Math.floor(y / PAD_ROW_H);
      if (row < 0 || row >= NUM_PADS) return;
      const padIdx = rowToPadIndex(row);
      const pad = DRUM_PADS[padIdx];

      const noteIdx = hitTestNote(x, y);
      const currentEvents = eventsRef.current;

      switch (tool) {
        case 'draw': {
          if (noteIdx !== null) {
            setSelectedNoteIdx(noteIdx);
            setSelectedPad(pad.note);
            return;
          }
          setSelectedNoteIdx(null);
          setSelectedPad(pad.note);

          const gridTicks = GRID_VALUES[gridSize];
          const clickTick = x / pixelsPerTick + clipStartTick;
          const snappedTick = snapToGrid(clickTick, gridSize);

          const newNote: MidiNoteEvent = {
            note: pad.note,
            velocity,
            startTick: snappedTick,
            durationTicks: gridTicks,
            channel: 10,
          };
          const newEvents = [...currentEvents, newNote].sort(
            (a, b) => a.startTick - b.startTick,
          );
          onChange(newEvents);
          audition(pad.note, velocity);

          // Track paint position for drag-paint
          paintRef.current = { padIdx, tick: snappedTick };

          const addedIdx = newEvents.findIndex(
            (n) =>
              n.startTick === snappedTick &&
              n.note === pad.note &&
              n.durationTicks === gridTicks,
          );
          setSelectedNoteIdx(addedIdx >= 0 ? addedIdx : null);
          break;
        }

        case 'select': {
          if (noteIdx !== null) {
            setSelectedNoteIdx(noteIdx);
            const ev = currentEvents[noteIdx];
            setSelectedPad(canonicalNote(ev.note));
            const relTick = ev.startTick - clipStartTick;
            const noteX = relTick * pixelsPerTick;
            const noteW = Math.max(
              MIN_NOTE_W,
              ev.durationTicks * pixelsPerTick,
            );
            const nearRightEdge = x >= noteX + noteW - RESIZE_EDGE_PX;

            dragRef.current = {
              noteIndex: noteIdx,
              mode: nearRightEdge ? 'resize' : 'move',
              offsetTick: Math.round((x - noteX) / pixelsPerTick),
              originalPadIndex: padIdx,
              originalNote: { ...ev },
            };
          } else {
            setSelectedNoteIdx(null);
            setSelectedPad(pad.note);
          }
          break;
        }

        case 'erase': {
          if (noteIdx !== null) {
            const newEvents = currentEvents.filter((_, i) => i !== noteIdx);
            onChange(newEvents);
            setSelectedNoteIdx(null);
          }
          paintRef.current = { padIdx, tick: -1 }; // enable drag-erase
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
      audition,
    ],
  );

  // ── Mouse move (grid canvas) ──────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      const { x, y } = getCanvasCoords(e);
      const canvas = gridCanvasRef.current;

      // No active drag — just update cursor
      if (!drag && !paintRef.current) {
        if (!canvas) return;
        switch (tool) {
          case 'draw':
            canvas.style.cursor = PENCIL_CURSOR;
            break;
          case 'erase':
            canvas.style.cursor = ERASER_CURSOR;
            break;
          case 'select': {
            const noteIdx = hitTestNote(x, y);
            if (noteIdx !== null) {
              const ev = eventsRef.current[noteIdx];
              const relTick = ev.startTick - clipStartTick;
              const noteX = relTick * pixelsPerTick;
              const noteW = Math.max(
                MIN_NOTE_W,
                ev.durationTicks * pixelsPerTick,
              );
              canvas.style.cursor =
                x >= noteX + noteW - RESIZE_EDGE_PX ? 'col-resize' : 'grab';
            } else {
              canvas.style.cursor = 'default';
            }
            break;
          }
        }
        return;
      }

      // Paint mode (draw tool drag)
      if (paintRef.current && tool === 'draw') {
        const row = Math.floor(y / PAD_ROW_H);
        if (row < 0 || row >= NUM_PADS) return;
        const padIdx = rowToPadIndex(row);
        const pad = DRUM_PADS[padIdx];
        const gridTicks = GRID_VALUES[gridSize];
        const clickTick = x / pixelsPerTick + clipStartTick;
        const snappedTick = snapToGrid(clickTick, gridSize);

        if (
          paintRef.current.padIdx !== padIdx ||
          paintRef.current.tick !== snappedTick
        ) {
          // Check if a note already exists at this position
          const currentEvents = eventsRef.current;
          const exists = currentEvents.some(
            (ev) =>
              canonicalNote(ev.note) === pad.note &&
              ev.startTick === snappedTick,
          );
          if (!exists) {
            const newNote: MidiNoteEvent = {
              note: pad.note,
              velocity,
              startTick: snappedTick,
              durationTicks: gridTicks,
              channel: 10,
            };
            onChange(
              [...currentEvents, newNote].sort(
                (a, b) => a.startTick - b.startTick,
              ),
            );
            audition(pad.note, velocity);
          }
          paintRef.current = { padIdx, tick: snappedTick };
        }
        return;
      }

      // Paint-erase mode (erase tool drag)
      if (paintRef.current && tool === 'erase') {
        const noteIdx = hitTestNote(x, y);
        if (noteIdx !== null) {
          const currentEvents = eventsRef.current;
          onChange(currentEvents.filter((_, i) => i !== noteIdx));
        }
        return;
      }

      // Select tool drag
      if (drag) {
        const currentEvents = [...eventsRef.current];

        if (drag.mode === 'move') {
          const rawTick = x / pixelsPerTick + clipStartTick - drag.offsetTick;
          const snappedTick = snapToGrid(rawTick, gridSize);

          const row = Math.floor(y / PAD_ROW_H);
          const clampedRow = Math.max(0, Math.min(NUM_PADS - 1, row));
          const newPadIdx = rowToPadIndex(clampedRow);
          const newPad = DRUM_PADS[newPadIdx];

          currentEvents[drag.noteIndex] = {
            ...currentEvents[drag.noteIndex],
            startTick: Math.max(0, snappedTick),
            note: newPad.note,
          };
        } else if (drag.mode === 'resize') {
          const endTick = x / pixelsPerTick + clipStartTick;
          const snappedEnd = snapToGrid(endTick, gridSize);
          const ev = currentEvents[drag.noteIndex];
          const newDuration = Math.max(
            GRID_VALUES[gridSize],
            snappedEnd - ev.startTick,
          );
          currentEvents[drag.noteIndex] = { ...ev, durationTicks: newDuration };
        }

        onChange(currentEvents);
      }
    },
    [
      tool,
      getCanvasCoords,
      hitTestNote,
      clipStartTick,
      pixelsPerTick,
      gridSize,
      onChange,
      velocity,
      audition,
    ],
  );

  // ── Mouse up ──────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    paintRef.current = null;
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
      if (dragRef.current || paintRef.current) handleMouseUp();
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [handleMouseUp]);

  // ── Velocity lane mouse handler ───────────────────────────────────────
  const velDragRef = useRef<boolean>(false);
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
        setSelectedNoteIdx(targetIdx);
        velDragRef.current = true;

        const newVel = Math.max(
          1,
          Math.min(127, Math.round(((h - 2 - my) / maxStemH) * 127)),
        );
        const updated = [...currentEvents];
        updated[targetIdx] = { ...updated[targetIdx], velocity: newVel };
        onChange(updated);
      }
    },
    [clipStartTick, pixelsPerTick, onChange],
  );

  const handleVelMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!velDragRef.current || selectedNoteIdx === null) return;
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
      currentEvents[selectedNoteIdx] = {
        ...currentEvents[selectedNoteIdx],
        velocity: newVel,
      };
      onChange(currentEvents);
    },
    [selectedNoteIdx, onChange],
  );

  const handleVelMouseUp = useCallback(() => {
    velDragRef.current = false;
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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

      if (
        (e.code === 'Delete' || e.code === 'Backspace') &&
        selectedNoteIdx !== null
      ) {
        e.preventDefault();
        e.stopPropagation();
        const newEvents = eventsRef.current.filter(
          (_, i) => i !== selectedNoteIdx,
        );
        onChange(newEvents);
        setSelectedNoteIdx(null);
      }
    },
    [selectedNoteIdx, onChange],
  );

  // ── Wheel zoom ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = gridScrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
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
  }, [zoom, pixelsPerTick, MIN_ZOOM]);

  // ── Playhead position ─────────────────────────────────────────────────
  const playheadPx = useMemo(() => {
    if (!isPlaying) return -1;
    const relTick = position - clipStartTick;
    return relTick * pixelsPerTick;
  }, [isPlaying, position, clipStartTick, pixelsPerTick]);

  const currentKitLabel =
    DRUM_KITS.find((k) => k.id === currentKit)?.label ?? currentKit;

  if (!track) return null;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 shrink-0"
        style={{
          height: TOOLBAR_H,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Label + Kit selector */}
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Drums
        </span>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {loading && (
              <Loader2
                size={10}
                className="animate-spin"
                style={{ color: 'var(--color-text-dim)' }}
              />
            )}
            {currentKitLabel}
            <ChevronDown size={10} style={{ color: 'var(--color-text-dim)' }} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-30"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                minWidth: 140,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {DRUM_KITS.map((kit) => (
                <button
                  key={kit.id}
                  onClick={() => handleKitChange(kit.id)}
                  className="block w-full text-left px-3 py-1.5 text-[11px] cursor-pointer transition-colors"
                  style={{
                    backgroundColor:
                      kit.id === currentKit
                        ? 'var(--color-surface-2)'
                        : 'transparent',
                    color:
                      kit.id === currentKit
                        ? 'var(--color-text)'
                        : 'var(--color-text-dim)',
                    fontWeight: kit.id === currentKit ? 600 : 400,
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (kit.id !== currentKit)
                      e.currentTarget.style.backgroundColor =
                        'var(--color-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (kit.id !== currentKit)
                      e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {kit.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10" />

        {/* Tool buttons */}
        <div className="flex gap-0.5">
          {(
            [
              {
                id: 'select' as Tool,
                icon: <MousePointer2 className="w-3.5 h-3.5" />,
                label: 'Select',
                shortcut: 'V',
              },
              {
                id: 'draw' as Tool,
                icon: <Pencil className="w-3.5 h-3.5" />,
                label: 'Draw',
                shortcut: 'D',
              },
              {
                id: 'erase' as Tool,
                icon: <Eraser className="w-3.5 h-3.5" />,
                label: 'Erase',
                shortcut: 'E',
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`flex items-center gap-1 h-6 px-2 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                tool === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
              style={{ border: 'none' }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10" />

        {/* Grid dropdown */}
        <label
          className="flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Grid
          <select
            value={gridSize}
            onChange={(e) => setGridSize(e.target.value as GridSize)}
            className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs outline-none"
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
          className="px-2 py-0.5 text-xs rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          style={{ color: 'var(--color-text)' }}
        >
          Quantize
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10" />

        {/* Velocity slider */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/30 font-semibold uppercase">
            {selectedNoteIdx !== null ? 'Sel Vel' : 'Vel'}
          </span>
          <input
            type="range"
            min={1}
            max={127}
            value={
              selectedNoteIdx !== null
                ? (eventsRef.current[selectedNoteIdx]?.velocity ?? velocity)
                : velocity
            }
            onChange={(e) => {
              const val = Number(e.target.value);
              if (selectedNoteIdx !== null) {
                const updated = [...eventsRef.current];
                updated[selectedNoteIdx] = {
                  ...updated[selectedNoteIdx],
                  velocity: Math.max(1, Math.min(127, val)),
                };
                onChange(updated);
              } else {
                setVelocity(val);
              }
            }}
            className="w-16 h-1 accent-white/50"
          />
          <span className="text-[10px] font-mono text-white/40 w-6 text-right">
            {selectedNoteIdx !== null
              ? (eventsRef.current[selectedNoteIdx]?.velocity ?? velocity)
              : velocity}
          </span>
        </div>

        {/* Spacer + meta */}
        <div className="flex-1" />

        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          {events.length} notes
        </span>
        <span
          className="text-[10px] font-mono"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider cursor-pointer transition-colors"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: 'var(--color-text-dim)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')
          }
        >
          <Trash2 size={10} />
          Clear
        </button>
      </div>

      {/* ── Editor body ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Grid area: labels + ruler + grid (scrolls vertically) */}
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Left column: corner spacer + pad labels */}
          <div className="shrink-0 flex flex-col" style={{ width: LABEL_W }}>
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
            {/* Pad labels — reversed so Kick is at bottom, scrolls with grid */}
            <div
              ref={labelScrollRef}
              className="flex flex-col overflow-y-auto"
              style={{
                flex: 1,
                borderRight: '1px solid var(--color-border)',
                scrollbarWidth: 'none',
              }}
            >
              {[...DRUM_PADS].reverse().map((pad) => (
                <DrumRowLabel
                  key={pad.note}
                  pad={pad}
                  selected={selectedPad === pad.note}
                  onSelect={() => setSelectedPad(pad.note)}
                  onTrigger={() => handlePadTrigger(pad.note)}
                  volume={track.drumPads?.[pad.note]?.volume ?? 0.8}
                  pan={
                    track.drumPads?.[pad.note]?.pan ??
                    DRUM_KIT_CONFIGS.find((c) => c.id === currentKit)
                      ?.defaultPan?.[pad.note] ??
                    0
                  }
                  onVolumeChange={(v) =>
                    updateDrumPad(trackId, pad.note, { volume: v })
                  }
                  onPanChange={(v) =>
                    updateDrumPad(trackId, pad.note, { pan: v })
                  }
                />
              ))}
            </div>
          </div>

          {/* Right column: ruler + grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Ruler */}
            <div
              ref={rulerScrollRef}
              style={{
                height: RULER_H,
                flexShrink: 0,
                overflowX: 'hidden',
                overflowY: 'hidden',
              }}
            >
              <canvas ref={rulerCanvasRef} className="block" />
            </div>

            {/* Grid — scroll master (scrolls both X and Y) */}
            <div
              ref={gridScrollRef}
              className="flex-1 overflow-auto relative"
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

              {/* CSS Playhead */}
              {isPlaying && playheadPx >= 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 1,
                    height: GRID_H,
                    backgroundColor: '#ef4444',
                    transform: `translateX(${playheadPx}px)`,
                    willChange: 'transform',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Velocity lane — always below grid, never overlaps */}
        <div className="shrink-0" style={{ marginLeft: LABEL_W }}>
          <button
            onClick={() => setVelLaneOpen((o) => !o)}
            className="flex items-center gap-1 w-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider cursor-pointer"
            style={{
              color: 'var(--color-text-dim)',
              background: 'none',
              border: 'none',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            {velLaneOpen ? (
              <ChevronDown size={10} />
            ) : (
              <ChevronRight size={10} />
            )}
            Velocity
          </button>
          <AnimatePresence>
            {velLaneOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: VEL_LANE_H }}
                exit={{ height: 0 }}
                transition={SPRING}
                className="overflow-hidden"
              >
                <div
                  ref={velScrollRef}
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

      {/* ── Collapsible Sample Editor ────────────────────────────── */}
      <div
        className="shrink-0 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={() => setSampleEditorOpen((o) => !o)}
          className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider cursor-pointer"
          style={{
            color: 'var(--color-text-dim)',
            background: 'none',
            border: 'none',
          }}
        >
          {sampleEditorOpen ? (
            <ChevronDown size={10} />
          ) : (
            <ChevronRight size={10} />
          )}
          Sample
          <span
            className="font-normal normal-case"
            style={{ color: 'var(--color-text-dim)', opacity: 0.6 }}
          >
            — {DRUM_PADS.find((p) => p.note === selectedPad)?.label ?? 'Kick'}
          </span>
        </button>
        <AnimatePresence>
          {sampleEditorOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 80 }}
              exit={{ height: 0 }}
              transition={SPRING}
              className="overflow-hidden"
            >
              <SampleWaveformPreview padNote={selectedPad} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── DrumRowLabel ─────────────────────────────────────────────────────────

interface DrumRowLabelProps {
  pad: (typeof DRUM_PADS)[number];
  selected: boolean;
  onSelect: () => void;
  onTrigger: () => void;
  volume: number;
  pan: number;
  onVolumeChange: (v: number) => void;
  onPanChange: (v: number) => void;
}

function DrumRowLabel({
  pad,
  selected,
  onSelect,
  onTrigger,
  volume,
  pan,
  onVolumeChange,
  onPanChange,
}: DrumRowLabelProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 shrink-0 cursor-pointer"
      style={{
        height: PAD_ROW_H,
        backgroundColor: selected ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
      onClick={onSelect}
    >
      {/* Pad trigger */}
      <button
        onMouseDown={(e) => {
          e.stopPropagation();
          onTrigger();
        }}
        className="shrink-0 rounded transition-colors active:scale-90"
        style={{
          width: 16,
          height: 16,
          backgroundColor: selected
            ? 'var(--color-accent)'
            : 'rgba(255,255,255,0.08)',
          border: 'none',
          cursor: 'pointer',
        }}
        title={`Trigger ${pad.label}`}
      />

      {/* Name */}
      <span
        className="text-[9px] font-medium truncate"
        style={{
          color: selected ? 'var(--color-text)' : 'var(--color-text-dim)',
          width: 42,
          flexShrink: 0,
        }}
      >
        {pad.shortLabel}
      </span>

      {/* Pan knob (mini) */}
      <MiniKnob
        value={pan}
        min={-1}
        max={1}
        onChange={onPanChange}
        label="P"
        isBipolar
      />

      {/* Volume knob (mini) */}
      <MiniKnob
        value={volume}
        min={0}
        max={1}
        onChange={onVolumeChange}
        label="V"
      />
    </div>
  );
}

// ── MiniKnob ────────────────────────────────────────────────────────────

interface MiniKnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  isBipolar?: boolean;
}

function MiniKnob({
  value,
  min,
  max,
  onChange,
  label,
  isBipolar,
}: MiniKnobProps) {
  const dragRef = useRef<{ startY: number; startVal: number } | null>(null);
  const SIZE = 18;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = 6;

  const t = (value - min) / (max - min);
  const ARC_RANGE = 270;
  const START_ANGLE = -135;
  const angle = START_ANGLE + t * ARC_RANGE;
  const rad = ((angle - 90) * Math.PI) / 180;
  const ix = cx + Math.cos(rad) * r;
  const iy = cy + Math.sin(rad) * r;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startVal: value };
    },
    [value],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.startY - e.clientY;
      const startT = (dragRef.current.startVal - min) / (max - min);
      const newT = Math.min(1, Math.max(0, startT + dy / 100));
      onChange(min + newT * (max - min));
    },
    [min, max, onChange],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(isBipolar ? 0 : 0.8);
    },
    [onChange, isBipolar],
  );

  return (
    <svg
      width={SIZE}
      height={SIZE}
      className="cursor-ns-resize select-none shrink-0"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <title>
        {label}: {value.toFixed(2)}
      </title>
      <circle
        cx={cx}
        cy={cy}
        r={r + 1}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={0.5}
      />
      <line
        x1={cx}
        y1={cy}
        x2={ix}
        y2={iy}
        stroke="var(--color-text)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Sample Waveform Preview ─────────────────────────────────────────────

function SampleWaveformPreview({ padNote }: { padNote: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padDef = DRUM_PADS.find((p) => p.note === padNote);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const env = Math.exp(-t * 6);
      const noise =
        Math.sin(t * 80) * 0.5 +
        Math.sin(t * 200) * 0.3 +
        Math.sin(t * 40) * 0.2;
      const amp = env * noise * (h / 2) * 0.8;
      ctx.lineTo(x, h / 2 - amp);
    }
    for (let x = w - 1; x >= 0; x--) {
      const t = x / w;
      const env = Math.exp(-t * 6);
      const noise =
        Math.sin(t * 80) * 0.5 +
        Math.sin(t * 200) * 0.3 +
        Math.sin(t * 40) * 0.2;
      const amp = env * noise * (h / 2) * 0.8;
      ctx.lineTo(x, h / 2 + amp);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(padDef?.label ?? 'Sample', 8, 14);
  }, [padNote, padDef]);

  return (
    <div className="px-3 pb-2" style={{ height: 72 }}>
      <canvas
        ref={canvasRef}
        className="w-full rounded"
        style={{
          height: 64,
          border: '1px solid var(--color-border)',
        }}
      />
    </div>
  );
}
