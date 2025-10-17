import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from "uuid";
import { MidiClipType, Note, InstrumentType } from '@/types';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

type MidiClipProps = {
  clipData: MidiClipType;
  instrument: InstrumentType;
  onUpdate: (clip: MidiClipType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSplit: () => void;
  progress: number;
  noteDuration: string;
  isAudioReady: boolean;
  editTool: "select" | "pencil";
};

const NOTES_ORDERED = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];

const createPitchRange = () => {
  try {
    const octaves = Array.from({ length: 8 }, (_, i) => 7 - i);
    return octaves.flatMap(octave => NOTES_ORDERED.map(note => `${note}${octave}`));
  } catch (error) {
    console.error('Error creating pitch range:', error);
    return ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
  }
};

const PITCH_RANGE = createPitchRange();

const noteToY = (note: string) => {
  const index = PITCH_RANGE.indexOf(note.toUpperCase());
  return index === -1 ? 0 : index;
};

const instrumentColors: Record<InstrumentType, string> = {
    synth: "bg-blue-500 border-blue-700",
    bass: "bg-red-500 border-red-700",
    drums: "bg-yellow-500 border-yellow-700",
    keys: "bg-purple-500 border-purple-700",
    guitar: "bg-green-500 border-green-700",
};

const NOTE_DURATIONS = [
  { label: "1/16", value: "16n" },
  { label: "1/8", value: "8n" },
  { label: "1/4", value: "4n" },
  { label: "1/2", value: "2n" },
  { label: "Whole", value: "1n" },
];

const durationToWidth = (durationStr: string, totalSixteenths: number) => {
  switch (durationStr) {
    case "16n": return (1 / 16) * totalSixteenths;
    case "8n": return (1 / 8) * totalSixteenths;
    case "4n": return (1 / 4) * totalSixteenths;
    case "2n": return (1 / 2) * totalSixteenths;
    case "1n": return totalSixteenths;
    default: return (1 / 16) * totalSixteenths;
  }
};

// Map drag distance (in sixteenths) to a musical duration string
const sixteenthsToDuration = (six: number): string => {
  const n = Math.max(1, six);
  if (n <= 1) return "16n";
  if (n <= 2) return "8n";
  if (n <= 4) return "4n";
  if (n <= 8) return "2n";
  return "1n";
};

const MidiClip = ({
  clipData,
  instrument,
  onUpdate,
  onDuplicate,
  onDelete,
  onSplit,
  isAudioReady,
  noteDuration,
  editTool,
}: MidiClipProps) => {
  const { notes } = clipData;
  const safeDuration = Math.max(0.25, clipData.duration || 1);
  const TOTAL_SIXTEENTHS = safeDuration * 16;

  const noteColor = useMemo(() => instrumentColors[instrument] || "bg-gray-500", [instrument]);
  const clipRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);

  // Pencil drawing state
  const [drawingNoteId, setDrawingNoteId] = useState<string | null>(null);
  const drawingStartSixteenthRef = useRef<number>(0);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]') as HTMLDivElement;
      if (viewport) {
        const defaultScrollTop = PITCH_RANGE.indexOf('C4') * 12 - 48;
        viewport.scrollTop = Math.max(0, defaultScrollTop);
      }
    }
  }, []);

  const posToIndices = (e: { clientX: number; clientY: number }) => {
    if (!clipRef.current) return { sixteenthIndex: 0, pitchIndex: 0 };
    const rect = clipRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sixteenthIndex = Math.max(0, Math.min(TOTAL_SIXTEENTHS - 1, Math.floor((x / rect.width) * TOTAL_SIXTEENTHS)));
    const pitchIndex = Math.max(0, Math.min(PITCH_RANGE.length - 1, Math.floor(y / 12)));
    return { sixteenthIndex, pitchIndex };
  };

  const addNoteAt = (sixteenthIndex: number, pitchIndex: number, duration: string) => {
    const measure = Math.floor(sixteenthIndex / 16);
    const beat = Math.floor((sixteenthIndex % 16) / 4);
    const sixteenth = sixteenthIndex % 4;
    const newNote: Note = {
      id: uuidv4(),
      time: `${measure}:${beat}:${sixteenth}`,
      note: PITCH_RANGE[pitchIndex],
      duration,
    };
    onUpdate({ ...clipData, notes: [...notes, newNote] });
    return newNote.id;
  };

  const handleClipClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editTool === "pencil") return; // handled by mousedown/drag in pencil mode
    if (!clipRef.current) return;
    const rect = clipRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const sixteenthIndex = Math.floor((x / rect.width) * TOTAL_SIXTEENTHS);
    const pitchIndex = Math.floor(y / 12);

    if (pitchIndex < 0 || pitchIndex >= PITCH_RANGE.length) return;
    if (sixteenthIndex < 0 || sixteenthIndex >= TOTAL_SIXTEENTHS) return;

    const measure = Math.floor(sixteenthIndex / 16);
    const beat = Math.floor((sixteenthIndex % 16) / 4);
    const sixteenth = sixteenthIndex % 4;

    const newNote: Note = {
      id: uuidv4(),
      time: `${measure}:${beat}:${sixteenth}`,
      note: PITCH_RANGE[pitchIndex],
      duration: noteDuration,
    };

    onUpdate({ ...clipData, notes: [...notes, newNote] });
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editTool !== "pencil") return;
    const { sixteenthIndex, pitchIndex } = posToIndices(e);
    const id = addNoteAt(sixteenthIndex, pitchIndex, "16n");
    setDrawingNoteId(id);
    drawingStartSixteenthRef.current = sixteenthIndex;
  };

  const handleNoteMouseDown = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (editTool === "pencil") return; // don't move notes in pencil mode
    setDraggingNoteId(noteId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!clipRef.current) return;

    // Pencil drawing update
    if (drawingNoteId) {
      const { sixteenthIndex, pitchIndex } = posToIndices(e);
      const startSix = drawingStartSixteenthRef.current;
      const lenSix = Math.max(1, Math.abs(sixteenthIndex - startSix) + 1);
      const duration = sixteenthsToDuration(lenSix);

      const noteIndex = notes.findIndex(n => n.id === drawingNoteId);
      if (noteIndex !== -1) {
        const startMeasure = Math.floor(startSix / 16);
        const startBeat = Math.floor((startSix % 16) / 4);
        const startSixteenth = startSix % 4;
        const newNotes = [...notes];
        newNotes[noteIndex] = {
          ...newNotes[noteIndex],
          time: `${startMeasure}:${startBeat}:${startSixteenth}`,
          note: PITCH_RANGE[pitchIndex],
          duration,
        };
        onUpdate({ ...clipData, notes: newNotes });
      }
      return;
    }

    // Dragging existing note to move
    if (draggingNoteId !== null) {
      const rect = clipRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const sixteenthIndex = Math.max(0, Math.min(TOTAL_SIXTEENTHS - 1, Math.floor((x / rect.width) * TOTAL_SIXTEENTHS)));
      const pitchIndex = Math.max(0, Math.min(PITCH_RANGE.length - 1, Math.floor(y / 12)));

      const measure = Math.floor(sixteenthIndex / 16);
      const beat = Math.floor((sixteenthIndex % 16) / 4);
      const sixteenth = sixteenthIndex % 4;

      const newNoteValue = PITCH_RANGE[pitchIndex];
      const newTime = `${measure}:${beat}:${sixteenth}`;

      const noteIndex = notes.findIndex(n => n.id === draggingNoteId);
      if (noteIndex === -1) return;

      const currentNote = notes[noteIndex];
      if (currentNote && (currentNote.note !== newNoteValue || currentNote.time !== newTime)) {
        const newNotes = [...notes];
        newNotes[noteIndex] = { ...currentNote, note: newNoteValue, time: newTime };
        onUpdate({ ...clipData, notes: newNotes });
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingNoteId(null);
    setDrawingNoteId(null);
  };

  const handleNoteDoubleClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    const newNotes = notes.filter((note) => note.id !== noteId);
    onUpdate({ ...clipData, notes: newNotes });
  };

  const handleChangeNoteDuration = useCallback((duration: string, noteId: string) => {
    setTimeout(() => {
      const noteIndex = notes.findIndex(n => n.id === noteId);
      if (noteIndex === -1) return;
      const newNotes = [...notes];
      newNotes[noteIndex] = { ...newNotes[noteIndex], duration };
      onUpdate({ ...clipData, notes: newNotes });
    }, 0);
  }, [notes, onUpdate, clipData]);

  const handleDeleteNote = useCallback((noteId: string) => {
    setTimeout(() => {
      const newNotes = notes.filter((note) => note.id !== noteId);
      onUpdate({ ...clipData, notes: newNotes });
    }, 0);
  }, [notes, onUpdate, clipData]);

  const timeToX = (time: string) => {
    const [measure, beat, sixteenth] = time.split(':').map(Number);
    const totalSixteenths = (measure * 16) + (beat * 4) + sixteenth;
    return (totalSixteenths / TOTAL_SIXTEENTHS) * 100;
  };

  const getNoteWidth = (durationStr: string) => {
    const widthSixteenths = durationToWidth(durationStr, TOTAL_SIXTEENTHS);
    return (widthSixteenths / TOTAL_SIXTEENTHS) * 100;
  };

  return (
    <div className="relative h-full">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="h-full rounded-sm absolute w-full"
            style={{
              left: 0,
              width: "100%",
            }}
          >
            <ScrollArea ref={scrollAreaRef} className="h-full w-full bg-muted rounded-sm">
              <div
                ref={clipRef}
                className={cn("relative", editTool === "pencil" ? "cursor-crosshair" : "cursor-pointer")}
                style={{ height: `${PITCH_RANGE.length * 12}px` }}
                onClick={handleClipClick}
                onMouseDown={handleBackgroundMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div className="absolute inset-0 pointer-events-none">
                  {PITCH_RANGE.map((_, i) => (
                    <div key={i} className="h-[12px] border-b border-black/10 dark:border-white/5" />
                  ))}
                </div>
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {Array.from({ length: Math.max(1, TOTAL_SIXTEENTHS) }, (_, i) => (
                    <div key={i} className={cn("h-full w-px", i % 4 === 0 ? "bg-black/20 dark:bg-white/10" : "bg-black/10 dark:bg-white/5")} />
                  ))}
                </div>

                {notes.map((note: Note, idx: number) => {
                  const top = noteToY(note.note);
                  if (top === -1) return null;

                  return (
                    <ContextMenu key={note.id || idx}>
                      <ContextMenuTrigger asChild>
                        <div
                          onContextMenu={(e) => e.stopPropagation()}
                          className={cn(
                            "absolute rounded-sm flex items-center justify-center text-white text-xs font-medium select-none",
                            noteColor,
                            draggingNoteId === note.id ? "cursor-grabbing" : (editTool === "pencil" ? "cursor-crosshair" : "cursor-grab")
                          )}
                          style={{
                            top: `${top * 12}px`,
                            left: `${timeToX(note.time)}%`,
                            height: `12px`,
                            width: `${Math.max(2, getNoteWidth(note.duration))}%`,
                          }}
                          onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
                          onDoubleClick={(e) => handleNoteDoubleClick(e, note.id)}
                        >
                          <span className="truncate px-1 pointer-events-none">{note.note}</span>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <div className="px-2 py-1 text-xs text-muted-foreground">Set Duration</div>
                        {NOTE_DURATIONS.map((d) => (
                          <ContextMenuItem
                            key={d.value}
                            onSelect={() => handleChangeNoteDuration(d.value, note.id)}
                          >
                            {d.label}
                          </ContextMenuItem>
                        ))}
                        <ContextMenuItem className="text-red-500" onSelect={() => handleDeleteNote(note.id)}>
                          Delete Note
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onDuplicate}>Duplicate</ContextMenuItem>
          <ContextMenuItem onSelect={onSplit} disabled={!isAudioReady}>Split</ContextMenuItem>
          <ContextMenuItem className="text-red-500" onSelect={onDelete}>Delete Clip</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

export default MidiClip;