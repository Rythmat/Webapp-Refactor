import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Track, Clip } from '@/studio-daw/hooks/use-audio-engine';
import type { MidiNote } from '@/studio-daw/audio/midi-engine';
import { cn } from '@/lib/utils';
import { Scissors, Copy, Trash2, FileAudio, Piano, ArrowRight, Clock, Music, Layers } from 'lucide-react';

type RulerMode = 'time' | 'bars';

interface DAWTimelineProps {
  tracks: Track[];
  currentTime: number;
  isPlaying: boolean;
  bpm?: number;
  onSplitClip?: (trackId: string, clipId: string, atTime: number) => void;
  onDuplicateClip?: (trackId: string, clipId: string) => void;
  onDeleteClip?: (trackId: string, clipId: string) => void;
  onMoveClip?: (trackId: string, clipId: string, newStartTime: number) => void;
  onDoubleClickClip?: (trackId: string, clipId: string) => void;
  onChangeMidiInstrument?: (trackId: string, clipId: string) => void;
  onExtendClip?: (trackId: string, clipId: string) => void;
  onSeparateStems?: (trackId: string, clipId: string) => void;
  onUpdateClipFades?: (trackId: string, clipId: string, fades: { fadeInDuration?: number; fadeOutDuration?: number }) => void;
  onConvertToMidi?: (trackId: string, clipId: string) => void;
  // Loop
  loopEnabled?: boolean;
  loopStart?: number;
  loopEnd?: number;
  onSetLoopRegion?: (start: number, end: number) => void;
  // Seek
  onSeekTo?: (time: number) => void;
  // Recording visualization
  recordingTrackId?: string | null;
  recordingNotes?: MidiNote[];
  recordingStartTime?: number;
  recordingInputLevel?: number;
  isRecording?: boolean;
  recordingMode?: 'audio' | 'midi';
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  trackId: string | null;
  clipId: string | null;
}

interface DragState {
  clipId: string;
  trackId: string;
  initialMouseX: number;
  initialStartTime: number;
}

interface FadeDragState {
  clipId: string;
  trackId: string;
  type: 'fadeIn' | 'fadeOut';
  initialMouseX: number;
  initialDuration: number;
}

const PIXELS_PER_SECOND = 40;
const TRACK_HEIGHT = 60;

const MAX_TILE_WIDTH = 4096;

/** Draws a single waveform tile */
const WaveformTile: React.FC<{
  buffer: AudioBuffer;
  tileWidth: number;
  height: number;
  color: string;
  muted: boolean;
  startSample: number;
  endSample: number;
}> = React.memo(({ buffer, tileWidth, height, color, muted, startSample, endSample }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !buffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = tileWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, tileWidth, height);

    const channelData = buffer.getChannelData(0);
    const totalSamples = endSample - startSample;
    const samplesPerPixel = Math.max(1, Math.floor(totalSamples / tileWidth));

    const midY = height / 2;
    const amplitude = height * 0.4;
    ctx.fillStyle = muted ? '#555555' : color;
    ctx.globalAlpha = muted ? 0.2 : 0.5;

    for (let x = 0; x < tileWidth; x++) {
      const s = startSample + x * samplesPerPixel;
      const e = Math.min(s + samplesPerPixel, endSample);
      let min = 0, max = 0;
      for (let i = s; i < e && i < channelData.length; i++) {
        if (channelData[i] < min) min = channelData[i];
        if (channelData[i] > max) max = channelData[i];
      }
      const barTop = midY - max * amplitude;
      const barBottom = midY - min * amplitude;
      ctx.fillRect(x, barTop, 1, Math.max(1, barBottom - barTop));
    }
  }, [buffer, tileWidth, height, color, muted, startSample, endSample]);

  return <canvas ref={canvasRef} style={{ width: tileWidth, height }} className="pointer-events-none flex-shrink-0" />;
});

/** Tiled waveform renderer — splits long clips into canvas tiles to avoid browser size limits */
const WaveformCanvas: React.FC<{
  buffer: AudioBuffer;
  width: number;
  height: number;
  color: string;
  muted: boolean;
  clipOffset?: number;
  clipDuration?: number;
}> = ({ buffer, width, height, color, muted, clipOffset = 0, clipDuration }) => {
  const dur = clipDuration ?? buffer.duration;
  const sampleRate = buffer.sampleRate;
  const totalStartSample = Math.floor(clipOffset * sampleRate);
  const totalEndSample = Math.min(totalStartSample + Math.floor(dur * sampleRate), buffer.getChannelData(0).length);
  const totalSamples = totalEndSample - totalStartSample;

  // If width fits in a single tile, render directly
  if (width <= MAX_TILE_WIDTH) {
    return (
      <div className="absolute top-0 left-0 pointer-events-none" style={{ width, height }}>
        <WaveformTile
          buffer={buffer} tileWidth={width} height={height}
          color={color} muted={muted}
          startSample={totalStartSample} endSample={totalEndSample}
        />
      </div>
    );
  }

  // Split into tiles
  const tileCount = Math.ceil(width / MAX_TILE_WIDTH);
  const tiles = [];
  for (let i = 0; i < tileCount; i++) {
    const tileStart = i * MAX_TILE_WIDTH;
    const tileW = Math.min(MAX_TILE_WIDTH, width - tileStart);
    const sampleStart = totalStartSample + Math.floor((tileStart / width) * totalSamples);
    const sampleEnd = totalStartSample + Math.floor(((tileStart + tileW) / width) * totalSamples);
    tiles.push(
      <WaveformTile
        key={i}
        buffer={buffer} tileWidth={tileW} height={height}
        color={color} muted={muted}
        startSample={sampleStart} endSample={Math.min(sampleEnd, totalEndSample)}
      />
    );
  }

  return (
    <div className="absolute top-0 left-0 pointer-events-none flex" style={{ width, height }}>
      {tiles}
    </div>
  );
};

/** Draws a mini piano-roll visualization for MIDI clips (replaces waveform) */
const MidiClipPreview: React.FC<{
  clip: Clip;
  width: number;
  height: number;
  color: string;
  muted: boolean;
}> = ({ clip, width, height, color, muted }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clip.midiData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const notes = clip.midiData.notes;
    if (notes.length === 0) return;

    const minNote = Math.min(...notes.map(n => n.note));
    const maxNote = Math.max(...notes.map(n => n.note));
    const noteRange = Math.max(1, maxNote - minNote + 1);
    const totalDur = clip.midiData.totalDuration || clip.duration;

    ctx.fillStyle = muted ? '#555555' : color;
    ctx.globalAlpha = muted ? 0.2 : 0.6;

    const noteH = Math.max(1.5, (height - 4) / noteRange);

    for (const note of notes) {
      const x = (note.startTime / totalDur) * width;
      const w = Math.max(1, (note.duration / totalDur) * width);
      const y = height - 2 - ((note.note - minNote) / noteRange) * (height - 4) - noteH;
      ctx.fillRect(x, y, w, noteH);
    }
  }, [clip, width, height, color, muted]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="absolute top-0 left-0 pointer-events-none"
    />
  );
};

/** Draws a reference track clip with contour overlay */
const ReferenceClipPreview: React.FC<{
  clip: Clip;
  width: number;
  height: number;
  muted: boolean;
}> = ({ clip, width, height, muted }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clip.buffer || !clip.referenceData?.contour) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const { points, segments, totalDuration } = clip.referenceData.contour;
    const pixelsPerSecond = width / totalDuration;
    const midY = height / 2;

    // Draw waveform (dimmed)
    const channelData = clip.buffer.getChannelData(0);
    const samplesPerPixel = Math.max(1, Math.floor(channelData.length / width));
    const amplitude = height * 0.3;

    ctx.fillStyle = muted ? 'rgba(100, 100, 100, 0.15)' : 'rgba(156, 163, 175, 0.2)';

    for (let x = 0; x < width; x++) {
      const start = x * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);

      let min = 0;
      let max = 0;
      for (let i = start; i < end && i < channelData.length; i++) {
        if (channelData[i] < min) min = channelData[i];
        if (channelData[i] > max) max = channelData[i];
      }

      const barTop = midY - max * amplitude;
      const barBottom = midY - min * amplitude;
      const barHeight = Math.max(1, barBottom - barTop);
      ctx.fillRect(x, barTop, 1, barHeight);
    }

    // Draw segment backgrounds with intensity colors
    const intensityColors = {
      silent: 'rgba(107, 114, 128, 0.2)',
      low: 'rgba(59, 130, 246, 0.2)',
      medium: 'rgba(34, 197, 94, 0.2)',
      high: 'rgba(249, 115, 22, 0.2)',
    };

    for (const segment of segments) {
      const x = segment.startTime * pixelsPerSecond;
      const segWidth = segment.duration * pixelsPerSecond;
      ctx.fillStyle = intensityColors[segment.intensity];
      ctx.fillRect(x, 0, segWidth, height);
    }

    // Draw contour envelope
    if (points.length > 0) {
      const envelopeHeight = height * 0.6;
      const envelopeOffset = height * 0.2;

      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = points[i].time * pixelsPerSecond;
        const y = height - envelopeOffset - points[i].amplitude * envelopeHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = muted ? 'rgba(100, 100, 100, 0.4)' : 'rgba(249, 115, 22, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [clip, width, height, muted]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="absolute top-0 left-0 pointer-events-none"
    />
  );
};

/** Live MIDI recording preview — shows notes appearing in real-time during MIDI recording */
const LiveMidiRecordingPreview: React.FC<{
  notes: MidiNote[];
  startTime: number;
  currentTime: number;
  color: string;
  height: number;
}> = ({ notes, startTime, currentTime, color, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsed = Math.max(0, currentTime - startTime);
  const width = Math.max(40, elapsed * PIXELS_PER_SECOND);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (notes.length === 0) return;

    const minNote = Math.min(...notes.map(n => n.note));
    const maxNote = Math.max(...notes.map(n => n.note));
    const noteRange = Math.max(1, maxNote - minNote + 1);

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;

    const noteH = Math.max(1.5, (height - 4) / noteRange);

    for (const note of notes) {
      const x = (note.startTime / elapsed) * width;
      const dur = note.duration > 0 ? note.duration : elapsed - note.startTime;
      const w = Math.max(1, (dur / elapsed) * width);
      const y = height - 2 - ((note.note - minNote) / noteRange) * (height - 4) - noteH;
      ctx.fillRect(x, y, w, noteH);
    }
  }, [notes, width, height, color, elapsed]);

  return (
    <div
      className="absolute top-[8px] bottom-[8px] rounded-sm overflow-hidden border-2 border-[#FF4444]/60 animate-pulse"
      style={{
        left: `${startTime * PIXELS_PER_SECOND}px`,
        width: `${width}px`,
        backgroundColor: `${color}15`,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width, height: height - 16 }}
        className="absolute top-0 left-0 pointer-events-none"
      />
    </div>
  );
};

/** Live audio recording preview — shows bouncing level meter during audio recording */
const LiveAudioRecordingPreview: React.FC<{
  startTime: number;
  currentTime: number;
  inputLevel: number;
  color: string;
  height: number;
}> = ({ startTime, currentTime, inputLevel, color, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>([]);
  const elapsed = Math.max(0, currentTime - startTime);
  const width = Math.max(40, elapsed * PIXELS_PER_SECOND);
  const innerHeight = height - 16;

  // Accumulate level samples over time
  useEffect(() => {
    levelsRef.current.push(inputLevel);
  }, [inputLevel]);

  // Clear on new recording
  useEffect(() => {
    levelsRef.current = [];
  }, [startTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, innerHeight);

    const levels = levelsRef.current;
    if (levels.length === 0) return;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4;

    // Draw level bars across the width
    const barW = Math.max(1, width / levels.length);
    for (let i = 0; i < levels.length; i++) {
      const barH = levels[i] * innerHeight;
      const x = (i / levels.length) * width;
      const y = (innerHeight - barH) / 2;
      ctx.fillRect(x, y, barW, barH);
    }
  }, [width, innerHeight, color, inputLevel]);

  return (
    <div
      className="absolute top-[8px] bottom-[8px] rounded-sm overflow-hidden border-2 border-[#FF4444]/60 animate-pulse"
      style={{
        left: `${startTime * PIXELS_PER_SECOND}px`,
        width: `${width}px`,
        backgroundColor: `${color}15`,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width, height: innerHeight }}
        className="absolute top-0 left-0 pointer-events-none"
      />
    </div>
  );
};

const DAWTimeline: React.FC<DAWTimelineProps> = ({ tracks, currentTime, bpm = 60, onSplitClip, onDuplicateClip, onDeleteClip, onMoveClip, onDoubleClickClip, onChangeMidiInstrument, onExtendClip, onSeparateStems, onUpdateClipFades, onConvertToMidi, onSeekTo, loopEnabled, loopStart = 0, loopEnd = 0, onSetLoopRegion, recordingTrackId, recordingNotes = [], recordingStartTime = 0, recordingInputLevel = 0, isRecording = false, recordingMode = 'audio' }) => {
  const playheadPosition = currentTime * PIXELS_PER_SECOND;

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, trackId: null, clipId: null });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);
  const [fadeDragState, setFadeDragState] = useState<FadeDragState | null>(null);
  const [rulerMode, setRulerMode] = useState<RulerMode>('time');
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const arrangementScrollRef = useRef<HTMLDivElement>(null);

  // Click on ruler → seek to that position
  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeekTo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = e.currentTarget.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, x / PIXELS_PER_SECOND);
    onSeekTo(time);
  }, [onSeekTo]);

  // Playhead drag
  useEffect(() => {
    if (!isDraggingPlayhead || !onSeekTo) return;
    const handleMove = (e: MouseEvent) => {
      const ruler = rulerScrollRef.current;
      if (!ruler) return;
      const rect = ruler.getBoundingClientRect();
      const scrollLeft = ruler.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const time = Math.max(0, x / PIXELS_PER_SECOND);
      onSeekTo(time);
    };
    const handleUp = () => setIsDraggingPlayhead(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingPlayhead, onSeekTo]);

  // Fade handle drag
  useEffect(() => {
    if (!fadeDragState || !onUpdateClipFades) return;
    const handleMove = (e: MouseEvent) => {
      const deltaX = e.clientX - fadeDragState.initialMouseX;
      const deltaSec = deltaX / PIXELS_PER_SECOND;
      const clip = tracks.flatMap(t => t.clips).find(c => c.id === fadeDragState.clipId);
      if (!clip) return;
      if (fadeDragState.type === 'fadeIn') {
        const newDuration = Math.max(0, Math.min(clip.duration - (clip.fadeOutDuration || 0), fadeDragState.initialDuration + deltaSec));
        onUpdateClipFades(fadeDragState.trackId, fadeDragState.clipId, { fadeInDuration: newDuration });
      } else {
        const newDuration = Math.max(0, Math.min(clip.duration - (clip.fadeInDuration || 0), fadeDragState.initialDuration - deltaSec));
        onUpdateClipFades(fadeDragState.trackId, fadeDragState.clipId, { fadeOutDuration: newDuration });
      }
    };
    const handleUp = () => setFadeDragState(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [fadeDragState, onUpdateClipFades, tracks]);

  // Derive selected track from selected clip
  const selectedTrackId = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      if (track.clips.some(c => c.id === selectedClipId)) return track.id;
    }
    return null;
  }, [tracks, selectedClipId]);

  // Dynamic timeline duration
  const timelineDuration = useMemo(() => {
    const maxClipEnd = Math.max(
      60,
      ...tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration + 10))
    );
    return Math.ceil(maxClipEnd);
  }, [tracks]);

  const totalWidth = timelineDuration * PIXELS_PER_SECOND;

  // Close context menu on click outside or scroll
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    const handleScroll = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Sync ruler scroll with arrangement scroll
  useEffect(() => {
    const el = arrangementScrollRef.current;
    if (!el) return;
    const handleArrangementScroll = () => {
      if (rulerScrollRef.current) {
        rulerScrollRef.current.scrollLeft = el.scrollLeft;
      }
    };
    el.addEventListener('scroll', handleArrangementScroll);
    return () => el.removeEventListener('scroll', handleArrangementScroll);
  }, []);

  // Drag handling
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.initialMouseX;
      const deltaSeconds = deltaX / PIXELS_PER_SECOND;
      const newStartTime = Math.max(0, dragState.initialStartTime + deltaSeconds);
      setDragPreviewTime(newStartTime);
    };

    const handleMouseUp = () => {
      if (dragPreviewTime !== null && onMoveClip) {
        onMoveClip(dragState.trackId, dragState.clipId, dragPreviewTime);
      }
      setDragState(null);
      setDragPreviewTime(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, dragPreviewTime, onMoveClip]);

  const handleContextMenu = useCallback((e: React.MouseEvent, trackId: string, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedClipId(clipId);
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, trackId, clipId });
  }, []);

  const handleSplit = useCallback(() => {
    if (contextMenu.trackId && contextMenu.clipId && onSplitClip) {
      onSplitClip(contextMenu.trackId, contextMenu.clipId, currentTime);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [contextMenu.trackId, contextMenu.clipId, currentTime, onSplitClip]);

  const handleDuplicate = useCallback(() => {
    if (contextMenu.trackId && contextMenu.clipId && onDuplicateClip) {
      onDuplicateClip(contextMenu.trackId, contextMenu.clipId);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [contextMenu.trackId, contextMenu.clipId, onDuplicateClip]);

  const handleDelete = useCallback(() => {
    if (contextMenu.trackId && contextMenu.clipId && onDeleteClip) {
      onDeleteClip(contextMenu.trackId, contextMenu.clipId);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [contextMenu.trackId, contextMenu.clipId, onDeleteClip]);

  const handleChangeInstrument = useCallback(() => {
    if (contextMenu.trackId && contextMenu.clipId && onChangeMidiInstrument) {
      onChangeMidiInstrument(contextMenu.trackId, contextMenu.clipId);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [contextMenu.trackId, contextMenu.clipId, onChangeMidiInstrument]);

  const handleExtend = useCallback(() => {
    if (contextMenu.trackId && contextMenu.clipId && onExtendClip) {
      onExtendClip(contextMenu.trackId, contextMenu.clipId);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [contextMenu.trackId, contextMenu.clipId, onExtendClip]);

  // Helper to check if current context menu target is a MIDI track
  const contextMenuTrack = contextMenu.trackId ? tracks.find(t => t.id === contextMenu.trackId) : null;
  const isMidiTrack = contextMenuTrack?.type === 'midi';
  const contextMenuClip = contextMenuTrack?.clips.find(c => c.id === contextMenu.clipId);
  const hasAudioBuffer = !isMidiTrack && contextMenuClip?.buffer;

  const handleDragStart = useCallback((e: React.MouseEvent, trackId: string, clip: Clip) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragState({
      clipId: clip.id,
      trackId,
      initialMouseX: e.clientX,
      initialStartTime: clip.startTime,
    });
    setSelectedClipId(clip.id);
  }, []);

  // Check if the current playhead is within the selected clip
  const canSplitSelected = useMemo(() => {
    if (!selectedClipId) return false;
    for (const track of tracks) {
      const clip = track.clips.find(c => c.id === selectedClipId);
      if (clip) {
        return currentTime > clip.startTime && currentTime < clip.startTime + clip.duration;
      }
    }
    return false;
  }, [selectedClipId, tracks, currentTime]);

  // Seconds per beat and per bar (4/4 time)
  const secPerBeat = 60 / bpm;
  const secPerBar = secPerBeat * 4;

  // Track scroll position for virtualized ruler marks
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1200);

  useEffect(() => {
    const el = arrangementScrollRef.current;
    if (!el) return;
    setViewportWidth(el.clientWidth);
    const handleScroll = () => {
      setScrollLeft(el.scrollLeft);
    };
    const handleResize = () => setViewportWidth(el.clientWidth);
    el.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Generate ruler marks — virtualized to only visible range
  const rulerMarks = useMemo(() => {
    const marks: { time: number; isMajor: boolean; x: number; label?: string }[] = [];
    const margin = 200; // extra pixels outside viewport
    const visStart = Math.max(0, scrollLeft - margin) / PIXELS_PER_SECOND;
    const visEnd = Math.min(timelineDuration, (scrollLeft + viewportWidth + margin) / PIXELS_PER_SECOND);

    if (rulerMode === 'bars') {
      const startBeat = Math.floor(visStart / secPerBeat);
      const endBeat = Math.ceil(visEnd / secPerBeat);
      for (let beat = startBeat; beat <= endBeat; beat++) {
        const time = beat * secPerBeat;
        if (time > timelineDuration + 1) break;
        const isBarLine = beat % 4 === 0;
        const barNum = Math.floor(beat / 4) + 1;
        marks.push({
          time,
          isMajor: isBarLine,
          x: time * PIXELS_PER_SECOND,
          label: isBarLine ? `${barNum}` : undefined,
        });
      }
    } else {
      const startSec = Math.floor(visStart);
      const endSec = Math.ceil(visEnd);
      for (let i = startSec; i <= endSec && i <= timelineDuration; i++) {
        marks.push({
          time: i,
          isMajor: i % 5 === 0,
          x: i * PIXELS_PER_SECOND,
          label: i % 5 === 0 ? `${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}` : undefined,
        });
      }
    }

    return marks;
  }, [timelineDuration, rulerMode, secPerBeat, scrollLeft, viewportWidth]);

  return (
    <div className="flex-1 bg-[#191919] relative flex flex-col overflow-hidden select-none">
      {/* Edit Toolbar */}
      {tracks.length > 0 && (
        <div className="h-7 border-b border-[#333] flex items-center px-2 bg-[#222] gap-1 flex-shrink-0">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-white/30 mr-2">Edit</span>
          <button
            onClick={() => {
              if (selectedClipId && selectedTrackId && onSplitClip) {
                onSplitClip(selectedTrackId, selectedClipId, currentTime);
              }
            }}
            disabled={!canSplitSelected}
            className={cn(
              "flex items-center gap-1 h-5 px-2 rounded-sm text-[9px] font-semibold transition-colors",
              canSplitSelected
                ? "bg-[#333] text-white/60 hover:bg-[#444] hover:text-white"
                : "bg-[#252525] text-white/15 cursor-not-allowed"
            )}
            title="Split selected clip at playhead"
          >
            <Scissors size={10} />
            Split
          </button>
          <button
            onClick={() => {
              if (selectedClipId && selectedTrackId && onDuplicateClip) {
                onDuplicateClip(selectedTrackId, selectedClipId);
              }
            }}
            disabled={!selectedClipId}
            className={cn(
              "flex items-center gap-1 h-5 px-2 rounded-sm text-[9px] font-semibold transition-colors",
              selectedClipId
                ? "bg-[#333] text-white/60 hover:bg-[#444] hover:text-white"
                : "bg-[#252525] text-white/15 cursor-not-allowed"
            )}
            title="Duplicate selected clip"
          >
            <Copy size={10} />
            Duplicate
          </button>
          <button
            onClick={() => {
              if (selectedClipId && selectedTrackId && onDeleteClip) {
                onDeleteClip(selectedTrackId, selectedClipId);
                setSelectedClipId(null);
              }
            }}
            disabled={!selectedClipId}
            className={cn(
              "flex items-center gap-1 h-5 px-2 rounded-sm text-[9px] font-semibold transition-colors",
              selectedClipId
                ? "bg-[#333] text-white/60 hover:bg-[#444] hover:text-red-400"
                : "bg-[#252525] text-white/15 cursor-not-allowed"
            )}
            title="Delete selected clip"
          >
            <Trash2 size={10} />
            Delete
          </button>
          {selectedClipId && (
            <span className="ml-2 text-[9px] text-white/25 font-mono">
              Selected: {tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)?.name || '—'}
            </span>
          )}
        </div>
      )}

      {/* Time Ruler */}
      <div className="h-7 border-b border-[#333] bg-[#2a2a2a] flex-shrink-0 flex">
        {/* Ruler mode toggle (fixed) */}
        <button
          onClick={() => setRulerMode(prev => prev === 'time' ? 'bars' : 'time')}
          className="flex-shrink-0 h-full w-7 flex items-center justify-center bg-[#2a2a2a] border-r border-[#333] text-white/30 hover:text-white/60 hover:bg-[#333] transition-colors"
          title={rulerMode === 'time' ? 'Switch to Bars' : 'Switch to Time'}
        >
          {rulerMode === 'time' ? <Music size={10} /> : <Clock size={10} />}
        </button>
        {/* Scrollable ruler area — click to seek */}
        <div className="flex-1 relative scrollbar-hidden cursor-pointer" ref={rulerScrollRef} style={{ overflowX: 'scroll', scrollbarWidth: 'none' }} onClick={handleRulerClick}>
          <div className="relative h-full" style={{ width: totalWidth }}>
            {rulerMarks.map(({ time, isMajor, x, label }) => (
              <div key={`${rulerMode}-${time}`} className="absolute top-0 bottom-0" style={{ left: x }}>
                <div className={cn("absolute bottom-0 w-px", isMajor ? "h-3 bg-white/30" : "h-1.5 bg-white/15")} />
                {label && (
                  <span className="absolute top-1 left-1 text-[9px] text-white/35 font-mono leading-none whitespace-nowrap">
                    {label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable arrangement area */}
      <div className="flex-1 overflow-auto relative" ref={arrangementScrollRef}>
        <div className="relative" style={{ width: totalWidth, minHeight: '100%' }}>
          {/* Vertical grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {rulerMarks.map(({ time, isMajor, x }) => (
              <div
                key={`grid-${rulerMode}-${time}`}
                className="absolute top-0 bottom-0 w-px"
                style={{ left: x, backgroundColor: isMajor ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)' }}
              />
            ))}
          </div>

          {/* Track lanes */}
          <div className="flex flex-col relative">
            {tracks.map((track) => (
              <div key={track.id} className="relative border-b border-[#2a2a2a]" style={{ height: TRACK_HEIGHT }}>
                <div className="absolute inset-0 hover:bg-white/[0.02] transition-colors" />

                {/* Clips */}
                {track.clips.map((clip) => {
                  if (!clip.buffer) return null;

                  const isDragging = dragState?.clipId === clip.id;
                  const effectiveStartTime = isDragging && dragPreviewTime !== null ? dragPreviewTime : clip.startTime;
                  const clipLeft = effectiveStartTime * PIXELS_PER_SECOND;
                  const clipWidth = clip.duration * PIXELS_PER_SECOND;
                  const waveformHeight = TRACK_HEIGHT - 16;
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      className={cn(
                        "absolute top-[2px] bottom-[2px] rounded-[3px] overflow-hidden",
                        track.muted && "opacity-30",
                        isDragging ? "cursor-grabbing z-10 opacity-80" : "cursor-grab"
                      )}
                      style={{
                        left: clipLeft,
                        width: clipWidth,
                        backgroundColor: track.color + '18',
                        border: isSelected ? `2px solid ${track.color}` : `1px solid ${track.color}40`,
                        boxShadow: isSelected ? `0 0 8px ${track.color}30` : isDragging ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!dragState) setSelectedClipId(prev => prev === clip.id ? null : clip.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onDoubleClickClip) onDoubleClickClip(track.id, clip.id);
                      }}
                      onMouseDown={(e) => handleDragStart(e, track.id, clip)}
                      onContextMenu={(e) => handleContextMenu(e, track.id, clip.id)}
                    >
                      <div className="h-4 flex items-center px-1.5 gap-1" style={{ backgroundColor: clip.referenceData ? 'rgba(249, 115, 22, 0.6)' : track.color + '60' }}>
                        {clip.referenceData && <FileAudio className="w-2.5 h-2.5 text-white/80" />}
                        <span className="text-[9px] font-semibold truncate leading-none" style={{ color: '#fff' }}>
                          {clip.name}
                        </span>
                      </div>
                      <div className="relative" style={{ height: waveformHeight }}>
                        {clip.referenceData ? (
                          <ReferenceClipPreview
                            clip={clip}
                            width={clipWidth}
                            height={waveformHeight}
                            muted={track.muted}
                          />
                        ) : clip.midiData ? (
                          <MidiClipPreview
                            clip={clip}
                            width={clipWidth}
                            height={waveformHeight}
                            color={track.color}
                            muted={track.muted}
                          />
                        ) : (
                          <WaveformCanvas
                            buffer={clip.buffer}
                            width={clipWidth}
                            height={waveformHeight}
                            color={track.color}
                            muted={track.muted}
                            clipOffset={clip.offset}
                            clipDuration={clip.duration}
                          />
                        )}

                        {/* Fade-in gradient overlay */}
                        {(clip.fadeInDuration > 0) && (
                          <div
                            className="absolute top-0 left-0 bottom-0 pointer-events-none"
                            style={{
                              width: Math.max(2, clip.fadeInDuration * PIXELS_PER_SECOND),
                              background: `linear-gradient(to right, rgba(0,0,0,0.55), transparent)`,
                            }}
                          />
                        )}

                        {/* Fade-out gradient overlay */}
                        {(clip.fadeOutDuration > 0) && (
                          <div
                            className="absolute top-0 right-0 bottom-0 pointer-events-none"
                            style={{
                              width: Math.max(2, clip.fadeOutDuration * PIXELS_PER_SECOND),
                              background: `linear-gradient(to left, rgba(0,0,0,0.55), transparent)`,
                            }}
                          />
                        )}
                      </div>

                      {/* Fade-in drag handle (top-left) */}
                      {isSelected && onUpdateClipFades && (
                        <div
                          className="absolute top-[16px] z-10 cursor-ew-resize group"
                          style={{ left: Math.max(0, (clip.fadeInDuration || 0) * PIXELS_PER_SECOND - 3) }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFadeDragState({ clipId: clip.id, trackId: track.id, type: 'fadeIn', initialMouseX: e.clientX, initialDuration: clip.fadeInDuration || 0 });
                          }}
                        >
                          <div className="w-[6px] h-[14px] rounded-sm bg-white/60 group-hover:bg-white/90 transition-colors" />
                        </div>
                      )}

                      {/* Fade-out drag handle (top-right) */}
                      {isSelected && onUpdateClipFades && (
                        <div
                          className="absolute top-[16px] z-10 cursor-ew-resize group"
                          style={{ right: Math.max(0, (clip.fadeOutDuration || 0) * PIXELS_PER_SECOND - 3) }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFadeDragState({ clipId: clip.id, trackId: track.id, type: 'fadeOut', initialMouseX: e.clientX, initialDuration: clip.fadeOutDuration || 0 });
                          }}
                        >
                          <div className="w-[6px] h-[14px] rounded-sm bg-white/60 group-hover:bg-white/90 transition-colors" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Live recording preview */}
                {isRecording && track.id === recordingTrackId && recordingMode === 'midi' && (
                  <LiveMidiRecordingPreview
                    notes={recordingNotes}
                    startTime={recordingStartTime}
                    currentTime={currentTime}
                    color={track.color}
                    height={TRACK_HEIGHT}
                  />
                )}
                {isRecording && track.id === recordingTrackId && recordingMode === 'audio' && (
                  <LiveAudioRecordingPreview
                    startTime={recordingStartTime}
                    currentTime={currentTime}
                    inputLevel={recordingInputLevel}
                    color={track.color}
                    height={TRACK_HEIGHT}
                  />
                )}

                {/* Empty track indicator */}
                {track.clips.length === 0 && !isRecording && track.id !== recordingTrackId && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-white/10 italic">Empty track</span>
                  </div>
                )}
              </div>
            ))}

            <div className="flex-1 min-h-[400px]" />
          </div>

          {/* Loop region overlay */}
          {loopEnabled && loopEnd > loopStart && (
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{
                left: `${loopStart * PIXELS_PER_SECOND}px`,
                width: `${(loopEnd - loopStart) * PIXELS_PER_SECOND}px`,
              }}
            >
              <div className="absolute inset-0 bg-[#5B8DEF]/10 border-l-2 border-r-2 border-[#5B8DEF]/50" />
              {/* Loop start marker */}
              <div className="absolute top-0 left-0 w-2 h-3 bg-[#5B8DEF]/70 rounded-br-sm" />
              {/* Loop end marker */}
              <div className="absolute top-0 right-0 w-2 h-3 bg-[#5B8DEF]/70 rounded-bl-sm" />
            </div>
          )}

          {/* Playhead */}
          <div className="absolute top-0 bottom-0 z-20" style={{ transform: `translateX(${playheadPosition}px)` }}>
            <div className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none" />
            {/* Draggable playhead handle */}
            <div
              className="absolute -top-0 -left-[6px] w-3 h-4 cursor-col-resize z-30 flex items-start justify-center"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingPlayhead(true);
              }}
            >
              <div className="w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid rgba(255,255,255,0.9)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-[#1e1e1e] border border-[#444] rounded-md shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleSplit} disabled={currentTime <= 0} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors", currentTime > 0 ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-white/20 cursor-not-allowed")}>
            <Scissors size={12} /> Split at Playhead
          </button>
          <button onClick={handleDuplicate} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/10 hover:text-white text-left transition-colors">
            <Copy size={12} /> Duplicate
          </button>
          {isMidiTrack && onChangeMidiInstrument && (
            <button onClick={handleChangeInstrument} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-purple-400/70 hover:bg-purple-500/10 hover:text-purple-400 text-left transition-colors">
              <Piano size={12} /> Change Instrument
            </button>
          )}
          {hasAudioBuffer && onExtendClip && (
            <button onClick={handleExtend} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-green-400/70 hover:bg-green-500/10 hover:text-green-400 text-left transition-colors">
              <ArrowRight size={12} /> Extend / Continue
            </button>
          )}
          {hasAudioBuffer && onSeparateStems && (
            <button
              onClick={() => { if (contextMenu.trackId && contextMenu.clipId) { onSeparateStems(contextMenu.trackId, contextMenu.clipId); setContextMenu(prev => ({ ...prev, visible: false })); } }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-400 text-left transition-colors"
            >
              <Layers size={12} /> Separate Stems
            </button>
          )}
          {hasAudioBuffer && onConvertToMidi && (
            <button
              onClick={() => { if (contextMenu.trackId && contextMenu.clipId) { onConvertToMidi(contextMenu.trackId, contextMenu.clipId); setContextMenu(prev => ({ ...prev, visible: false })); } }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400 text-left transition-colors"
            >
              <Music size={12} /> Convert to MIDI
            </button>
          )}
          <div className="my-1 h-px bg-white/10" />
          <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400/70 hover:bg-red-500/10 hover:text-red-400 text-left transition-colors">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default DAWTimeline;
