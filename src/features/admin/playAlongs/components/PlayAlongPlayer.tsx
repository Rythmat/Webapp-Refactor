import { debounce } from 'lodash';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard/PianoKeyboard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { usePlayback } from '@/contexts/PlaybackContext';
import { usePlayAlong } from '@/hooks/data';
import { useAudioFilePlayer } from '@/hooks/useAudioFilePlayer';
import { usePlayAlongMidiTracks } from '@/hooks/usePlayAlongMidiTracks';

interface PlayAlongPlayerProps {
  id: string;
  color?: string | null;
}

export const PlayAlongPlayer = ({ id, color }: PlayAlongPlayerProps) => {
  // Fetch play along details
  const { data: playAlong, isLoading: playAlongLoading } = usePlayAlong({ id });

  const {
    tracks: pianoTracks = [],
    selectedTrack,
    setSelectedTrack,
    isLoading: midiLoading,
    error: midiError,
  } = usePlayAlongMidiTracks(id);

  // Set up MIDI playback with usePlayback hook
  const {
    play: playMidi,
    stop: stopMidi,
    seek: seekMidi,
    isPlaying: isPlayingMidi,
    activeEvents,
    totalDuration,
    currentPosition,
  } = usePlayback(selectedTrack?.track || null, {
    volume: 0,
    bpm: selectedTrack?.beatsPerMinute,
  });

  const {
    play: playAudio,
    pause: pauseAudio,
    stop: stopAudio,
    seek: seekAudio,
    isLoading: audioLoading,
    error: audioError,
    // duration: audioDuration,
  } = useAudioFilePlayer(id);

  const debouncedSeekAudio = useMemo(
    () =>
      debounce((position: number) => seekAudio(position), 2000, {
        leading: true,
        trailing: false,
      }),
    [seekAudio],
  );

  const syncAudio = useCallback(() => {
    const audioPosition = currentPosition * totalDuration;
    debouncedSeekAudio(audioPosition);
  }, [currentPosition, totalDuration, debouncedSeekAudio]);

  useEffect(() => {
    if (isPlayingMidi) {
      const audioPosition = currentPosition * totalDuration;

      /**
       * Workaround to keep the audio in sync with the MIDI:
       * Every 30 seconds in MIDI playback, seek to the same position in audio to keep them in sync.
       * This is needed as the audio duration is not exactly the same as the MIDI duration.
       *
       * TODO: Investigate why the audio duration is not exactly the same as the MIDI duration.
       */
      const secondPosition = Math.round(audioPosition);

      if (secondPosition === 3 || secondPosition % 30 === 0) {
        syncAudio();
      }
    }
  }, [totalDuration, currentPosition, syncAudio, isPlayingMidi]);

  const play = useCallback(() => {
    playAudio().then(() => {
      playMidi();
      syncAudio();
    });
  }, [playMidi, playAudio, syncAudio]);

  const pause = useCallback(() => {
    stopMidi({ pause: true });
    pauseAudio();
  }, [stopMidi, pauseAudio]);

  const stop = useCallback(() => {
    stopMidi({ pause: false });
    stopAudio();
  }, [stopMidi, stopAudio]);

  const seek = useCallback(
    (percentage: number) => {
      seekMidi(percentage);
      seekAudio(percentage * totalDuration);
    },
    [seekMidi, seekAudio, totalDuration],
  );

  const error = midiError || audioError;
  const isLoading = midiLoading || audioLoading || playAlongLoading;

  // Format time display
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return <div className="p-4 text-red-500">{error.message}</div>;
  }

  if (isLoading) {
    const skeletonStyle = color
      ? { backgroundColor: `${color}15` } // 15 = ~8% opacity in hex
      : {};

    return (
      <div className="text-muted-foreground">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" style={skeletonStyle} />
          <Skeleton className="h-4 w-32" style={skeletonStyle} />
        </div>

        <div className="flex flex-col rounded-lg bg-foreground py-3 text-background">
          <div className="flex items-center justify-between gap-2 px-4 pb-3">
            <Skeleton className="size-8 rounded" style={skeletonStyle} />
            <Skeleton className="size-8 rounded" style={skeletonStyle} />
            <div className="flex-1 px-2">
              <Skeleton className="h-2 w-full" style={skeletonStyle} />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" style={skeletonStyle} />
            </div>
          </div>
          <div className="overflow-x-auto px-4 pb-2">
            <Skeleton className="h-16 w-full" style={skeletonStyle} />
          </div>
        </div>
      </div>
    );
  }

  if (!playAlong) {
    return <div className="p-4 text-red-500">Play along not found</div>;
  }

  return (
    <div className="text-muted-foreground">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{playAlong.name}</h2>
        <p className="text-sm text-foreground">{playAlong.description}</p>
      </div>

      <div className="flex flex-col rounded-lg bg-foreground py-3 text-background">
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <Button
            disabled={isLoading}
            size="sm"
            style={{
              backgroundColor: color || '#333333',
              color: 'white',
            }}
            variant="ghost"
            onClick={isPlayingMidi ? pause : play}
          >
            {isPlayingMidi ? (
              <Pause className="size-3" fill="white" />
            ) : (
              <Play className="size-3" fill="white" />
            )}
          </Button>
          <Button
            disabled={isLoading}
            size="icon"
            style={{
              color: color || '#333333',
            }}
            variant="ghost"
            onClick={stop}
          >
            <RotateCcw className="size-5" />
          </Button>

          <div className="flex-1 px-2">
            <Slider
              max={1}
              min={0}
              rangeStyle={{ backgroundColor: color ?? undefined }}
              step={0.01}
              trackStyle={{ backgroundColor: '#ddd' }}
              value={[currentPosition]}
              onValueChange={(value) => seek(value[0])}
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            {pianoTracks && pianoTracks.length > 1 && (
              <div className="flex flex-col px-4">
                <Select
                  value={selectedTrack?.id || undefined}
                  onValueChange={(value) => {
                    stop();
                    setSelectedTrack(
                      pianoTracks.find((track) => track.id === value) || null,
                    );
                  }}
                >
                  <SelectTrigger className="w-full border-none px-0 shadow-none">
                    <SelectValue placeholder="Select a MIDI track" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTrack &&
                      pianoTracks.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span>{formatTime(currentPosition * totalDuration)}</span>
              <span>/</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <PianoKeyboard
            showOctaveStart
            activeBlackKeyColor={color ?? undefined}
            activeWhiteKeyColor={color ?? undefined}
            endC={7}
            playingNotes={activeEvents}
            startC={3}
          />
        </div>
      </div>

      {playAlong?.midiBeatsPerMinute && (
        <div className="mt-1 text-right text-xs text-muted-foreground">
          BPM: {playAlong.midiBeatsPerMinute}
        </div>
      )}
    </div>
  );
};
