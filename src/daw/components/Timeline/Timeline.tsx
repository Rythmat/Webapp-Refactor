import {
  memo,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useArrangeKeymap } from '@/daw/commands/clipCommands';
import { withTransaction } from '@/daw/store/history';
import { openClipEditor } from '@/daw/shell/dock/dockSelection';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { formatChordRegion } from '@/daw/utils/chordRegionNotation';
import {
  CHORD_INPUT_HINT,
  chordInputText,
  typedChord,
} from '@/daw/harmony/chordInput';
import { ChordInputHint, chordBoxBorder } from '@/daw/harmony/ChordInputHint';
import { keyFrameOf } from '@/daw/harmony/keyFrame';
import { showWarning } from '@/components/utils/toast';
import { useChordNotation } from '@/lib/chordNotation';
import { seekTo } from '@/daw/hooks/useTransport';
import { getPlayheadTick, usePlayheadEffect } from '@/daw/engine/playheadClock';
import {
  getAudioBuffer,
  setAudioBuffer,
  setOriginalAudio,
  subscribeAudioBufferChanges,
} from '@/daw/audio/AudioBufferStore';
import { selectEffectiveKey } from '@/daw/harmony/effectiveKey';
import { clipKeyOf } from '@/daw/harmony/clipKey';
import { isApplePlatform } from '@/daw/shell/topbar/platformKeys';
import { CanvasMenu } from '@/daw/shell/canvas/clipMenu/CanvasMenu';
import { ClipEditPill } from '@/daw/shell/canvas/clipMenu/ClipEditPill';
import {
  useCanvasMenuStore,
  type CanvasMenuTarget,
} from '@/daw/shell/canvas/clipMenu/canvasMenuStore';
import {
  isDrumTrack,
  setClipFade,
} from '@/daw/shell/canvas/clipMenu/clipActions';
import {
  CLIP_HEADER_PX,
  clipZoneAt,
  drawClipHeader,
  drawFadeHandles,
  drawTrimGrips,
  type ChromeBox,
  type FadeSpan,
} from './clipChrome';
import {
  getPeakPyramid,
  readPeaks,
  subscribePeakPyramids,
} from '@/daw/audio/peaks';
import { splitAudioClipAt } from './splitAudioClipAt';
import { splitMidiClipAt } from './splitMidiClipAt';
import {
  TICKS_PER_BEAT,
  ticksPerBar,
  pixelsPerBeat,
  tickToPixel,
  pixelToTick,
  visibleTickRange,
  visibleSubdivisions,
  alternatingBarGroup,
  rulerMarkings,
} from '@/daw/utils/timelineScale';
import {
  LOOP_STRIP_H,
  PLAYHEAD_HANDLE_H,
  PLAYHEAD_HANDLE_W,
  dragLoopRange,
  drawLoopRegion,
  rulerPressTarget,
  type RulerTarget,
} from '@/daw/utils/rulerLoop';
import {
  nextChordSelection,
  notesInMarquee,
  type DrawnNote,
} from '@/daw/utils/insightSelection';
import { ALL_GRID_VALUES, TRIPLET_GRID_VALUES } from '@/daw/utils/quantize';
import {
  barStartTick,
  gridStepTicks,
  snapTicks,
  timelineSnapGrid,
} from '@/daw/time/timeModel';
import type { MidiNoteEvent } from '@prism/engine';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { DRAG_MIME, type DragPayload } from '@/daw/data/libraryItems';
import {
  DAW_PALETTE_EVENT,
  getDawPalette,
  type DawPalette,
} from '@/daw/ui/tokens';
import {
  CLIP_INSET,
  MIN_MIDI_CLIP_PX,
  clipBoxOf,
  timelineNeedsRedraw,
  useTimelineTracks,
} from './timelineGeometry';
import {
  CHORD_LANE_PX,
  LANE_HEADER_PX,
  RULER_PX,
  clampedRowAt,
  rowIndexAt,
  rowLayoutOf,
} from '@/daw/shell/tracklist/rowLayout';
import { pauseFollow, useFollowPlayhead } from '@/daw/editor/follow';
import { publishTimelineWidth, songLengthOf } from '@/daw/editor/viewport';
import {
  clipAudioStatus,
  retryClipAudio,
  type ClipAudioStatus,
} from '@/daw/audio/assets/assetStatus';

// ── Constants ───────────────────────────────────────────────────────────
// The lanes' heights come from the track list's row layout (rowLayout.ts),
// so a header and its lane always line up. The rulers the lanes scroll
// under: the loop strip and the bar numbers, then the chord lane. The m:ss
// row that sat under the lanes is gone: the top bar's readout switches to
// minutes and seconds (milestone 2.7).
const RULER_HEIGHT = RULER_PX; // loop strip (LOOP_STRIP_H) + bar numbers
const CHORD_RULER_HEIGHT = CHORD_LANE_PX; // the chord lane
const RULERS_HEIGHT = LANE_HEADER_PX;
/** Ruler labels: the micro type, and the gap kept between two labels. */
const RULER_FONT = "11px 'Glacial Indifference', system-ui, sans-serif";
const RULER_LABEL_GAP = 6;
// Dragging vertically on the bar-number ruler zooms the timeline: this much
// zoom delta is applied per pixel of vertical movement (up = zoom in).
const RULER_ZOOM_SENSITIVITY = 0.006;
// Vertical pixels of movement before a ruler press becomes a zoom drag rather
// than a seek click.
const RULER_ZOOM_DRAG_THRESHOLD = 3;
// Horizontal pixels of movement before an empty-area press becomes a pan drag
// rather than a seek click.
const PAN_DRAG_THRESHOLD = 4;

// ── MIME-type inference (for audio assets without a Content-Type header) ────

const AUDIO_EXTENSION_MIME: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  webm: 'audio/webm',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
};

function inferContentTypeFromUrl(url: string): string | null {
  try {
    const path = new URL(url, window.location.origin).pathname;
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext) return null;
    return AUDIO_EXTENSION_MIME[ext] ?? null;
  } catch {
    return null;
  }
}

// ── Audio tiles without their audio ─────────────────────────────────────

/** What an audio clip without its audio says, long and short. */
const AUDIO_TILE_LABELS: Record<
  Exclude<ClipAudioStatus, 'ready'>,
  { long: string; short: string }
> = {
  loading: { long: 'Loading…', short: 'Loading…' },
  failed: { long: 'Couldn’t load — click to retry', short: 'Retry' },
  missing: { long: 'Audio missing — not uploaded', short: 'Missing' },
};

// ── Piano-roll rendering ─────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Where a clip note's bar was drawn (canvas coords), by its event index. */
type NoteBar = { index: number; x: number; y: number; w: number; h: number };

function drawPianoRoll(
  ctx: CanvasRenderingContext2D,
  events: {
    startTick: number;
    durationTicks: number;
    note: number;
    velocity: number;
  }[],
  clipX: number,
  clipY: number,
  clipWidth: number,
  clipHeight: number,
  clipStartTick: number,
  clipDuration: number,
  color: string,
  chordRegions?: ChordRegion[],
  usePrismColors?: boolean,
  /** Indices of notes selected for Insight: outlined, with the clip's other
   *  notes dimmed. */
  selectedIndices?: ReadonlySet<number>,
  /** The song tick of the notes' tick 0: the clip's start for a clip's
   *  (clip-time) notes, 0 for notes already in song time. Chords are song
   *  time, so a note's chord colour is looked up there (pianoroll-09). */
  eventsSongOffset = 0,
): NoteBar[] {
  if (events.length === 0 || clipDuration === 0) return [];

  let minNote = 127,
    maxNote = 0;
  for (const ev of events) {
    if (ev.note < minNote) minNote = ev.note;
    if (ev.note > maxNote) maxNote = ev.note;
  }
  minNote = Math.max(0, minNote - 2);
  maxNote = Math.min(127, maxNote + 2);
  const noteRange = maxNote - minNote || 1;

  const [r, g, b] = hexToRgb(color);
  const useChordColors =
    usePrismColors && chordRegions && chordRegions.length > 0;
  const paddingTop = 16;
  const paddingBottom = 4;
  const drawHeight = clipHeight - paddingTop - paddingBottom;
  const noteBarH = Math.max(2, Math.min(4, (drawHeight / noteRange) * 0.8));

  const hasSelection =
    selectedIndices !== undefined && selectedIndices.size > 0;
  const bars: NoteBar[] = [];

  for (const [i, ev] of events.entries()) {
    const x =
      clipX + ((ev.startTick - clipStartTick) / clipDuration) * clipWidth;
    const w = Math.max(2, (ev.durationTicks / clipDuration) * clipWidth);
    const pitchRatio = (ev.note - minNote) / noteRange;
    const ny =
      clipY + paddingTop + drawHeight - pitchRatio * drawHeight - noteBarH;
    const alpha = 0.6 + (ev.velocity / 127) * 0.4;

    let nr = r,
      ng = g,
      nb = b;
    if (useChordColors) {
      for (let j = chordRegions.length - 1; j >= 0; j--) {
        if (
          eventsSongOffset + ev.startTick >=
          (chordRegions[j].rawStartTick ?? chordRegions[j].startTick)
        ) {
          [nr, ng, nb] = chordRegions[j].color;
          break;
        }
      }
    }

    const isSelected = hasSelection && selectedIndices.has(i);
    const dimmed = hasSelection && !isSelected;

    ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${dimmed ? alpha * 0.35 : alpha})`;
    ctx.beginPath();
    ctx.roundRect(x, ny, w, noteBarH, 1);
    ctx.fill();
    bars.push({ index: i, x, y: ny, w, h: noteBarH });
    if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x - 0.5, ny - 0.5, w + 1, noteBarH + 1, 1.5);
      ctx.stroke();
    }
  }
  return bars;
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
    ctx.quadraticCurveTo(
      cpX,
      centerY - amps[i - 1] * maxAmplitude,
      x,
      centerY - h,
    );
  }

  for (let i = count - 1; i >= 1; i--) {
    const x = clipX + i * dx;
    const h = amps[i] * maxAmplitude;
    const nextX = clipX + (i - 1) * dx;
    const cpX = (x + nextX) / 2;
    ctx.quadraticCurveTo(
      cpX,
      centerY + h,
      nextX,
      centerY + amps[i - 1] * maxAmplitude,
    );
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

type DragMode = 'move' | 'resize-left' | 'resize-right';

/**
 * A fade handle being dragged (milestone 2.12): the audio clip, which fade,
 * and its length so far in ticks. Drawn from here, written once on release.
 */
interface FadeDrag {
  clipId: string;
  trackId: string;
  edge: 'in' | 'out';
  ticks: number;
}

/** Where a clip's chrome is drawn: its box, less the lane inset. */
function chromeBox(x: number, y: number, w: number, h: number): ChromeBox {
  return { x, y, w, h };
}

/** An audio clip's fades in px at the zoom, kept inside the clip. */
function fadeSpanPx(
  fadeInTicks: number,
  fadeOutTicks: number,
  ppb: number,
  widthPx: number,
): FadeSpan {
  const px = (ticks: number) =>
    Math.max(0, Math.min(widthPx, (ticks / TICKS_PER_BEAT) * ppb));
  return { inPx: px(fadeInTicks), outPx: px(fadeOutTicks) };
}

interface DragState {
  clipId: string;
  trackId: string;
  originTrackIndex: number;
  offsetX: number; // px offset from clip left edge to mouse
  startTickOrigin: number;
  // Clip's right edge (timeline ticks) at grab time — the fixed anchor when
  // trimming the left edge.
  endTickOrigin: number;
  // Bounds the trimmed edges may travel to. For MIDI these are the content
  // extent (shrink-only); for audio they extend to the underlying buffer so a
  // previously trimmed head/tail can be revealed again.
  minStartTick: number;
  maxEndTick: number;
  mode: DragMode;
}

// ── Snapping ────────────────────────────────────────────────────────────
// Every gesture snaps to the one grid, the timeline's (timelineSnapGrid), in
// the project's metre and from each bar line; with snap off every gesture is
// free. A clip drag used to fall back to a beat, a marker to a bar and a
// click to a fraction of a tick (timeline-14).

// ── Canvas inputs ───────────────────────────────────────────────────────

/** The theme colours the canvas paints with. */
interface CanvasTokens {
  colorBg: string;
  colorBorder: string;
  colorGridRgb: string;
  colorSelRgb: string;
  palette: DawPalette;
}

/** The DAW palette as the timeline canvas draws with it. */
function readCanvasTokens(): CanvasTokens {
  const palette = getDawPalette();
  return {
    colorBg: palette.bg,
    colorBorder: palette.hairline,
    colorGridRgb: palette.lineRgb,
    colorSelRgb: palette.selectionRgb,
    palette,
  };
}

// ── Playhead ────────────────────────────────────────────────────────────
// Painted through a ref from the playhead clock (milestone 1.7): playback
// moves this line every frame without rendering it or the Timeline
// (timeline-23). It renders only when the zoom, scroll or width change, and
// when recording starts or stops: it is white, and record red while
// recording (milestone 2.7).
const TimelinePlayhead = memo(function TimelinePlayhead({
  zoom,
  scrollLeft,
  maxX,
  handleRef,
}: {
  zoom: number;
  scrollLeft: number;
  maxX: number;
  /** Stable, so the handle is pinned to the ruler as it mounts, not on
   *  every position update. */
  handleRef: (node: HTMLDivElement | null) => void;
}) {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const recording = useStore((s) => s.isRecording);
  const color = recording ? 'var(--daw-record)' : 'var(--daw-playhead)';
  usePlayheadEffect((tick) => {
    const line = lineRef.current;
    if (!line) return;
    const x = tickToPixel(tick, zoom, scrollLeft);
    // Out of view it is hidden, not unmounted, so the handle stays pinned.
    if (x < -2 || x > maxX + 2) {
      if (line.style.display !== 'none') line.style.display = 'none';
      return;
    }
    if (line.style.display) line.style.display = '';
    const transform = `translateX(${x}px)`;
    if (line.style.transform !== transform) line.style.transform = transform;
  });
  return (
    <div
      ref={lineRef}
      className="pointer-events-none absolute inset-y-0"
      data-testid="timeline-playhead"
      style={{
        width: 2,
        backgroundColor: color,
        willChange: 'transform',
      }}
    >
      {/* Grab handle at the foot of the bar ruler (hit-tested by the canvas
          via rulerPressTarget; the Timeline re-pins it on scroll). */}
      <div
        ref={handleRef}
        style={{
          position: 'absolute',
          left: 1 - PLAYHEAD_HANDLE_W / 2,
          borderLeft: `${PLAYHEAD_HANDLE_W / 2}px solid transparent`,
          borderRight: `${PLAYHEAD_HANDLE_W / 2}px solid transparent`,
          borderTop: `${PLAYHEAD_HANDLE_H}px solid ${color}`,
        }}
      />
    </div>
  );
});

// ── Timeline ────────────────────────────────────────────────────────────

export interface TimelineProps {
  /**
   * The scroller the timeline shares with the track list (TrackArea): one
   * vertical scroll for the rows and the lanes (timeline-12). The rulers are
   * drawn at its scroll offset, so they stay on top.
   */
  scrollRef: RefObject<HTMLDivElement>;
}

export function Timeline({ scrollRef }: TimelineProps) {
  useDevCommitCount('Timeline');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The canvas's width in px, as last measured (see Width, below).
  const widthRef = useRef(0);
  const clipRectsRef = useRef<ClipRect[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const dragTickRef = useRef<number>(0);
  const dragEndTickRef = useRef<number>(0);
  const dragTrackRef = useRef<number>(0);
  const markerDragRef = useRef<string | null>(null);
  // Where the dragged marker is drawn: the drag writes the store once, on
  // release (milestone 1.9), so the draw reads its place from here meanwhile.
  const markerDragTickRef = useRef<number | null>(null);
  // Active press on the top ruler — the same gestures as the piano roll's (see
  // rulerPressTarget): undecided until it moves past RULER_ZOOM_DRAG_THRESHOLD,
  // then a playhead drag, a vertical drag-to-zoom or a horizontal loop drag.
  // A press that never moves is a click: on the loop it toggles looping,
  // anywhere else it seeks to `seekTick`.
  const rulerPressRef = useRef<{
    target: RulerTarget;
    mode: 'playhead' | 'zoom' | 'loop' | null;
    startX: number;
    startY: number;
    lastY: number;
    pressTick: number;
    seekTick: number;
    original: { start: number; end: number };
  } | null>(null);
  // The playhead's grab triangle. The rulers are drawn at the scroll offset
  // (sticky) while the playhead lives in the scrolling content, so the handle
  // is re-pinned to the foot of the bar ruler whenever the view scrolls.
  const playheadHandleRef = useRef<HTMLDivElement | null>(null);
  // Chord-lane selection anchor: the last chord clicked without Shift, so a
  // Shift-click selects the run from it (nextChordSelection).
  const chordAnchorRef = useRef<string | null>(null);
  // ⌘/Ctrl-drag in the track area: a marquee selecting, for Insight, every
  // note it touches in the clips it crosses. Canvas coords.
  // A plain press on empty canvas starts one too: released without a drag
  // it is a click, and seeks to `seekTick`.
  const noteMarqueeRef = useRef<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    seekTick: number | null;
  } | null>(null);
  // Clip notes as last drawn — what the marquee hits — and, while it's being
  // dragged, the notes it touches per clip, lit up live.
  const drawnNotesRef = useRef<DrawnNote[]>([]);
  const marqueeHitsRef = useRef<Map<string, Set<number>> | null>(null);
  const extendNoteMarquee = useCallback((x: number, y: number) => {
    const marquee = noteMarqueeRef.current;
    if (!marquee) return;
    marquee.x1 = x;
    marquee.y1 = y;
    marqueeHitsRef.current = new Map(
      notesInMarquee(drawnNotesRef.current, marquee).map((s) => [
        s.clipId,
        new Set(s.noteIndices),
      ]),
    );
  }, []);
  // A pan with the middle button (2.12; a plain drag on empty canvas used to
  // pan and now draws the marquee). `seekTick`, when set, is applied on a
  // release that never crossed the drag threshold.
  const panDragRef = useRef<{
    startX: number;
    lastX: number;
    moved: boolean;
    seekTick: number | null;
  } | null>(null);

  // The clip under the pointer, whose trim zones (and fade handles) show.
  const hoverClipRef = useRef<string | null>(null);
  // An audio clip's fade handle in hand (2.12).
  const fadeDragRef = useRef<FadeDrag | null>(null);
  // The canvas's box: a clip drag marks it data-dragging, which hides the
  // Edit pill until the clip lands.
  const canvasBoxRef = useRef<HTMLDivElement>(null);

  // ── Store state ──
  // Not the transport position: TimelinePlayhead subscribes to that itself,
  // so playback doesn't re-render this component (timeline-23).
  // The canvas reads what it draws from the store itself, when it draws, so
  // this component subscribes only to what its markup and handlers use. The
  // tracks are taken as they last changed what the canvas draws: a fader
  // step or a rename doesn't re-render the timeline (timeline-07).
  const tracks = useTimelineTracks();
  const zoom = useStore((s) => s.timelineZoom);
  const scrollLeft = useStore((s) => s.timelineScrollLeft);
  const gridSize = useStore((s) => s.timelineGridSize);
  const snapEnabled = useStore((s) => s.timelineSnapEnabled);
  // Chord-lane labels follow the global chord notation (hybrid = the toggle above).
  const chordNotation = useChordNotation();
  const chordNotationRef = useRef(chordNotation);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);

  /**
   * The chord ruler's rename box: the region, where it stands, what has been
   * typed, and whether the last Enter found no chord in it.
   */
  const [editingChord, setEditingChord] = useState<{
    id: string;
    x: number;
    y: number;
    value: string;
    refused?: boolean;
  } | null>(null);

  /**
   * Write the chord typed in the ruler's box over its region, as the lane
   * stores chords (harmony/chordInput). 'refused' when the text names no
   * chord; nothing is written for an empty or unchanged box.
   */
  const writeTypedChord = useCallback(
    (entry: { id: string; value: string }) => {
      const text = entry.value.trim();
      const { rootNote, mode, chordRegions, renameChordRegion } =
        useStore.getState();
      const region = chordRegions.find((r) => r.id === entry.id);
      if (!text || !region) return 'unchanged';
      const frame = keyFrameOf(rootNote, mode);
      if (text === chordInputText(region, frame)) return 'unchanged';
      const chord = typedChord(text, frame);
      if (!chord) return 'refused';
      renameChordRegion(entry.id, chord.name, chord.noteName, {
        color: chord.color,
        degreeKey: chord.degreeKey,
        identity: chord.identity,
      });
      return 'written';
    },
    [],
  );

  // ── Derived ──
  const snapGrid = useMemo(() => {
    const ts = { numerator: tsNum, denominator: tsDen };
    return { enabled: snapEnabled, step: gridStepTicks(gridSize, ts), ts };
  }, [snapEnabled, gridSize, tsNum, tsDen]);
  const projectLengthTicks = useMemo(
    () => songLengthOf(tracks, ticksPerBar(tsNum, tsDen)),
    [tracks, tsNum, tsDen],
  );

  // ── Snap helper with current grid ──
  const doSnap = useCallback(
    (tick: number) => snapTicks(tick, snapGrid),
    [snapGrid],
  );

  // ── Draw ──────────────────────────────────────────────────────────────

  // Theme colours, read from CSS once and again only when the theme's inline
  // tokens on `.daw-root` change, not on every draw.
  const canvasTokensRef = useRef<CanvasTokens | null>(null);

  // Draws the whole canvas from the store as it is now. It is stable, so
  // nothing re-keys on it; callers ask for a draw with requestRedraw.
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;
    const drawStart = import.meta.env.DEV ? performance.now() : 0;

    const state = useStore.getState();
    const tracks = state.tracks;
    const gridSize = state.timelineGridSize;
    const chordRulerShowNotes = state.chordRulerShowNotes;
    const tsNum = state.timeSignatureNumerator;
    const tsDen = state.timeSignatureDenominator;
    const chordNotation = chordNotationRef.current;

    // The scroller the lanes share with the track list (TrackArea).
    const scrollParent = scrollRef.current;
    const scrollTop = scrollParent?.scrollTop ?? 0;
    const viewportH = scrollParent?.clientHeight ?? 0;
    const rows = rowLayoutOf(tracks);

    // The canvas is sized from the scroll area, not from its own parent: the
    // parent holds the canvas, so measuring it let the canvas only ever grow,
    // leaving dead scroll range after the dock opened or a track went
    // (timeline-11).
    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = Math.max(
      viewportH > 0 ? viewportH : container.clientHeight,
      rows.total + RULERS_HEIGHT,
    );

    // Resize canvas to viewport (virtual rendering — not content size)
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const currentSelectedClipId = state.selectedClipId;
    const currentZoom = state.timelineZoom;
    const currentScrollLeft = state.timelineScrollLeft;
    const currentPpb = pixelsPerBeat(currentZoom);
    const newClipRects: ClipRect[] = [];
    const newDrawnNotes: DrawnNote[] = [];

    canvasTokensRef.current ??= readCanvasTokens();
    const { colorBg, colorBorder, colorGridRgb, colorSelRgb, palette } =
      canvasTokensRef.current;
    // The key a pitched clip's header is read against (harmony core, 1.16a).
    const songKey = selectEffectiveKey(state);

    // Visible tick range (with 1 bar buffer on each side)
    const { startTick: visStartRaw, endTick: visEndRaw } = visibleTickRange(
      cw,
      currentZoom,
      currentScrollLeft,
    );
    const barTicks = ticksPerBar(tsNum, tsDen);
    const visStart = Math.max(0, visStartRaw - barTicks);
    const visEnd = visEndRaw + barTicks;

    // ── Clear ──────────────────────────────────────────────────────
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, cw, ch);

    // (Top ruler + time ruler drawn at end with scroll-offset for sticky behavior)

    // ── Alternating bar shading ───────────────────────────────────
    const barGroup = alternatingBarGroup(currentZoom);
    const barGroupTicks = barGroup * barTicks;
    ctx.fillStyle = `rgba(${colorGridRgb}, 0.025)`;
    const firstGroup = Math.floor(visStart / barGroupTicks);
    const lastGroup = Math.ceil(visEnd / barGroupTicks);
    for (let g = firstGroup; g <= lastGroup; g++) {
      if (g % 2 === 0) continue;
      const x1 = tickToPixel(g * barGroupTicks, currentZoom, currentScrollLeft);
      const x2 = tickToPixel(
        (g + 1) * barGroupTicks,
        currentZoom,
        currentScrollLeft,
      );
      ctx.fillRect(x1, RULERS_HEIGHT, x2 - x1, ch - RULERS_HEIGHT);
    }

    // ── Grid (zoom-adaptive subdivisions) ──────────────────────────
    const subdivisions = visibleSubdivisions(currentZoom, tsNum, tsDen);
    for (const sub of subdivisions) {
      ctx.strokeStyle = `rgba(${colorGridRgb}, ${sub.alpha})`;
      ctx.lineWidth = sub.lineWidth;

      const startAligned =
        Math.floor(visStart / sub.tickInterval) * sub.tickInterval;
      for (let tick = startAligned; tick <= visEnd; tick += sub.tickInterval) {
        if (tick < 0) continue;
        // Skip if already drawn by coarser subdivision
        let alreadyDrawn = false;
        for (const coarser of subdivisions) {
          if (
            coarser.tickInterval > sub.tickInterval &&
            tick % coarser.tickInterval === 0
          ) {
            alreadyDrawn = true;
            break;
          }
        }
        if (alreadyDrawn) continue;

        const x = tickToPixel(tick, currentZoom, currentScrollLeft);
        if (x < -1 || x > cw + 1) continue;
        ctx.beginPath();
        ctx.moveTo(x, RULERS_HEIGHT);
        ctx.lineTo(x, ch);
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

      ctx.strokeStyle = `rgba(${colorGridRgb}, 0.08)`;
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
        ctx.lineTo(x, ch);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // ── Track lanes ─────────────────────────────────────────────────
    // A clip being moved is drawn in the lane under the pointer.
    const laneTop = (index: number) => rows.tops[index] + RULERS_HEIGHT;
    const clipHeight = (index: number) => rows.heights[index] - CLIP_INSET * 2;
    for (let t = 0; t < tracks.length; t++) {
      const track = tracks[t];
      const y = laneTop(t);
      const laneH = rows.heights[t];
      const boxH = laneH - CLIP_INSET * 2;

      // Lane separator
      ctx.strokeStyle = `rgba(${colorGridRgb}, 0.04)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + laneH);
      ctx.lineTo(cw, y + laneH);
      ctx.stroke();

      // ── MIDI clips ────────────────────────────────────────────────
      for (const clip of track.midiClips) {
        const drag = dragRef.current;
        const dmode = drag && drag.clipId === clip.id ? drag.mode : null;
        const isMoving = dmode === 'move';
        const effectiveTrackIndex = isMoving ? dragTrackRef.current : t;
        const effectiveY = laneTop(effectiveTrackIndex);
        const effectiveH = clipHeight(effectiveTrackIndex);

        // Events are clip-relative (playback adds clip.startTick), so notes
        // are drawn from the clip's own tick 0, sized or not. Drawing a sized
        // clip's notes from its song position put them off its left edge,
        // leaving an empty box anywhere after bar 1 (a moved Prism take).
        const eventsMinTick = 0;
        let clipDuration: number;
        if (clip.durationTicks) {
          clipDuration = clip.durationTicks;
        } else if (clip.events.length > 0) {
          // An unsized clip is measured from its own tick 0 — NOT from its
          // first note. Measuring from the first note collapses a rest at the
          // front of the clip and drags the notes onto its leading edge.
          clipDuration = clip.events.reduce(
            (max, e) => Math.max(max, e.startTick + e.durationTicks),
            0,
          );
        } else {
          clipDuration = 0;
        }

        // Notes follow the clip when moving but stay anchored when trimming an
        // edge — the box (below) clips them. Their pixel scale is constant
        // (clipWidth / clipDuration === ppb / TPB) so positions don't squish.
        const noteStartTick = isMoving ? dragTickRef.current : clip.startTick;
        const noteX = tickToPixel(
          noteStartTick,
          currentZoom,
          currentScrollLeft,
        );
        const noteWidth = Math.max(
          (clipDuration / TICKS_PER_BEAT) * currentPpb,
          20,
        );

        // Box edges — live values while trimming, content extent otherwise.
        let boxStartTick = noteStartTick;
        let boxEndTick = noteStartTick + clipDuration;
        if (dmode === 'resize-left') {
          boxStartTick = dragTickRef.current;
          boxEndTick = clip.startTick + clipDuration;
        } else if (dmode === 'resize-right') {
          boxStartTick = clip.startTick;
          boxEndTick = dragEndTickRef.current;
        }

        // Skip clips outside visible range
        if (boxEndTick < visStart || boxStartTick > visEnd) continue;

        const clipX = tickToPixel(boxStartTick, currentZoom, currentScrollLeft);
        const clipWidth = Math.max(
          ((boxEndTick - boxStartTick) / TICKS_PER_BEAT) * currentPpb,
          MIN_MIDI_CLIP_PX,
        );

        const isSelected = currentSelectedClipId === clip.id;
        const muted = clip.muted === true;
        const box = chromeBox(
          clipX,
          effectiveY + CLIP_INSET,
          clipWidth,
          effectiveH,
        );

        // Store rect for hit testing (viewport space)
        newClipRects.push({
          clipId: clip.id,
          trackId: track.id,
          trackIndex: t,
          x: clipX,
          y: effectiveY + CLIP_INSET,
          w: clipWidth,
          h: effectiveH,
          startTick: boxStartTick,
        });

        // A muted clip (2.12) stays in place, dimmed, under a dashed edge.
        ctx.globalAlpha = muted ? 0.45 : 1;

        // Background — neutral white glass so chord ruler / MIDI notes show through
        ctx.fillStyle = `rgba(${colorGridRgb}, ${isSelected ? 0.1 : 0.05})`;
        ctx.beginPath();
        ctx.roundRect(clipX, effectiveY + CLIP_INSET, clipWidth, effectiveH, 4);
        ctx.fill();

        // ── Clip header + piano-roll notes ─────────────────────────
        // Skip details at extreme zoom-out for performance
        if (clipWidth > 8 && currentPpb >= 5) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(
            clipX,
            effectiveY + CLIP_INSET,
            clipWidth,
            effectiveH,
            4,
          );
          ctx.clip();

          if (clip.events.length > 0) {
            // A marquee being dragged lights up the notes it touches;
            // otherwise the note selection shows.
            const marqueeHits = marqueeHitsRef.current;
            const noteSelection = state.selectedNotes.find(
              (s) => s.clipId === clip.id,
            );
            const bars = drawPianoRoll(
              ctx,
              clip.events,
              noteX,
              effectiveY + CLIP_INSET,
              noteWidth,
              effectiveH,
              eventsMinTick,
              clipDuration,
              track.color,
              state.chordRegions,
              state.clipColorMode === 'prism',
              marqueeHits
                ? marqueeHits.get(clip.id)
                : noteSelection && new Set(noteSelection.noteIndices),
              clip.startTick,
            );
            // Only notes showing inside the clip box can be hit.
            const boxTop = effectiveY + CLIP_INSET;
            const boxBottom = boxTop + effectiveH;
            for (const b of bars) {
              if (
                b.x > clipX + clipWidth ||
                b.x + b.w < clipX ||
                b.y > boxBottom ||
                b.y + b.h < boxTop
              ) {
                continue;
              }
              newDrawnNotes.push({ trackId: track.id, clipId: clip.id, ...b });
            }
          }

          // The header (2.12): the clip's name, or its track's, and on a
          // pitched track the key its notes are in.
          ctx.globalAlpha = 1;
          drawClipHeader(
            ctx,
            box,
            {
              title: clip.name?.trim() || track.name,
              keyLabel: isDrumTrack(track)
                ? null
                : (clipKeyOf(clip.events, songKey)?.label ?? null),
              muted,
              color: track.color,
            },
            palette,
          );
          ctx.restore();
        }

        // Border — neutral white, bright when selected; dashed while muted.
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(${colorGridRgb}, ${isSelected ? 0.7 : 0.2})`;
        ctx.lineWidth = isSelected ? 2 : 1;
        if (muted) ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.roundRect(clipX, effectiveY + CLIP_INSET, clipWidth, effectiveH, 4);
        ctx.stroke();
        ctx.setLineDash([]);
        // The trim zones show on the clip in hand or under the pointer.
        if (
          !isMoving &&
          (isSelected || hoverClipRef.current === clip.id) &&
          clipWidth > 8
        ) {
          drawTrimGrips(ctx, box, palette);
        }
      }

      // ── Live recording overlay ─────────────────────────────────────
      if (
        state.liveRecordingTrackId === track.id &&
        state.liveRecordingNotes.length > 0
      ) {
        const liveNotes = state.liveRecordingNotes;
        const liveStart = state.liveRecordingStartTick;
        const liveMax = liveNotes.reduce(
          (max, e) => Math.max(max, e.startTick + e.durationTicks),
          liveStart,
        );
        const liveDur = liveMax - liveStart;
        if (liveDur > 0) {
          const liveX = tickToPixel(liveStart, currentZoom, currentScrollLeft);
          const liveW = Math.max((liveDur / TICKS_PER_BEAT) * currentPpb, 20);
          ctx.fillStyle = track.color + '28';
          ctx.beginPath();
          ctx.roundRect(liveX, y + CLIP_INSET, liveW, boxH, 4);
          ctx.fill();

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(liveX, y + CLIP_INSET, liveW, boxH, 4);
          ctx.clip();
          drawPianoRoll(
            ctx,
            liveNotes,
            liveX,
            y + CLIP_INSET,
            liveW,
            boxH,
            liveStart,
            liveDur,
            track.color,
            state.chordRegions,
            state.clipColorMode === 'prism',
          );
          ctx.restore();
        }
      }

      // ── Live audio recording waveform overlay ─────────────────────
      if (
        state.liveAudioTrackId === track.id &&
        state.liveAudioPeaks.length > 0
      ) {
        const livePeaks = state.liveAudioPeaks;
        const liveStart = state.liveAudioStartTick;
        // Each peak ≈ 66ms of audio. Convert to ticks: (bpm/60) * 0.066 * 480
        const ticksPerPeak = (state.bpm / 60) * 0.066 * 480;
        const totalTicks = livePeaks.length * ticksPerPeak;
        const liveX = tickToPixel(liveStart, currentZoom, currentScrollLeft);
        const liveW = Math.max((totalTicks / TICKS_PER_BEAT) * currentPpb, 20);

        // Background
        ctx.fillStyle = track.color + '28';
        ctx.beginPath();
        ctx.roundRect(liveX, y + CLIP_INSET, liveW, boxH, 4);
        ctx.fill();

        // Waveform
        if (liveW > 8) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(liveX, y + CLIP_INSET, liveW, boxH, 4);
          ctx.clip();

          const centerY = y + laneH / 2;
          const maxH = (laneH - 8) * 0.42;

          // Normalize peaks for display
          let maxPeak = 0;
          for (let i = 0; i < livePeaks.length; i++) {
            if (livePeaks[i] > maxPeak) maxPeak = livePeaks[i];
          }
          const normalizedPeaks =
            maxPeak > 0 ? livePeaks.map((p) => p / maxPeak) : livePeaks;

          drawSmoothWaveform(
            ctx,
            normalizedPeaks,
            liveX,
            centerY,
            liveW,
            maxH,
            track.color + 'AA',
          );
          ctx.restore();
        }
      }

      // ── Audio clips ───────────────────────────────────────────────
      for (const clip of track.audioClips) {
        const drag = dragRef.current;
        const dmode = drag && drag.clipId === clip.id ? drag.mode : null;
        const isMoving = dmode === 'move';
        const effectiveTrackIndex = isMoving ? dragTrackRef.current : t;
        const effectiveY = laneTop(effectiveTrackIndex);
        const effectiveH = clipHeight(effectiveTrackIndex);

        // Box edges — live values while trimming, content extent otherwise.
        const baseStartTick = isMoving ? dragTickRef.current : clip.startTick;
        let boxStartTick = baseStartTick;
        let boxEndTick = baseStartTick + clip.duration;
        if (dmode === 'resize-left') {
          boxStartTick = dragTickRef.current;
          boxEndTick = clip.startTick + clip.duration;
        } else if (dmode === 'resize-right') {
          boxStartTick = clip.startTick;
          boxEndTick = dragEndTickRef.current;
        }

        if (boxEndTick < visStart || boxStartTick > visEnd) continue;

        const clipX = tickToPixel(boxStartTick, currentZoom, currentScrollLeft);
        const clipWidth =
          ((boxEndTick - boxStartTick) / TICKS_PER_BEAT) * currentPpb;

        // Portion of the underlying asset the (previewed) box plays, so the
        // waveform reflects front/back trims.
        const ticksPerSec = (state.bpm * 480) / 60;
        const previewOffsetSec =
          (clip.offsetSeconds ?? 0) +
          (boxStartTick - clip.startTick) / ticksPerSec;
        const previewDurationSec = (boxEndTick - boxStartTick) / ticksPerSec;

        const isSelected = currentSelectedClipId === clip.id;
        const muted = clip.muted === true;
        const box = chromeBox(
          clipX,
          effectiveY + CLIP_INSET,
          clipWidth,
          effectiveH,
        );
        // A fade handle in hand draws its fade where the pointer has it.
        const fadeDrag =
          fadeDragRef.current?.clipId === clip.id ? fadeDragRef.current : null;
        const fadeInTicks =
          fadeDrag?.edge === 'in' ? fadeDrag.ticks : clip.fadeInTicks;
        const fadeOutTicks =
          fadeDrag?.edge === 'out' ? fadeDrag.ticks : clip.fadeOutTicks;

        // Store rect for hit testing
        newClipRects.push({
          clipId: clip.id,
          trackId: track.id,
          trackIndex: t,
          x: clipX,
          y: effectiveY + CLIP_INSET,
          w: clipWidth,
          h: effectiveH,
          startTick: boxStartTick,
        });

        ctx.globalAlpha = muted ? 0.45 : 1;
        ctx.fillStyle = `rgba(${colorGridRgb}, ${isSelected ? 0.1 : 0.05})`;
        ctx.beginPath();
        ctx.roundRect(clipX, effectiveY + CLIP_INSET, clipWidth, effectiveH, 4);
        ctx.fill();

        if (clipWidth > 8 && currentPpb >= 5) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(
            clipX,
            effectiveY + CLIP_INSET,
            clipWidth,
            effectiveH,
            4,
          );
          ctx.clip();

          const sampleCount = Math.max(Math.floor(clipWidth / 2), 16);
          // The waveform sits under the header (2.12).
          const bodyH = effectiveH - CLIP_HEADER_PX;
          const centerY = effectiveY + CLIP_INSET + CLIP_HEADER_PX + bodyH / 2;
          const maxH = (bodyH - 4) * 0.46;

          const audioBuffer = getAudioBuffer(clip.id);
          // A clip without its audio says why, instead of drawing a made-up
          // waveform over silence (timeline-25): loading (a download, or a
          // restore from the device's drafts), failed (click to retry), or
          // missing (never uploaded, and not on this device).
          const status = audioBuffer
            ? 'ready'
            : clipAudioStatus(clip.id, clip.assetId);
          // A long take that is decoded and playable, while the peaks worker
          // is still summarising it, is not loading: it draws a flat line
          // until its waveform arrives.
          const pyramid = audioBuffer ? getPeakPyramid(audioBuffer) : undefined;

          if (pyramid === null) {
            ctx.strokeStyle = track.color + '66';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(clipX + 4, centerY);
            ctx.lineTo(clipX + clipWidth - 4, centerY);
            ctx.stroke();
          } else if (status !== 'ready' || !audioBuffer || !pyramid) {
            const label =
              AUDIO_TILE_LABELS[status === 'ready' ? 'loading' : status];
            ctx.font = "12px 'Glacial Indifference', system-ui, sans-serif";
            const text =
              ctx.measureText(label.long).width + 16 <= clipWidth
                ? label.long
                : ctx.measureText(label.short).width + 12 <= clipWidth
                  ? label.short
                  : null;
            if (text) {
              ctx.fillStyle = 'rgba(255,255,255,0.6)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, clipX + clipWidth / 2, centerY);
            } else {
              // Too narrow for text — draw a subtle dashed line so the user
              // sees that something's pending.
              ctx.strokeStyle = 'rgba(255,255,255,0.3)';
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.moveTo(clipX + 4, centerY);
              ctx.lineTo(clipX + clipWidth - 4, centerY);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          } else {
            // Only the points on the canvas (and one past each edge) are read
            // and drawn. They sit on a grid fixed to the clip, so a scroll
            // reveals more of the same points instead of resampling them.
            const dx = clipWidth / (sampleCount - 1);
            const firstPoint = Math.min(
              sampleCount - 1,
              Math.max(0, Math.floor(-clipX / dx) - 1),
            );
            const lastPoint = Math.max(
              firstPoint,
              Math.min(sampleCount - 1, Math.ceil((cw - clipX) / dx) + 1),
            );
            const sr = audioBuffer.sampleRate;
            const amps = readPeaks(
              pyramid,
              audioBuffer,
              sampleCount,
              Math.floor(previewOffsetSec * sr),
              Math.floor((previewOffsetSec + previewDurationSec) * sr),
              firstPoint,
              lastPoint,
            );

            drawSmoothWaveform(
              ctx,
              amps,
              clipX + firstPoint * dx,
              centerY,
              (lastPoint - firstPoint) * dx,
              maxH,
              track.color + 'AA',
            );
          }

          // ── Fade overlays ── over the body, under the header: the
          // shading falls from the fade's end to the clip's edge, with the
          // fade's line on it.
          const bodyTop = effectiveY + CLIP_INSET + CLIP_HEADER_PX;
          const bodyBottom = effectiveY + CLIP_INSET + effectiveH;
          const fades = fadeSpanPx(
            fadeInTicks,
            fadeOutTicks,
            currentPpb,
            clipWidth,
          );
          ctx.strokeStyle = `rgba(${colorGridRgb}, 0.55)`;
          ctx.lineWidth = 1;
          if (fades.inPx > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.moveTo(clipX, bodyTop);
            ctx.lineTo(clipX + fades.inPx, bodyTop);
            ctx.lineTo(clipX, bodyBottom);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(clipX, bodyBottom);
            ctx.lineTo(clipX + fades.inPx, bodyTop);
            ctx.stroke();
          }
          if (fades.outPx > 0) {
            const clipRight = clipX + clipWidth;
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.moveTo(clipRight, bodyTop);
            ctx.lineTo(clipRight - fades.outPx, bodyTop);
            ctx.lineTo(clipRight, bodyBottom);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(clipRight, bodyBottom);
            ctx.lineTo(clipRight - fades.outPx, bodyTop);
            ctx.stroke();
          }

          // The header (2.12): the clip's own name, or its track's. Room is
          // kept for the fade handles in its corners.
          ctx.globalAlpha = 1;
          drawClipHeader(
            ctx,
            box,
            {
              title: clip.name?.trim() || track.name,
              keyLabel: null,
              muted,
              color: track.color,
              insetLeft: 12,
              insetRight: 12,
            },
            palette,
          );
          ctx.restore();
        }

        // Border — bright when selected; dashed while muted.
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(${colorGridRgb}, ${isSelected ? 0.7 : 0.2})`;
        ctx.lineWidth = isSelected ? 2 : 1;
        if (muted) ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.roundRect(clipX, effectiveY + CLIP_INSET, clipWidth, effectiveH, 4);
        ctx.stroke();
        ctx.setLineDash([]);
        // The trim zones and fade handles show on the clip in hand or under
        // the pointer.
        if (
          !isMoving &&
          (isSelected ||
            hoverClipRef.current === clip.id ||
            fadeDrag !== null) &&
          clipWidth > 8
        ) {
          drawTrimGrips(ctx, box, palette);
          drawFadeHandles(
            ctx,
            box,
            fadeSpanPx(fadeInTicks, fadeOutTicks, currentPpb, clipWidth),
            palette,
          );
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
      ctx.fillStyle = `rgba(${colorSelRgb}, 0.04)`;
      ctx.fillRect(lx1, RULERS_HEIGHT, lw, ch - RULERS_HEIGHT);

      // Vertical lines at loop boundaries
      ctx.strokeStyle = palette.rangeEdge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx1, RULERS_HEIGHT);
      ctx.lineTo(lx1, ch);
      ctx.moveTo(lx2, RULERS_HEIGHT);
      ctx.lineTo(lx2, ch);
      ctx.stroke();
    }

    // ── Markers ─────────────────────────────────────────────────────
    const dragId = markerDragRef.current;
    const dragTick = markerDragTickRef.current;
    const currentMarkers =
      dragId && dragTick !== null
        ? useStore
            .getState()
            .markers.map((m) =>
              m.id === dragId ? { ...m, tick: dragTick } : m,
            )
        : useStore.getState().markers;
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
      ctx.lineTo(mx, ch);
      ctx.stroke();
      ctx.restore();

      // (Marker flags drawn below with sticky top ruler)
    }

    // ── Note marquee (⌘-drag) ──────────────────────────────────────────
    const marquee = noteMarqueeRef.current;
    if (marquee) {
      const mx = Math.min(marquee.x0, marquee.x1);
      const my = Math.min(marquee.y0, marquee.y1);
      const mw = Math.abs(marquee.x1 - marquee.x0);
      const mh = Math.abs(marquee.y1 - marquee.y0);
      ctx.fillStyle = palette.rangeFill;
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = palette.rangeEdge;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(mx + 0.5, my + 0.5, mw, mh);
      ctx.setLineDash([]);
    }

    // ── Sticky rulers (drawn last so they overlay content) ────────────

    // Scroll-offset positions so rulers stay pinned during vertical scroll
    const rulerY = scrollTop;

    // ── Top ruler (bar/beat numbers) ──────────────────────────────────
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, rulerY, cw, RULER_HEIGHT);
    ctx.fillStyle = `rgba(${colorGridRgb}, 0.03)`;
    ctx.fillRect(0, rulerY, cw, RULER_HEIGHT);

    // Loop strip along the top of the ruler — the same loop as the piano roll
    // draws: light blue while looping, gray (still in place) while off.
    drawLoopRegion(
      ctx,
      tickToPixel(state.loopStart, currentZoom, currentScrollLeft),
      tickToPixel(state.loopEnd, currentZoom, currentScrollLeft),
      rulerY,
      colorSelRgb,
      state.loopEnabled,
    );
    ctx.strokeStyle = `rgba(${colorGridRgb}, 0.06)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerY + LOOP_STRIP_H - 0.5);
    ctx.lineTo(cw, rulerY + LOOP_STRIP_H - 0.5);
    ctx.stroke();

    // Bottom border
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerY + RULER_HEIGHT);
    ctx.lineTo(cw, rulerY + RULER_HEIGHT);
    ctx.stroke();

    // Ruler labels (zoom-adaptive): bars, then beats, then halves of a
    // beat as the zoom allows. All in the 11 px micro type, the bars in the
    // ruler colour and the finer levels dimmer; a mark a coarser level
    // already labels is skipped, and a label that would run into the one
    // before it is left out, so labels never overprint (timeline-22).
    const levels = rulerMarkings(currentZoom, state.bpm, tsNum, tsDen);
    const labelY = rulerY + LOOP_STRIP_H + (RULER_HEIGHT - LOOP_STRIP_H) / 2;
    ctx.font = RULER_FONT;
    ctx.textBaseline = 'middle';
    const taken: [number, number][] = [];
    const free = (left: number, right: number) =>
      taken.every(
        ([l, r]) => right + RULER_LABEL_GAP <= l || left >= r + RULER_LABEL_GAP,
      );

    // Marker flags (top of the bar-number lane, under the loop strip). Their
    // names go first: a bar number they would cover is left out.
    const flagY = rulerY + LOOP_STRIP_H;
    for (const marker of currentMarkers) {
      const mx = tickToPixel(marker.tick, currentZoom, currentScrollLeft);
      if (mx < -60 || mx > cw + 10) continue;

      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.moveTo(mx, flagY + 2);
      ctx.lineTo(mx + 7, flagY + 2);
      ctx.lineTo(mx + 7, flagY + 12);
      ctx.lineTo(mx + 3.5, flagY + 16);
      ctx.lineTo(mx, flagY + 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillText(marker.name, mx + 10, labelY);
      taken.push([mx, mx + 10 + ctx.measureText(marker.name).width]);
    }

    levels.forEach((level, depth) => {
      ctx.fillStyle = depth === 0 ? palette.rulerText : palette.text3;
      const startAligned =
        Math.floor(visStart / level.tickInterval) * level.tickInterval;
      for (
        let tick = startAligned;
        tick <= visEnd;
        tick += level.tickInterval
      ) {
        if (tick < 0) continue;
        if (levels.some((c, i) => i < depth && tick % c.tickInterval === 0)) {
          continue;
        }
        const x = tickToPixel(tick, currentZoom, currentScrollLeft);
        if (x < -50 || x > cw + 50) continue;
        const text = level.format(tick);
        const left = x + 4;
        const right = left + ctx.measureText(text).width;
        if (!free(left, right)) continue;
        taken.push([left, right]);
        ctx.fillText(text, left, labelY);
      }
    });

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

      // Colored region fill (matches Prism harmonic colors); selected chords
      // (for Insight) get a stronger fill and an outline in their colour.
      const [cr, cg, cb] = region.color;
      const isSelected = state.selectedChordIds.includes(region.id);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${isSelected ? 0.4 : 0.15})`;
      ctx.fillRect(x1, chordRulerY, x2 - x1, CHORD_RULER_HEIGHT);
      if (isSelected) {
        ctx.strokeStyle = `rgb(${cr}, ${cg}, ${cb})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          x1 + 0.75,
          chordRulerY + 0.75,
          x2 - x1 - 1.5,
          CHORD_RULER_HEIGHT - 1.5,
        );
        ctx.lineWidth = 1;
      }

      // Chord name
      ctx.fillStyle = isSelected ? palette.text : `rgb(${cr}, ${cg}, ${cb})`;
      ctx.font = "12px 'Glacial Indifference', system-ui, sans-serif";
      ctx.textBaseline = 'middle';
      const label = displayAccidentals(
        chordRulerShowNotes ? region.name : region.noteName,
      );
      ctx.fillText(
        chordNotation === 'hybrid'
          ? label
          : formatChordRegion(
              region,
              chordNotation,
              { keyRootPc: state.rootNote, mode: state.mode },
              label,
            ),
        x1 + 6,
        chordRulerY + CHORD_RULER_HEIGHT / 2,
      );

      // Right separator
      ctx.strokeStyle = `rgba(${colorGridRgb}, 0.06)`;
      ctx.beginPath();
      ctx.moveTo(x2, chordRulerY + 2);
      ctx.lineTo(x2, chordRulerY + CHORD_RULER_HEIGHT - 2);
      ctx.stroke();
    }

    clipRectsRef.current = newClipRects;
    drawnNotesRef.current = newDrawnNotes;
    // One entry per draw for the perf harness (studio:perf timeline-scroll).
    if (import.meta.env.DEV) {
      performance.measure('ma:timeline:draw', { start: drawStart });
    }
  }, []);

  // ── Redraw triggers ───────────────────────────────────────────────
  // Everything that changes the canvas asks for a redraw, and the canvas is
  // drawn at most once a frame, whatever asked and however often
  // (timeline-07). Drags ask too while the transport plays, so a clip moved
  // or trimmed over a looping playback follows the pointer (timeline-10).
  const redrawFrameRef = useRef(0);
  const requestRedraw = useCallback(() => {
    if (redrawFrameRef.current) return;
    redrawFrameRef.current = requestAnimationFrame(() => {
      redrawFrameRef.current = 0;
      draw();
    });
  }, [draw]);

  // The first draw happens before the first paint, so the canvas never shows
  // a blank frame.
  useLayoutEffect(() => {
    draw();
    return () => {
      cancelAnimationFrame(redrawFrameRef.current);
      redrawFrameRef.current = 0;
    };
  }, [draw]);

  // Store changes redraw only when they change what the canvas draws: a
  // fader, FX or automation move leaves it alone.
  useEffect(
    () =>
      useStore.subscribe((next, prev) => {
        if (timelineNeedsRedraw(next, prev)) requestRedraw();
      }),
    [requestRedraw],
  );

  // A cloud-loaded buffer arriving replaces its "Loading…" label, and the
  // peaks worker delivering a long take's waveform replaces its flat line.
  useEffect(() => {
    const stopBuffers = subscribeAudioBufferChanges(requestRedraw);
    const stopPeaks = subscribePeakPyramids(requestRedraw);
    return () => {
      stopBuffers();
      stopPeaks();
    };
  }, [requestRedraw]);

  useEffect(() => {
    if (chordNotationRef.current === chordNotation) return;
    chordNotationRef.current = chordNotation;
    requestRedraw();
  }, [chordNotation, requestRedraw]);

  // The palette is read once; a change to the tokens at run time redraws
  // with the new one.
  useEffect(() => {
    const onPalette = () => {
      canvasTokensRef.current = null;
      requestRedraw();
    };
    window.addEventListener(DAW_PALETTE_EVENT, onPalette);
    return () => window.removeEventListener(DAW_PALETTE_EVENT, onPalette);
  }, [requestRedraw]);

  // Moving the window to a screen with another pixel ratio redraws at it.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    let query: MediaQueryList | null = null;
    const watch = () => {
      query?.removeEventListener('change', onChange);
      query = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`,
      );
      query.addEventListener('change', onChange);
    };
    const onChange = () => {
      watch();
      requestRedraw();
    };
    watch();
    return () => query?.removeEventListener('change', onChange);
  }, [requestRedraw]);

  // ── Redraw on vertical scroll (sticky rulers) and on resize ──────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      // Keep the playhead's grab handle on the sticky bar ruler.
      if (playheadHandleRef.current) {
        playheadHandleRef.current.style.top = `${
          el.scrollTop + RULER_HEIGHT - PLAYHEAD_HANDLE_H
        }px`;
      }
      requestRedraw();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // The canvas and the seconds ruler are sized from the scroll area: redraw
    // when it changes size (a panel opening or closing, the dock, the
    // window), not only on scroll (timeline-11). Only a real size change
    // redraws: the observer's first callback reports the size the mount draw
    // already used.
    let observedW = el.clientWidth;
    let observedH = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === observedW && el.clientHeight === observedH) return;
      observedW = el.clientWidth;
      observedH = el.clientHeight;
      requestRedraw();
    });
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [requestRedraw, scrollRef]);

  // ── Mouse coord helper ─────────────────────────────────────────────

  const getScrollTop = useCallback(
    () => scrollRef.current?.scrollTop ?? 0,
    [scrollRef],
  );

  // The playhead's grab handle, pinned to the foot of the bar ruler as it
  // mounts; the scroll listener above keeps it there. A stable callback, so
  // React doesn't detach and re-attach it, and re-measure, on every render.
  const pinPlayheadHandle = useCallback(
    (node: HTMLDivElement | null) => {
      playheadHandleRef.current = node;
      if (node) {
        node.style.top = `${getScrollTop() + RULER_HEIGHT - PLAYHEAD_HANDLE_H}px`;
      }
    },
    [getScrollTop],
  );

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

  // What a press on a clip grabs (2.12): a fade handle on an audio clip, a
  // trim zone at either edge, or the clip itself (clipChrome.clipZoneAt).
  const zoneAt = useCallback((x: number, y: number, hit: ClipRect) => {
    const state = useStore.getState();
    const audio = state.tracks
      .find((t) => t.id === hit.trackId)
      ?.audioClips.find((c) => c.id === hit.clipId);
    const fades = audio
      ? fadeSpanPx(
          audio.fadeInTicks,
          audio.fadeOutTicks,
          pixelsPerBeat(state.timelineZoom),
          hit.w,
        )
      : undefined;
    return clipZoneAt(x, y, hit, fades);
  }, []);

  /** The clip under the pointer, for its trim zones; redraws on a change. */
  const setHoverClip = useCallback(
    (clipId: string | null) => {
      if (hoverClipRef.current === clipId) return;
      hoverClipRef.current = clipId;
      requestRedraw();
    },
    [requestRedraw],
  );

  // ── Mouse down ─────────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const state = useStore.getState();
      const activeTool = state.activeTool;
      const currentZoom = state.timelineZoom;
      const currentScrollLeft = state.timelineScrollLeft;

      // The middle button pans the view, wherever it is pressed (2.12: a
      // drag on empty canvas draws the marquee now).
      if (e.button === 1) {
        e.preventDefault();
        panDragRef.current = {
          startX: x,
          lastX: x,
          moved: false,
          seekTick: null,
        };
        return;
      }
      // Only the main button acts here: a right-click opens the canvas menu
      // (handleContextMenu), and on a Mac so does a Ctrl-click.
      if (e.button !== 0 || (e.ctrlKey && isApplePlatform())) return;

      // Chord ruler click: select chords for Insight to analyze — click one,
      // Shift-click a run, Cmd/Ctrl-click to add or remove one; clicking an
      // empty stretch clears the selection. Double-click renames a chord.
      const st = getScrollTop();
      if (y >= st + RULER_HEIGHT && y < st + RULERS_HEIGHT) {
        const currentState = useStore.getState();
        const tick = pixelToTick(
          x,
          currentState.timelineZoom,
          currentState.timelineScrollLeft,
        );
        const region = currentState.chordRegions.find(
          (r) => r.startTick <= tick && r.endTick > tick,
        );
        if (!region) {
          chordAnchorRef.current = null;
          currentState.setSelectedChordIds([]);
          return;
        }
        const next = nextChordSelection(
          currentState.chordRegions,
          currentState.selectedChordIds,
          chordAnchorRef.current,
          region.id,
          { shift: e.shiftKey, toggle: e.metaKey || e.ctrlKey },
        );
        chordAnchorRef.current = next.anchorId;
        currentState.setSelectedChordIds(next.selectedIds);
        return;
      }

      // Top ruler (the chord ruler below it is handled above): marker flags
      // first, then whatever the press lands on — the loop in the top strip,
      // or in the bar-number lane the playhead handle or a seek/zoom/loop-draw.
      if (y >= st && y < st + RULERS_HEIGHT) {
        const localY = y - st;
        if (localY >= LOOP_STRIP_H && localY < LOOP_STRIP_H + 18) {
          for (const marker of state.markers) {
            const mx = tickToPixel(marker.tick, currentZoom, currentScrollLeft);
            if (Math.abs(x - mx) < 10) {
              markerDragRef.current = marker.id;
              return;
            }
          }
        }
        const pressTick = pixelToTick(x, currentZoom, currentScrollLeft);
        rulerPressRef.current = {
          target: rulerPressTarget(
            x,
            localY,
            tickToPixel(state.loopStart, currentZoom, currentScrollLeft),
            tickToPixel(state.loopEnd, currentZoom, currentScrollLeft),
            LOOP_STRIP_H,
            tickToPixel(getPlayheadTick(), currentZoom, currentScrollLeft),
          ),
          mode: null,
          startX: x,
          startY: y,
          lastY: y,
          pressTick,
          seekTick: doSnap(pressTick),
          original: { start: state.loopStart, end: state.loopEnd },
        };
        return;
      }

      // Cursor tool, ⌘/Ctrl held: drag a marquee to select notes in clips,
      // starting on a clip too.
      if (activeTool === 'cursor' && (e.metaKey || e.ctrlKey)) {
        noteMarqueeRef.current = { x0: x, y0: y, x1: x, y1: y, seekTick: null };
        return;
      }

      // Cursor tool: clip interaction
      if (activeTool === 'cursor') {
        const hit = hitTestClip(x, y);

        if (hit) {
          state.setSelectedClip(hit.clipId, hit.trackId);

          // A click on a tile whose audio failed to load tries again.
          const tile = state.tracks
            .find((t) => t.id === hit.trackId)
            ?.audioClips.find((c) => c.id === hit.clipId);
          if (
            tile &&
            !getAudioBuffer(tile.id) &&
            clipAudioStatus(tile.id, tile.assetId) === 'failed'
          ) {
            retryClipAudio(tile.id);
          }

          // Resolve the clip's content end + the bounds its edges may travel to.
          const hitTrack = state.tracks.find((t) => t.id === hit.trackId);
          const zone = zoneAt(x, y, hit);
          const fadeClip = hitTrack?.audioClips.find(
            (c) => c.id === hit.clipId,
          );
          if ((zone === 'fade-in' || zone === 'fade-out') && fadeClip) {
            // A fade handle: the fade follows the pointer and is written on
            // release (2.12).
            fadeDragRef.current = {
              clipId: hit.clipId,
              trackId: hit.trackId,
              edge: zone === 'fade-in' ? 'in' : 'out',
              ticks:
                zone === 'fade-in'
                  ? fadeClip.fadeInTicks
                  : fadeClip.fadeOutTicks,
            };
            pauseFollow();
            return;
          }
          const mode: DragMode =
            zone === 'trim-left'
              ? 'resize-left'
              : zone === 'trim-right'
                ? 'resize-right'
                : 'move';

          const midiClip = hitTrack?.midiClips.find((c) => c.id === hit.clipId);
          const audioClip = hitTrack?.audioClips.find(
            (c) => c.id === hit.clipId,
          );
          let endTickOrigin = hit.startTick;
          let minStartTick = hit.startTick;
          let maxEndTick = hit.startTick;
          if (midiClip) {
            // MIDI trims are destructive — bound the edges to the content.
            let dur = 0;
            if (midiClip.durationTicks != null) {
              dur = midiClip.durationTicks;
            } else if (midiClip.events.length > 0) {
              // From the clip's own tick 0, so a rest at the front counts
              // toward the length the right edge trims against.
              dur = midiClip.events.reduce(
                (m, e) => Math.max(m, e.startTick + e.durationTicks),
                0,
              );
            }
            endTickOrigin = midiClip.startTick + dur;
            minStartTick = midiClip.startTick;
            maxEndTick = endTickOrigin;
          } else if (audioClip) {
            // Audio trims are non-destructive — the buffer beyond the current
            // edges can be revealed, so bounds span the whole underlying asset.
            endTickOrigin = audioClip.startTick + audioClip.duration;
            const ticksPerSec = (state.bpm * 480) / 60;
            const offsetTicks = (audioClip.offsetSeconds ?? 0) * ticksPerSec;
            const bufferTicks =
              (getAudioBuffer(audioClip.id)?.duration ?? 0) * ticksPerSec;
            const assetStart = audioClip.startTick - offsetTicks;
            minStartTick = Math.max(0, assetStart);
            maxEndTick =
              bufferTicks > 0 ? assetStart + bufferTicks : endTickOrigin;
          }

          dragRef.current = {
            clipId: hit.clipId,
            trackId: hit.trackId,
            originTrackIndex: hit.trackIndex,
            offsetX: x - hit.x,
            startTickOrigin: hit.startTick,
            endTickOrigin,
            minStartTick,
            maxEndTick,
            mode,
          };
          dragTickRef.current = hit.startTick;
          dragEndTickRef.current = endTickOrigin;
          dragTrackRef.current = hit.trackIndex;
          // A page turn under a dragged clip would move the clip too.
          pauseFollow();
        } else {
          // Empty space: deselect now. A click seeks on release, as the
          // ruler does; a drag draws the marquee, selecting the notes it
          // touches for Insight (2.12; the middle button pans).
          state.setSelectedClip(null, null);
          const tick = pixelToTick(x, currentZoom, currentScrollLeft);
          noteMarqueeRef.current = {
            x0: x,
            y0: y,
            x1: x,
            y1: y,
            seekTick: doSnap(tick),
          };
        }
      }

      // Draw tool: a click on an empty MIDI lane draws a one-bar clip there,
      // from the grid line before the click, and opens it in the dock's note
      // editor; a click on a clip opens that one.
      if (activeTool === 'pencil') {
        const hit = hitTestClip(x, y);
        const trackId =
          hit?.trackId ??
          state.tracks[rowIndexAt(rowLayoutOf(state.tracks), y - RULERS_HEIGHT)]
            ?.id;
        const track = state.tracks.find((t) => t.id === trackId);
        if (!track || track.type !== 'midi') return;
        let clipId = hit?.clipId ?? null;
        if (!clipId) {
          const grid = timelineSnapGrid(state);
          const tick = pixelToTick(x, currentZoom, currentScrollLeft);
          const barStart = barStartTick(tick, grid.ts);
          const startTick = grid.enabled
            ? barStart + Math.floor((tick - barStart) / grid.step) * grid.step
            : Math.max(0, Math.round(tick));
          clipId = `clip-draw-${crypto.randomUUID().slice(0, 8)}`;
          const newId = clipId;
          withTransaction('Draw clip', () =>
            state.addMidiClip(track.id, {
              id: newId,
              name: track.name,
              startTick,
              durationTicks: ticksPerBar(tsNum, tsDen),
              events: [],
            }),
          );
        }
        state.setSelectedTrackId(track.id);
        state.setSelectedClip(clipId, track.id);
        // Notes: the drum grid on drums, the piano roll on the rest (2.9).
        state.setChannelStripTab('piano-roll');
        return;
      }

      // Scissors tool: split clip at click position
      if (activeTool === 'scissors') {
        const hit = hitTestClip(x, y);
        if (!hit) return;

        const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
        const splitTick = doSnap(rawTick);

        // A MIDI clip splits at the clip tick under the cursor, its right
        // half's notes moved onto that half's start; an audio clip's halves
        // both keep the recording (no slicing, no eviction), so undo and a
        // reload still find the take. Each returns null for the other kind.
        // One undo step with the chords it hands to the right half.
        const rightId = withTransaction(
          'Split clip',
          () =>
            splitMidiClipAt(hit.trackId, hit.clipId, splitTick) ??
            splitAudioClipAt(hit.trackId, hit.clipId, splitTick),
        );
        if (rightId) state.setSelectedClip(rightId, hit.trackId);
      }
    },
    [getCanvasCoords, getScrollTop, hitTestClip, zoneAt, doSnap, tsNum, tsDen],
  );

  // Double-click: ruler → add marker, clip → its editor in the dock
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const st = getScrollTop();
      // Chord ruler: double-click renames the chord (a single click selects it).
      if (y >= st + RULER_HEIGHT && y < st + RULERS_HEIGHT) {
        const state = useStore.getState();
        const tick = pixelToTick(
          x,
          state.timelineZoom,
          state.timelineScrollLeft,
        );
        const region = state.chordRegions.find(
          (r) => r.startTick <= tick && r.endTick > tick,
        );
        if (region) {
          setEditingChord({
            id: region.id,
            x: tickToPixel(
              region.startTick,
              state.timelineZoom,
              state.timelineScrollLeft,
            ),
            // The chord lane is drawn at the scroll offset (sticky).
            y: st + RULER_HEIGHT,
            // Opens on the chord, as a symbol the box reads back.
            value: chordInputText(
              region,
              keyFrameOf(state.rootNote, state.mode),
            ),
          });
        }
        return;
      }
      if (y >= st && y < st + RULER_HEIGHT) {
        const state = useStore.getState();
        const currentZoom = state.timelineZoom;
        const currentScrollLeft = state.timelineScrollLeft;
        const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
        const snapped = snapTicks(rawTick, timelineSnapGrid(state));
        const nextNum = state.markers.length + 1;
        state.addMarker(snapped, `Marker ${nextNum}`);
        return;
      }
      // The click before it has opened the clip's editor in the dock
      // already (2.9: Notes, the drum grid or the chain); a double-click
      // does the same, where the modal piano roll used to open.
      const hit = hitTestClip(x, y);
      if (hit) openClipEditor(hit.trackId);
    },
    [getCanvasCoords, getScrollTop, hitTestClip],
  );

  // ── Context menu (right-click) ────────────────────────────────────
  // The one canvas menu (2.12): a clip's menu on a clip, which it selects
  // (not its track, so the dock stays put, as in Soundtrap); a lane's on an
  // empty stretch of lane; a marker's on a marker flag; the ruler's above
  // the lanes. It hangs at the pointer.

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const { x, y } = getCanvasCoords(e);
      const st = getScrollTop();
      const state = useStore.getState();
      const currentZoom = state.timelineZoom;
      const currentScrollLeft = state.timelineScrollLeft;
      const tick = snapTicks(
        pixelToTick(x, currentZoom, currentScrollLeft),
        timelineSnapGrid(state),
      );

      let target: CanvasMenuTarget | null = null;
      if (y >= st && y < st + RULERS_HEIGHT) {
        // A marker's flag or its name, else the ruler itself.
        const marker = state.markers.find((m) => {
          const mx = tickToPixel(m.tick, currentZoom, currentScrollLeft);
          return x >= mx - 5 && x <= mx + 70;
        });
        target = marker
          ? { kind: 'marker', markerId: marker.id, tick: marker.tick }
          : { kind: 'ruler', tick };
      } else if (y >= st + RULERS_HEIGHT) {
        const hit = hitTestClip(x, y);
        if (hit) {
          state.setSelectedClip(hit.clipId, hit.trackId);
          target = { kind: 'clip', trackId: hit.trackId, clipId: hit.clipId };
        } else {
          // The canvas is the lanes' full height, so a lane is found from
          // the canvas's top.
          const track =
            state.tracks[
              rowIndexAt(rowLayoutOf(state.tracks), y - RULERS_HEIGHT)
            ];
          if (track) target = { kind: 'lane', trackId: track.id, tick };
        }
      }
      if (!target) return;
      useCanvasMenuStore.getState().open({
        target,
        anchor: { x: e.clientX, y: e.clientY, width: 0, height: 0 },
        source: 'pointer',
        playheadTick: getPlayheadTick(),
      });
    },
    [getCanvasCoords, getScrollTop, hitTestClip],
  );

  // ── Mouse move ─────────────────────────────────────────────────────

  // Drives an active top-ruler press (rulerPressRef) to canvas position (x, y)
  // — shared by the canvas and window move handlers so a drag carries on off
  // the canvas. Loop and playhead drags are absolute and zoom is incremental
  // from `lastY`, so handling the same move twice is harmless. Returns whether
  // a ruler press is active.
  const moveRulerPress = useCallback(
    (x: number, y: number): boolean => {
      const r = rulerPressRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) return false;
      const state = useStore.getState();

      if (!r.mode) {
        const movedX = x - r.startX;
        const movedY = y - r.startY;
        if (
          Math.max(Math.abs(movedX), Math.abs(movedY)) <=
          RULER_ZOOM_DRAG_THRESHOLD
        ) {
          return true;
        }
        r.mode =
          r.target === 'playhead'
            ? 'playhead'
            : Math.abs(movedY) > Math.abs(movedX)
              ? 'zoom'
              : 'loop';
        r.lastY = y;
        // Zooming takes the view: Follow waits for Play or Stop.
        if (r.mode === 'zoom') pauseFollow();
        // Drawing a fresh loop switches looping on, as in Logic.
        if (r.mode === 'loop' && r.target === 'empty') {
          state.setLoopEnabled(true);
        }
      }

      const grid = timelineSnapGrid(state);
      // The loop's edges step by the grid, or by single ticks with snap off.
      const snap = grid.enabled ? grid.step : 1;
      const tick = pixelToTick(x, state.timelineZoom, state.timelineScrollLeft);
      if (r.mode === 'playhead') {
        seekTo(snapTicks(tick, grid));
        canvas.style.cursor = 'grabbing';
      } else if (r.mode === 'loop') {
        const range = dragLoopRange(
          r.target,
          r.original,
          r.pressTick,
          tick,
          snap,
        );
        state.setLoopRange(range.start, range.end);
        canvas.style.cursor = 'ew-resize';
        requestRedraw();
      } else {
        // Vertical drag → zoom (up = in), anchored at the cursor so the bar
        // under it stays put.
        const dy = r.lastY - y;
        if (dy !== 0) {
          state.zoomAtPoint(
            dy * RULER_ZOOM_SENSITIVITY,
            x + state.timelineScrollLeft,
          );
          r.lastY = y;
        }
        canvas.style.cursor = 'ns-resize';
      }
      return true;
    },
    [requestRedraw],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
      const { x, y } = getCanvasCoords(e);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = useStore.getState();
      const currentZoom = state.timelineZoom;
      const currentScrollLeft = state.timelineScrollLeft;
      const grid = timelineSnapGrid(state);
      // The shortest a trim can leave a clip: a grid step, or a tick.
      const currentSnapTicks = grid.enabled ? grid.step : 1;

      // Marker drag
      if (markerDragRef.current) {
        const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
        const snapped = snapTicks(rawTick, grid);
        markerDragTickRef.current = snapped;
        canvas.style.cursor = 'col-resize';
        requestRedraw();
        return;
      }

      // Note marquee in progress
      if (noteMarqueeRef.current) {
        extendNoteMarquee(x, y);
        canvas.style.cursor = 'crosshair';
        requestRedraw();
        return;
      }

      // Top-ruler press in progress: playhead, zoom or loop drag.
      if (moveRulerPress(x, y)) return;

      // The middle button's pan. Dragging the mouse left scrolls toward the
      // right of the timeline and vice-versa (content follows the cursor),
      // clamped to the content extent.
      if (panDragRef.current) {
        const p = panDragRef.current;
        if (!p.moved) {
          if (Math.abs(x - p.startX) <= PAN_DRAG_THRESHOLD) return;
          p.moved = true;
          p.lastX = x;
          pauseFollow();
        }
        const deltaX = x - p.lastX;
        if (deltaX !== 0) {
          const maxScrollNow = Math.max(
            0,
            (projectLengthTicks / TICKS_PER_BEAT) * pixelsPerBeat(currentZoom) -
              widthRef.current,
          );
          state.setTimelineScrollLeft(
            Math.min(maxScrollNow, Math.max(0, currentScrollLeft - deltaX)),
          );
          p.lastX = x;
        }
        canvas.style.cursor = 'grabbing';
        return;
      }

      // A fade handle in hand: the fade runs from its edge of the clip to
      // the pointer, on the grid, never into the other fade.
      const fade = fadeDragRef.current;
      if (fade) {
        const clip = state.tracks
          .find((t) => t.id === fade.trackId)
          ?.audioClips.find((c) => c.id === fade.clipId);
        if (clip) {
          const tick = snapTicks(
            pixelToTick(x, currentZoom, currentScrollLeft),
            grid,
          );
          const raw =
            fade.edge === 'in'
              ? tick - clip.startTick
              : clip.startTick + clip.duration - tick;
          const other =
            fade.edge === 'in' ? clip.fadeOutTicks : clip.fadeInTicks;
          const next = Math.max(0, Math.min(clip.duration - other, raw));
          if (next !== fade.ticks) {
            fade.ticks = next;
            requestRedraw();
          }
        }
        canvas.style.cursor = 'ew-resize';
        return;
      }

      const drag = dragRef.current;

      if (drag) {
        // The Edit pill hides until the clip lands (ClipEditPill).
        if (canvasBoxRef.current)
          canvasBoxRef.current.dataset.dragging = 'true';
        if (drag.mode === 'move') {
          const rawTick = pixelToTick(
            x - drag.offsetX,
            currentZoom,
            currentScrollLeft,
          );
          dragTickRef.current = snapTicks(rawTick, grid);
          dragTrackRef.current = clampedRowAt(
            rowLayoutOf(state.tracks),
            y - RULERS_HEIGHT,
          );
          requestRedraw();
        } else if (drag.mode === 'resize-left') {
          // Left edge can travel between its lower bound and one grid step
          // short of the fixed right edge.
          const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
          const snapped = snapTicks(rawTick, grid);
          dragTickRef.current = Math.max(
            drag.minStartTick,
            Math.min(snapped, drag.endTickOrigin - currentSnapTicks),
          );
          requestRedraw();
        } else if (drag.mode === 'resize-right') {
          // Right edge can travel between one grid step past the fixed left
          // edge and its upper bound.
          const rawTick = pixelToTick(x, currentZoom, currentScrollLeft);
          const snapped = snapTicks(rawTick, grid);
          dragEndTickRef.current = Math.min(
            drag.maxEndTick,
            Math.max(snapped, drag.startTickOrigin + currentSnapTicks),
          );
          requestRedraw();
        }
        canvas.style.cursor = drag.mode === 'move' ? 'grabbing' : 'col-resize';
        return;
      }

      // Cursor hint — ruler area
      const st = getScrollTop();
      if (y >= st && y < st + RULERS_HEIGHT) {
        const localY = y - st;
        // Marker handles (flag + name label area)
        if (localY >= LOOP_STRIP_H && localY < LOOP_STRIP_H + 20) {
          for (const marker of state.markers) {
            const mx = tickToPixel(marker.tick, currentZoom, currentScrollLeft);
            if (x >= mx - 5 && x <= mx + 70) {
              canvas.style.cursor = 'grab';
              return;
            }
          }
        }
        // Top ruler: a grab hand on the playhead handle, resize arrows on a
        // loop edge, a pointing hand everywhere else (click to seek/toggle).
        if (localY < RULER_HEIGHT) {
          const target = rulerPressTarget(
            x,
            localY,
            tickToPixel(state.loopStart, currentZoom, currentScrollLeft),
            tickToPixel(state.loopEnd, currentZoom, currentScrollLeft),
            LOOP_STRIP_H,
            tickToPixel(getPlayheadTick(), currentZoom, currentScrollLeft),
          );
          canvas.style.cursor =
            target === 'playhead'
              ? 'grab'
              : target === 'loop-start' || target === 'loop-end'
                ? 'ew-resize'
                : 'pointer';
          return;
        }
      }
      if (y > st + RULERS_HEIGHT) {
        const hit = hitTestClip(x, y);
        // The Pointer tool shows a clip's trim zones (and an audio clip's
        // fade handles) while the pointer is over it.
        setHoverClip(
          state.activeTool === 'cursor' ? (hit?.clipId ?? null) : null,
        );
        const zone = hit ? zoneAt(x, y, hit) : null;
        if (state.activeTool === 'cursor' && (e.metaKey || e.ctrlKey)) {
          canvas.style.cursor = 'crosshair';
        } else if (state.activeTool === 'scissors' && hit) {
          canvas.style.cursor = 'crosshair';
        } else if (state.activeTool === 'pencil') {
          const lane =
            state.tracks[
              rowIndexAt(rowLayoutOf(state.tracks), y - RULERS_HEIGHT)
            ];
          canvas.style.cursor =
            lane?.type === 'midi' ? (hit ? 'pointer' : 'copy') : 'not-allowed';
        } else if (zone === 'fade-in' || zone === 'fade-out') {
          canvas.style.cursor = 'ew-resize';
        } else if (zone === 'trim-left' || zone === 'trim-right') {
          canvas.style.cursor = 'col-resize';
        } else if (hit) {
          canvas.style.cursor = 'grab';
        } else {
          // Empty space: a click seeks, a drag draws the marquee.
          canvas.style.cursor = 'default';
        }
      } else {
        setHoverClip(null);
        canvas.style.cursor = 'default';
      }
    },
    [
      getCanvasCoords,
      getScrollTop,
      hitTestClip,
      zoneAt,
      setHoverClip,
      requestRedraw,
      projectLengthTicks,
      moveRulerPress,
      extendNoteMarquee,
    ],
  );

  // ── Mouse up ───────────────────────────────────────────────────────

  const handleCanvasMouseUp = useCallback(() => {
    // Note marquee: select every note it touched. A ⌘-click without a drag
    // clears the note selection.
    if (noteMarqueeRef.current) {
      const m = noteMarqueeRef.current;
      noteMarqueeRef.current = null;
      marqueeHitsRef.current = null;
      const state = useStore.getState();
      const dragged =
        Math.abs(m.x1 - m.x0) >= PAN_DRAG_THRESHOLD ||
        Math.abs(m.y1 - m.y0) >= PAN_DRAG_THRESHOLD;
      state.setSelectedNotes(
        dragged ? notesInMarquee(drawnNotesRef.current, m) : [],
      );
      // A plain click on empty canvas seeks, as a click on the ruler does.
      if (!dragged && m.seekTick !== null) seekTo(m.seekTick);
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      requestRedraw();
      return;
    }
    if (fadeDragRef.current) {
      // One write, one undo step: 'Fade in' or 'Fade out'.
      const fade = fadeDragRef.current;
      fadeDragRef.current = null;
      setClipFade(
        { trackId: fade.trackId, clipId: fade.clipId },
        fade.edge,
        fade.ticks,
      );
      useStore.getState().setSelectedClip(fade.clipId, fade.trackId);
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      requestRedraw();
      return;
    }
    if (rulerPressRef.current) {
      const r = rulerPressRef.current;
      rulerPressRef.current = null;
      // Never crossed the drag threshold → a click: on the loop it toggles
      // looping (the range stays put); elsewhere it seeks. A click on the
      // playhead handle leaves the playhead where it is.
      if (!r.mode && r.target !== 'playhead') {
        const state = useStore.getState();
        if (r.target === 'empty') {
          seekTo(r.seekTick);
          state.setSelectedClip(null, null);
        } else {
          state.setLoopEnabled(!state.loopEnabled);
        }
      }
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      return;
    }
    if (panDragRef.current) {
      const p = panDragRef.current;
      panDragRef.current = null;
      if (!p.moved && p.seekTick !== null) seekTo(p.seekTick);
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      return;
    }
    if (markerDragRef.current) {
      const id = markerDragRef.current;
      const tick = markerDragTickRef.current;
      markerDragRef.current = null;
      markerDragTickRef.current = null;
      const marker = useStore.getState().markers.find((m) => m.id === id);
      if (marker && tick !== null && tick !== marker.tick) {
        withTransaction('Move marker', () =>
          useStore.getState().updateMarker(id, { tick }),
        );
      }
      requestRedraw();
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;

    // One undo step, and one update to collaborators, however many writes
    // the move or trim makes.
    withTransaction(drag.mode === 'move' ? 'Move clip' : 'Trim clip', () => {
      const state = useStore.getState();

      if (drag.mode === 'move') {
        const newTick = dragTickRef.current;
        const newTrackIdx = dragTrackRef.current;
        const freshTracks = state.tracks;
        const originTrack = freshTracks[drag.originTrackIndex];
        const targetTrack = freshTracks[newTrackIdx];

        // One write through moveClip: it refuses (and says so) a track a
        // collaborator holds or the wrong kind of track, and takes the
        // chords Prism read from the clip along, no others (timeline-05,
        // timeline-06).
        if (originTrack && targetTrack) {
          state.moveClip(originTrack.id, drag.clipId, targetTrack.id, newTick);
        }
      } else if (drag.mode === 'resize-left' || drag.mode === 'resize-right') {
        const track = state.tracks.find((tr) => tr.id === drag.trackId);
        const midiClip = track?.midiClips.find((c) => c.id === drag.clipId);
        const audioClip = track?.audioClips.find((c) => c.id === drag.clipId);

        if (midiClip) {
          // MIDI trims are destructive: drop events outside the new bounds,
          // clamp those that straddle an edge, and leave durationTicks unset so
          // the clip box tracks its (now trimmed) content.
          if (drag.mode === 'resize-left') {
            const shift = dragTickRef.current - midiClip.startTick; // ticks off front
            if (shift > 0) {
              const events = midiClip.events
                .filter((e) => e.startTick + e.durationTicks > shift)
                .map((e) => {
                  const rel = e.startTick - shift;
                  return rel < 0
                    ? {
                        ...e,
                        startTick: 0,
                        durationTicks: e.durationTicks + rel,
                      }
                    : { ...e, startTick: rel };
                });
              const ccEvents = midiClip.ccEvents
                ?.map((c) => ({ ...c, tick: c.tick - shift }))
                .filter((c) => c.tick >= 0);
              state.updateMidiClip(drag.trackId, drag.clipId, {
                startTick: dragTickRef.current,
                events,
                ccEvents: ccEvents?.length ? ccEvents : undefined,
                durationTicks: undefined,
              });
            }
          } else {
            const newLen = dragEndTickRef.current - midiClip.startTick;
            const events = midiClip.events
              .filter((e) => e.startTick < newLen)
              .map((e) =>
                e.startTick + e.durationTicks > newLen
                  ? { ...e, durationTicks: newLen - e.startTick }
                  : e,
              );
            const ccEvents = midiClip.ccEvents?.filter((c) => c.tick < newLen);
            state.updateMidiClip(drag.trackId, drag.clipId, {
              events,
              ccEvents: ccEvents?.length ? ccEvents : undefined,
              durationTicks: undefined,
            });
          }
        } else if (audioClip) {
          // Audio trims are non-destructive: shift the asset read offset and the
          // played duration; the buffer itself is untouched. The fades stay
          // inside what is left, the fade in first (2.12: their handles show
          // where they end).
          const ticksPerSec = (state.bpm * 480) / 60;
          const fadesWithin = (duration: number) => {
            const fadeInTicks = Math.min(audioClip.fadeInTicks, duration);
            return {
              fadeInTicks,
              fadeOutTicks: Math.min(
                audioClip.fadeOutTicks,
                duration - fadeInTicks,
              ),
            };
          };
          if (drag.mode === 'resize-left') {
            const shift = dragTickRef.current - audioClip.startTick;
            if (shift !== 0) {
              const duration = audioClip.duration - shift;
              state.updateAudioClip(drag.trackId, drag.clipId, {
                startTick: dragTickRef.current,
                duration,
                offsetSeconds: Math.max(
                  0,
                  (audioClip.offsetSeconds ?? 0) + shift / ticksPerSec,
                ),
                ...fadesWithin(duration),
              });
            }
          } else {
            const duration = dragEndTickRef.current - audioClip.startTick;
            state.updateAudioClip(drag.trackId, drag.clipId, {
              duration,
              ...fadesWithin(duration),
            });
          }
        }
      }
    });

    dragRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    if (canvasBoxRef.current) delete canvasBoxRef.current.dataset.dragging;

    // The clip's track is selected with it, and a click that moved and
    // trimmed nothing opens the clip's editor in the dock (2.9). Done on
    // release, so the dock never changes height under a drag.
    const clicked =
      dragTickRef.current === drag.startTickOrigin &&
      dragEndTickRef.current === drag.endTickOrigin &&
      dragTrackRef.current === drag.originTrackIndex;
    const holder = useStore
      .getState()
      .tracks.find(
        (t) =>
          t.midiClips.some((c) => c.id === drag.clipId) ||
          t.audioClips.some((c) => c.id === drag.clipId),
      );
    if (holder) {
      if (clicked) openClipEditor(holder.id);
      else if (useStore.getState().selectedTrackId !== holder.id) {
        useStore.getState().setSelectedTrackId(holder.id);
      }
    }

    requestRedraw();
  }, [requestRedraw]);

  // Global mouseup listener for drag release outside canvas
  // While a ruler zoom-drag or empty-area pan is active, keep processing mouse
  // movement at the window level so the gesture continues even after the cursor
  // leaves the canvas (e.g. dragging up into the transport bar to keep scaling
  // the timeline — there's no ceiling on how far up the user can go). Both
  // deltas are incremental and update their own `last` reference, so the
  // canvas's own onMouseMove and this listener can't double-apply: whichever
  // fires second for a given event sees a zero delta.
  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (noteMarqueeRef.current) {
        const { x, y } = getCanvasCoords(e);
        extendNoteMarquee(x, y);
        requestRedraw();
      } else if (rulerPressRef.current) {
        const { x, y } = getCanvasCoords(e);
        moveRulerPress(x, y);
      } else if (
        (dragRef.current || markerDragRef.current || fadeDragRef.current) &&
        e.target !== canvasRef.current
      ) {
        // A clip or marker drag keeps following the pointer off the canvas
        // (timeline-10); over the canvas, its own handler moves it.
        handleCanvasMouseMove(e);
      } else if (panDragRef.current) {
        const { x } = getCanvasCoords(e);
        const p = panDragRef.current;
        if (!p.moved) {
          if (Math.abs(x - p.startX) <= PAN_DRAG_THRESHOLD) return;
          p.moved = true;
          p.lastX = x;
          pauseFollow();
        }
        const deltaX = x - p.lastX;
        if (deltaX !== 0) {
          const state = useStore.getState();
          const maxScrollNow = Math.max(
            0,
            (projectLengthTicks / TICKS_PER_BEAT) *
              pixelsPerBeat(state.timelineZoom) -
              widthRef.current,
          );
          state.setTimelineScrollLeft(
            Math.min(
              maxScrollNow,
              Math.max(0, state.timelineScrollLeft - deltaX),
            ),
          );
          p.lastX = x;
        }
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      }
    },
    [
      getCanvasCoords,
      projectLengthTicks,
      moveRulerPress,
      handleCanvasMouseMove,
      requestRedraw,
      extendNoteMarquee,
    ],
  );

  useEffect(() => {
    const handleGlobalUp = () => {
      if (
        dragRef.current ||
        markerDragRef.current ||
        rulerPressRef.current ||
        panDragRef.current ||
        noteMarqueeRef.current ||
        fadeDragRef.current
      ) {
        handleCanvasMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('mousemove', handleWindowMouseMove);
    };
  }, [handleCanvasMouseUp, handleWindowMouseMove]);

  // ── Wheel: zoom (Cmd/Ctrl) + horizontal scroll (Shift/trackpad) ────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        // Zoom at cursor position
        e.preventDefault();
        pauseFollow();
        const delta = e.deltaY > 0 ? -0.03 : 0.03;
        const rect = canvas.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        useStore
          .getState()
          .zoomAtPoint(delta, cursorX + useStore.getState().timelineScrollLeft);
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal scroll (shift+wheel or trackpad horizontal gesture)
        e.preventDefault();
        pauseFollow();
        const dx = e.shiftKey ? e.deltaY : e.deltaX;
        const state = useStore.getState();
        const maxScroll = Math.max(
          0,
          (projectLengthTicks / TICKS_PER_BEAT) *
            pixelsPerBeat(state.timelineZoom) -
            widthRef.current,
        );
        state.setTimelineScrollLeft(
          Math.min(maxScroll, state.timelineScrollLeft + dx),
        );
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
        const id = st.addTrack(
          'midi',
          payload.instrumentType,
          payload.instrumentType,
        );
        st.setSelectedTrackId(id);
      } else if (payload.kind === 'template') {
        const id = st.addTrack(
          payload.trackType,
          payload.instrument,
          payload.name,
        );
        st.setSelectedTrackId(id);
      } else if (payload.kind === 'drum-sample') {
        try {
          const resp = await fetch(payload.url);
          if (!resp.ok)
            throw new Error(`Failed to fetch sample: ${resp.status}`);
          const arrayBuf = await resp.arrayBuffer();
          // Clone the bytes before decodeAudioData — some browsers neuter the
          // input. We need both: the decoded buffer for playback, and the
          // original bytes for upload (already a compressed format on the
          // server, so uploading as-is avoids a quality-losing re-encode).
          const originalBytes = arrayBuf.slice(0);
          const originalContentType =
            resp.headers.get('content-type') ||
            inferContentTypeFromUrl(payload.url) ||
            'audio/wav';
          const ctx = new AudioContext();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          const trackId = st.addTrack('audio', 'none', payload.name, '#f59e0b');
          st.setSelectedTrackId(trackId);
          const clipId = `clip-sample-${crypto.randomUUID().slice(0, 8)}`;
          const durationTicks = Math.round(
            (audioBuf.duration / 60) * st.bpm * 480,
          );
          setAudioBuffer(clipId, audioBuf);
          setOriginalAudio(clipId, originalBytes, originalContentType);
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
          if (!resp.ok)
            throw new Error(`Failed to fetch MIDI loop: ${resp.status}`);
          const arrayBuf = await resp.arrayBuffer();
          // The MIDI reader loads with the first drop, not with the editor.
          const { importMidiFile } = await import('@/daw/midi/MidiFileIO');
          const sequences = importMidiFile(arrayBuf);
          const OUR_PPQ = 480;
          for (let i = 0; i < sequences.length; i++) {
            const seq = sequences[i];
            const ppq = seq.ticksPerQuarterNote;
            const instrument = payload.instrument ?? 'soundfont';
            const color = instrument === 'drum-machine' ? '#f59e0b' : '#8b5cf6';
            const trackId = st.addTrack(
              'midi',
              instrument,
              payload.name,
              color,
            );
            st.setSelectedTrackId(trackId);
            const events: MidiNoteEvent[] = seq.events.map(
              (ev: MidiNoteEvent) => ({
                ...ev,
                startTick:
                  ppq === OUR_PPQ
                    ? ev.startTick
                    : Math.round((ev.startTick * OUR_PPQ) / ppq),
                durationTicks:
                  ppq === OUR_PPQ
                    ? ev.durationTicks
                    : Math.round((ev.durationTicks * OUR_PPQ) / ppq),
              }),
            );
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
    if (!file || (!file.name.endsWith('.mid') && !file.name.endsWith('.midi')))
      return;

    const OUR_PPQ = 480;
    const arrayBuffer = await file.arrayBuffer();
    const { importMidiFile } = await import('@/daw/midi/MidiFileIO');
    const sequences = importMidiFile(arrayBuffer);
    const state = useStore.getState();
    const COLORS = [
      '#8b5cf6',
      '#a855f7',
      '#f59e0b',
      '#f97316',
      '#22c55e',
      '#3b82f6',
      '#ef4444',
      '#06b6d4',
    ];

    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];
      const ppq = seq.ticksPerQuarterNote;
      const color = COLORS[i % COLORS.length];
      const trackId = state.addTrack(
        'midi',
        'oracle-synth',
        seq.trackName,
        color,
      );

      const events: MidiNoteEvent[] = seq.events.map((ev: MidiNoteEvent) => ({
        ...ev,
        startTick:
          ppq === OUR_PPQ
            ? ev.startTick
            : Math.round((ev.startTick * OUR_PPQ) / ppq),
        durationTicks:
          ppq === OUR_PPQ
            ? ev.durationTicks
            : Math.round((ev.durationTicks * OUR_PPQ) / ppq),
      }));

      state.addMidiClip(trackId, {
        id: `clip-drop-${crypto.randomUUID().slice(0, 8)}`,
        name: seq.trackName,
        startTick: 0,
        events,
      });
    }
  }, []);

  // ── Width ──────────────────────────────────────────────────────────

  // The canvas's width, tracked as it changes (a panel opening or closing,
  // the window) so the playhead's range stays right, and published to the
  // editor's viewport, which the toolbar's zoom, the keys, Fit and the
  // scrollbar all read (shell-32). A resize re-renders this component once a
  // frame at most.
  const [viewportWidth, setViewportWidth] = useState(0);
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      widthRef.current = el.clientWidth;
      publishTimelineWidth(el.clientWidth);
      setViewportWidth(el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      publishTimelineWidth(0);
    };
  }, []);

  // Where a clip sits on screen, kept in sight: a key opens the clip's menu
  // there when its Edit pill is scrolled away (2.12).
  useEffect(() => {
    useCanvasMenuStore.setState({
      clipAnchor: (clipId) => {
        const canvas = canvasRef.current;
        const scroller = scrollRef.current;
        if (!canvas || !scroller) return null;
        const state = useStore.getState();
        const box = clipBoxOf(
          state.tracks,
          clipId,
          state.timelineZoom,
          state.timelineScrollLeft,
        );
        if (!box) return null;
        const canvasBox = canvas.getBoundingClientRect();
        const view = scroller.getBoundingClientRect();
        const clamp = (v: number, lo: number, hi: number) =>
          Math.max(lo, Math.min(hi, v));
        const x = clamp(
          canvasBox.left + box.x,
          canvasBox.left,
          canvasBox.right - 8,
        );
        const y = clamp(
          canvasBox.top + box.y,
          view.top + RULERS_HEIGHT,
          view.bottom - 8,
        );
        return { x, y, width: 0, height: Math.min(box.h, view.bottom - y) };
      },
    });
    return () => useCanvasMenuStore.setState({ clipAnchor: null });
  }, [scrollRef]);

  // Create's keys (copy, paste, nudge, tools, zoom), while the timeline is on
  // screen.
  useArrangeKeymap();
  // Pages after the playhead while the song plays (editor/follow).
  useFollowPlayhead(() => widthRef.current);

  return (
    <div
      className="flex flex-1 flex-col bg-[var(--daw-bg)]"
      style={{ minHeight: '100%' }}
    >
      <div
        ref={canvasBoxRef}
        className="group/canvas relative flex-1 overflow-x-hidden"
      >
        <canvas
          ref={canvasRef}
          className="block"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onDoubleClick={handleCanvasDoubleClick}
          onContextMenu={handleContextMenu}
          onMouseLeave={() => setHoverClip(null)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        {/* Chord ruler inline editor */}
        {editingChord && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setEditingChord(null)}
            />
            <input
              autoFocus
              className="absolute z-50"
              style={{
                left: editingChord.x,
                top: editingChord.y,
                width: 120,
                height: CHORD_RULER_HEIGHT,
                fontSize: 12,
                fontFamily: "'Glacial Indifference', system-ui, sans-serif",
                background: 'var(--daw-popover)',
                color: 'var(--daw-text)',
                border: chordBoxBorder(!!editingChord.refused),
                borderRadius: 3,
                padding: '0 4px',
                outline: 'none',
              }}
              value={editingChord.value}
              aria-label="Chord symbol"
              aria-invalid={editingChord.refused || undefined}
              onChange={(e) =>
                setEditingChord(
                  (prev) =>
                    prev && { ...prev, value: e.target.value, refused: false },
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (writeTypedChord(editingChord) === 'refused') {
                    setEditingChord({ ...editingChord, refused: true });
                  } else {
                    setEditingChord(null);
                  }
                } else if (e.key === 'Escape') {
                  setEditingChord(null);
                }
              }}
              onBlur={() => {
                if (writeTypedChord(editingChord) === 'refused') {
                  showWarning(
                    `"${editingChord.value.trim()}": ${CHORD_INPUT_HINT}`,
                  );
                }
                setEditingChord(null);
              }}
            />
            {editingChord.refused && (
              <ChordInputHint
                style={{
                  left: editingChord.x,
                  top: editingChord.y + CHORD_RULER_HEIGHT + 4,
                  zIndex: 51,
                }}
              />
            )}
          </>
        )}
        {/* CSS playhead — GPU-accelerated, no canvas redraw needed */}
        <TimelinePlayhead
          zoom={zoom}
          scrollLeft={scrollLeft}
          maxX={viewportWidth}
          handleRef={pinPlayheadHandle}
        />
        {/* The selected clip's Edit pill (2.12): its menu without a
            right-click. */}
        <ClipEditPill scrollRef={scrollRef} viewportWidth={viewportWidth} />
      </div>
      {/* The canvas's one menu (2.12): clips, lanes, markers, the ruler. */}
      <CanvasMenu />
    </div>
  );
}
