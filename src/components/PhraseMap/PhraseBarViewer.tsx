import { useCallback } from 'react';
import { PhraseBar, PhraseBarNote, PhraseMap } from '@/hooks/data';
import { cn } from '../utilities';
import {
  BarDivider,
  BarEnd,
  BarEndRepeat,
  BarStart,
  NotationSymbol,
} from './NotationSvgs';
import { getNoteDuration } from './helpers';

// Reusable component to render a single bar
export const PhraseBarViewer = ({
  bar,
  currentPositionIndex = -1,
  currentBarIndex = -1,
  isFirstBar = false,
  isLastBar = false,
  isPlaying = false,
  phraseMap,
}: {
  bar: PhraseBar;
  currentPositionIndex?: number;
  currentBarIndex?: number;
  isFirstBar?: boolean;
  isLastBar?: boolean;
  isPlaying?: boolean;
  phraseMap: PhraseMap;
}) => {
  const getNoteStartPosition = useCallback(
    (note: PhraseBarNote) => {
      let startPosition = 0;

      for (const targetNote of bar.PhraseBarNotes) {
        if (targetNote.id === note.id) {
          break;
        }

        startPosition += getNoteDuration(targetNote, phraseMap.beatsPerBar * 4);
      }

      return startPosition;
    },
    [bar, phraseMap.beatsPerBar],
  );

  return (
    <div className="w-full">
      <div className="mb-2 h-4 text-sm font-medium">{bar.label}</div>
      <div className="flex w-full border border-b-0 border-r-0 border-zinc-400">
        {Array.from({ length: 16 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-6 w-full border-r border-zinc-400 transition-colors',
              index + 16 * currentBarIndex <= currentPositionIndex
                ? isPlaying
                  ? 'bg-zinc-300' // Current position
                  : 'bg-muted'
                : 'bg-muted', // Inactive positions
            )}
          />
        ))}
      </div>

      <div className="flex w-full border-t border-zinc-400">
        {bar.PhraseBarNotes.map((note) => (
          <div
            key={note.id}
            className="flex flex-col items-center"
            style={{
              width: `${getNoteDuration(note, 1) * 100}%`,
            }}
          >
            <div
              className="h-6 w-full border-b border-l border-zinc-400 bg-muted transition-colors"
              style={{
                backgroundColor:
                  note.color || bar.color || phraseMap.color || undefined,
                opacity: isPlaying
                  ? getNoteStartPosition(note) + 16 * currentBarIndex <=
                    currentPositionIndex
                    ? 1
                    : 0.5
                  : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div className="relative flex w-full border-t border-zinc-400">
        {bar.startRepeat && (
          <div className="absolute -left-3 top-1 flex flex-col items-center">
            <BarStart size={20} />
          </div>
        )}

        {bar.PhraseBarNotes.map((note) => (
          <div
            key={note.id}
            className="flex flex-col items-center"
            style={{
              width: `${getNoteDuration(note, 1) * 100}%`,
            }}
          >
            <div className="mt-1 flex w-full justify-start pl-px text-zinc-700">
              <NotationSymbol
                duration={note.noteDuration}
                size={20}
                type={note.noteType}
              />
            </div>
          </div>
        ))}

        {/* If the bar is the first bar, show the bar start symbol */}
        {isFirstBar && (
          <div className="absolute left-[-7px] top-1 flex flex-col items-center">
            <BarStart size={20} />
          </div>
        )}

        {/* If the bar is the last bar, show the bar end symbol */}
        <div className="absolute right-[-11px] top-1 flex flex-col items-center">
          {bar.endRepeat ? (
            <BarEndRepeat size={20} />
          ) : isLastBar ? (
            <BarEnd size={20} />
          ) : (
            <BarDivider size={20} />
          )}
        </div>
      </div>
    </div>
  );
};
