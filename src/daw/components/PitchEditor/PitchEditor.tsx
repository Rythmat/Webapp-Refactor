import { useRef, useEffect, useCallback, useState } from 'react';
import { MousePointer2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import {
  hzToMidi,
  type PitchSegment,
} from '@/daw/audio/pitch-analysis/PitchAnalyzer';
import type { PitchEdit } from '@/daw/store/tracksSlice';
import { getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { useStore } from '@/daw/store';

// ── Constants ───────────────────────────────────────────────────────────────
const KEYS_WIDTH = 48;
const RULER_H = 24;
const TOOLBAR_H = 36;
const ROW_H = 14;
const TICKS_PER_BEAT = 480;
const BEATS_PER_BAR = 4;

const VIEW_MIN = 36; // C2
const VIEW_MAX = 84; // C6
const VIEW_RANGE = VIEW_MAX - VIEW_MIN + 1; // 49 notes

// ── Note helpers ────────────────────────────────────────────────────────────
const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
function noteName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
function isBlackKey(midi: number): boolean {
  const n = midi % 12;
  return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
}

// ── Drag state ──────────────────────────────────────────────────────────────
interface SegmentDrag {
  segmentId: string;
  originalNote: number;
  offsetPitch: number;
}

// ── Props ───────────────────────────────────────────────────────────────────
interface PitchEditorProps {
  segments: PitchSegment[];
  edits: PitchEdit[];
  clipId: string;
  clipStartTick: number;
  clipDurationTicks: number;
  clipColor: string;
  bpm: number;
  onEditSegment: (segmentId: string, targetMidiNote: number) => void;
  onRemoveEdit: (segmentId: string) => void;
  onResetAll: () => void;
}

export function PitchEditor({
  segments,
  edits,
  clipId,
  clipStartTick,
  clipDurationTicks,
  clipColor,
  bpm,
  onEditSegment,
  onRemoveEdit,
  onResetAll,
}: PitchEditorProps) {
  // Refs — 3 canvases + 3 scroll containers
  const pianoCanvasRef = useRef<HTMLCanvasElement>(null);
  const rulerCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const pianoScrollRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const [selectedSegId, setSelectedSegId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const dragRef = useRef<SegmentDrag | null>(null);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const editsRef = useRef(edits);
  editsRef.current = edits;
  const initialScrollDone = useRef(false);
  const lastEditRef = useRef<{ segmentId: string; prevNote: number } | null>(
    null,
  );
  const segRectsRef = useRef<
    { id: string; x: number; y: number; w: number; h: number }[]
  >([]);

  // Subscribe to transport for playback cursor
  const isPlaying = useStore((s) => s.isPlaying);
  const position = useStore((s) => s.position);

  // Pixel scale
  const ticksPerSecond = (bpm / 60) * TICKS_PER_BEAT;
  const totalTicks = Math.max(clipDurationTicks, TICKS_PER_BEAT * 8);
  const pixelsPerTick = (40 / TICKS_PER_BEAT) * zoom;
  const gridW = totalTicks * pixelsPerTick;
  const gridH = VIEW_RANGE * ROW_H;

  // Segment position helpers
  const msToTick = (ms: number) => (ms / 1000) * ticksPerSecond;
  const segToX = (seg: PitchSegment) =>
    msToTick(seg.startTimeMs) * pixelsPerTick;
  const segToW = (seg: PitchSegment) =>
    Math.max(
      3,
      (msToTick(seg.endTimeMs) - msToTick(seg.startTimeMs)) * pixelsPerTick,
    );

  const getSegNote = (seg: PitchSegment): number => {
    const edit = editsRef.current.find((e) => e.segmentId === seg.id);
    return edit ? edit.targetMidiNote : seg.midiNote;
  };

  // ── Draw Piano Keys ─────────────────────────────────────────────────────
  const drawPiano = useCallback(() => {
    const canvas = pianoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    ctx.fillStyle = '#111118';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < VIEW_RANGE; i++) {
      const midiNote = VIEW_MAX - i;
      const rowY = i * ROW_H;
      const black = isBlackKey(midiNote);
      const isC = midiNote % 12 === 0;

      if (!black) {
        ctx.fillStyle = isC ? '#2a2a38' : '#222230';
        ctx.fillRect(0, rowY, w, ROW_H);
      } else {
        ctx.fillStyle = '#0e0e16';
        ctx.fillRect(0, rowY, w * 0.65, ROW_H);
        ctx.fillStyle = '#1a1a28';
        ctx.fillRect(w * 0.65, rowY, w * 0.35, ROW_H);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowY + ROW_H);
      ctx.lineTo(w, rowY + ROW_H);
      ctx.stroke();

      if (isC) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, rowY);
        ctx.lineTo(w, rowY);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = 'bold 8px Inter, monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillText(noteName(midiNote), w - 4, rowY + ROW_H / 2);
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w - 0.5, 0);
    ctx.lineTo(w - 0.5, h);
    ctx.stroke();
  }, [gridH]);

  // ── Draw Ruler ──────────────────────────────────────────────────────────
  const drawRuler = useCallback(() => {
    const canvas = rulerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = gridW;
    const h = RULER_H;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, 0, w, h);

    const totalBeats = Math.ceil(totalTicks / TICKS_PER_BEAT);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beat * TICKS_PER_BEAT * pixelsPerTick;
      const isBar = beat % BEATS_PER_BAR === 0;

      ctx.strokeStyle = isBar
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, isBar ? 0 : h * 0.5);
      ctx.lineTo(x, h);
      ctx.stroke();

      if (isBar) {
        const barNum = beat / BEATS_PER_BAR + 1;
        ctx.fillStyle = '#7a7a90';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(String(barNum), x + 4, h / 2);
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5);
    ctx.lineTo(w, h - 0.5);
    ctx.stroke();
  }, [gridW, totalTicks, pixelsPerTick]);

  // ── Draw Grid + Segments ──────────────────────────────────────────────
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = gridScrollRef.current;
    if (!container) return;

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

    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    // Row backgrounds + horizontal grid lines
    for (let i = 0; i < VIEW_RANGE; i++) {
      const midiNote = VIEW_MAX - i;
      const rowY = i * ROW_H;
      if (isBlackKey(midiNote)) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, rowY, w, ROW_H);
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

    // Vertical grid lines (beats + bars)
    const totalBeats = Math.ceil(totalTicks / TICKS_PER_BEAT);
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beat * TICKS_PER_BEAT * pixelsPerTick;
      const isBar = beat % BEATS_PER_BAR === 0;
      ctx.strokeStyle = isBar
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = isBar ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // ── Render pitch segments ─────────────────────────────────────────────
    const audioBuffer = getAudioBuffer(clipId);
    const cachedRects: {
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }[] = [];

    for (const seg of segmentsRef.current) {
      const edit = editsRef.current.find((e) => e.segmentId === seg.id);
      const displayNote = edit ? edit.targetMidiNote : seg.midiNote;

      if (displayNote < VIEW_MIN || displayNote > VIEW_MAX) continue;

      const x = segToX(seg);
      const segW = segToW(seg);
      const pitchIdx = VIEW_MAX - displayNote;
      const y = pitchIdx * ROW_H;
      const isSelected = selectedSegId === seg.id;

      cachedRects.push({ id: seg.id, x, y, w: segW, h: ROW_H });

      // Ghost outline at original position if edited
      if (edit && seg.midiNote !== edit.targetMidiNote) {
        const origIdx = VIEW_MAX - seg.midiNote;
        if (seg.midiNote >= VIEW_MIN && seg.midiNote <= VIEW_MAX) {
          const origY = origIdx * ROW_H;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.roundRect(x, origY + 1, segW, ROW_H - 2, 3);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Segment fill — tinted by cents deviation when not edited
      const alpha = isSelected ? 1.0 : 0.75;
      ctx.fillStyle = `${clipColor}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')}`;
      ctx.beginPath();
      ctx.roundRect(x, y + 1, segW, ROW_H - 2, 3);
      ctx.fill();

      // Cents deviation tint overlay (green=on-pitch, yellow=slightly off, red=very off)
      if (!edit) {
        const absCents = Math.abs(seg.centsOffset);
        if (absCents > 5) {
          const tintAlpha = Math.min(0.25, (absCents / 50) * 0.25);
          if (absCents < 20) {
            ctx.fillStyle = `rgba(255, 200, 50, ${tintAlpha})`; // yellow
          } else {
            ctx.fillStyle = `rgba(255, 80, 60, ${tintAlpha})`; // red
          }
          ctx.beginPath();
          ctx.roundRect(x, y + 1, segW, ROW_H - 2, 3);
          ctx.fill();
        }
      }

      // Waveform inside segment (Phase 8)
      if (audioBuffer && segW > 6) {
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor((seg.startTimeMs / 1000) * sampleRate);
        const endSample = Math.min(
          Math.floor((seg.endTimeMs / 1000) * sampleRate),
          audioBuffer.length,
        );
        if (endSample > startSample) {
          const channelData = audioBuffer.getChannelData(0);
          const numPeaks = Math.max(2, Math.floor(segW / 2));
          const samplesPerPeak = Math.floor(
            (endSample - startSample) / numPeaks,
          );
          const peaks: number[] = [];
          let maxPeak = 0;
          for (let p = 0; p < numPeaks; p++) {
            const s = startSample + p * samplesPerPeak;
            const e = Math.min(s + samplesPerPeak, endSample);
            let peak = 0;
            for (let j = s; j < e; j++) {
              const abs = Math.abs(channelData[j]);
              if (abs > peak) peak = abs;
            }
            peaks.push(peak);
            if (peak > maxPeak) maxPeak = peak;
          }

          if (maxPeak > 0) {
            const waveH = (ROW_H - 4) * 0.4;
            const centerY = y + ROW_H / 2;
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y + 1, segW, ROW_H - 2, 3);
            ctx.clip();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            const dx = segW / (numPeaks - 1 || 1);
            ctx.moveTo(x, centerY);
            for (let p = 0; p < numPeaks; p++) {
              const amp = (peaks[p] / maxPeak) * waveH;
              ctx.lineTo(x + p * dx, centerY - amp);
            }
            for (let p = numPeaks - 1; p >= 0; p--) {
              const amp = (peaks[p] / maxPeak) * waveH;
              ctx.lineTo(x + p * dx, centerY + amp);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Pitch contour line inside segment
      if (seg.pitchContour.length > 1 && segW > 8) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y + 1, segW, ROW_H - 2, 3);
        ctx.clip();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const dx = segW / (seg.pitchContour.length - 1);
        for (let i = 0; i < seg.pitchContour.length; i++) {
          const freq = seg.pitchContour[i];
          if (freq <= 0) continue;
          const midi = hzToMidi(freq);
          const centsFromNote = (midi - displayNote) * ROW_H;
          const py = y + ROW_H / 2 - centsFromNote;
          if (i === 0) ctx.moveTo(x + i * dx, py);
          else ctx.lineTo(x + i * dx, py);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Selection outline
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y + 1, segW, ROW_H - 2, 3);
        ctx.stroke();
      }

      // Edit indicator — small arrow showing shift direction
      if (edit && seg.midiNote !== edit.targetMidiNote) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '8px Inter, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const shift = edit.targetMidiNote - seg.midiNote;
        ctx.fillText(
          shift > 0 ? `+${shift}` : `${shift}`,
          x + 2,
          y + ROW_H / 2,
        );
      }
    }

    segRectsRef.current = cachedRects;

    // ── Playback cursor ─────────────────────────────────────────────────────
    if (isPlaying) {
      const cursorTick = position - clipStartTick;
      if (cursorTick >= 0 && cursorTick <= totalTicks) {
        const cursorX = cursorTick * pixelsPerTick;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, h);
        ctx.stroke();
      }
    }
  }, [
    segments,
    edits,
    selectedSegId,
    clipId,
    clipColor,
    gridW,
    gridH,
    totalTicks,
    pixelsPerTick,
    bpm,
    isPlaying,
    position,
    clipStartTick,
  ]);

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

  // ── Auto-scroll to segment pitch range on mount ─────────────────────────
  useEffect(() => {
    if (initialScrollDone.current || segments.length === 0) return;
    const grid = gridScrollRef.current;
    if (!grid) return;

    requestAnimationFrame(() => {
      let minN = 127,
        maxN = 0;
      for (const seg of segments) {
        if (seg.midiNote < minN) minN = seg.midiNote;
        if (seg.midiNote > maxN) maxN = seg.midiNote;
      }
      const centerNote = Math.floor((minN + maxN) / 2);
      const centerRow = VIEW_MAX - centerNote;
      const targetScroll = centerRow * ROW_H - grid.clientHeight / 2;
      grid.scrollTop = Math.max(0, targetScroll);
      initialScrollDone.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length]);

  // ── Sync scroll ─────────────────────────────────────────────────────────
  const handleGridScroll = useCallback(() => {
    const grid = gridScrollRef.current;
    if (!grid) return;
    if (pianoScrollRef.current)
      pianoScrollRef.current.scrollTop = grid.scrollTop;
    if (rulerScrollRef.current)
      rulerScrollRef.current.scrollLeft = grid.scrollLeft;
  }, []);

  // ── Canvas coords ───────────────────────────────────────────────────────
  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scrollContainer = gridScrollRef.current;
    return {
      x: e.clientX - rect.left + (scrollContainer?.scrollLeft ?? 0),
      y: e.clientY - rect.top + (scrollContainer?.scrollTop ?? 0),
    };
  }, []);

  // ── Hit test (uses cached rects from drawGrid for O(n) without recomputation) ──
  const hitTestSegment = useCallback(
    (canvasX: number, canvasY: number): string | null => {
      const rects = segRectsRef.current;
      for (let i = rects.length - 1; i >= 0; i--) {
        const r = rects[i];
        if (
          canvasX >= r.x &&
          canvasX <= r.x + r.w &&
          canvasY >= r.y &&
          canvasY <= r.y + r.h
        ) {
          return r.id;
        }
      }
      return null;
    },
    [],
  );

  // ── Mouse down ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const segId = hitTestSegment(x, y);

      if (segId) {
        setSelectedSegId(segId);
        const seg = segmentsRef.current.find((s) => s.id === segId);
        if (seg) {
          dragRef.current = {
            segmentId: segId,
            originalNote: getSegNote(seg),
            offsetPitch: 0,
          };
        }
      } else {
        setSelectedSegId(null);
      }
    },
    [getCanvasCoords, hitTestSegment],
  );

  // ── Mouse move ──────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = gridCanvasRef.current;
      if (!canvas) return;

      const drag = dragRef.current;
      if (!drag) {
        const { x, y } = getCanvasCoords(e);
        const hit = hitTestSegment(x, y);
        canvas.style.cursor = hit ? 'grab' : 'default';
        return;
      }

      canvas.style.cursor = 'grabbing';
      const { y } = getCanvasCoords(e);
      const newNote = VIEW_MAX - Math.floor(y / ROW_H);
      const clamped = Math.max(VIEW_MIN, Math.min(VIEW_MAX, newNote));

      if (clamped !== drag.originalNote) {
        lastEditRef.current = {
          segmentId: drag.segmentId,
          prevNote: drag.originalNote,
        };
        onEditSegment(drag.segmentId, clamped);
        drag.originalNote = clamped;
      }
    },
    [getCanvasCoords, hitTestSegment, onEditSegment],
  );

  // ── Mouse up ──────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    if (gridCanvasRef.current) {
      gridCanvasRef.current.style.cursor = 'default';
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (dragRef.current) handleMouseUp();
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [handleMouseUp]);

  // ── Zoom via Ctrl+Scroll ──────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.25, Math.min(6.0, z + delta)));
    }
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd+Z: undo last edit
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        const last = lastEditRef.current;
        if (last) {
          // If prev note matches original segment note, remove the edit; otherwise revert to prev
          const seg = segmentsRef.current.find((s) => s.id === last.segmentId);
          if (seg && last.prevNote === seg.midiNote) {
            onRemoveEdit(last.segmentId);
          } else if (seg) {
            onEditSegment(last.segmentId, last.prevNote);
          }
          lastEditRef.current = null;
        }
        return;
      }

      if (!selectedSegId) return;
      const seg = segmentsRef.current.find((s) => s.id === selectedSegId);
      if (!seg) return;

      const currentNote = getSegNote(seg);

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const target = Math.min(VIEW_MAX, currentNote + 1);
        lastEditRef.current = {
          segmentId: selectedSegId,
          prevNote: currentNote,
        };
        onEditSegment(selectedSegId, target);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const target = Math.max(VIEW_MIN, currentNote - 1);
        lastEditRef.current = {
          segmentId: selectedSegId,
          prevNote: currentNote,
        };
        onEditSegment(selectedSegId, target);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        onRemoveEdit(selectedSegId);
      }
    },
    [selectedSegId, onEditSegment, onRemoveEdit],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  const editCount = edits.length;

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center gap-2 px-3"
        style={{
          height: TOOLBAR_H,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="flex items-center gap-1.5 text-[10px] font-semibold"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <MousePointer2 className="size-3.5" />
          Select + Drag
        </div>

        <div className="h-4 w-px bg-white/10" />

        <span
          className="text-[10px]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {segments.length} segments
        </span>

        {editCount > 0 && (
          <>
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-accent)' }}
            >
              {editCount} edit{editCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onResetAll}
              className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] transition-colors hover:bg-white/10"
              style={{ color: 'var(--color-text)' }}
              title="Reset all edits"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          </>
        )}

        <div className="ml-auto h-4 w-px bg-white/10" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="flex size-5 items-center justify-center rounded transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-text-dim)' }}
            title="Zoom out"
          >
            <ZoomOut className="size-3" />
          </button>
          <span
            className="w-8 text-center text-[9px] tabular-nums"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(6.0, z + 0.25))}
            className="flex size-5 items-center justify-center rounded transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-text-dim)' }}
            title="Zoom in"
          >
            <ZoomIn className="size-3" />
          </button>
        </div>

        {selectedSegId && (
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--color-text)' }}
          >
            {(() => {
              const seg = segments.find((s) => s.id === selectedSegId);
              if (!seg) return '';
              const note = getSegNote(seg);
              const edit = edits.find((e) => e.segmentId === seg.id);
              return edit
                ? `${noteName(seg.midiNote)} → ${noteName(note)}`
                : noteName(note);
            })()}
          </span>
        )}
      </div>

      {/* Editor body — 4-quadrant synced layout */}
      <div
        className="flex flex-1 overflow-hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
      >
        {/* Left column: corner spacer + piano keys */}
        <div className="flex shrink-0 flex-col" style={{ width: KEYS_WIDTH }}>
          <div
            style={{
              height: RULER_H,
              flexShrink: 0,
              backgroundColor: '#0a0a0f',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          />
          <div
            ref={pianoScrollRef}
            style={{ flex: 1, overflowY: 'hidden', overflowX: 'hidden' }}
          >
            <canvas ref={pianoCanvasRef} className="block" />
          </div>
        </div>

        {/* Right column: ruler + grid */}
        <div className="flex flex-1 flex-col overflow-hidden">
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
    </div>
  );
}
