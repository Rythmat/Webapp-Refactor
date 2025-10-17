import { Play, Pause } from 'lucide-react';
import { PianoKeyboard, useRange } from '@/components/PianoKeyboard';
import { Button } from '@/components/ui/button';
import { GetNoteSequencesByIdData } from '@/contexts/MusicAtlasContext/musicAtlas.generated';
import { usePlayback, parseNoteSequence } from '@/contexts/PlaybackContext';

interface PianoPlayerProps {
  noteSequence: GetNoteSequencesByIdData;
  showAllNotes?: boolean;
  color?: string;
}

export const PianoPlayer = ({
  noteSequence,
  showAllNotes = false,
  color,
}: PianoPlayerProps) => {
  const { isPlaying, isPaused, activeEvents, play, stop, currentPosition } =
    usePlayback(noteSequence);

  const previewNotes = parseNoteSequence(noteSequence);
  const octaveRange = useRange(previewNotes);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-2">
        <div className="text-lg font-semibold">{noteSequence.name}</div>
      </div>

      <div className="rounded-lg bg-foreground py-3 text-background">
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <Button
            size="sm"
            style={{
              backgroundColor: color || '#333333',
              color: 'white',
            }}
            title={isPlaying ? 'Stop' : 'Play'}
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              if (isPlaying) {
                stop({ pause: true });
              } else {
                play();
              }
            }}
          >
            {isPlaying ? (
              <Pause className="size-3" fill="white" />
            ) : (
              <Play className="size-3" fill="white" />
            )}
          </Button>

          <div className="h-1 w-full rounded-full bg-gray-200">
            <div
              className="h-1 rounded-full bg-primary"
              style={{
                width:
                  isPlaying || isPaused ? `${currentPosition * 100}%` : '0%',
                backgroundColor: color || undefined,
              }}
            ></div>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <PianoKeyboard
            showOctaveStart
            activeBlackKeyColor={color}
            activeWhiteKeyColor={color}
            endC={octaveRange.highestC}
            playingNotes={
              isPlaying || isPaused
                ? activeEvents
                : showAllNotes
                  ? previewNotes
                  : []
            }
            startC={octaveRange.lowestC}
          />
        </div>
      </div>

      <div className="mt-2 text-right text-xs text-muted-foreground">
        Tempo: {noteSequence.tempo} BPM | Time Signature:{' '}
        {noteSequence.timeSignature}
      </div>
    </div>
  );
};
