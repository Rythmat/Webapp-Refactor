/* eslint-disable react-hooks/exhaustive-deps, sonarjs/cognitive-complexity, tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/components/utilities';
import { DRUMS_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap } from '@/daw/commands/registry';
import { useStore, type Track } from '@/daw/store';
import { usePlayheadEffect } from '@/daw/engine/playheadClock';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import {
  DrumMachineEngine,
  DRUM_KITS,
  DRUM_KIT_CONFIGS,
  DRUM_PADS,
  canonicalPadNote,
  type DrumKitId,
} from '@/daw/instruments/DrumMachineEngine';
import type { MidiNoteEvent } from '@prism/engine';
import { GRID_VALUES, type GridSize } from '@/daw/utils/quantize';
import { alternatingBarGroup } from '@/daw/utils/timelineScale';
import { noteEditorOriginTick } from '@/daw/audio/noteEditorOrigin';
import { midiClipLength } from '@/daw/components/Timeline/midiClipCuts';
import {
  generateBars,
  generateDrumPattern,
} from '@/daw/drums/generateDrumPattern';
import { grooveInPattern } from '@/daw/drums/addGrooveClip';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { resolveEditorClip } from '@/daw/model/editorClip';
import {
  barStartTick,
  feltBeatTicks,
  gridStepTicks,
  snapTicks,
  ticksPerBar,
  ticksPerBeat,
  timeSignatureOf,
} from '@/daw/time/timeModel';
import { rollBeatLines } from '../PianoRoll/rollGrid';
import {
  ControlGestureContext,
  useContinuousControl,
  useControlGesture,
} from '@/daw/hooks/useContinuousControl';
import { previewTrack } from '@/daw/engine/trackReconciler';
import { withTransaction } from '@/daw/store/history';
import { getDawPalette } from '@/daw/ui/tokens';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

type DrumPads = NonNullable<Track['drumPads']>;

// ── Types ─────────────────────────────────────────────────────────────────

// A drag operates on the whole current selection. `originals` snapshots every
// selected note at grab time (keyed by index); `anchorIndex` is the grabbed one.
interface NoteDrag {
  mode: 'move' | 'resize';
  anchorIndex: number;
  grabTickOffset: number;
  originals: Map<number, MidiNoteEvent>;
}

// Marquee (rubber-band) selection rectangle, in grid-canvas content coords.
interface MarqueeRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const LABEL_W = 140;
const PAD_ROW_H = 28;
const RULER_H = 24;
const BAR_H = 40; // px for the bar under the grid, as the piano roll's
const NUM_PADS = DRUM_PADS.length; // 11
const GRID_H = PAD_ROW_H * NUM_PADS;
const VEL_LANE_H = 60;
const VEL_CIRCLE_R = 4;
const VEL_CIRCLE_HIT_R = 7;
const TICKS_PER_BEAT = 480;
const MIN_NOTE_W = 3;
const RESIZE_EDGE_PX = 6;
const SPRING = { type: 'spring' as const, stiffness: 350, damping: 30 };
// Dragging vertically on the bar-number ruler scales the editor (horizontal
// zoom, up = in). Horizontal movement is ignored — there is no drag-to-pan.
const RULER_DRAG_THRESHOLD = 3; // px before a ruler press becomes a zoom drag
const RULER_ZOOM_SENSITIVITY = 0.01; // zoom delta per px of vertical movement

/**
 * Whether a press at `x` takes a hit's right edge (a resize) rather than the
 * hit (a move). A hit too narrow to hold both is only ever moved: a sixteenth
 * at a zoomed-out view is a few pixels, all of them edge.
 */
function onResizeEdge(x: number, noteX: number, noteW: number): boolean {
  return noteW >= 3 * RESIZE_EDGE_PX && x >= noteX + noteW - RESIZE_EDGE_PX;
}

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

/** Find DRUM_PADS index for a MIDI note */
function padIndexForNote(note: number): number {
  const cn = canonicalPadNote(note);
  return DRUM_PADS.findIndex((p) => p.note === cn);
}

// ── Theme colors ──────────────────────────────────────────────────────────

function getThemeColors() {
  const palette = getDawPalette();
  return {
    bg: palette.bg,
    border: palette.hairline,
    textDim: palette.text3,
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
  const setDrumKit = useStore((s) => s.setDrumKit);

  // The pads' mix knobs: the kit follows a drag through the track's engine,
  // and the release saves the pads it changed, as one undo step.
  const padMix = useContinuousControl<DrumPads | undefined>({
    value: track?.drumPads,
    preview: (drumPads) => previewTrack(trackId, { drumPads }),
    commit: (next, start) => {
      if (!next) return;
      for (const [note, pad] of Object.entries(next)) {
        if (pad !== start?.[Number(note)]) {
          updateDrumPad(trackId, Number(note), pad);
        }
      }
    },
    label: 'Change drum mix',
  });
  const padMixRef = useRef(padMix.value);
  padMixRef.current = padMix.value;
  const changePadMix = padMix.change;
  const setPadMix = useCallback(
    (note: number, params: Partial<DrumPads[number]>) => {
      const current = padMixRef.current;
      const prev = current?.[note] ?? { volume: 0.8, pan: 0 };
      const next = { ...current, [note]: { ...prev, ...params } };
      padMixRef.current = next;
      changePadMix(next);
    },
    [changePadMix],
  );
  const padGesture = useMemo(
    () => ({ begin: padMix.begin, end: padMix.end }),
    [padMix.begin, padMix.end],
  );
  const updateMidiClipEvents = useStore((s) => s.updateMidiClipEvents);
  const updateMidiClip = useStore((s) => s.updateMidiClip);
  const addMidiClip = useStore((s) => s.addMidiClip);
  const isPlaying = useStore((s) => s.isPlaying);

  // The project's metre: bars and beats come from it, never from 4/4.
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  const ts = useMemo(
    () => ({ numerator: tsNum, denominator: tsDen }),
    [tsNum, tsDen],
  );
  const barTicks = ticksPerBar(ts);

  // The clip every note editor on this track edits (editorClip.ts): the
  // selected one, the one under the playhead, or the first. It used to be
  // the first always, so a second groove was edited blind
  // (dock-instruments-03).
  const clip = useStore((s) => resolveEditorClip(s, trackId)) ?? undefined;
  const committedEvents = useMemo(() => clip?.events ?? [], [clip?.events]);
  // A drag on the grid or the velocity lane (hits painted or erased, notes
  // moved or resized, velocities drawn) edits a draft the view draws from,
  // and is written once, on release (dock-instruments-13).
  const [draft, setDraft] = useState<MidiNoteEvent[] | null>(null);
  const draftRef = useRef<MidiNoteEvent[] | null>(null);
  const events = draft ?? committedEvents;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const editDraft = useCallback((next: MidiNoteEvent[]) => {
    draftRef.current = next;
    eventsRef.current = next;
    setDraft(next);
  }, []);
  // Events are clip-relative (playback adds clip.startTick), so the grid starts
  // at the clip's own tick 0 and new hits are stored relative to it. Only the
  // playhead, which runs in song ticks, needs where the clip sits in the song.
  const originTick = noteEditorOriginTick(events, barTicks);
  // A track with no clips draws from the playhead's bar, where its first hit
  // makes the clip.
  const blankStartTick = useStore((s) =>
    barStartTick(s.position, timeSignatureOf(s)),
  );
  const clipStart = clip?.startTick ?? blankStartTick;
  const songOffset = clipStart + originTick;

  // Kit selection lives in the store (persisted + collab-synced)
  const currentKit: DrumKitId = track?.drumKit ?? 'natural';

  // ── Local state ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [selectedPad, setSelectedPad] = useState<number>(36);
  const [velLaneOpen, setVelLaneOpen] = useState(false);

  const [gridSize, setGridSize] = useState<GridSize>('1/16');
  const [velocity, setVelocity] = useState(100);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set(),
  );
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [zoom, setZoom] = useState(1);
  const MAX_ZOOM = 6;

  const selectSingle = useCallback((i: number | null) => {
    setSelectedIndices(i === null ? new Set() : new Set([i]));
  }, []);
  // The selection is indices into the clip's notes: let it go when the grid
  // moves to another clip, or it would pick the same places in that one.
  const clipKey = clip?.id ?? null;
  useEffect(() => {
    setSelectedIndices(new Set());
  }, [clipKey]);

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
  // A box drawn from `origin`. Shift or ⌘ adds to `base`, the selection it
  // started from; a click on a hit with no drag adds or takes it away.
  const marqueeRef = useRef<{
    originX: number;
    originY: number;
    moved: boolean;
    base: Set<number>;
    clickNote: number | null;
  } | null>(null);
  const initialZoomSet = useRef(false);
  // Active ruler scale drag (vertical → horizontal zoom).
  const rulerDragRef = useRef<{
    startY: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  // Live mirrors of zoom + its lower bound for the window-level ruler drag.
  const zoomRef = useRef(1);
  const minZoomRef = useRef(0.15);

  // ── Computed layout ───────────────────────────────────────────────────
  const MIN_TICKS = barTicks * 4;
  const maxTick = events.reduce(
    (max, e) => Math.max(max, e.startTick + e.durationTicks),
    originTick + MIN_TICKS,
  );
  const totalTicks = maxTick - originTick + barTicks;
  // The grid's step and snapping are the song's, counted from its bar lines
  // (as in the piano roll), never left of the grid's edge.
  const gridStep = gridStepTicks(gridSize, ts);
  const snapClipTick = useCallback(
    (clipTick: number) =>
      Math.max(
        originTick,
        snapTicks(clipTick + clipStart, { enabled: true, step: gridStep, ts }) -
          clipStart,
      ),
    [originTick, clipStart, gridStep, ts],
  );

  const containerW = gridScrollRef.current?.clientWidth ?? 600;
  const MIN_ZOOM = Math.max(
    0.15,
    containerW / ((totalTicks * 40) / TICKS_PER_BEAT),
  );
  zoomRef.current = zoom;
  minZoomRef.current = MIN_ZOOM;
  const pixelsPerTick = (40 * zoom) / TICKS_PER_BEAT;
  const gridW = totalTicks * pixelsPerTick;

  // ── Fit 4 bars to container on mount ─────────────────────────────────
  useEffect(() => {
    if (initialZoomSet.current) return;
    const container = gridScrollRef.current;
    if (!container) return;
    const fourBarPx = ((4 * barTicks) / TICKS_PER_BEAT) * 40;
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
          startTick: blankStartTick,
          events: newEvents,
        });
      }
    },
    [clip, trackId, blankStartTick, updateMidiClipEvents, addMidiClip],
  );
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const commitDraft = useCallback(() => {
    const next = draftRef.current;
    if (!next) return;
    draftRef.current = null;
    setDraft(null);
    withTransaction('Edit drums', () => onChangeRef.current(next));
  }, []);
  // Unmounted mid-drag: keep what the drag reached.
  useEffect(() => commitDraft, [commitDraft]);

  // ── Kit management ────────────────────────────────────────────────────
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
      setDrumKit(trackId, kitId);
      // setDrumKit no-ops while a collaborator holds the track lock
      const took =
        useStore.getState().tracks.find((t) => t.id === trackId)?.drumKit ===
        kitId;
      if (!took) return;
      // Apply to the engine directly for immediate feedback; the playback
      // engine's store sync also calls setKit, which dedupes in-flight loads.
      const state = trackEngineRegistry.get(trackId);
      if (!(state?.instrument instanceof DrumMachineEngine)) return;
      setLoading(true);
      try {
        await state.instrument.setKit(kitId);
      } catch (err) {
        console.error('[DrumMachineView] Failed to load kit:', err);
      } finally {
        setLoading(false);
      }
    },
    [trackId, setDrumKit],
  );

  const handleClear = useCallback(() => {
    if (clip) updateMidiClipEvents(trackId, clip.id, []);
    selectSingle(null);
  }, [clip, trackId, updateMidiClipEvents, selectSingle]);

  // Generate (owner, 2026-10-22, after Soundtrap's drum editor): a fresh
  // groove in the kit's style over the whole pattern, as long as the clip
  // (two bars when there is none yet), as one undo step. Another press,
  // another groove.
  const handleGenerate = useCallback(() => {
    const bars = generateBars(clip ? midiClipLength(clip) : 0, barTicks);
    const next = generateDrumPattern({
      bars,
      barTicks,
      beatTicks: feltBeatTicks(ts),
      kit: currentKit,
    });
    withTransaction('Generate drums', () => {
      // A groove's name goes with its hits: the menu stops marking it.
      if (clip && grooveInPattern(clip.name, GROOVES)) {
        updateMidiClip(trackId, clip.id, { name: 'Drum Pattern' });
      }
      onChange(next);
    });
    selectSingle(null);
  }, [
    clip,
    barTicks,
    ts,
    currentKit,
    trackId,
    updateMidiClip,
    onChange,
    selectSingle,
  ]);

  const handlePadTrigger = useCallback(
    (note: number) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOn(note, 100);
    },
    [trackId],
  );

  // On the song's grid, as painting and dragging snap.
  const handleQuantize = useCallback(() => {
    onChange(
      eventsRef.current.map((ev) => ({
        ...ev,
        startTick: snapClipTick(ev.startTick),
      })),
    );
  }, [snapClipTick, onChange]);

  // ── Draw Ruler ────────────────────────────────────────────────────────
  const drawRuler = useCallback(() => {
    const canvas = rulerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = getThemeColors();
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

    // The song's bars and beats, wherever the clip starts.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const line of rollBeatLines(songOffset, pixelsPerTick, 0, w, ts)) {
      const { x, bar: isBar } = line;

      ctx.strokeStyle = isBar
        ? 'rgba(255,255,255,0.15)'
        : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, isBar ? 0 : h * 0.5);
      ctx.lineTo(x, h);
      ctx.stroke();

      const bar = line.barNumber;
      const beatInBar = line.beatInBar;
      ctx.fillStyle = colors.textDim;
      ctx.font = isBar
        ? "10px 'Glacial Indifference', system-ui, sans-serif"
        : "9px 'Glacial Indifference', system-ui, sans-serif";
      const label = isBar ? String(bar) : `${bar}.${beatInBar + 1}`;
      ctx.fillText(label, x + 4, h / 2);
    }

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5);
    ctx.lineTo(w, h - 0.5);
    ctx.stroke();
  }, [gridW, totalTicks, pixelsPerTick, songOffset, ts]);

  // ── Draw Grid + Notes ─────────────────────────────────────────────────
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = gridScrollRef.current;
    if (!container) return;

    const colors = getThemeColors();
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

    // Alternating bar shading, by the song's bars
    const barGroup = alternatingBarGroup(zoom);
    const barGroupTicks = barGroup * barTicks;
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    const lastGroup = Math.ceil((songOffset + totalTicks) / barGroupTicks);
    for (let g = Math.floor(songOffset / barGroupTicks); g <= lastGroup; g++) {
      if (g % 2 === 0) continue;
      const x1 = (g * barGroupTicks - songOffset) * pixelsPerTick;
      const x2 = ((g + 1) * barGroupTicks - songOffset) * pixelsPerTick;
      ctx.fillRect(x1, 0, x2 - x1, h);
    }

    // Vertical grid lines: the song's bars + beats
    for (const line of rollBeatLines(songOffset, pixelsPerTick, 0, w, ts)) {
      const { x, bar: isBar } = line;

      ctx.strokeStyle = isBar
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = isBar ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Sub-grid lines, on the song's grid like the beats
    const beatTicks = ticksPerBeat(ts);
    if (gridStep < beatTicks) {
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      const lastTick = songOffset + totalTicks;
      for (
        let tick = Math.ceil(songOffset / gridStep) * gridStep;
        tick <= lastTick;
        tick += gridStep
      ) {
        if (tick % beatTicks === 0) continue;
        const x = (tick - songOffset) * pixelsPerTick;
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
      const relTick = ev.startTick - originTick;
      const x = relTick * pixelsPerTick;
      const noteW = Math.max(MIN_NOTE_W, ev.durationTicks * pixelsPerTick);
      const noteY = row * PAD_ROW_H;
      const isSelected = selectedIndices.has(i);

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
    originTick,
    selectedIndices,
    marqueeRect,
    gridW,
    totalTicks,
    pixelsPerTick,
    gridStep,
    ts,
    songOffset,
    selectedPad,
    track?.color,
  ]);

  // ── Draw Velocity Lane ────────────────────────────────────────────────
  const drawVelLane = useCallback(() => {
    const canvas = velCanvasRef.current;
    if (!canvas || !velLaneOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = getThemeColors();
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
        const isSelected = selectedIndices.has(i);
        if ((pass === 0 && isSelected) || (pass === 1 && !isSelected)) continue;

        const ev = currentEvents[i];
        const relTick = ev.startTick - originTick;
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
    originTick,
    selectedIndices,
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
        const relTick = ev.startTick - originTick;
        const x = relTick * pixelsPerTick;
        const w = Math.max(MIN_NOTE_W, ev.durationTicks * pixelsPerTick);
        const noteY = row * PAD_ROW_H;

        if (cx >= x && cx <= x + w && cy >= noteY && cy <= noteY + PAD_ROW_H) {
          return i;
        }
      }
      return null;
    },
    [originTick, pixelsPerTick],
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
  // One way to edit, as the piano roll (owner, 2026-10-22: no Select, Draw
  // and Erase tools): a press on a hit takes it (its right edge resizes it),
  // on empty space draws a box. Double-click adds or removes a hit
  // (handleDoubleClick).
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      if (x < 0 || y < 0) return;

      const row = Math.floor(y / PAD_ROW_H);
      if (row < 0 || row >= NUM_PADS) return;
      const pad = DRUM_PADS[rowToPadIndex(row)];

      const noteIdx = hitTestNote(x, y);
      const currentEvents = eventsRef.current;

      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        // Shift or ⌘: a box from anywhere — over hits too, so a busy
        // pattern can be boxed — adds to the selection; a click without a
        // drag adds or takes away the one hit.
        marqueeRef.current = {
          originX: x,
          originY: y,
          moved: false,
          base: new Set(selectedIndices),
          clickNote: noteIdx,
        };
        setMarqueeRect(null);
      } else if (noteIdx !== null) {
        // Drag the whole selection if the grabbed hit is part of an
        // existing multi-selection; otherwise grab just this hit.
        let indices: Set<number>;
        if (selectedIndices.has(noteIdx) && selectedIndices.size > 1) {
          indices = selectedIndices;
        } else {
          indices = new Set([noteIdx]);
          setSelectedIndices(indices);
        }

        const ev = currentEvents[noteIdx];
        setSelectedPad(canonicalPadNote(ev.note));
        const relTick = ev.startTick - originTick;
        const noteX = relTick * pixelsPerTick;
        const noteW = Math.max(MIN_NOTE_W, ev.durationTicks * pixelsPerTick);
        const nearRightEdge = onResizeEdge(x, noteX, noteW);
        audition(ev.note, ev.velocity);

        const originals = new Map<number, MidiNoteEvent>();
        for (const i of indices) originals.set(i, { ...currentEvents[i] });

        dragRef.current = {
          mode: nearRightEdge ? 'resize' : 'move',
          anchorIndex: noteIdx,
          grabTickOffset: Math.round((x - noteX) / pixelsPerTick),
          originals,
        };
      } else {
        // Empty space: start a box. The selection goes now, so a plain
        // click deselects, while a drag rebuilds it live in mouse-move.
        setSelectedIndices(new Set());
        setSelectedPad(pad.note);
        marqueeRef.current = {
          originX: x,
          originY: y,
          moved: false,
          base: new Set(),
          clickNote: null,
        };
        setMarqueeRect(null);
      }
    },
    [
      getCanvasCoords,
      hitTestNote,
      originTick,
      pixelsPerTick,
      audition,
      selectedIndices,
    ],
  );

  // ── Double-click: add a hit, or take one away ─────────────────────────
  // On empty space a hit goes in there, on the grid, a grid step long, at
  // the velocity set in the bar; on a hit, the hit goes. Each is one undo
  // step.
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      if (x < 0 || y < 0) return;
      dragRef.current = null;
      marqueeRef.current = null;
      setMarqueeRect(null);
      const currentEvents = eventsRef.current;
      const noteIdx = hitTestNote(x, y);
      if (noteIdx !== null) {
        onChange(currentEvents.filter((_, i) => i !== noteIdx));
        selectSingle(null);
        return;
      }
      const row = Math.floor(y / PAD_ROW_H);
      if (row < 0 || row >= NUM_PADS) return;
      const pad = DRUM_PADS[rowToPadIndex(row)];
      const newNote: MidiNoteEvent = {
        note: pad.note,
        velocity,
        startTick: snapClipTick(x / pixelsPerTick + originTick),
        durationTicks: gridStep,
        channel: 10,
      };
      const newEvents = [...currentEvents, newNote].sort(
        (a, b) => a.startTick - b.startTick,
      );
      onChange(newEvents);
      audition(pad.note, velocity);
      setSelectedPad(pad.note);
      selectSingle(newEvents.indexOf(newNote));
    },
    [
      getCanvasCoords,
      hitTestNote,
      velocity,
      snapClipTick,
      pixelsPerTick,
      originTick,
      gridStep,
      onChange,
      audition,
      selectSingle,
    ],
  );

  // ── Mouse move (grid canvas) ──────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);

      // Marquee selection in progress — rebuild selection from notes inside it.
      if (marqueeRef.current) {
        const m = marqueeRef.current;
        m.moved = true;
        const rect: MarqueeRect = {
          x1: Math.min(m.originX, x),
          y1: Math.min(m.originY, y),
          x2: Math.max(m.originX, x),
          y2: Math.max(m.originY, y),
        };
        setMarqueeRect(rect);
        const sel = new Set<number>(m.base);
        const evs = eventsRef.current;
        for (let i = 0; i < evs.length; i++) {
          const ev = evs[i];
          const padIdx = padIndexForNote(ev.note);
          if (padIdx < 0) continue;
          const nrow = padIndexToRow(padIdx);
          const nx = (ev.startTick - originTick) * pixelsPerTick;
          const nw = Math.max(MIN_NOTE_W, ev.durationTicks * pixelsPerTick);
          const ny = nrow * PAD_ROW_H;
          if (
            nx <= rect.x2 &&
            nx + nw >= rect.x1 &&
            ny <= rect.y2 &&
            ny + PAD_ROW_H >= rect.y1
          ) {
            sel.add(i);
          }
        }
        setSelectedIndices(sel);
        return;
      }

      const drag = dragRef.current;
      const canvas = gridCanvasRef.current;

      // No drag: the cursor says what a press would do.
      if (!drag) {
        if (!canvas) return;
        const noteIdx = hitTestNote(x, y);
        if (noteIdx !== null) {
          const ev = eventsRef.current[noteIdx];
          const noteX = (ev.startTick - originTick) * pixelsPerTick;
          const noteW = Math.max(MIN_NOTE_W, ev.durationTicks * pixelsPerTick);
          canvas.style.cursor = onResizeEdge(x, noteX, noteW)
            ? 'col-resize'
            : 'grab';
        } else {
          canvas.style.cursor = 'default';
        }
        return;
      }

      // A drag moves or resizes the whole selection together.
      {
        const currentEvents = [...eventsRef.current];
        const anchorOrig = drag.originals.get(drag.anchorIndex);
        if (!anchorOrig) return;

        if (drag.mode === 'move') {
          // Derive the anchor's snapped tick + row delta, then shift the group.
          const rawTick = x / pixelsPerTick + originTick - drag.grabTickOffset;
          const snappedTick = snapClipTick(rawTick);
          let tickDelta = snappedTick - anchorOrig.startTick;

          const row = Math.max(
            0,
            Math.min(NUM_PADS - 1, Math.floor(y / PAD_ROW_H)),
          );
          const anchorRow = padIndexToRow(padIndexForNote(anchorOrig.note));
          let rowDelta = row - anchorRow;

          // Clamp deltas so no note in the group leaves valid bounds.
          let minStart = Infinity;
          let minRow = Infinity;
          let maxRow = -Infinity;
          for (const o of drag.originals.values()) {
            if (o.startTick < minStart) minStart = o.startTick;
            const r = padIndexToRow(padIndexForNote(o.note));
            if (r < minRow) minRow = r;
            if (r > maxRow) maxRow = r;
          }
          if (minStart + tickDelta < 0) tickDelta = -minStart;
          if (minRow + rowDelta < 0) rowDelta = -minRow;
          if (maxRow + rowDelta > NUM_PADS - 1)
            rowDelta = NUM_PADS - 1 - maxRow;

          for (const [idx, o] of drag.originals) {
            const newRow = padIndexToRow(padIndexForNote(o.note)) + rowDelta;
            currentEvents[idx] = {
              ...currentEvents[idx],
              startTick: o.startTick + tickDelta,
              note: DRUM_PADS[rowToPadIndex(newRow)].note,
            };
          }
        } else if (drag.mode === 'resize') {
          const endTick = x / pixelsPerTick + originTick;
          const snappedEnd = snapClipTick(endTick);
          const newAnchorDur = Math.max(
            gridStep,
            snappedEnd - anchorOrig.startTick,
          );
          const durDelta = newAnchorDur - anchorOrig.durationTicks;
          for (const [idx, o] of drag.originals) {
            currentEvents[idx] = {
              ...currentEvents[idx],
              durationTicks: Math.max(gridStep, o.durationTicks + durDelta),
            };
          }
        }

        editDraft(currentEvents);
      }
    },
    [
      getCanvasCoords,
      hitTestNote,
      originTick,
      pixelsPerTick,
      gridStep,
      snapClipTick,
      editDraft,
    ],
  );

  // ── Mouse up ──────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    const m = marqueeRef.current;
    if (m && !m.moved && m.clickNote !== null) {
      const toggled = new Set(m.base);
      if (toggled.has(m.clickNote)) toggled.delete(m.clickNote);
      else toggled.add(m.clickNote);
      setSelectedIndices(toggled);
    }
    dragRef.current = null;
    marqueeRef.current = null;
    setMarqueeRect(null);
    commitDraft();
    if (gridCanvasRef.current) gridCanvasRef.current.style.cursor = 'default';
  }, []);

  useEffect(() => {
    const handler = () => {
      if (dragRef.current || marqueeRef.current) handleMouseUp();
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [handleMouseUp]);

  // ── Velocity lane mouse handler ───────────────────────────────────────
  const velDragRef = useRef<{ noteIndex: number } | null>(null);
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
        const relTick = ev.startTick - originTick;
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
        editDraft(updated);
      }
    },
    [originTick, pixelsPerTick, editDraft, selectSingle],
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
      currentEvents[idx] = {
        ...currentEvents[idx],
        velocity: newVel,
      };
      editDraft(currentEvents);
    },
    [editDraft],
  );

  const handleVelMouseUp = useCallback(() => {
    velDragRef.current = null;
    commitDraft();
  }, [commitDraft]);

  // A velocity drawn past the lane's edge ends wherever it is let go.
  useEffect(() => {
    const handler = () => {
      if (velDragRef.current) handleVelMouseUp();
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [handleVelMouseUp]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  // ── Keys, while the grid has focus (the drums scope) ──────────────────
  // Delete or Backspace removes the selected hits (no tool keys: there are
  // no tools since 2026-10-22). Delete stays here with nothing selected, so
  // it never reaches the clip behind the grid.
  useKeymap(
    DRUMS_SCOPE.id,
    {
      'drums.delete': () => {
        if (selectedIndices.size === 0) return;
        onChange(eventsRef.current.filter((_, i) => !selectedIndices.has(i)));
        setSelectedIndices(new Set());
      },
    },
    { element: containerRef },
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

  // ── Ruler scale drag: vertical → horizontal zoom ─────────────────────────
  // Movement is tracked at the window level so the gesture keeps scaling even
  // after the cursor leaves the ruler (no ceiling). Horizontal movement is
  // ignored; a drag on the grid edits hits, so scaling lives on the ruler.
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

  // ── The corner's zoom: wider or narrower, about the middle of the view ──
  const zoomBy = (factor: number) => {
    const container = gridScrollRef.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    if (!container || next === zoom) return;
    const mid = container.scrollLeft + container.clientWidth / 2;
    const midTick = mid / pixelsPerTick;
    setZoom(next);
    requestAnimationFrame(() => {
      const nextPixelsPerTick = (40 * next) / TICKS_PER_BEAT;
      container.scrollLeft = Math.max(
        0,
        midTick * nextPixelsPerTick - container.clientWidth / 2,
      );
    });
  };

  // ── Playhead position ─────────────────────────────────────────────────
  // Painted from the playhead clock through a ref, so playback moves the
  // line without rendering the drum machine (dock-instruments-06).
  const playheadRef = useRef<HTMLDivElement | null>(null);
  usePlayheadEffect((tick) => {
    const line = playheadRef.current;
    if (!line) return;
    const px = (tick - songOffset) * pixelsPerTick;
    if (px < 0) {
      if (line.style.display !== 'none') line.style.display = 'none';
      return;
    }
    if (line.style.display) line.style.display = '';
    const transform = `translateX(${px}px)`;
    if (line.style.transform !== transform) line.style.transform = transform;
  });

  if (!track) return null;

  // Velocity control reflects the selection: shows the first selected note's
  // value and applies edits to every selected note.
  const selectedArr = Array.from(selectedIndices);
  const velRefIdx = selectedArr.length > 0 ? selectedArr[0] : null;
  const velDisplay =
    velRefIdx !== null
      ? (eventsRef.current[velRefIdx]?.velocity ?? velocity)
      : velocity;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      data-tutorial-id="drum-machine-view"
      className="flex flex-col h-full overflow-hidden"
      tabIndex={0}
    >
      {/* ── Editor body ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Grid area: labels + ruler + grid (scrolls vertically) */}
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Left column: corner spacer + pad labels */}
          <div className="shrink-0 flex flex-col" style={{ width: LABEL_W }}>
            {/* The corner: zoom out and in, as the piano roll has them. */}
            <div
              className="flex shrink-0 items-center justify-center gap-0.5 border-b border-r border-daw-hairline bg-daw-bg"
              style={{ height: RULER_H }}
            >
              {(
                [
                  ['Zoom out', ZoomOut, 1 / 1.25],
                  ['Zoom in', ZoomIn, 1.25],
                ] as const
              ).map(([label, Icon, factor]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  data-hint={label}
                  onClick={() => zoomBy(factor)}
                  className={cn(
                    'flex size-5 items-center justify-center rounded-[var(--daw-radius-sm)] text-daw-text-3 hover:bg-daw-hover hover:text-daw-text',
                    TRANSITION,
                    FOCUS_RING,
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </button>
              ))}
            </div>
            {/* Pad labels — reversed so Kick is at bottom, scrolls with grid */}
            <div
              ref={labelScrollRef}
              className="flex flex-col overflow-y-auto"
              style={{
                flex: 1,
                borderRight: '1px solid var(--daw-hairline)',
                scrollbarWidth: 'none',
              }}
            >
              <ControlGestureContext.Provider value={padGesture}>
                {[...DRUM_PADS].reverse().map((pad) => (
                  <DrumRowLabel
                    key={pad.note}
                    pad={pad}
                    selected={selectedPad === pad.note}
                    onSelect={() => setSelectedPad(pad.note)}
                    onTrigger={() => handlePadTrigger(pad.note)}
                    volume={padMix.value?.[pad.note]?.volume ?? 0.8}
                    pan={
                      padMix.value?.[pad.note]?.pan ??
                      DRUM_KIT_CONFIGS.find((c) => c.id === currentKit)
                        ?.defaultPan?.[pad.note] ??
                      0
                    }
                    onVolumeChange={(v) => setPadMix(pad.note, { volume: v })}
                    onPanChange={(v) => setPadMix(pad.note, { pan: v })}
                  />
                ))}
              </ControlGestureContext.Provider>
            </div>
          </div>

          {/* Right column: ruler + grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Ruler — drag vertically to scale (horizontal zoom) */}
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
                onDoubleClick={handleDoubleClick}
              />

              {/* CSS Playhead */}
              {isPlaying && (
                <div
                  ref={playheadRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 1,
                    height: GRID_H,
                    backgroundColor: '#ef4444',
                    willChange: 'transform',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Velocity lane — always below grid, never overlaps; its switch
            is at the right of the bar. */}
        <div
          className="shrink-0"
          style={{
            marginLeft: LABEL_W,
            borderTop: velLaneOpen ? '1px solid var(--daw-hairline)' : 'none',
          }}
        >
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
      {/* The bar under the grid, where the piano roll has its own (owner,
          2026-10-22): the kit, the grid and Quantize, the velocity new hits
          get (the selection's, while hits are picked), Generate and Clear,
          and at the right the velocity lane's switch. */}
      <div
        data-testid="drum-grid-bar"
        className="flex shrink-0 items-center gap-3 border-t border-daw-hairline px-3"
        style={{ height: BAR_H }}
      >
        <div
          className="flex items-center gap-1.5"
          data-tutorial-id="drum-kit-selector"
        >
          <Select
            label="Drum kit"
            size="sm"
            value={currentKit}
            onValueChange={(v) => void handleKitChange(v as DrumKitId)}
            options={DRUM_KITS.map((kit) => ({
              value: kit.id,
              label: kit.label,
            }))}
          />
          {loading && (
            <Loader2
              aria-label="Loading the kit"
              className="size-3 animate-spin text-daw-text-3"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>Grid</span>
          <Select
            label="Grid"
            size="sm"
            value={gridSize}
            onValueChange={(v) => setGridSize(v as GridSize)}
            options={Object.keys(GRID_VALUES).map((g) => ({
              value: g,
              label: g,
            }))}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            handleQuantize();
            containerRef.current?.focus();
          }}
          data-hint="Quantize: move every hit onto the grid"
          className={cn(
            TYPE_CLASS.label,
            'flex h-6 items-center rounded-full bg-daw-pill px-2.5 font-bold text-daw-text hover:bg-daw-hover',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          Quantize
        </button>
        <label className="flex items-center gap-1.5">
          <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
            Note velocity
          </span>
          <input
            type="range"
            aria-label={
              selectedArr.length > 0
                ? 'Velocity of the selected hits'
                : 'Velocity of new hits'
            }
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
                editDraft(updated);
              } else {
                setVelocity(val);
              }
            }}
            // The slide is one edit: written when it is let go, or after
            // each arrow-key step.
            onPointerUp={commitDraft}
            onKeyUp={commitDraft}
            onBlur={commitDraft}
            className="h-1 w-20 accent-daw-text-2"
          />
          <span
            className={cn(
              TYPE_CLASS.label,
              'w-7 text-right tabular-nums text-daw-text-2',
            )}
          >
            {velDisplay}
          </span>
        </label>
        <button
          type="button"
          data-testid="drum-generate"
          onClick={() => {
            handleGenerate();
            containerRef.current?.focus();
          }}
          data-hint="Generate: write a new drum pattern in the kit's style"
          className={cn(
            TYPE_CLASS.label,
            'ml-auto flex h-6 items-center gap-1 rounded-full bg-daw-pill-on px-2.5 font-bold text-daw-text hover:bg-daw-hover',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          <Sparkles className="size-3" aria-hidden />
          Generate
        </button>
        <button
          type="button"
          onClick={handleClear}
          data-hint="Clear every hit in this pattern"
          className={cn(
            TYPE_CLASS.label,
            'flex h-6 items-center gap-1 rounded-full bg-daw-pill px-2.5 font-bold text-daw-pill-text hover:text-daw-text',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          <Trash2 className="size-3" aria-hidden />
          Clear
        </button>
        <button
          type="button"
          aria-label="Velocity lane"
          aria-expanded={velLaneOpen}
          data-testid="velocity-lane-toggle"
          data-hint="Show or hide each hit's velocity under the grid"
          onClick={() => setVelLaneOpen((o) => !o)}
          className={cn(
            TYPE_CLASS.label,
            'flex h-7 items-center gap-1 rounded-full px-3 font-bold',
            velLaneOpen
              ? 'bg-daw-pill-on text-daw-text'
              : 'bg-daw-pill text-daw-pill-text hover:text-daw-text',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          Velocity lane
          {velLaneOpen ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronUp className="size-3.5" aria-hidden />
          )}
        </button>
      </div>
      {/* No "Sample" section under the grid: it drew the same made-up
          envelope for every pad, not the pad's sample. */}
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
            ? 'var(--daw-accent)'
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
          color: selected ? 'var(--daw-text)' : 'var(--daw-text-3)',
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
  const gesture = useControlGesture();
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
      gesture?.begin();
    },
    [value, gesture],
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
    if (!dragRef.current) return;
    dragRef.current = null;
    gesture?.end();
  }, [gesture]);

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
        stroke="var(--daw-text)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
