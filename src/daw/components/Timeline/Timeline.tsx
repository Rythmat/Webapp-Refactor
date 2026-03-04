import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useStore } from '@/daw/store';
import { seekTo } from '@/daw/hooks/useTransport';
import { importMidiFile } from '@/daw/midi/MidiFileIO';
import * as Tone from 'tone';
import { getAudioBuffer, setAudioBuffer, removeAudioBuffer, computePeaks, sliceBuffer } from '@/daw/audio/AudioBufferStore';
import {
  TICKS_PER_BEAT,
  TICKS_PER_BAR,
  pixelsPerBeat,
  tickToPixel,
  pixelToTick,
  visibleTickRange,
  visibleSubdivisions,
  alternatingBarGroup,
  rulerMarkings,
  tickToTime,
  tickToTimePrecise,
} from '@/daw/utils/timelineScale';
import { ALL_GRID_VALUES, TRIPLET_GRID_VALUES } from '@/daw/utils/quantize';
import type { MidiNoteEvent } from '@prism/engine';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { DRAG_MIME, type DragPayload } from '@/daw/data/libraryItems';

// ── Constants ───────────────────────────────────────────────────────────
const TRACK_HEIGHT = 80; // px per track lane
const RULER_HEIGHT = 28; // px for bar-number ruler at top
const CHORD_RULER_HEIGHT = 20; // px for chord name ruler
const RULERS_HEIGHT = RULER_HEIGHT + CHORD_RULER_HEIGHT; // total header height
const TIME_RULER_HEIGHT = 22; // px for time ruler at bottom
const RESIZE_EDGE_PX = 6; // px threshold for resize handle
const PROJECT_MIN_BARS = 8; // minimum visible project length
const PROJECT_PAD_BARS = 4; // extra bars of padding beyond content

// ── Seeded PRNG (deterministic per clip) ────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ── Piano-roll rendering ─────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function drawPianoRoll(
  ctx: CanvasRenderingContext2D,
  events: { startTick: number; durationTicks: number; note: number; velocity: number }[],
  clipX: number,
  clipY: number,
  clipWidth: number,
  clipHeight: number,
  clipStartTick: number,
  clipDuration: number,
  color: string,
  chordRegions?: ChordRegion[],
  usePrismColors?: boolean,
) {
  if (events.length === 0 || clipDuration === 0) return;

  let minNote = 127, maxNote = 0;
  for (const ev of events) {
    if (ev.note < minNote) minNote = ev.note;
    if (ev.note > maxNote) maxNote = ev.note;
  }
  minNote = Math.max(0, minNote - 2);
  maxNote = Math.min(127, maxNote + 2);
  const noteRange = maxNote - minNote || 1;

  const [r, g, b] = hexToRgb(color);
  const useChordColors = usePrismColors && chordRegions && chordRegions.length > 0;
  const paddingTop = 16;
  const paddingBottom = 4;
  const drawHeight = clipHeight - paddingTop - paddingBottom;
  const noteBarH = Math.max(2, Math.min(4, drawHeight / noteRange * 0.8));

  for (const ev of events) {
    const x = clipX + ((ev.startTick - clipStartTick) / clipDuration) * clipWidth;
    const w = Math.max(2, (ev.durationTicks / clipDuration) * clipWidth);
    const pitchRatio = (ev.note - minNote) / noteRange;
    const ny = clipY + paddingTop + drawHeight - pitchRatio * drawHeight - noteBarH;
    const alpha = 0.6 + (ev.velocity / 127) * 0.4;

    let nr = r, ng = g, nb = b;
    if (useChordColors) {
      for (let j = chordRegions.length - 1; j >= 0; j--) {
        if (ev.startTick >= chordRegions[j].startTick) {
          [nr, ng, nb] = chordRegions[j].color;
          break;
        }
      }
    }

    ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
    ctx.beginPath();
    ctx.roundRect(x, ny, w, noteBarH, 1);
    ctx.fill();
  }
}

function drawSmoothWaveform(
  ctx: CanvasRenderingContext2D,
  amps: number[],
  clipX: number,
  centerY: number,
  clipWidth: number,
  maxAmplitude: number,
  color: string,
) {
  const count = amps.length;
  if (count < 2) return;

  ctx.fillStyle = color;
  ctx.beginPath();

  const dx = clipWidth / (count - 1);
  ctx.moveTo(clipX, centerY - amps[0] * maxAmplitude);
  for (let i = 1; i < count; i++) {
    const x = clipX + i * dx;
    const h = amps[i] * maxAmplitude;
    const prevX = clipX + (i - 1) * dx;
    const cpX = (prevX + x) / 2;
    ctx.quadraticCurveTo(cpX, centerY - amps[i - 1] * maxAmplitude, x, centerY - h);
  }

  for (let i = count - 1; i >= 1; i--) {
    const x = clipX + i * dx;
    const h = amps[i] * maxAmplitude;
    const nextX = clipX + (i - 1) * dx;
    const cpX = (x + nextX) / 2;
    ctx.quadraticCurveTo(cpX, centerY + h, nextX, centerY + amps[i - 1] * maxAmplitude);
  }

  ctx.closePath();
  ctx.fill();
}

// ── Clip rect storage for hit testing ────────────────────────────────────

interface ClipRect {
  clipId: string;
  trackId: string;
  trackIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  startTick: number;
}

// ── Drag state ──────────────────────────────────────────────────────────

interface DragState {
  clipId: string;
  trackId: string;
  originTrackIndex: number;
  offsetX: number; // px offset from clip left edge to mouse
  startTickOrigin: number;
  mode: 'move' | 'resize';
}

// ── Project length computation ──────────────────────────────────────────

function computeProjectLengthTicks(
  tracks: { midiClips: { startTick: number; durationTicks?: number; events: { startTick: number; durationTicks: number }[] }[]; audioClips: { startTick: number; duration: number }[] }[],
): number {
  let maxTick = TICKS_PER_BAR * PROJECT_MIN_BARS;
  for (const track of tracks) {
    for (const clip of track.midiClips) {
      const endTick = clip.durationTicks
        ? clip.startTick + clip.durationTicks
        : clip.events.reduce(
            (max, e) => Math.max(max, e.startTick + e.durationTicks),
            clip.startTick,
          );
      maxTick = Math.max(maxTick, endTick);
    }
    for (const clip of track.audioClips) {
      maxTick = Math.max(maxTick, clip.startTick + clip.duration);
    }
  }
  return maxTick + TICKS_PER_BAR * PROJECT_PAD_BARS;
}

// ── Snap helper ─────────────────────────────────────────────────────────

function snapTick(tick: number, gridTicks: number): number {
  return Math.max(0, Math.round(tick / gridTicks) * gridTicks);
}

// ── Timeline ────────────────────────────────────────────────────────────

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clipRectsRef = useRef<ClipRect[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const dragTickRef = useRef<number>(0);
  const dragTrackRef = useRef<number>(0);
  const loopDragRef = useRef<'start' | 'end' | null>(null);
  const markerDragRef = useRef<string | null>(null);

  // ── Context menu state ──
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    markerId: string | null;
    tick: number;
    audioClipId?: string;
    audioTrackId?: string;
  } | null>(null);

  // ── Store state ──
  const tracks = useStore((s) => s.tracks);
  const position = useStore((s) => s.position);
  const bpm = useStore((s) => s.bpm);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const loopStart = useStore((s) => s.loopStart);
  const loopEnd = useStore((s) => s.loopEnd);
  const zoom = useStore((s) => s.timelineZoom);
  const scrollLeft = useStore((s) => s.timelineScrollLeft);
  const gridSize = useStore((s) => s.timelineGridSize);
  const snapEnabled = useStore((s) => s.timelineSnapEnabled);
  const _tripletMode = useStore((s) => s.timelineTripletMode);
  const markers = useStore((s) => s.markers);
  const _chordRegions = useStore((s) => s.chordRegions);

  // ── Derived ──
  const ppb = pixelsPerBeat(zoom);
  const snapGridTicks = snapEnabled ? ALL_GRID_VALUES[gridSize] : 1;
  const projectLengthTicks = useMemo(() => computeProjectLengthTicks(tracks), [tracks]);

  // ── Snap helper with current grid ──
  const doSnap = useCallback(
    (tick: number) => snapEnabled ? snapTick(tick, snapGridTicks) : Math.max(0, tick),
    [snapEnabled, snapGridTicks],
  );

  // ── Draw ──────────────────────────────────────────────────────────────

  const draw = useCallback(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const container = canvas.parentElement;
      if (!container) return;

      // Scroll parent = the overflow-auto div in TimelineWithHeaders
      const scrollParent = container.parentElement?.parentElement;
      const scrollTop = scrollParent?.scrollTop ?? 0;
      const viewportH = scrollParent?.clientHeight ?? 0;

      const dpr = window.devicePixelRatio || 1;
      const cw = container.clientWidth;
      const ch = Math.max(
        container.clientHeight,
        tracks.length * TRACK_HEIGHT + RULERS_HEIGHT + TIME_RULER_HEIGHT,
      );

      // Resize canvas to viewport (virtual rendering — not content size)
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const state = useStore.getState();
      const currentSelectedClipId = state.selectedClipId;
      const currentZoom = state.timelineZoom;
      const currentScrollLeft = state.timelineScrollLeft;
      const currentPpb = pixelsPerBeat(currentZoom);
      const newClipRects: ClipRect[] = [];

      // Theme-aware canvas colors (read from CSS variables once per frame)
      const rootStyle = getComputedStyle(document.documentElement);
      const colorBg = rootStyle.getPropertyValue('--color-bg').trim() || '#191919';
      const colorBorder = rootStyle.getPropertyValue('--color-border').trim() || 'rgba(255, 255, 255, 0.08)';
      const colorGridRgb = rootStyle.getPropertyValue('--color-grid-rgb').trim() || '255, 255, 255';
      const _colorRulerText = rootStyle.getPropertyValue('--color-ruler-text').trim() || 'rgba(255, 255, 255, 0.25)';

      // Visible tick range (with 1 bar buffer on each side)
      const { startTick: visStartRaw, endTick: visEndRaw } = visibleTickRange(cw, currentZoom, currentScrollLeft);
      const visStart = Math.max(0, visStartRaw - TICKS_PER_BAR);
      const visEnd = visEndRaw + TICKS_PER_BAR;

      // ── Clear ──────────────────────────────────────────────────────
      ctx.fillStyle = colorBg;
      ctx.fillRect(0, 0, cw, ch);

      // (Top ruler + time ruler drawn at end with scroll-offset for sticky behavior)

      // ── Alternating bar shading ───────────────────────────────────
      const barGroup = alternatingBarGroup(currentZoom);
      const barGroupTicks = barGroup * TICKS_PER_BAR;
      ctx.fillStyle = `rgba(${colorGridRgb}, 0.025)`;
      const firstGroup = Math.floor(visStart / barGroupTicks);
      const lastGroup = Math.ceil(visEnd / barGroupTicks);
      for (let g = firstGroup; g <= lastGroup; g++) {
        if (g % 2 === 0) continue;
        const x1 = tickToPixel(g * barGroupTicks, currentZoom, currentScrollLeft);
        const x2 = tickToPixel((g + 1) * barGroupTicks, currentZoom, currentScrollLeft);
        ctx.fillRect(x1, RULERS_HEIGHT, x2 - x1, ch - RULERS_HEIGHT - TIME_RULER_HEIGHT);
      }

      // ── Grid (zoom-adaptive subdivisions) ──────────────────────────
      const subdivisions = visibleSubdivisions(currentZoom);
      for (const sub of subdivisions) {
        ctx.strokeStyle = `rgba(${colorGridRgb}, ${sub.alpha})`;
        ctx.lineWidth = sub.lineWidth;

        const startAligned = Math.floor(visStart / sub.tickInterval) * sub.tickInterval;
        for (let tick = startAligned; tick <= visEnd; tick += sub.tickInterval) {
          if (tick < 0) continue;
          // Skip if already drawn by coarser subdivision
          let alreadyDrawn = false;
          for (const coarser of subdivisions) {
            if (coarser.tickInterval > sub.tickInterval && tick % coarser.tickInterval === 0) {
              alreadyDrawn = true;
              break;
            }
          }
          if (alreadyDrawn) continue;

          const x = tickToPixel(tick, currentZoom, currentScrollLeft);
          if (x < -1 || x > cw + 1) continue;
          ctx.beginPath();
          ctx.moveTo(x, RULERS_HEIGHT);
          ctx.lineTo(x, ch - TIME_RULER_HEIGHT);
          ctx.stroke();
        }
      }

      // ── Triplet grid lines ─────────────────────────────────────────
      if (state.timelineTripletMode) {
        const tripletKey = gridSize as string;
        const isTripletGrid = tripletKey.endsWith('T');
        // Show triplet lines for the current grid size, or 1/4T by default
        const tripletTicks = isTripletGrid
          ? ALL_GRID_VALUES[gridSize]
          : (TRIPLET_GRID_VALUES['1/4T'] as number);

        ctx.strokeStyle = 'rgba(255, 180, 100, 0.08)';
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 0.5;

        const startAligned = Math.floor(visStart / tripletTicks) * tripletTicks;
        for (let tick = startAligned; tick <= visEnd; tick += tripletTicks) {
          if (tick < 0) continue;
          if (tick % TICKS_PER_BEAT === 0) continue; // skip beat lines
          const x = tickToPixel(tick, currentZoom, currentScrollLeft);
          if (x < -1 || x > cw + 1) continue;
          ctx.beginPath();
          ctx.moveTo(x, RULERS_HEIGHT);
          ctx.lineTo(x, ch - TIME_RULER_HEIGHT);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // ── Track lanes ─────────────────────────────────────────────────
      for (let t = 0; t < tracks.length; t++) {
        const track = tracks[t];
        const y = t * TRACK_HEIGHT + RULERS_HEIGHT;

        // Lane separator
        ctx.strokeStyle = `rgba(${colorGridRgb}, 0.04)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + TRACK_HEIGHT);
        ctx.lineTo(cw, y + TRACK_HEIGHT);
        ctx.stroke();

        // ── MIDI clips ────────────────────────────────────────────────
        for (const clip of track.midiClips) {
          const drag = dragRef.current;
          const isDragging = drag && drag.clipId === clip.id && drag.mode === 'move';
          const effectiveStartTick = isDragging ? dragTickRef.current : clip.startTick;
          const effectiveTrackIndex = isDragging ? dragTrackRef.current : t;
          const effectiveY = effectiveTrackIndex * TRACK_HEIGHT + RULERS_HEIGHT;

          const maxTick = clip.durationTicks
            ? clip.startTick + clip.durationTicks
            : clip.events.reduce(
                (max, e) => Math.max(max, e.startTick + e.durationTicks),
                clip.startTick,
              );
          const clipDuration = maxTick - clip.startTick;
          const clipEndTick = effectiveStartTick + clipDuration;

          // Skip clips outside visible range
          if (clipEndTick < visStart || effectiveStartTick > visEnd) continue;

          const clipX = tickToPixel(effectiveStartTick, currentZoom, currentScrollLeft);
          const clipWidth = Math.max(
            (clipDuration / TICKS_PER_BEAT) * currentPpb,
            20,
          );

          const isSelected = currentSelectedClipId === clip.id;

          // Store rect for hit testing (viewport space)
          newClipRects.push({
            clipId: clip.id,
            trackId: track.id,
            trackIndex: t,
            x: clipX,
            y: effectiveY + 2,
            w: clipWidth,
            h: TRACK_HEIGHT - 4,
            startTick: clip.startTick,
          });

          // Background — rounded, vibrant
          ctx.fillStyle = track.color + (isSelected ? '50' : '38');
          ctx.beginPath();
          ctx.roundRect(clipX, effectiveY + 2, clipWidth, TRACK_HEIGHT - 4, 4);
          ctx.fill();

          // Border — selected clips get brighter border
          ctx.strokeStyle = isSelected
            ? track.color + 'FF'
            : track.color + '90';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.beginPath();
          ctx.roundRect(clipX, effectiveY + 2, clipWidth, TRACK_HEIGHT - 4, 4);
          ctx.stroke();

          // ── Clip title + piano-roll notes ──────────────────────────
          // Skip details at extreme zoom-out for performance
          if (clipWidth > 8 && currentPpb >= 5) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(clipX, effectiveY + 2, clipWidth, TRACK_HEIGHT - 4, 4);
            ctx.clip();

            const title = (clip as { name?: string }).name || clip.id;
            ctx.fillStyle = `rgba(${colorGridRgb}, 0.7)`;
            ctx.font = '9px Inter, sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(title, clipX + 6, effectiveY + 6);

            if (clip.events.length > 0) {
              drawPianoRoll(
                ctx,
                clip.events,
                clipX,
                effectiveY + 2,
                clipWidth,
                TRACK_HEIGHT - 4,
                clip.startTick,
                clipDuration,
                track.color,
                state.chordRegions,
                state.clipColorMode === 'prism',
              );
            }

            ctx.restore();
          }
        }

        // ── Audio clips ───────────────────────────────────────────────
        for (const clip of track.audioClips) {
          const clipEndTick = clip.startTick + clip.duration;
          if (clipEndTick < visStart || clip.startTick > visEnd) continue;

          const clipX = tickToPixel(clip.startTick, currentZoom, currentScrollLeft);
          const clipWidth = (clip.duration / TICKS_PER_BEAT) * currentPpb;

          const isSelected = currentSelectedClipId === clip.id;

          // Store rect for hit testing
          newClipRects.push({
            clipId: clip.id,
            trackId: track.id,
            trackIndex: t,
            x: clipX,
            y: y + 2,
            w: clipWidth,
            h: TRACK_HEIGHT - 4,
            startTick: clip.startTick,
          });

          ctx.fillStyle = track.color + (isSelected ? '50' : '30');
          ctx.beginPath();
          ctx.roundRect(clipX, y + 2, clipWidth, TRACK_HEIGHT - 4, 4);
          ctx.fill();

          ctx.strokeStyle = isSelected ? track.color + 'FF' : track.color + '80';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.beginPath();
          ctx.roundRect(clipX, y + 2, clipWidth, TRACK_HEIGHT - 4, 4);
          ctx.stroke();

          if (clipWidth > 8 && currentPpb >= 5) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(clipX, y + 2, clipWidth, TRACK_HEIGHT - 4, 4);
            ctx.clip();

            const sampleCount = Math.max(Math.floor(clipWidth / 2), 16);
            const centerY = y + TRACK_HEIGHT / 2;
            const maxH = (TRACK_HEIGHT - 8) * 0.42;

            const audioBuffer = getAudioBuffer(clip.id);
            let amps: number[];
            if (audioBuffer) {
              amps = computePeaks(audioBuffer, sampleCount);
            } else {
              const rand = seededRandom(hashStr(clip.id));
              amps = Array.from({ length: sampleCount }, () => rand() * 0.6 + 0.2);
            }

            drawSmoothWaveform(ctx, amps, clipX, centerY, clipWidth, maxH, track.color + 'AA');

            // ── Fade overlays ──
            const clipH = TRACK_HEIGHT - 4;
            if (clip.fadeInTicks > 0) {
              const fadeW = (clip.fadeInTicks / TICKS_PER_BEAT) * currentPpb;
              ctx.fillStyle = 'rgba(0,0,0,0.35)';
              ctx.beginPath();
              ctx.moveTo(clipX, y + 2);
              ctx.lineTo(clipX + fadeW, y + 2);
              ctx.lineTo(clipX, y + 2 + clipH);
              ctx.closePath();
              ctx.fill();
            }
            if (clip.fadeOutTicks > 0) {
              const fadeW = (clip.fadeOutTicks / TICKS_PER_BEAT) * currentPpb;
              const clipRight = clipX + clipWidth;
              ctx.fillStyle = 'rgba(0,0,0,0.35)';
              ctx.beginPath();
              ctx.moveTo(clipRight, y + 2);
              ctx.lineTo(clipRight - fadeW, y + 2);
              ctx.lineTo(clipRight, y + 2 + clipH);
              ctx.closePath();
              ctx.fill();
            }

            ctx.restore();
          }
        }
      }

      // ── Loop region ───────────────────────────────────────────────
      const currentLoopEnabled = state.loopEnabled;
      const currentLoopStart = state.loopStart;
      const currentLoopEnd = state.loopEnd;
      if (currentLoopEnabled) {
        const lx1 = tickToPixel(currentLoopStart, currentZoom, currentScrollLeft);
        const lx2 = tickToPixel(currentLoopEnd, currentZoom, currentScrollLeft);
        const lw = lx2 - lx1;

        // Tinted overlay on track area (loop ruler elements drawn in sticky section)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
        ctx.fillRect(lx1, RULERS_HEIGHT, lw, ch - RULERS_HEIGHT - TIME_RULER_HEIGHT);

        // Vertical lines at loop boundaries
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx1, RULERS_HEIGHT);
        ctx.lineTo(lx1, ch - TIME_RULER_HEIGHT);
        ctx.moveTo(lx2, RULERS_HEIGHT);
        ctx.lineTo(lx2, ch - TIME_RULER_HEIGHT);
        ctx.stroke();
      }

      // ── Markers ─────────────────────────────────────────────────────
      const currentMarkers = useStore.getState().markers;
      for (const marker of currentMarkers) {
        const mx = tickToPixel(marker.tick, currentZoom, currentScrollLeft);
        if (mx < -60 || mx > cw + 10) continue;

        // Dashed vertical guide line
        ctx.save();
        ctx.strokeStyle = marker.color + '26'; // 15% opacity
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(mx, RULERS_HEIGHT);
        ctx.lineTo(mx, ch - TIME_RULER_HEIGHT);
        ctx.stroke();
        ctx.restore();

        // (Marker flags drawn below with sticky top ruler)
      }

      // ── Sticky rulers (drawn last so they overlay content) ────────────

      // Scroll-offset positions so rulers stay pinned during vertical scroll
      const rulerY = scrollTop;
      // Account for horizontal scrollbar (h-3 = 12px) when it's visible
      const totalPx = (projectLengthTicks / TICKS_PER_BEAT) * pixelsPerBeat(currentZoom);
      const hScrollbarH = totalPx > cw ? 12 : 0;
      const timeRulerY = viewportH > 0
        ? scrollTop + viewportH - TIME_RULER_HEIGHT - hScrollbarH
        : ch - TIME_RULER_HEIGHT;

      // ── Top ruler (bar/beat numbers) ──────────────────────────────────
      ctx.fillStyle = colorBg;
      ctx.fillRect(0, rulerY, cw, RULER_HEIGHT);
      ctx.fillStyle = `rgba(${colorGridRgb}, 0.03)`;
      ctx.fillRect(0, rulerY, cw, RULER_HEIGHT);

      // Loop region band + handles on ruler
      if (state.loopEnabled) {
        const lx1r = tickToPixel(state.loopStart, currentZoom, currentScrollLeft);
        const lx2r = tickToPixel(state.loopEnd, currentZoom, currentScrollLeft);
        const lwr = lx2r - lx1r;

        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.fillRect(lx1r, rulerY, lwr, RULER_HEIGHT);

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(lx1r, rulerY);
        ctx.lineTo(lx1r + 8, rulerY);
        ctx.lineTo(lx1r, rulerY + RULER_HEIGHT);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(lx2r, rulerY);
        ctx.lineTo(lx2r - 8, rulerY);
        ctx.lineTo(lx2r, rulerY + RULER_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }

      // Bottom border
      ctx.strokeStyle = colorBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rulerY + RULER_HEIGHT);
      ctx.lineTo(cw, rulerY + RULER_HEIGHT);
      ctx.stroke();

      // Ruler labels (zoom-adaptive)
      const levels = rulerMarkings(currentZoom, state.bpm);
      for (const level of levels) {
        ctx.fillStyle = `rgba(${colorGridRgb}, ${level.alpha * 0.6})`;
        ctx.font = `${level.fontSize}px Inter, sans-serif`;
        ctx.textBaseline = 'middle';

        const startAligned = Math.floor(visStart / level.tickInterval) * level.tickInterval;
        for (let tick = startAligned; tick <= visEnd; tick += level.tickInterval) {
          if (tick < 0) continue;
          if (level !== levels[0] && tick % levels[0].tickInterval === 0) continue;
          const x = tickToPixel(tick, currentZoom, currentScrollLeft);
          if (x < -50 || x > cw + 50) continue;
          ctx.fillText(level.format(tick), x + 4, rulerY + RULER_HEIGHT / 2);
        }
      }

      // Time display at primary marks (when zoomed in enough)
      if (currentPpb >= 30) {
        ctx.fillStyle = 'rgba(122, 122, 144, 0.3)';
        ctx.font = '8px Inter, sans-serif';
        ctx.textBaseline = 'bottom';
        const primaryLevelInterval = levels[0].tickInterval;
        const startAligned = Math.floor(visStart / primaryLevelInterval) * primaryLevelInterval;
        for (let tick = startAligned; tick <= visEnd; tick += primaryLevelInterval) {
          if (tick < 0) continue;
          const x = tickToPixel(tick, currentZoom, currentScrollLeft);
          if (x < -50 || x > cw + 50) continue;
          ctx.fillText(tickToTime(tick, state.bpm), x + 4, rulerY + RULER_HEIGHT - 2);
        }
      }

      // Marker flags (on top ruler)
      for (const marker of currentMarkers) {
        const mx = tickToPixel(marker.tick, currentZoom, currentScrollLeft);
        if (mx < -60 || mx > cw + 10) continue;

        ctx.fillStyle = marker.color;
        ctx.beginPath();
        ctx.moveTo(mx, rulerY + 2);
        ctx.lineTo(mx + 7, rulerY + 2);
        ctx.lineTo(mx + 7, rulerY + 12);
        ctx.lineTo(mx + 3.5, rulerY + 16);
        ctx.lineTo(mx, rulerY + 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = marker.color + 'cc';
        ctx.font = '9px Inter, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker.name, mx + 10, rulerY + 10);
      }

      // ── Chord name ruler ────────────────────────────────────────────────
      const chordRulerY = rulerY + RULER_HEIGHT;
      ctx.fillStyle = colorBg;
      ctx.fillRect(0, chordRulerY, cw, CHORD_RULER_HEIGHT);
      ctx.fillStyle = `rgba(${colorGridRgb}, 0.02)`;
      ctx.fillRect(0, chordRulerY, cw, CHORD_RULER_HEIGHT);

      // Bottom border
      ctx.strokeStyle = colorBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, chordRulerY + CHORD_RULER_HEIGHT);
      ctx.lineTo(cw, chordRulerY + CHORD_RULER_HEIGHT);
      ctx.stroke();

      // Chord regions
      const currentChordRegions = state.chordRegions;
      for (const region of currentChordRegions) {
        const x1 = tickToPixel(region.startTick, currentZoom, currentScrollLeft);
        const x2 = tickToPixel(region.endTick, currentZoom, currentScrollLeft);
        if (x2 < 0 || x1 > cw) continue;

        // Colored region fill (matches Prism harmonic colors)
        const [cr, cg, cb] = region.color;
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.15)`;
        ctx.fillRect(x1, chordRulerY, x2 - x1, CHORD_RULER_HEIGHT);

        // Chord name
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.85)`;
        ctx.font = '10px Inter, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(region.name, x1 + 6, chordRulerY + CHORD_RULER_HEIGHT / 2);

        // Right separator
        ctx.strokeStyle = `rgba(${colorGridRgb}, 0.06)`;
        ctx.beginPath();
        ctx.moveTo(x2, chordRulerY + 2);
        ctx.lineTo(x2, chordRulerY + CHORD_RULER_HEIGHT - 2);
        ctx.stroke();
      }

      // ── Bottom time ruler ─────────────────────────────────────────────
      ctx.fillStyle = colorBg;
      ctx.fillRect(0, timeRulerY, cw, TIME_RULER_HEIGHT);
      ctx.fillStyle = `rgba(${colorGridRgb}, 0.03)`;
      ctx.fillRect(0, timeRulerY, cw, TIME_RULER_HEIGHT);

      // Top border
      ctx.strokeStyle = colorBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, timeRulerY);
      ctx.lineTo(cw, timeRulerY);
      ctx.stroke();

      // Time labels
      const showTenths = currentPpb >= 80;
      const timeLevels = rulerMarkings(currentZoom, state.bpm);
      const primaryInterval = timeLevels[0].tickInterval;

      ctx.fillStyle = `rgba(${colorGridRgb}, 0.3)`;
      ctx.font = '9px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      const trStartAligned = Math.floor(visStart / primaryInterval) * primaryInterval;
      for (let tick = trStartAligned; tick <= visEnd; tick += primaryInterval) {
        if (tick < 0) continue;
        const x = tickToPixel(tick, currentZoom, currentScrollLeft);
        if (x < -50 || x > cw + 50) continue;
        ctx.fillText(tickToTimePrecise(tick, state.bpm, showTenths), x + 4, timeRulerY + TIME_RULER_HEIGHT / 2);
      }

      if (timeLevels.length > 1) {
        const secondaryInterval = timeLevels[1].tickInterval;
        ctx.fillStyle = 'rgba(122, 122, 144, 0.3)';
        ctx.font = '8px Inter, sans-serif';
        const trSecStart = Math.floor(visStart / secondaryInterval) * secondaryInterval;
        for (let tick = trSecStart; tick <= visEnd; tick += secondaryInterval) {
          if (tick < 0) continue;
          if (tick % primaryInterval === 0) continue;
          const x = tickToPixel(tick, currentZoom, currentScrollLeft);
          if (x < -50 || x > cw + 50) continue;
          ctx.fillText(tickToTimePrecise(tick, state.bpm, showTenths), x + 4, timeRulerY + TIME_RULER_HEIGHT / 2);
        }
      }

      clipRectsRef.current = newClipRects;
    },
    [tracks, gridSize],
  );

  // ── Redraw triggers ───────────────────────────────────────────────
  useEffect(() => {
    draw();
  }, [tracks, bpm, draw, selectedClipId, loopEnabled, loopStart, loopEnd, zoom, scrollLeft, markers]);

  // ── Redraw on vertical scroll (sticky rulers) ────────────────────
  useEffect(() => {
    const el = canvasRef.current?.parentElement?.parentElement?.parentElement;
    if (!el) return;
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(draw);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [draw]);

  // ── CSS Playhead position ──────────────────────────────────────────
  const playheadPx = useMemo(
    () => tickToPixel(position, zoom, scrollLeft),
    [position, zoom, scrollLeft],
  );

  // ── Mouse coord helper ─────────────────────────────────────────────

  const getScrollTop = useCallback(() => {
    const el = canvasRef.current?.parentElement?.parentElement?.parentElement;
    return el?.scrollTop ?? 0;
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const hitTestClip = useCallback((x: number, y: number): ClipRect | null => {
    for (let i = clipRectsRef.current.length - 1; i >= 0; i--) {
      const r = clipRectsRef.current[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return r;
      }
    }
    return null;
  }, []);

  const isNearRightEdge = useCallback((x: number, clipRect: ClipRect): boolean => {
    return x >= clipRect.x + clipRect.w - RESIZE_EDGE_PX;
  }, []);

  // ── Mouse down ─────────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const state = useStore.getState();
      const activeTool = state.activeTool;
      const currentZoom = state.timelineZoom;
      const currentScrollLeft = state.timelineScrollLeft;

      // Ruler click: check loop handles, then marker handles, then seek
      const st = getScrollTop();
      if (y >= st && y < st + RULERS_HEIGHT) {
        if (state.loopEnabled) {
          const lx1 = tickToPixel(state.loopStart, currentZoom, currentScrollLeft);
          const lx2 = tickToPixel(state.loopEnd, currentZoom, currentScrollLeft);
          if (Math.abs(x - lx1) < 10) {
            loopDragRef.current = 'start';
            return;
          }
          if (Math.abs(x - lx2) < 10) {
            loopDragRef.current = 'end';
            return;
          }
        }
        // Check marker handles
        for (const marker of state.markers) {
          const mx = tickToPixel(marker.tick, currentZoom, currentScrollLeft);
          if (Math.abs(x - mx) < 10 && y < st + 18) {
            markerDragRef.current = marker.id;
            return;
          }
        }
        const tick = pixelToTick(x, currentZoom, currentScrollLeft);
        seekTo(doSnap(tick));
        state.setSelectedClip(null, null);
        return;
      }

      // Cursor tool: clip interaction
      if (activeTool === 'cursor') {
        const hit = hitTestClip(x, y);

        if (hit) {
          state.setSelectedClip(hit.clipId, hit.trackId);

          const mode = isNearRightEdge(x, hit) ? 'resize' : 'move';

          dragRef.current = {
            clipId: hit.clipId,
            trackId: hit.trackId,
            originTrackIndex: hit.trackIndex,
            offsetX: x - hit.x,
            startTickOrigin: hit.startTick,
            mode,
          };
          dragTickRef.current = hit.startTick;
          dragTrackRef.current = hit.trackIndex;
        } else {
          state.setSelectedClip(null, null);
          const tick = pixelToTick(x, currentZoom, currentScrollLeft);
          seekTo(doSnap(tick));
        }
      }

      // Scissors tool: split clip at click position
      if (activeTool === 'scissors') {
        const hit = hitTestClip(x, y);
        if (!hit) return;

        const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
        const splitTick = doSnap(rawTick);
        const track = state.tracks.find((t) => t.id === hit.trackId);
        if (!track) return;

        // Try MIDI clip split
        const midiClip = track.midiClips.find((c) => c.id === hit.clipId);
        if (midiClip) {
          const clipEnd = midiClip.durationTicks
            ? midiClip.startTick + midiClip.durationTicks
            : midiClip.events.reduce(
                (max, ev) => Math.max(max, ev.startTick + ev.durationTicks),
                midiClip.startTick,
              );
          if (splitTick <= midiClip.startTick || splitTick >= clipEnd) return;

          const leftEvents = midiClip.events.filter((ev) => ev.startTick < splitTick);
          const rightEvents = midiClip.events.filter((ev) => ev.startTick >= splitTick);

          const leftId = `clip-split-${crypto.randomUUID().slice(0, 8)}`;
          const rightId = `clip-split-${crypto.randomUUID().slice(0, 8)}`;

          state.removeMidiClip(hit.trackId, midiClip.id);
          state.addMidiClip(hit.trackId, {
            ...midiClip,
            id: leftId,
            events: leftEvents,
            durationTicks: splitTick - midiClip.startTick,
          });
          state.addMidiClip(hit.trackId, {
            ...midiClip,
            id: rightId,
            startTick: splitTick,
            events: rightEvents,
            durationTicks: clipEnd - splitTick,
          });
          state.setSelectedClip(rightId, hit.trackId);
          return;
        }

        // Audio clip split
        const audioClip = track.audioClips.find((c) => c.id === hit.clipId);
        if (audioClip) {
          const clipEnd = audioClip.startTick + audioClip.duration;
          if (splitTick <= audioClip.startTick || splitTick >= clipEnd) return;

          const buffer = getAudioBuffer(audioClip.id);
          if (!buffer) return;

          const bpm = state.bpm;
          const offsetTicks = splitTick - audioClip.startTick;
          const offsetSeconds = (offsetTicks / 480) * (60 / bpm);
          const splitSample = Math.round(offsetSeconds * buffer.sampleRate);

          const rawCtx = Tone.getContext().rawContext;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = (rawCtx as any)._nativeContext ?? rawCtx as AudioContext;

          const leftBuffer = sliceBuffer(ctx, buffer, 0, splitSample);
          const rightBuffer = sliceBuffer(ctx, buffer, splitSample, buffer.length);

          const leftId = `clip-split-${crypto.randomUUID().slice(0, 8)}`;
          const rightId = `clip-split-${crypto.randomUUID().slice(0, 8)}`;

          setAudioBuffer(leftId, leftBuffer);
          setAudioBuffer(rightId, rightBuffer);
          removeAudioBuffer(audioClip.id);

          state.removeAudioClip(hit.trackId, audioClip.id);
          state.addAudioClip(hit.trackId, {
            id: leftId,
            startTick: audioClip.startTick,
            duration: offsetTicks,
            fadeInTicks: audioClip.fadeInTicks,
            fadeOutTicks: 0,
          });
          state.addAudioClip(hit.trackId, {
            id: rightId,
            startTick: splitTick,
            duration: audioClip.duration - offsetTicks,
            fadeInTicks: 0,
            fadeOutTicks: audioClip.fadeOutTicks,
          });
          state.setSelectedClip(rightId, hit.trackId);
        }
      }
    },
    [getCanvasCoords, getScrollTop, hitTestClip, isNearRightEdge, doSnap],
  );

  // Double-click: ruler → add marker, clip → open Piano Roll
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const st = getScrollTop();
      if (y >= st && y < st + RULERS_HEIGHT) {
        const state = useStore.getState();
        const currentZoom = state.timelineZoom;
        const currentScrollLeft = state.timelineScrollLeft;
        const currentSnapTicks = state.timelineSnapEnabled
          ? ALL_GRID_VALUES[state.timelineGridSize]
          : TICKS_PER_BAR;
        const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
        const snapped = snapTick(rawTick, currentSnapTicks);
        const nextNum = state.markers.length + 1;
        state.addMarker(snapped, `Marker ${nextNum}`);
        return;
      }
      const hit = hitTestClip(x, y);
      if (hit) {
        const hitTrack = useStore.getState().tracks.find((t) => t.id === hit.trackId);
        if (hitTrack?.instrument !== 'drum-machine') {
          useStore.getState().setEditingClip(hit.clipId, hit.trackId);
        }
      }
    },
    [getCanvasCoords, getScrollTop, hitTestClip],
  );

  // ── Context menu (right-click) ────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const st = getScrollTop();
      const state = useStore.getState();
      const currentZoom = state.timelineZoom;
      const currentScrollLeft = state.timelineScrollLeft;
      const currentSnapTicks = state.timelineSnapEnabled
        ? ALL_GRID_VALUES[state.timelineGridSize]
        : TICKS_PER_BAR;

      // Check audio clip hit first
      if (y >= st + RULERS_HEIGHT) {
        const hit = hitTestClip(x, y);
        if (hit) {
          const track = state.tracks.find((t) => t.id === hit.trackId);
          const audioClip = track?.audioClips.find((c) => c.id === hit.clipId);
          if (audioClip) {
            e.preventDefault();
            state.setSelectedClip(hit.clipId, hit.trackId);
            setCtxMenu({
              x: e.clientX,
              y: e.clientY,
              markerId: null,
              tick: 0,
              audioClipId: hit.clipId,
              audioTrackId: hit.trackId,
            });
            return;
          }
        }
      }

      // Ruler area: marker context menu
      if (y < st || y >= st + RULERS_HEIGHT) return;

      e.preventDefault();

      // Check if near an existing marker (flag + name label area)
      let hitMarkerId: string | null = null;
      for (const marker of state.markers) {
        const mx = tickToPixel(marker.tick, currentZoom, currentScrollLeft);
        if (x >= mx - 5 && x <= mx + 70) {
          hitMarkerId = marker.id;
          break;
        }
      }

      const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
      const snapped = snapTick(rawTick, currentSnapTicks);

      setCtxMenu({ x: e.clientX, y: e.clientY, markerId: hitMarkerId, tick: snapped });
    },
    [getCanvasCoords, getScrollTop, hitTestClip],
  );

  const handleCtxMenuRename = useCallback(() => {
    if (!ctxMenu?.markerId) return;
    const marker = useStore.getState().markers.find((m) => m.id === ctxMenu.markerId);
    const newName = prompt('Marker name:', marker?.name ?? '');
    if (newName !== null && newName.trim()) {
      useStore.getState().updateMarker(ctxMenu.markerId, { name: newName.trim() });
    }
    setCtxMenu(null);
  }, [ctxMenu]);

  const handleCtxMenuDelete = useCallback(() => {
    if (!ctxMenu?.markerId) return;
    useStore.getState().removeMarker(ctxMenu.markerId);
    setCtxMenu(null);
  }, [ctxMenu]);

  const handleCtxMenuAdd = useCallback(() => {
    if (!ctxMenu) return;
    const state = useStore.getState();
    const nextNum = state.markers.length + 1;
    state.addMarker(ctxMenu.tick, `Marker ${nextNum}`);
    setCtxMenu(null);
  }, [ctxMenu]);

  // ── Audio clip context menu handlers ──

  const handleCtxFadeIn = useCallback(() => {
    if (!ctxMenu?.audioClipId || !ctxMenu.audioTrackId) return;
    const state = useStore.getState();
    const track = state.tracks.find((t) => t.id === ctxMenu.audioTrackId);
    const clip = track?.audioClips.find((c) => c.id === ctxMenu.audioClipId);
    if (!clip) { setCtxMenu(null); return; }
    // Toggle: if already has fade, remove it; otherwise set to 1 beat
    const newFade = clip.fadeInTicks > 0 ? 0 : 480;
    state.updateAudioClip(ctxMenu.audioTrackId, ctxMenu.audioClipId, { fadeInTicks: newFade });
    setCtxMenu(null);
  }, [ctxMenu]);

  const handleCtxFadeOut = useCallback(() => {
    if (!ctxMenu?.audioClipId || !ctxMenu.audioTrackId) return;
    const state = useStore.getState();
    const track = state.tracks.find((t) => t.id === ctxMenu.audioTrackId);
    const clip = track?.audioClips.find((c) => c.id === ctxMenu.audioClipId);
    if (!clip) { setCtxMenu(null); return; }
    const newFade = clip.fadeOutTicks > 0 ? 0 : 480;
    state.updateAudioClip(ctxMenu.audioTrackId, ctxMenu.audioClipId, { fadeOutTicks: newFade });
    setCtxMenu(null);
  }, [ctxMenu]);

  const handleCtxSplitAtPlayhead = useCallback(() => {
    if (!ctxMenu?.audioClipId || !ctxMenu.audioTrackId) return;
    const state = useStore.getState();
    const track = state.tracks.find((t) => t.id === ctxMenu.audioTrackId);
    const clip = track?.audioClips.find((c) => c.id === ctxMenu.audioClipId);
    if (!clip) { setCtxMenu(null); return; }

    const splitTick = state.position;
    const clipEnd = clip.startTick + clip.duration;
    if (splitTick <= clip.startTick || splitTick >= clipEnd) { setCtxMenu(null); return; }

    const buffer = getAudioBuffer(clip.id);
    if (!buffer) { setCtxMenu(null); return; }

    const offsetTicks = splitTick - clip.startTick;
    const offsetSeconds = (offsetTicks / 480) * (60 / state.bpm);
    const splitSample = Math.round(offsetSeconds * buffer.sampleRate);

    const rawCtx = Tone.getContext().rawContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (rawCtx as any)._nativeContext ?? rawCtx as AudioContext;

    const leftBuffer = sliceBuffer(ctx, buffer, 0, splitSample);
    const rightBuffer = sliceBuffer(ctx, buffer, splitSample, buffer.length);

    const leftId = `clip-split-${crypto.randomUUID().slice(0, 8)}`;
    const rightId = `clip-split-${crypto.randomUUID().slice(0, 8)}`;

    setAudioBuffer(leftId, leftBuffer);
    setAudioBuffer(rightId, rightBuffer);
    removeAudioBuffer(clip.id);

    state.removeAudioClip(ctxMenu.audioTrackId, clip.id);
    state.addAudioClip(ctxMenu.audioTrackId, {
      id: leftId,
      startTick: clip.startTick,
      duration: offsetTicks,
      fadeInTicks: clip.fadeInTicks,
      fadeOutTicks: 0,
    });
    state.addAudioClip(ctxMenu.audioTrackId, {
      id: rightId,
      startTick: splitTick,
      duration: clip.duration - offsetTicks,
      fadeInTicks: 0,
      fadeOutTicks: clip.fadeOutTicks,
    });
    state.setSelectedClip(rightId, ctxMenu.audioTrackId);
    setCtxMenu(null);
  }, [ctxMenu]);

  const handleCtxDuplicate = useCallback(() => {
    if (!ctxMenu?.audioClipId || !ctxMenu.audioTrackId) return;
    const state = useStore.getState();
    const track = state.tracks.find((t) => t.id === ctxMenu.audioTrackId);
    const clip = track?.audioClips.find((c) => c.id === ctxMenu.audioClipId);
    if (!clip) { setCtxMenu(null); return; }

    const srcBuffer = getAudioBuffer(clip.id);
    if (!srcBuffer) { setCtxMenu(null); return; }

    const newId = `clip-dup-${crypto.randomUUID().slice(0, 8)}`;
    setAudioBuffer(newId, srcBuffer);
    state.addAudioClip(ctxMenu.audioTrackId, {
      ...structuredClone(clip),
      id: newId,
      startTick: clip.startTick + clip.duration,
    });
    state.setSelectedClip(newId, ctxMenu.audioTrackId);
    setCtxMenu(null);
  }, [ctxMenu]);

  const handleCtxDeleteClip = useCallback(() => {
    if (!ctxMenu?.audioClipId || !ctxMenu.audioTrackId) return;
    removeAudioBuffer(ctxMenu.audioClipId);
    useStore.getState().removeAudioClip(ctxMenu.audioTrackId, ctxMenu.audioClipId);
    useStore.getState().setSelectedClip(null, null);
    setCtxMenu(null);
  }, [ctxMenu]);

  // ── Mouse move ─────────────────────────────────────────────────────

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = useStore.getState();
      const currentZoom = state.timelineZoom;
      const currentScrollLeft = state.timelineScrollLeft;
      const currentSnapTicks = state.timelineSnapEnabled
        ? ALL_GRID_VALUES[state.timelineGridSize]
        : TICKS_PER_BEAT;

      // Marker drag
      if (markerDragRef.current) {
        const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
        const snapped = snapTick(rawTick, currentSnapTicks);
        state.updateMarker(markerDragRef.current, { tick: snapped });
        canvas.style.cursor = 'col-resize';
        if (!state.isPlaying) draw();
        return;
      }

      // Loop handle drag
      if (loopDragRef.current) {
        const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
        const snapped = snapTick(rawTick, currentSnapTicks);
        if (loopDragRef.current === 'start') {
          state.setLoopRange(Math.min(snapped, state.loopEnd - currentSnapTicks), state.loopEnd);
        } else {
          state.setLoopRange(state.loopStart, Math.max(snapped, state.loopStart + currentSnapTicks));
        }
        canvas.style.cursor = 'col-resize';
        if (!state.isPlaying) draw();
        return;
      }

      const drag = dragRef.current;

      if (drag) {
        if (drag.mode === 'move') {
          const rawTick = pixelToTick(x - drag.offsetX, currentZoom, currentScrollLeft);
          dragTickRef.current = snapTick(rawTick, currentSnapTicks);
          const trackIdx = Math.floor((y - RULERS_HEIGHT) / TRACK_HEIGHT);
          dragTrackRef.current = Math.max(0, Math.min(tracks.length - 1, trackIdx));
          if (!state.isPlaying) {
            draw();
          }
        }
        canvas.style.cursor = drag.mode === 'resize' ? 'col-resize' : 'grabbing';
        return;
      }

      // Cursor hint — ruler area
      const st = getScrollTop();
      if (y >= st && y < st + RULERS_HEIGHT) {
        // Marker handles (flag + name label area)
        for (const marker of state.markers) {
          const mx = tickToPixel(marker.tick, currentZoom, currentScrollLeft);
          if (x >= mx - 5 && x <= mx + 70 && y < st + 20) {
            canvas.style.cursor = 'grab';
            return;
          }
        }
        // Loop handles
        if (state.loopEnabled) {
          const lx1 = tickToPixel(state.loopStart, currentZoom, currentScrollLeft);
          const lx2 = tickToPixel(state.loopEnd, currentZoom, currentScrollLeft);
          if (Math.abs(x - lx1) < 10 || Math.abs(x - lx2) < 10) {
            canvas.style.cursor = 'col-resize';
            return;
          }
        }
      }
      if (y > st + RULERS_HEIGHT) {
        const hit = hitTestClip(x, y);
        if (state.activeTool === 'scissors' && hit) {
          canvas.style.cursor = 'crosshair';
        } else if (hit && isNearRightEdge(x, hit)) {
          canvas.style.cursor = 'col-resize';
        } else if (hit) {
          canvas.style.cursor = 'grab';
        } else {
          canvas.style.cursor = 'default';
        }
      } else {
        canvas.style.cursor = 'default';
      }
    },
    [getCanvasCoords, getScrollTop, hitTestClip, isNearRightEdge, draw, tracks.length],
  );

  // ── Mouse up ───────────────────────────────────────────────────────

  const handleCanvasMouseUp = useCallback(
    () => {
      if (markerDragRef.current) {
        markerDragRef.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
        return;
      }
      if (loopDragRef.current) {
        loopDragRef.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;

      const state = useStore.getState();

      if (drag.mode === 'move') {
        const newTick = dragTickRef.current;
        const newTrackIdx = dragTrackRef.current;
        const freshTracks = state.tracks;
        const originTrack = freshTracks[drag.originTrackIndex];
        const targetTrack = freshTracks[newTrackIdx];

        if (originTrack && targetTrack) {
          // Try MIDI clip first
          const midiClip = originTrack.midiClips.find((c) => c.id === drag.clipId);
          if (midiClip) {
            if (originTrack.id === targetTrack.id) {
              if (newTick !== drag.startTickOrigin) {
                state.updateMidiClip(originTrack.id, drag.clipId, { startTick: newTick });
              }
            } else {
              state.removeMidiClip(originTrack.id, drag.clipId);
              state.addMidiClip(targetTrack.id, { ...midiClip, startTick: newTick });
              state.setSelectedClip(midiClip.id, targetTrack.id);
            }
          } else {
            // Audio clip move
            const audioClip = originTrack.audioClips.find((c) => c.id === drag.clipId);
            if (audioClip) {
              if (originTrack.id === targetTrack.id) {
                if (newTick !== drag.startTickOrigin) {
                  state.updateAudioClip(originTrack.id, drag.clipId, { startTick: newTick });
                }
              } else {
                state.removeAudioClip(originTrack.id, drag.clipId);
                state.addAudioClip(targetTrack.id, { ...audioClip, startTick: newTick });
                state.setSelectedClip(audioClip.id, targetTrack.id);
              }
            }
          }
        }
      }

      dragRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';

      if (!state.isPlaying) {
        draw();
      }
    },
    [draw],
  );

  // Global mouseup listener for drag release outside canvas
  useEffect(() => {
    const handleGlobalUp = () => {
      if (dragRef.current || loopDragRef.current) {
        handleCanvasMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, [handleCanvasMouseUp]);

  // ── Wheel: zoom (Cmd/Ctrl) + horizontal scroll (Shift/trackpad) ────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        // Zoom at cursor position
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.03 : 0.03;
        const rect = canvas.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        useStore.getState().zoomAtPoint(delta, cursorX + useStore.getState().timelineScrollLeft);
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal scroll (shift+wheel or trackpad horizontal gesture)
        e.preventDefault();
        const dx = e.shiftKey ? e.deltaY : e.deltaX;
        const state = useStore.getState();
        const maxScroll = Math.max(0, (projectLengthTicks / TICKS_PER_BEAT) * pixelsPerBeat(state.timelineZoom) - (canvas.parentElement?.clientWidth ?? 800));
        state.setTimelineScrollLeft(Math.min(maxScroll, state.timelineScrollLeft + dx));
      }
      // else: vertical scroll — let container handle it naturally
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [projectLengthTicks]);

  // ── Drag-and-drop .mid files ─────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();

    // ── Library item drops (instruments, templates, etc.) ───────────
    const libraryData = e.dataTransfer.getData(DRAG_MIME);
    if (libraryData) {
      const payload: DragPayload = JSON.parse(libraryData);
      const st = useStore.getState();
      if (payload.kind === 'instrument') {
        const id = st.addTrack('midi', payload.instrumentType, payload.instrumentType);
        st.setSelectedTrackId(id);
      } else if (payload.kind === 'template') {
        const id = st.addTrack(payload.trackType, payload.instrument, payload.name);
        st.setSelectedTrackId(id);
      } else if (payload.kind === 'drum-sample') {
        try {
          const resp = await fetch(payload.url);
          if (!resp.ok) throw new Error(`Failed to fetch sample: ${resp.status}`);
          const arrayBuf = await resp.arrayBuffer();
          const ctx = new AudioContext();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          const trackId = st.addTrack('audio', 'none', payload.name, '#f59e0b');
          st.setSelectedTrackId(trackId);
          const clipId = `clip-sample-${crypto.randomUUID().slice(0, 8)}`;
          const durationTicks = Math.round((audioBuf.duration / 60) * st.bpm * 480);
          setAudioBuffer(clipId, audioBuf);
          st.addAudioClip(trackId, {
            id: clipId,
            startTick: 0,
            duration: durationTicks,
            fadeInTicks: 0,
            fadeOutTicks: 0,
          });
        } catch (err) {
          console.error('Failed to load drum sample:', err);
        }
      } else if (payload.kind === 'midi-loop') {
        try {
          const resp = await fetch(payload.url);
          if (!resp.ok) throw new Error(`Failed to fetch MIDI loop: ${resp.status}`);
          const arrayBuf = await resp.arrayBuffer();
          const sequences = importMidiFile(arrayBuf);
          const OUR_PPQ = 480;
          for (let i = 0; i < sequences.length; i++) {
            const seq = sequences[i];
            const ppq = seq.ticksPerQuarterNote;
            const instrument = payload.instrument ?? 'soundfont';
            const color = instrument === 'drum-machine' ? '#f59e0b' : '#8b5cf6';
            const trackId = st.addTrack('midi', instrument, payload.name, color);
            st.setSelectedTrackId(trackId);
            const events: MidiNoteEvent[] = seq.events.map((ev: MidiNoteEvent) => ({
              ...ev,
              startTick: ppq === OUR_PPQ ? ev.startTick : Math.round(ev.startTick * OUR_PPQ / ppq),
              durationTicks: ppq === OUR_PPQ ? ev.durationTicks : Math.round(ev.durationTicks * OUR_PPQ / ppq),
            }));
            st.addMidiClip(trackId, {
              id: `clip-loop-${crypto.randomUUID().slice(0, 8)}`,
              name: payload.name,
              startTick: 0,
              events,
            });
          }
        } catch (err) {
          console.error('Failed to load MIDI loop:', err);
        }
      }
      return;
    }

    // ── .mid / .midi file drops ─────────────────────────────────────
    const file = e.dataTransfer.files[0];
    if (!file || (!file.name.endsWith('.mid') && !file.name.endsWith('.midi'))) return;

    const OUR_PPQ = 480;
    const arrayBuffer = await file.arrayBuffer();
    const sequences = importMidiFile(arrayBuffer);
    const state = useStore.getState();
    const COLORS = ['#8b5cf6', '#a855f7', '#f59e0b', '#f97316', '#22c55e', '#3b82f6', '#ef4444', '#06b6d4'];

    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];
      const ppq = seq.ticksPerQuarterNote;
      const color = COLORS[i % COLORS.length];
      const trackId = state.addTrack('midi', 'oracle-synth', seq.trackName, color);

      const events: MidiNoteEvent[] = seq.events.map((ev: MidiNoteEvent) => ({
        ...ev,
        startTick: ppq === OUR_PPQ ? ev.startTick : Math.round(ev.startTick * OUR_PPQ / ppq),
        durationTicks: ppq === OUR_PPQ ? ev.durationTicks : Math.round(ev.durationTicks * OUR_PPQ / ppq),
      }));

      state.addMidiClip(trackId, {
        id: `clip-drop-${crypto.randomUUID().slice(0, 8)}`,
        name: seq.trackName,
        startTick: 0,
        events,
      });
    }
  }, []);

  // ── Scrollbar ──────────────────────────────────────────────────────

  const totalContentWidth = (projectLengthTicks / TICKS_PER_BEAT) * ppb;
  const containerWidth = canvasRef.current?.parentElement?.clientWidth ?? 800;
  const showScrollbar = totalContentWidth > containerWidth;
  const thumbWidth = showScrollbar ? Math.max(30, (containerWidth / totalContentWidth) * containerWidth) : 0;
  const maxScroll = Math.max(1, totalContentWidth - containerWidth);
  const thumbLeft = showScrollbar ? (scrollLeft / maxScroll) * (containerWidth - thumbWidth) : 0;

  const scrollbarDragRef = useRef<{ startX: number; startScroll: number } | null>(null);

  const handleScrollbarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    scrollbarDragRef.current = { startX: e.clientX, startScroll: scrollLeft };

    const handleMove = (me: MouseEvent) => {
      if (!scrollbarDragRef.current) return;
      const dx = me.clientX - scrollbarDragRef.current.startX;
      const scrollDelta = (dx / (containerWidth - thumbWidth)) * maxScroll;
      useStore.getState().setTimelineScrollLeft(
        Math.max(0, Math.min(maxScroll, scrollbarDragRef.current.startScroll + scrollDelta)),
      );
    };
    const handleUp = () => {
      scrollbarDragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [scrollLeft, containerWidth, thumbWidth, maxScroll]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-bg)]" style={{ minHeight: '100%' }}>
      <div className="flex-1 overflow-x-hidden relative">
        <canvas
          ref={canvasRef}
          className="block"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onDoubleClick={handleCanvasDoubleClick}
          onContextMenu={handleContextMenu}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        {/* CSS playhead — GPU-accelerated, no canvas redraw needed */}
        {playheadPx >= -2 && playheadPx <= (containerWidth + 2) && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              width: 2,
              backgroundColor: '#ef4444',
              transform: `translateX(${playheadPx}px)`,
              willChange: 'transform',
            }}
          />
        )}
      </div>
      {/* Marker context menu */}
      {ctxMenu && (
        <>
          {/* Backdrop to dismiss */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}
          />
          <div
            className="fixed z-50 rounded-md py-1 shadow-lg"
            style={{
              left: ctxMenu.x,
              top: ctxMenu.y,
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              minWidth: 140,
            }}
          >
            {ctxMenu.audioClipId ? (
              <>
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                  style={{ color: 'var(--color-text)' }}
                  onClick={handleCtxFadeIn}
                >
                  {(() => {
                    const t = tracks.find((t) => t.id === ctxMenu.audioTrackId);
                    const c = t?.audioClips.find((c) => c.id === ctxMenu.audioClipId);
                    return c && c.fadeInTicks > 0 ? 'Remove Fade In' : 'Fade In';
                  })()}
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                  style={{ color: 'var(--color-text)' }}
                  onClick={handleCtxFadeOut}
                >
                  {(() => {
                    const t = tracks.find((t) => t.id === ctxMenu.audioTrackId);
                    const c = t?.audioClips.find((c) => c.id === ctxMenu.audioClipId);
                    return c && c.fadeOutTicks > 0 ? 'Remove Fade Out' : 'Fade Out';
                  })()}
                </button>
                <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '2px 0' }} />
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                  style={{ color: 'var(--color-text)' }}
                  onClick={handleCtxSplitAtPlayhead}
                >
                  Split at Playhead
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                  style={{ color: 'var(--color-text)' }}
                  onClick={handleCtxDuplicate}
                >
                  Duplicate
                </button>
                <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '2px 0' }} />
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                  style={{ color: '#ef4444' }}
                  onClick={handleCtxDeleteClip}
                >
                  Delete
                </button>
              </>
            ) : ctxMenu.markerId ? (
              <>
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                  style={{ color: 'var(--color-text)' }}
                  onClick={handleCtxMenuRename}
                >
                  Rename Marker
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                  style={{ color: '#ef4444' }}
                  onClick={handleCtxMenuDelete}
                >
                  Delete Marker
                </button>
              </>
            ) : (
              <button
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                style={{ color: 'var(--color-text)' }}
                onClick={handleCtxMenuAdd}
              >
                Add Marker Here
              </button>
            )}
          </div>
        </>
      )}
      {/* Horizontal scrollbar */}
      {showScrollbar && (
        <div
          className="h-3 shrink-0"
          style={{ backgroundColor: 'var(--color-grid-line)', position: 'sticky', bottom: 0 }}
        >
          <div
            className="absolute top-0.5 h-2 rounded-full cursor-pointer"
            style={{
              width: thumbWidth,
              left: thumbLeft,
              backgroundColor: 'var(--color-scrollbar-thumb)',
            }}
            onMouseDown={handleScrollbarMouseDown}
          />
        </div>
      )}
    </div>
  );
}

export { TRACK_HEIGHT, RULER_HEIGHT, CHORD_RULER_HEIGHT, TIME_RULER_HEIGHT };
