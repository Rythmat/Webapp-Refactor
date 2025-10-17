import { AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TbPiano } from 'react-icons/tb';
import { getNoteDuration } from '@/components/PhraseMap';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Note, PhraseBar, useNoteByMidiMap } from '@/hooks/data';
import { BarNoteInput } from './BarNoteInput';
import { NoteSelectionModal } from './NoteSelectionModal';
// import { Switch } from '@/components/ui/switch';

interface PhraseBarItemProps {
  index: number;
  bar: PhraseBar;
  beatsPerBar: number;
  notes: Note[];
  onUpdate: (updatedBar: PhraseBar) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const PhraseBarItem = ({
  bar,
  index,
  notes,
  beatsPerBar,
  onUpdate,
  onDelete,
  onDuplicate,
}: PhraseBarItemProps) => {
  const [openNoteModal, setOpenNoteModal] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);

  const hasOverflow = useMemo(
    () =>
      bar.PhraseBarNotes.reduce(
        (acc, note) => acc + getNoteDuration(note, beatsPerBar),
        0,
      ) > beatsPerBar,
    [bar.PhraseBarNotes, beatsPerBar],
  );

  const { data: noteByMidi } = useNoteByMidiMap();

  const handleNoteSelection = (
    selectedNotes: number[],
    targetNoteIndex = currentNoteIndex,
  ) => {
    if (targetNoteIndex !== null) {
      const updatedNotes = bar.PhraseBarNotes.map((n, i) =>
        i === targetNoteIndex ? { ...n, noteNumbers: selectedNotes } : n,
      );
      onUpdate({
        ...bar,
        PhraseBarNotes: updatedNotes,
      });
    }
  };

  return (
    <div className="rounded-lg border p-3 focus-within:border-primary">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium">{`${index + 1}`}</span>
            <div className="shrink-0">
              <ColorPicker
                value={bar.color || null}
                onChange={(newColor) =>
                  onUpdate({
                    ...bar,
                    color: newColor,
                  })
                }
              />
            </div>
            <div className="grow">
              <Input
                placeholder="Bar Label"
                value={bar.label || ''}
                onChange={(e) =>
                  onUpdate({
                    ...bar,
                    label: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasOverflow && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <AlertTriangle className="size-4" />
                Bar has overflow
              </span>
            )}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={onDuplicate}>
                    <Copy className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate Bar</TooltipContent>
              </Tooltip>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({
                  ...bar,
                  PhraseBarNotes: [
                    ...bar.PhraseBarNotes,
                    {
                      id: '',
                      noteNumbers: [60],
                      noteDuration: 'quarter',
                      noteType: 'note',
                      color: null,
                      order: bar.PhraseBarNotes.length,
                      label: null,
                    },
                  ],
                });
              }}
            >
              Add Note
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bar</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this bar? This action cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={bar.startRepeat}
              onCheckedChange={(checked) =>
                onUpdate({
                  ...bar,
                  startRepeat: checked,
                })
              }
            />
            <span className="text-sm">Start Repeat</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={bar.endRepeat}
              onCheckedChange={(checked) =>
                onUpdate({
                  ...bar,
                  endRepeat: checked,
                })
              }
            />
            <span className="text-sm">End Repeat</span>
          </div>
        </div> */}

        <div className="h-px bg-border" />

        {bar.PhraseBarNotes.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-col gap-2">
              {bar.PhraseBarNotes.map((note, noteIndex) => (
                <div
                  key={noteIndex}
                  className="flex items-center gap-1 rounded"
                >
                  <div className="shrink-0">
                    <ColorPicker
                      value={note.color || null}
                      onChange={(newColor) => {
                        const updatedNotes = bar.PhraseBarNotes.map((n, i) =>
                          i === noteIndex
                            ? { ...n, color: newColor || null }
                            : n,
                        );
                        onUpdate({
                          ...bar,
                          PhraseBarNotes: updatedNotes,
                        });
                      }}
                    />
                  </div>

                  <Select
                    value={note.noteType}
                    onValueChange={(value: 'note' | 'rest') => {
                      const updatedNotes = bar.PhraseBarNotes.map((n, i) =>
                        i === noteIndex ? { ...n, noteType: value } : n,
                      );
                      onUpdate({
                        ...bar,
                        PhraseBarNotes: updatedNotes,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-20">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="rest">Rest</SelectItem>
                    </SelectContent>
                  </Select>

                  {note.noteType === 'note' && (
                    <div className="flex h-8 w-64 items-center justify-start truncate rounded-md border bg-shade-4/30 pl-3">
                      {noteByMidi.size > 0 && (
                        <BarNoteInput
                          className="bg-transparent focus:outline-none"
                          currentNoteIndex={noteIndex}
                          noteByMidi={noteByMidi}
                          noteNumbers={note.noteNumbers}
                          onChange={(currentNoteIndex, noteNumbers) =>
                            handleNoteSelection(noteNumbers, currentNoteIndex)
                          }
                        />
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCurrentNoteIndex(noteIndex);
                          setOpenNoteModal(true);
                        }}
                      >
                        <TbPiano className="size-4" />
                      </Button>
                    </div>
                  )}

                  <Select
                    value={note.noteDuration}
                    onValueChange={(
                      value:
                        | 'whole'
                        | 'half'
                        | 'quarter'
                        | 'eighth'
                        | 'sixteenth',
                    ) => {
                      const updatedNotes = bar.PhraseBarNotes.map((n, i) =>
                        i === noteIndex ? { ...n, noteDuration: value } : n,
                      );
                      onUpdate({
                        ...bar,
                        PhraseBarNotes: updatedNotes,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whole">Whole</SelectItem>
                      <SelectItem value="half">Half</SelectItem>
                      <SelectItem value="quarter">Quarter</SelectItem>
                      <SelectItem value="eighth">Eighth</SelectItem>
                      <SelectItem value="sixteenth">Sixteenth</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    className="size-8 shrink-0 p-0"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({
                        ...bar,
                        PhraseBarNotes: bar.PhraseBarNotes.filter(
                          (targetNote) => targetNote.id !== note.id,
                        ),
                      });
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentNoteIndex !== null && (
        <NoteSelectionModal
          availableNotes={notes}
          open={openNoteModal}
          selectedNotes={bar.PhraseBarNotes[currentNoteIndex].noteNumbers}
          onConfirm={(selectedNotes) =>
            handleNoteSelection(selectedNotes, currentNoteIndex)
          }
          onOpenChange={setOpenNoteModal}
        />
      )}
    </div>
  );
};
