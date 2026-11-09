import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/audio/AudioEngine';
import { RigAudio } from './audio/rigAudio';
import { Band, type BandPart } from './audio/sources';
import { gearDef } from './rig/gearDefs';
import type { MissionState } from './rig/missionReducer';
import type { RigState } from './rig/rigTypes';

// ── The sound of the mission being played ──────────────────────────────────
// One band for the visit, so a sample only loads once. A rig for each mission.
// The bus channel is ours to disconnect; the context isn't ours to close.

/** The parts this rig's gear can make. */
export function partsFor(rig: RigState): BandPart[] {
  const parts = new Set<BandPart>();
  for (const gear of Object.values(rig.gear)) {
    for (const source of gearDef(gear).sources?.(gear) ?? []) {
      if (source.source !== 'notes') parts.add(source.source);
    }
  }
  return [...parts];
}

export function useRigAudio(state: MissionState | null, volume: number) {
  const [audio, setAudio] = useState<RigAudio | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<readonly string[]>([]);
  const [playing, setPlaying] = useState(true);
  const channel = useRef<GainNode | null>(null);
  const band = useRef<Band | null>(null);
  const noteTick = useRef(0);
  const mission = state?.mission ?? null;

  useEffect(() => {
    if (!mission) return;
    audioEngine.resume();
    const ctx = audioEngine.context;
    channel.current ??= audioEngine.channel('games', volume);
    const myBand = (band.current ??= new Band(ctx));
    const rig = new RigAudio(ctx, channel.current, myBand);
    const parts = partsFor(mission.rig());
    setAudio(rig);
    setLoading(true);
    setFailed([]);
    let current = true;
    void myBand.load(parts).then(() => {
      if (!current) return;
      setLoading(false);
      setFailed(parts.filter((part) => myBand.failed.has(part)));
    });
    const stopListening = myBand.onNote(() => {
      noteTick.current += 1;
    });
    return () => {
      current = false;
      stopListening();
      rig.dispose();
      setAudio(null);
    };
    // A rig per mission. Volume has its own effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission]);

  // Gone for good: the band and the channel.
  useEffect(
    () => () => {
      band.current?.dispose();
      band.current = null;
      channel.current?.disconnect();
      channel.current = null;
    },
    [],
  );

  useEffect(() => {
    if (channel.current) channel.current.gain.value = volume;
  }, [volume]);

  const rig = state?.rig;
  const trace = state?.trace;
  useEffect(() => {
    if (audio && rig && trace) audio.sync(rig, trace);
  }, [audio, rig, trace]);

  const probe = state?.probe ?? null;
  useEffect(() => {
    audio?.setProbe(probe);
  }, [audio, probe, rig]);

  const thumpNonce = state?.thumpNonce ?? 0;
  useEffect(() => {
    if (thumpNonce > 0) audio?.thump();
  }, [audio, thumpNonce]);

  const cableCount = rig?.cables.length ?? 0;
  const lastCount = useRef(cableCount);
  useEffect(() => {
    if (cableCount !== lastCount.current) audio?.plugClick();
    lastCount.current = cableCount;
  }, [audio, cableCount]);

  const handKeys = !!mission?.handKeys;
  useEffect(() => {
    const myBand = band.current;
    if (!myBand || !mission) return;
    myBand.setLoopedKeys(!handKeys);
    if (playing && !loading) myBand.start();
    else myBand.stop();
    return () => myBand.stop();
  }, [mission, playing, loading, handKeys]);

  const playKey = useCallback((midi: number) => {
    audioEngine.resume();
    band.current?.playKey(midi);
  }, []);

  return {
    audio,
    loading,
    failed,
    playing,
    setPlaying,
    noteTick,
    playKey,
  };
}
