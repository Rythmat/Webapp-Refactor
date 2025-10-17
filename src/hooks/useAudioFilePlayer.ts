import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { usePlayAlong } from './data';

export const useAudioFilePlayer = (playAlongId: string) => {
  const playAlong = usePlayAlong({ id: playAlongId });
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    data: { audio, url } = {},
    isLoading: audioLoading,
    error: audioError,
  } = useQuery({
    queryKey: ['audio', playAlongId],
    queryFn: async () => {
      if (!playAlong.data?.audioFilePath) {
        throw new Error('No audio file path found');
      }

      const res = await fetch(playAlong.data.audioFilePath);
      const arrayBuffer = await res.arrayBuffer();
      const audioContext = new AudioContext();
      const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
      return {
        audio: decodedAudio,
        url: playAlong.data.audioFilePath,
      };
    },
  });

  const audioPlayer = useMemo(() => {
    let el = document.getElementById(
      'use-play-along-audio-player',
    ) as HTMLAudioElement | null;

    if (!el) {
      el = document.createElement('audio');
      el.id = 'use-play-along-audio-player';
      document.body.appendChild(el);
    }

    if (!url) {
      return null;
    }

    el.src = url;
    el.currentTime = 0;
    return el;
  }, [url]);

  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      }
    };
  }, [audioPlayer]);

  const play = useCallback(async () => {
    if (!audioPlayer) {
      return Promise.resolve();
    }

    await audioPlayer.play();
    setIsPlaying(true);
  }, [audioPlayer]);

  const pause = useCallback(() => {
    if (!audioPlayer) {
      return;
    }
    audioPlayer.pause();
    setIsPlaying(false);
  }, [audioPlayer]);

  const stop = useCallback(() => {
    if (!audioPlayer) {
      return;
    }
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    setIsPlaying(false);
  }, [audioPlayer]);

  const seek = useCallback(
    (time: number) => {
      if (!audioPlayer) {
        return;
      }
      audioPlayer.currentTime = time;
    },
    [audioPlayer],
  );

  return useMemo(
    () => ({
      play,
      pause,
      stop,
      seek,
      isPlaying,
      duration: audio?.duration || 0,
      isLoading: audioLoading,
      error: audioError,
    }),
    [
      play,
      pause,
      stop,
      seek,
      isPlaying,
      audioLoading,
      audioError,
      audio?.duration,
    ],
  );
};
