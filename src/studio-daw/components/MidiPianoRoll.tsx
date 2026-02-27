import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, Pencil, MousePointer2, Eraser, Trash2 } from 'lucide-react';
import type { MidiClipData, MidiNote } from '@/studio-daw/audio/midi-engine';

type Tool = 'pencil' | 'select' | 'eraser';
type SnapDivision = '1/4' | '1/8' | '1/16';
type DragMode = 'move' | 'resize-left' | 'resize-right' | null;

interface MidiPianoRollProps {
  trackId: string;
  clipId: string;
  midiData: MidiClipData;
  trackColor: string;
  bpm: number;
  onUpdate: (trackId: string, clipId: string, newMidiData: MidiClipData) => void;
  onClose: () => void;
}

const NOTE_HEIGHT = 12;
const KEYBOARD_WIDTH = 48;
const MIN_NOTE = 12; // C0
const MAX_NOTE = 96;
const TOTAL_NOTES = MAX_NOTE - MIN_NOTE + 1;
const GRID_HEIGHT = TOTAL_NOTES * NOTE_HEIGHT;
const RESIZE_HANDLE_WIDTH = 6; // Pixels for resize handle detection

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]); // semitone offsets for black keys

function noteName(midi: number): string {
  return NOTE_NAMES[midi % 12] + Math.floor(midi / 12 - 1);
}

function isBlackKey(midi: number): boolean {
  return BLACK_KEYS.has(midi % 12);
}

function generateNoteId(): string {
  return Math.random().toString(36).substr(2, 9);
}

interface InternalNote extends MidiNote {
  _id: string;
}

const MidiPianoRoll: React.FC<MidiPianoRollProps> = ({
  trackId,
  clipId,
  midiData,
  trackColor,
  bpm,
  onUpdate,
  onClose,
}) => {
  const [tool, setTool] = useState<Tool>('select');
  const [snap, setSnap] = useState<SnapDivision>('1/8');
  const [velocity, setVelocity] = useState(70);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [hoverMode, setHoverMode] = useState<DragMode>(null);

  // Internal notes with unique IDs for selection tracking
  const [notes, setNotes] = useState<InternalNote[]>(() =>
    midiData.notes.map(n => ({ ...n, _id: generateNoteId() }))
  );

  // Sync internal notes when external midiData changes (e.g., from undo)
  const prevMidiDataRef = useRef(midiData);
  useEffect(() => {
    if (prevMidiDataRef.current !== midiData) {
      prevMidiDataRef.current = midiData;
      setNotes(midiData.notes.map(n => ({ ...n, _id: generateNoteId() })));
      setSelectedNoteIds(new Set());
    }
  }, [midiData]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Drawing state (pencil tool)
  const drawStateRef = useRef<{
    active: boolean;
    noteId: string;
    startBeat: number;
    noteNum: number;
  } | null>(null);

  // Drag state for select tool (move or resize)
  const dragStateRef = useRef<{
    active: boolean;
    mode: DragMode;
    noteIds: string[];
    // For move: track initial positions
    initialPositions: Map<string, { startTime: number; note: number }>;
    // Mouse offset from note start
    offsetBeat: number;
    offsetNote: number;
    // For resize: original durations and start times
    originalDurations: Map<string, number>;
    originalStartTimes: Map<string, number>;
    // Starting mouse position for resize
    startMouseBeat: number;
  } | null>(null);

  // Snap calculation
  const snapBeats = useMemo(() => {
    switch (snap) {
      case '1/4': return 1;
      case '1/8': return 0.5;
      case '1/16': return 0.25;
    }
  }, [snap]);

  const secondsPerBeat = 60 / bpm;
  const pixelsPerBeat = 40;

  // Total duration in beats
  const totalBeats = useMemo(() => {
    const maxEnd = notes.reduce((max, n) => Math.max(max, n.startTime + n.duration), 0);
    const minBeats = Math.ceil(midiData.totalDuration / secondsPerBeat);
    return Math.max(minBeats, Math.ceil(maxEnd / secondsPerBeat)) + 4; // +4 beats padding
  }, [notes, midiData.totalDuration, secondsPerBeat]);

  const gridWidth = totalBeats * pixelsPerBeat;

  const snapBeatOnly = useCallback((beat: number): number => {
    return Math.max(0, Math.round(beat / snapBeats) * snapBeats);
  }, [snapBeats]);

  // Get selected notes' average velocity
  const selectedVelocity = useMemo(() => {
    const selectedNotes = notes.filter(n => selectedNoteIds.has(n._id));
    if (selectedNotes.length === 0) return null;
    const avg = selectedNotes.reduce((sum, n) => sum + n.velocity, 0) / selectedNotes.length;
    return Math.round(avg);
  }, [notes, selectedNoteIds]);

  // Commit notes to parent
  const commitNotes = useCallback((updatedNotes: InternalNote[]) => {
    const cleaned: MidiNote[] = updatedNotes.map(({ _id, ...rest }) => rest);
    const maxEnd = cleaned.reduce((max, n) => Math.max(max, n.startTime + n.duration), 0);
    onUpdate(trackId, clipId, {
      ...midiData,
      notes: cleaned,
      totalDuration: Math.max(midiData.totalDuration, maxEnd),
    });
  }, [trackId, clipId, midiData, onUpdate]);

  // Delete selected notes
  const deleteSelectedNotes = useCallback(() => {
    if (selectedNoteIds.size === 0) return;
    const updated = notes.filter(n => !selectedNoteIds.has(n._id));
    setNotes(updated);
    commitNotes(updated);
    setSelectedNoteIds(new Set());
  }, [notes, selectedNoteIds, commitNotes]);

  // Update velocity for selected notes
  const updateSelectedVelocity = useCallback((newVelocity: number) => {
    if (selectedNoteIds.size === 0) return;
    const updated = notes.map(n => {
      if (selectedNoteIds.has(n._id)) {
        return { ...n, velocity: Math.max(1, Math.min(127, newVelocity)) };
      }
      return n;
    });
    setNotes(updated);
    commitNotes(updated);
  }, [notes, selectedNoteIds, commitNotes]);

  // Track scroll offset for viewport rendering
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(800);

  // === Canvas rendering (viewport-based: only draws the visible region) ===
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = viewportWidth;
    const h = GRID_HEIGHT;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Visible range in pixels (grid-space)
    const vLeft = scrollLeft;
    const vRight = scrollLeft + w;

    // Background
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, w, h);

    // Row backgrounds (alternating for black keys)
    for (let i = 0; i < TOTAL_NOTES; i++) {
      const midiNum = MAX_NOTE - i;
      const y = i * NOTE_HEIGHT;
      if (isBlackKey(midiNum)) {
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, y, w, NOTE_HEIGHT);
      }
      if (midiNum % 12 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, y, w, NOTE_HEIGHT);
      }
    }

    // Horizontal lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TOTAL_NOTES; i++) {
      const y = i * NOTE_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Vertical beat lines — only in visible range
    const startBeat = Math.max(0, Math.floor(vLeft / pixelsPerBeat / snapBeats) * snapBeats);
    const endBeat = Math.min(totalBeats, Math.ceil(vRight / pixelsPerBeat / snapBeats) * snapBeats);
    for (let beat = startBeat; beat <= endBeat; beat += snapBeats) {
      const x = beat * pixelsPerBeat - vLeft;
      const isMeasureLine = beat % 4 === 0;
      const isBeatLine = beat % 1 === 0;
      ctx.strokeStyle = isMeasureLine
        ? 'rgba(255,255,255,0.15)'
        : isBeatLine
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(255,255,255,0.03)';
      ctx.lineWidth = isMeasureLine ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Draw notes — only those intersecting the visible range
    for (const note of notes) {
      const row = MAX_NOTE - note.note;
      if (row < 0 || row >= TOTAL_NOTES) continue;
      const noteX = (note.startTime / secondsPerBeat) * pixelsPerBeat;
      const noteW = (note.duration / secondsPerBeat) * pixelsPerBeat;
      if (noteX + noteW < vLeft || noteX > vRight) continue; // off-screen

      const x = noteX - vLeft;
      const y = row * NOTE_HEIGHT;
      const isSelected = selectedNoteIds.has(note._id);

      const alpha = 0.4 + (note.velocity / 127) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = trackColor;
      ctx.fillRect(x + 1, y + 1, Math.max(4, noteW - 2), NOTE_HEIGHT - 2);
      ctx.globalAlpha = 1;

      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, Math.max(4, noteW - 2), NOTE_HEIGHT - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(x, y + 2, 3, NOTE_HEIGHT - 4);
        ctx.fillRect(x + noteW - 3, y + 2, 3, NOTE_HEIGHT - 4);
      } else {
        ctx.strokeStyle = trackColor;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 1, y + 1, Math.max(4, noteW - 2), NOTE_HEIGHT - 2);
      }

      const velWidth = (note.velocity / 127) * (noteW - 4);
      ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.fillRect(x + 2, y + NOTE_HEIGHT - 3, velWidth, 2);
    }
  }, [notes, totalBeats, snapBeats, pixelsPerBeat, secondsPerBeat, selectedNoteIds, trackColor, scrollLeft, viewportWidth]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // === Mouse event helpers ===

  const getGridPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Convert viewport-relative canvas X to grid-space X
    const gridX = canvasX + scrollLeft;
    const beat = gridX / pixelsPerBeat;
    const row = Math.floor(y / NOTE_HEIGHT);
    const noteNum = MAX_NOTE - row;
    if (noteNum < MIN_NOTE || noteNum > MAX_NOTE) return null;
    return { beat, noteNum, x: gridX, y };
  }, [pixelsPerBeat, scrollLeft]);

  const findNoteAt = useCallback((beat: number, noteNum: number): InternalNote | null => {
    const time = beat * secondsPerBeat;
    for (const n of notes) {
      if (n.note === noteNum && time >= n.startTime && time < n.startTime + n.duration) {
        return n;
      }
    }
    return null;
  }, [notes, secondsPerBeat]);

  // Determine if mouse is over a resize handle
  const getResizeMode = useCallback((beat: number, noteNum: number, x: number): DragMode => {
    const time = beat * secondsPerBeat;
    for (const n of notes) {
      if (n.note !== noteNum) continue;
      if (time < n.startTime || time >= n.startTime + n.duration) continue;

      const noteStartX = (n.startTime / secondsPerBeat) * pixelsPerBeat;
      const noteEndX = ((n.startTime + n.duration) / secondsPerBeat) * pixelsPerBeat;

      // Check left edge
      if (x >= noteStartX - 2 && x <= noteStartX + RESIZE_HANDLE_WIDTH) {
        return 'resize-left';
      }
      // Check right edge
      if (x >= noteEndX - RESIZE_HANDLE_WIDTH && x <= noteEndX + 2) {
        return 'resize-right';
      }
      return 'move';
    }
    return null;
  }, [notes, secondsPerBeat, pixelsPerBeat]);

  // === Mouse handlers ===

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getGridPosition(e);
    if (!pos) return;

    if (tool === 'pencil') {
      const existingNote = findNoteAt(pos.beat, pos.noteNum);
      if (existingNote) return; // Don't draw on top of existing notes

      const snappedBeat = snapBeatOnly(pos.beat);
      const startTime = snappedBeat * secondsPerBeat;
      const newNote: InternalNote = {
        _id: generateNoteId(),
        note: pos.noteNum,
        velocity,
        startTime,
        duration: snapBeats * secondsPerBeat,
        channel: 0,
      };
      drawStateRef.current = {
        active: true,
        noteId: newNote._id,
        startBeat: snappedBeat,
        noteNum: pos.noteNum,
      };
      setNotes(prev => [...prev, newNote]);
      setSelectedNoteIds(new Set([newNote._id]));
    } else if (tool === 'select') {
      const existingNote = findNoteAt(pos.beat, pos.noteNum);
      if (existingNote) {
        const mode = getResizeMode(pos.beat, pos.noteNum, pos.x);
        const isShiftHeld = e.shiftKey;

        // Handle multi-select with shift
        if (isShiftHeld) {
          setSelectedNoteIds(prev => {
            const next = new Set(prev);
            if (next.has(existingNote._id)) {
              next.delete(existingNote._id);
            } else {
              next.add(existingNote._id);
            }
            return next;
          });
        } else if (!selectedNoteIds.has(existingNote._id)) {
          // Single select
          setSelectedNoteIds(new Set([existingNote._id]));
        }

        // Get all selected note IDs (including the one we just clicked)
        const noteIdsToMove = selectedNoteIds.has(existingNote._id)
          ? Array.from(selectedNoteIds)
          : [existingNote._id];

        // Build initial positions map
        const initialPositions = new Map<string, { startTime: number; note: number }>();
        const originalDurations = new Map<string, number>();
        const originalStartTimes = new Map<string, number>();

        for (const noteId of noteIdsToMove) {
          const n = notes.find(note => note._id === noteId);
          if (n) {
            initialPositions.set(noteId, { startTime: n.startTime, note: n.note });
            originalDurations.set(noteId, n.duration);
            originalStartTimes.set(noteId, n.startTime);
          }
        }

        const noteBeat = existingNote.startTime / secondsPerBeat;
        dragStateRef.current = {
          active: true,
          mode,
          noteIds: noteIdsToMove,
          initialPositions,
          offsetBeat: pos.beat - noteBeat,
          offsetNote: pos.noteNum - existingNote.note,
          originalDurations,
          originalStartTimes,
          startMouseBeat: pos.beat,
        };
      } else {
        // Click on empty space - deselect
        if (!e.shiftKey) {
          setSelectedNoteIds(new Set());
        }
      }
    } else if (tool === 'eraser') {
      const existingNote = findNoteAt(pos.beat, pos.noteNum);
      if (existingNote) {
        const updated = notes.filter(n => n._id !== existingNote._id);
        setNotes(updated);
        commitNotes(updated);
        setSelectedNoteIds(prev => {
          const next = new Set(prev);
          next.delete(existingNote._id);
          return next;
        });
      }
    }
  }, [tool, velocity, snapBeats, secondsPerBeat, getGridPosition, findNoteAt, getResizeMode, notes, selectedNoteIds, snapBeatOnly, commitNotes]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getGridPosition(e);
    if (!pos) {
      setHoverMode(null);
      return;
    }

    // Update cursor based on hover position
    if (tool === 'select' && !dragStateRef.current?.active) {
      const mode = getResizeMode(pos.beat, pos.noteNum, pos.x);
      setHoverMode(mode);
    }

    // Pencil: extend note duration while drawing
    if (tool === 'pencil' && drawStateRef.current?.active) {
      const ds = drawStateRef.current;
      const currentBeat = snapBeatOnly(pos.beat);
      const endBeat = Math.max(ds.startBeat + snapBeats, currentBeat + snapBeats);
      const duration = (endBeat - ds.startBeat) * secondsPerBeat;

      setNotes(prev => prev.map(n => {
        if (n._id !== ds.noteId) return n;
        return { ...n, duration: Math.max(snapBeats * secondsPerBeat, duration) };
      }));
    }

    // Select: drag notes or resize
    if (tool === 'select' && dragStateRef.current?.active) {
      const drag = dragStateRef.current;

      if (drag.mode === 'move') {
        // Move all selected notes
        const beatDelta = pos.beat - drag.startMouseBeat;
        const snappedBeatDelta = snapBeatOnly(beatDelta + drag.offsetBeat) - snapBeatOnly(drag.offsetBeat);
        const noteDelta = pos.noteNum - drag.offsetNote - (drag.initialPositions.get(drag.noteIds[0])?.note ?? 0);

        setNotes(prev => prev.map(n => {
          if (!drag.noteIds.includes(n._id)) return n;
          const initial = drag.initialPositions.get(n._id);
          if (!initial) return n;

          const newStartBeat = (initial.startTime / secondsPerBeat) + snappedBeatDelta;
          const newNote = Math.min(MAX_NOTE, Math.max(MIN_NOTE, initial.note + noteDelta));

          return {
            ...n,
            startTime: Math.max(0, newStartBeat * secondsPerBeat),
            note: newNote,
          };
        }));
      } else if (drag.mode === 'resize-right') {
        // Resize from right edge - extend/shrink duration
        const beatDelta = pos.beat - drag.startMouseBeat;
        const snappedDelta = Math.round(beatDelta / snapBeats) * snapBeats;

        setNotes(prev => prev.map(n => {
          if (!drag.noteIds.includes(n._id)) return n;
          const originalDuration = drag.originalDurations.get(n._id) ?? n.duration;
          const newDuration = Math.max(snapBeats * secondsPerBeat, originalDuration + snappedDelta * secondsPerBeat);
          return { ...n, duration: newDuration };
        }));
      } else if (drag.mode === 'resize-left') {
        // Resize from left edge - move start and adjust duration
        const beatDelta = pos.beat - drag.startMouseBeat;
        const snappedDelta = Math.round(beatDelta / snapBeats) * snapBeats;

        setNotes(prev => prev.map(n => {
          if (!drag.noteIds.includes(n._id)) return n;
          const originalStart = drag.originalStartTimes.get(n._id) ?? n.startTime;
          const originalDuration = drag.originalDurations.get(n._id) ?? n.duration;

          const newStartTime = Math.max(0, originalStart + snappedDelta * secondsPerBeat);
          const newDuration = Math.max(snapBeats * secondsPerBeat, originalDuration - snappedDelta * secondsPerBeat);

          // Don't let start time go beyond end time
          if (newStartTime >= originalStart + originalDuration - snapBeats * secondsPerBeat) {
            return n;
          }

          return { ...n, startTime: newStartTime, duration: newDuration };
        }));
      }
    }
  }, [tool, getGridPosition, getResizeMode, snapBeatOnly, snapBeats, secondsPerBeat]);

  const handleMouseUp = useCallback(() => {
    if (drawStateRef.current?.active) {
      drawStateRef.current = null;
      commitNotes(notes);
    }
    if (dragStateRef.current?.active) {
      dragStateRef.current = null;
      commitNotes(notes);
    }
  }, [notes, commitNotes]);

  // === Piano keyboard drawing ===
  const keyboardCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawKeyboard = useCallback(() => {
    const canvas = keyboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = KEYBOARD_WIDTH * dpr;
    canvas.height = GRID_HEIGHT * dpr;
    canvas.style.width = `${KEYBOARD_WIDTH}px`;
    canvas.style.height = `${GRID_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    for (let i = 0; i < TOTAL_NOTES; i++) {
      const midiNum = MAX_NOTE - i;
      const y = i * NOTE_HEIGHT;
      const black = isBlackKey(midiNum);

      ctx.fillStyle = black ? '#1a1a1a' : '#2a2a2a';
      ctx.fillRect(0, y, KEYBOARD_WIDTH, NOTE_HEIGHT);

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + NOTE_HEIGHT);
      ctx.lineTo(KEYBOARD_WIDTH, y + NOTE_HEIGHT);
      ctx.stroke();

      // Label for C notes
      if (midiNum % 12 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px monospace';
        ctx.fillText(noteName(midiNum), 4, y + NOTE_HEIGHT - 2);
      }
    }

    // Right border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(KEYBOARD_WIDTH - 0.5, 0);
    ctx.lineTo(KEYBOARD_WIDTH - 0.5, GRID_HEIGHT);
    ctx.stroke();
  }, []);

  useEffect(() => {
    drawKeyboard();
  }, [drawKeyboard]);

  // Sync keyboard scroll with grid scroll, and update viewport offset
  const handleGridScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    const kbCanvas = keyboardCanvasRef.current;
    if (!container) return;
    if (kbCanvas) {
      kbCanvas.style.transform = `translateY(-${container.scrollTop}px)`;
    }
    setScrollLeft(container.scrollLeft);
  }, []);

  // Track viewport width on mount and resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const measure = () => setViewportWidth(container.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'p' || e.key === 'P') setTool('pencil');
      else if (e.key === 'v' || e.key === 'V') setTool('select');
      else if (e.key === 'e' || e.key === 'E') setTool('eraser');
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedNotes();
      }
      // Select all
      else if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelectedNoteIds(new Set(notes.map(n => n._id)));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, deleteSelectedNotes, notes]);

  // Cursor style based on tool and hover mode
  const getCursor = () => {
    if (tool === 'pencil') return 'crosshair';
    if (tool === 'eraser') return 'pointer';
    if (tool === 'select') {
      if (hoverMode === 'resize-left' || hoverMode === 'resize-right') {
        return 'ew-resize';
      }
      if (hoverMode === 'move') {
        return 'move';
      }
    }
    return 'default';
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-3.5 h-3.5" />, label: 'Select', shortcut: 'V' },
    { id: 'pencil', icon: <Pencil className="w-3.5 h-3.5" />, label: 'Draw', shortcut: 'P' },
    { id: 'eraser', icon: <Eraser className="w-3.5 h-3.5" />, label: 'Erase', shortcut: 'E' },
  ];

  const snapOptions: { value: SnapDivision; label: string }[] = [
    { value: '1/4', label: '1/4' },
    { value: '1/8', label: '1/8' },
    { value: '1/16', label: '1/16' },
  ];

  return (
    <div className="bg-[#1a1a1a] border-t border-[#444] flex flex-col" style={{ height: 300 }}>
      {/* Toolbar */}
      <div className="h-8 border-b border-[#333] flex items-center px-2 gap-3 flex-shrink-0 bg-[#222]">
        {/* Tool selector */}
        <div className="flex gap-0.5">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`flex items-center gap-1 h-6 px-2 rounded text-[10px] font-semibold transition-colors ${
                tool === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Snap */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/30 font-semibold uppercase">Snap</span>
          {snapOptions.map(s => (
            <button
              key={s.value}
              onClick={() => setSnap(s.value)}
              className={`h-5 px-1.5 rounded text-[10px] font-mono transition-colors ${
                snap === s.value
                  ? 'bg-white/10 text-white'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Velocity - either for new notes or selected notes */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/30 font-semibold uppercase">
            {selectedNoteIds.size > 0 ? 'Sel Vel' : 'Vel'}
          </span>
          <input
            type="range"
            min={1}
            max={127}
            value={selectedVelocity ?? velocity}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (selectedNoteIds.size > 0) {
                updateSelectedVelocity(val);
              } else {
                setVelocity(val);
              }
            }}
            className="w-16 h-1 accent-white/50"
          />
          <span className="text-[10px] font-mono text-white/40 w-6 text-right">
            {selectedVelocity ?? velocity}
          </span>
        </div>

        {/* Delete selected button */}
        {selectedNoteIds.size > 0 && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={deleteSelectedNotes}
              title="Delete selected (Del)"
              className="flex items-center gap-1 h-6 px-2 rounded text-[10px] font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedNoteIds.size})
            </button>
          </>
        )}

        <div className="flex-1" />

        {/* Note count */}
        <span className="text-[9px] font-mono text-white/25">{notes.length} notes</span>

        {/* Close */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 h-6 px-2 rounded text-[10px] font-semibold text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-3.5 h-3.5" />
          Close
        </button>
      </div>

      {/* Piano roll area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Piano keyboard */}
        <div className="flex-shrink-0 overflow-hidden relative" style={{ width: KEYBOARD_WIDTH }}>
          <canvas
            ref={keyboardCanvasRef}
            className="absolute top-0 left-0"
          />
        </div>

        {/* Note grid */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto relative"
          onScroll={handleGridScroll}
        >
          {/* Spacer to provide full scrollable width */}
          <div style={{ width: gridWidth, height: GRID_HEIGHT, position: 'relative' }}>
            <canvas
              ref={canvasRef}
              style={{ cursor: getCursor(), position: 'sticky', left: 0, top: 0 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>
      </div>

      {/* Selection info bar */}
      {selectedNoteIds.size > 0 && (
        <div className="h-6 border-t border-[#333] flex items-center px-3 gap-4 text-[10px] text-white/50 bg-[#1e1e1e]">
          <span className="text-white/70">{selectedNoteIds.size} note{selectedNoteIds.size > 1 ? 's' : ''} selected</span>
          <span>• Drag edges to resize • Drag center to move • Shift+click to multi-select • Del to delete</span>
        </div>
      )}
    </div>
  );
};

export default MidiPianoRoll;
