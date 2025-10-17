import { CheckIcon, SearchIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard/PianoKeyboard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlaybackEvent } from '@/contexts/PlaybackContext';
import { Note } from '@/hooks/data';

interface NoteSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNotes: number[];
  availableNotes: Note[];
  onConfirm: (selectedNotes: number[]) => void;
}

export function NoteSelectionModal({
  open,
  onOpenChange,
  selectedNotes: initialSelectedNotes,
  availableNotes,
  onConfirm,
}: NoteSelectionModalProps) {
  const [selectedNotes, setSelectedNotes] = useState<number[]>([
    ...initialSelectedNotes,
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const noteListRef = useRef<HTMLDivElement>(null);

  // Reset selected notes when modal opens
  useEffect(() => {
    if (open) {
      setSelectedNotes([...initialSelectedNotes]);

      // Add a small delay to ensure DOM has updated
      setTimeout(() => {
        if (initialSelectedNotes.length > 0 && noteListRef.current) {
          const firstSelectedNote = initialSelectedNotes[0];
          const noteElement = noteListRef.current.querySelector(
            `[data-midi="${firstSelectedNote}"]`,
          );

          if (noteElement) {
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }, [open, initialSelectedNotes]);

  const handlePianoKeyClick = (midi: number) => {
    // scroll to the note
    const noteElement = noteListRef.current?.querySelector(
      `[data-midi="${midi}"]`,
    );
    if (noteElement) {
      noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setSelectedNotes((prev) =>
      prev.includes(midi)
        ? prev.filter((note) => note !== midi)
        : [...prev, midi],
    );
  };

  const handleNoteItemClick = (midi: number) => {
    setSelectedNotes((prev) =>
      prev.includes(midi)
        ? prev.filter((note) => note !== midi)
        : [...prev, midi],
    );
  };

  const filteredNotes = availableNotes.filter((note) =>
    note.key.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm(selectedNotes);
    onOpenChange(false);
  };

  // Convert to PlayingNote format for the piano
  const playingNotes = selectedNotes.map(
    (note) =>
      ({
        velocity: 100,
        duration: 0,
        id: `note-${note}`,
        time: 0,
        midi: note,
        type: 'note',
        color: null,
      }) satisfies PlaybackEvent,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-fit">
        <DialogHeader>
          <DialogTitle>Select Notes</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Piano Keyboard */}
          <div className="flex h-48 flex-col overflow-hidden rounded-md border p-2">
            <PianoKeyboard
              showOctaveStart
              className="flex-1"
              endC={7}
              playingNotes={playingNotes}
              startC={1}
              vertical={false}
              onKeyClick={handlePianoKeyClick}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Note List */}
          <ScrollArea className="h-52 rounded-md border">
            <div ref={noteListRef} className="space-y-1 p-2">
              {filteredNotes.map((note) => (
                <div
                  key={note.midi}
                  className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${
                    selectedNotes.includes(note.midi)
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  }`}
                  data-midi={note.midi}
                  onClick={() => handleNoteItemClick(note.midi)}
                >
                  <span>{note.key}</span>
                  {selectedNotes.includes(note.midi) && (
                    <CheckIcon className="size-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
