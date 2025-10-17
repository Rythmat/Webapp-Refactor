import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlayback } from '@/contexts/PlaybackContext';
import { PhraseMap as PhraseMapType } from '@/hooks/data';
import { PianoKeyboard } from '../PianoKeyboard';
import { PhraseBarViewer } from './PhraseBarViewer';

export const PhraseMap = ({
  phraseMap,
  parentColor,
}: {
  phraseMap: PhraseMapType;
  parentColor?: string | null;
}) => {
  const {
    isPlaying,
    isPaused,
    play,
    stop,
    currentPositionIndex,
    activeEvents,
  } = usePlayback(phraseMap || null);

  if (!phraseMap) {
    return <div>Loading...</div>;
  }

  return (
    <div className="text-muted-foreground">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{phraseMap.label}</h2>
        <p className="text-sm text-foreground">{phraseMap.description}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg bg-foreground py-3 text-background">
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <Button
            size="sm"
            style={{
              backgroundColor: phraseMap.color || parentColor || '#333333',
              color: 'white',
            }}
            title={isPlaying ? 'Stop' : 'Play'}
            variant="ghost"
            onClick={isPlaying ? () => stop({ pause: true }) : () => play()}
          >
            {isPlaying ? (
              <Pause className="size-3" fill="white" />
            ) : (
              <Play className="size-3" fill="white" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-y-6 px-4 md:grid-cols-2 lg:grid-cols-4">
          {phraseMap.PhraseBars.map((bar, index) => (
            <PhraseBarViewer
              key={bar.id}
              bar={bar}
              currentBarIndex={index}
              currentPositionIndex={currentPositionIndex}
              isFirstBar={index === 0}
              isLastBar={index === phraseMap.PhraseBars.length - 1}
              isPlaying={isPlaying || isPaused}
              phraseMap={phraseMap}
            />
          ))}
        </div>

        <div className="overflow-x-auto pb-2">
          <PianoKeyboard
            showOctaveStart
            activeBlackKeyColor={phraseMap.color || parentColor || null}
            activeWhiteKeyColor={phraseMap.color || parentColor || null}
            playingNotes={activeEvents}
          />
        </div>
      </div>
    </div>
  );
};
