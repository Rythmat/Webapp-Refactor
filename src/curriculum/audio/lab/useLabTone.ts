import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/audio/AudioEngine';
import {
  getLessonVolume,
  subscribeLessonVolume,
} from '@/learn/audio/lessonVolumeValue';
import { LabAudio } from './labAudio';
import type { Envelope } from './physics/envelope';
import type { Recipe } from './physics/harmonics';

/** How long to give a resume before saying a tap is needed. */
const RESUME_GRACE_MS = 400;

/**
 * A lab's sound, on the instruments bus at the lesson volume. Made on the first
 * sound (a gesture). Stops when the tab is hidden, since the app's context
 * keeps running there, and is released on leaving. `sounding` lists the voices
 * on, so the page's buttons follow an auto fade or a hidden tab.
 */
export function useLabTone() {
  const audioRef = useRef<LabAudio | null>(null);
  const channelRef = useRef<GainNode | null>(null);
  const blipRef = useRef(0);
  /** A tapped note's letting go, by voice. */
  const letGoRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [sounding, setSounding] = useState<ReadonlySet<string>>(new Set());
  /** The browser is holding the sound back until a press on the page. */
  const [needsTap, setNeedsTap] = useState(false);

  const without = useCallback((id: string) => {
    setSounding((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearLetGo = useCallback((id: string) => {
    clearTimeout(letGoRef.current.get(id));
    letGoRef.current.delete(id);
  }, []);

  const stopAll = useCallback(() => {
    for (const id of [...letGoRef.current.keys()]) clearLetGo(id);
    audioRef.current?.stopAll();
    setSounding(new Set());
  }, [clearLetGo]);

  useEffect(() => {
    const unsubscribe = subscribeLessonVolume(() => {
      if (channelRef.current) channelRef.current.gain.value = getLessonVolume();
    });
    const onVisibility = () => {
      if (document.hidden) stopAll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      for (const timer of letGoRef.current.values()) clearTimeout(timer);
      letGoRef.current.clear();
      audioRef.current?.close();
      channelRef.current?.disconnect();
      audioRef.current = null;
      channelRef.current = null;
    };
  }, [stopAll]);

  const ensure = useCallback(() => {
    if (!audioRef.current) {
      channelRef.current = audioEngine.channel(
        'instruments',
        getLessonVolume(),
      );
      audioRef.current = new LabAudio({
        context: audioEngine.context,
        output: channelRef.current,
        onFaded: without,
      });
    }
    audioEngine.resume();
    window.setTimeout(
      () => setNeedsTap(!audioEngine.isRunning()),
      RESUME_GRACE_MS,
    );
    return audioRef.current;
  }, [without]);

  /** Start a voice, or glide it there when it is already sounding. */
  const set = useCallback(
    (id: string, hz: number, level = 1, harmonics?: Recipe) => {
      ensure().set(id, hz, level, harmonics);
      setSounding((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    },
    [ensure],
  );

  /** Move a voice only if it is on: dragging a slider in silence stays silent. */
  const glide = useCallback(
    (id: string, hz: number, level = 1, harmonics?: Recipe) => {
      if (audioRef.current?.isSounding(id)) {
        audioRef.current.set(id, hz, level, harmonics);
      }
    },
    [],
  );

  /** Two equal tones, the second this far behind: they really do cancel. */
  const setPair = useCallback(
    (id: string, hz: number, phase: number) => {
      ensure().setPair(id, hz, phase);
      setSounding((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    },
    [ensure],
  );

  /** Move a pair only if it's on. */
  const glidePair = useCallback((id: string, hz: number, phase: number) => {
    if (audioRef.current?.isSounding(id)) {
      audioRef.current.setPair(id, hz, phase);
    }
  }, []);

  /** What's really leaving the page, once there's a sound to measure. */
  const spectrum = useCallback(() => audioRef.current?.spectrum() ?? null, []);

  /** Start a note on an envelope's shape, until noteOff. */
  const noteOn = useCallback(
    (id: string, hz: number, envelope: Envelope, harmonics?: Recipe) => {
      clearLetGo(id);
      ensure().noteOn(id, hz, envelope, harmonics);
      setSounding((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    },
    [ensure, clearLetGo],
  );

  const noteOff = useCallback(
    (id: string) => {
      clearLetGo(id);
      audioRef.current?.noteOff(id);
      without(id);
    },
    [clearLetGo, without],
  );

  /** A whole note from one tap: held this long, then let go. */
  const playNote = useCallback(
    (
      id: string,
      hz: number,
      envelope: Envelope,
      holdSeconds: number,
      harmonics?: Recipe,
    ) => {
      noteOn(id, hz, envelope, harmonics);
      letGoRef.current.set(
        id,
        setTimeout(() => noteOff(id), holdSeconds * 1000),
      );
    },
    [noteOn, noteOff],
  );

  const stop = useCallback(
    (id: string) => {
      clearLetGo(id);
      audioRef.current?.stop(id);
      without(id);
    },
    [clearLetGo, without],
  );

  /** A short tone that ends by itself: a tap, an arrival. */
  const blip = useCallback(
    (hz: number, ms = 90, level = 0.7) => {
      blipRef.current += 1;
      const id = `blip-${blipRef.current}`;
      ensure().set(id, hz, level);
      window.setTimeout(() => audioRef.current?.stop(id), ms);
    },
    [ensure],
  );

  const peak = useCallback(() => audioRef.current?.peak() ?? 0, []);

  return {
    set,
    glide,
    stop,
    stopAll,
    blip,
    noteOn,
    noteOff,
    playNote,
    setPair,
    glidePair,
    spectrum,
    sounding,
    needsTap,
    peak,
  };
}
