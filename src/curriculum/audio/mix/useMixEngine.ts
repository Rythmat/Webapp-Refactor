import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '@/audio/AudioEngine';
import {
  getLessonVolume,
  subscribeLessonVolume,
} from '@/learn/audio/lessonVolumeValue';
import {
  MixEngine,
  type BusSettings,
  type ChannelSettings,
  type MeterPoint,
} from './mixEngine';
import { stemNamed, type StemId } from './stems';

/** How long to give a resume before saying a tap is needed. */
const RESUME_GRACE_MS = 400;
/** Nobody means to leave a groove running: it stops after this long untouched. */
const IDLE_STOP_MS = 180_000;

export type StemSettings = Readonly<Partial<Record<StemId, ChannelSettings>>>;

/**
 * A lesson's desk. Fetches its stems on opening, and makes no sound until a
 * gesture. Stops in a hidden tab or when left alone, and lets go on leaving; the
 * shared context carries on.
 */
export function useMixEngine(needs: readonly StemId[]) {
  const [buffers, setBuffers] = useState<ReadonlyMap<
    StemId,
    AudioBuffer
  > | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const engineRef = useRef<MixEngine | null>(null);
  const channelRef = useRef<GainNode | null>(null);
  const settingsRef = useRef<{ stems: StemSettings; bus: BusSettings }>({
    stems: {},
    bus: {},
  });
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const needsKey = needs.join();

  useEffect(() => {
    let cancelled = false;
    // A lesson with nothing to play (a keyboard lesson) loads no stems.
    const ids = needsKey ? (needsKey.split(',') as StemId[]) : [];
    Promise.all(
      ids.map(
        async (id) =>
          [id, await audioEngine.samples.load(stemNamed(id).url)] as const,
      ),
    ).then(
      (loaded) => {
        if (!cancelled) setBuffers(new Map(loaded));
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [needsKey]);

  const stop = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    engineRef.current?.stop();
    setPlaying(false);
  }, []);

  const touch = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(stop, IDLE_STOP_MS);
  }, [stop]);

  const play = useCallback(() => {
    if (!buffers?.size) return;
    if (!engineRef.current) {
      channelRef.current = audioEngine.channel(
        'instruments',
        getLessonVolume(),
      );
      engineRef.current = new MixEngine({
        context: audioEngine.context,
        output: channelRef.current,
        buffers,
      });
      engineRef.current.setChannels(settingsRef.current.stems);
      engineRef.current.setBus(settingsRef.current.bus);
    }
    audioEngine.resume();
    window.setTimeout(
      () => setNeedsTap(!audioEngine.isRunning()),
      RESUME_GRACE_MS,
    );
    engineRef.current.start();
    setPlaying(true);
    touch();
  }, [buffers, touch]);

  /** What the desk should be doing: safe before there's any sound. */
  const apply = useCallback(
    (stems: StemSettings, bus: BusSettings) => {
      settingsRef.current = { stems, bus };
      engineRef.current?.setChannels(stems);
      engineRef.current?.setBus(bus);
      if (engineRef.current?.playing) touch();
    },
    [touch],
  );

  useEffect(() => {
    const unsubscribe = subscribeLessonVolume(() => {
      if (channelRef.current) channelRef.current.gain.value = getLessonVolume();
    });
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      if (idleRef.current) clearTimeout(idleRef.current);
      engineRef.current?.close();
      channelRef.current?.disconnect();
      engineRef.current = null;
      channelRef.current = null;
    };
  }, [stop]);

  const peak = useCallback(
    (point: MeterPoint) => engineRef.current?.peak(point) ?? 0,
    [],
  );
  const spectrum = useCallback(() => engineRef.current?.spectrum() ?? null, []);
  const position = useCallback(() => engineRef.current?.position() ?? null, []);

  return useMemo(
    () => ({
      buffers,
      failed,
      ready: buffers != null,
      playing,
      needsTap,
      play,
      stop,
      apply,
      peak,
      spectrum,
      position,
    }),
    [
      buffers,
      failed,
      playing,
      needsTap,
      play,
      stop,
      apply,
      peak,
      spectrum,
      position,
    ],
  );
}

export type Mix = ReturnType<typeof useMixEngine>;
