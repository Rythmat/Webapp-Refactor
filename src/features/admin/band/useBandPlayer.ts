/**
 * The Band editor's audio: every layer on its own Studio instrument
 * (bandSounds — the samples, voices and synths the Studio plays), through its
 * own level, on one transport, looping the chart. An edit swaps the layers'
 * notes in without stopping, so a change is heard on the next pass; a level,
 * mute or solo change is heard at once.
 *
 * Positions are in band ticks (PPQ 480).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { BackingNote } from '@/curriculum/engine/genreGeneration/backingPatterns';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { makeClick, scheduleClicks } from '../parts/metronome';
import {
  applySynthSound,
  createBandInstrument,
  synthEngineOf,
} from './bandSounds';

/** One layer, ready to play. */
export interface PlayerLayer {
  id: string;
  sound: string;
  notes: readonly BackingNote[];
  /** 0–1. */
  volume: number;
  muted: boolean;
}

/** A note as the transport schedules it. */
type Scheduled = BackingNote & { time: string };

interface Voice {
  sound: string;
  adapter: InstrumentAdapter;
  gain: Tone.Gain;
  part: Tone.Part<Scheduled> | null;
  sounding: Set<number>;
}

const scale = () => Tone.getTransport().PPQ / 480;

/** The voice a capture monitors on: kept apart from the band's layers. */
const CAPTURE = 'capture:';

export function useBandPlayer() {
  const voices = useRef(new Map<string, Voice>());
  const soloRef = useRef<string | null>(null);
  const layersRef = useRef<readonly PlayerLayer[]>([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [solo, setSoloState] = useState<string | null>(null);
  const clickRef = useRef<Tone.Synth | null>(null);
  const unclickRef = useRef<(() => void) | null>(null);
  const unclick = () => {
    unclickRef.current?.();
    unclickRef.current = null;
  };

  const gainFor = (layer: PlayerLayer) => {
    const audible =
      !layer.muted &&
      (soloRef.current === null || soloRef.current === layer.id);
    return audible ? layer.volume : 0;
  };

  const releaseVoice = (voice: Voice) => {
    voice.sounding.forEach((n) => voice.adapter.noteOff(n));
    voice.sounding.clear();
  };

  const disposePart = (voice: Voice) => {
    try {
      voice.part?.stop();
      voice.part?.dispose();
    } catch {
      /* already gone */
    }
    voice.part = null;
  };

  const disposeVoice = useCallback((id: string) => {
    const voice = voices.current.get(id);
    if (!voice) return;
    disposePart(voice);
    releaseVoice(voice);
    voice.adapter.dispose?.();
    voice.gain.dispose();
    voices.current.delete(id);
  }, []);

  /** The layer's instrument, made (or remade, for a new sound) as needed. */
  const voiceFor = useCallback(
    async (layer: PlayerLayer): Promise<Voice | null> => {
      const existing = voices.current.get(layer.id);
      if (existing?.sound === layer.sound) return existing;
      if (existing) disposeVoice(layer.id);
      const adapter = createBandInstrument(layer.sound);
      if (!adapter) return null;
      const gain = new Tone.Gain(gainFor(layer)).toDestination();
      await adapter.init(
        Tone.getContext().rawContext as AudioContext,
        gain.input as unknown as AudioNode,
      );
      // A synth layer plays its patch, applied the way a saved project's is.
      applySynthSound(adapter, layer.sound);
      const voice: Voice = {
        sound: layer.sound,
        adapter,
        gain,
        part: null,
        sounding: new Set(),
      };
      voices.current.set(layer.id, voice);
      return voice;
    },
    [disposeVoice],
  );

  /** Puts a layer's notes on the transport, replacing what it had. */
  const schedule = (voice: Voice, notes: readonly BackingNote[]) => {
    const s = scale();
    disposePart(voice);
    releaseVoice(voice);
    const part = new Tone.Part<Scheduled>(
      (time, n) => {
        voice.adapter.noteOn(n.note, n.velocity, time);
        voice.sounding.add(n.note);
        const length = Tone.Ticks(
          Math.max(30, n.duration - 10) * s,
        ).toSeconds();
        voice.adapter.noteOff(n.note, time + length);
      },
      notes.map((n) => ({ ...n, time: `${Math.round(n.onset * s)}i` })),
    );
    part.start(0);
    voice.part = part;
  };

  /**
   * Plays the layers, looping `totalTicks`; while playing, swaps them in.
   * Layers no longer in the band are let go.
   */
  const play = useCallback(
    async (
      layers: readonly PlayerLayer[],
      {
        bpm,
        totalTicks,
        click,
      }: {
        bpm: number;
        totalTicks: number;
        /** The meter to click a metronome in; no click when left out. */
        click?: readonly [number, number];
      },
    ) => {
      if (Tone.getContext().state !== 'running') await Tone.start();
      layersRef.current = layers;
      const keep = new Set(layers.map((l) => l.id));
      [...voices.current.keys()]
        .filter((id) => !keep.has(id) && !id.startsWith(CAPTURE))
        .forEach(disposeVoice);
      setLoading(true);
      let ready: (Voice | null)[];
      try {
        ready = await Promise.all(layers.map(voiceFor));
      } finally {
        setLoading(false);
      }
      const transport = Tone.getTransport();
      const starting = transport.state !== 'started';
      // Clear what an earlier session left on the timeline BEFORE scheduling:
      // cancel() removes everything scheduled, these parts included.
      if (starting) transport.cancel();
      transport.bpm.value = bpm;
      transport.swing = 0;
      transport.loop = true;
      transport.loopStart = 0;
      transport.loopEnd = `${Math.round(totalTicks * scale())}i`;
      layers.forEach((layer, i) => {
        const voice = ready[i];
        if (!voice) return;
        voice.gain.gain.rampTo(gainFor(layer), 0.02);
        schedule(voice, layer.notes);
      });
      unclick();
      if (click) {
        clickRef.current ??= makeClick();
        unclickRef.current = scheduleClicks(
          clickRef.current,
          click,
          totalTicks,
          (tick) => `${Math.round(tick * scale())}i`,
        );
      }
      if (starting) {
        transport.ticks = 0;
        transport.start('+0.05');
      }
      setPlaying(true);
    },
    [voiceFor, disposeVoice],
  );

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    unclick();
    voices.current.forEach((voice) => {
      disposePart(voice);
      releaseVoice(voice);
    });
    setPlaying(false);
    setPosition(0);
  }, []);

  /** Where the transport is, in band ticks. */
  const currentTick = useCallback(
    () => Tone.getTransport().ticks / scale(),
    [],
  );

  /** A key played live, heard on `sound` (a capture's monitor). */
  const liveOn = useCallback(
    async (sound: string, midi: number, velocity: number) => {
      if (Tone.getContext().state !== 'running') await Tone.start();
      const voice = await voiceFor({
        id: `${CAPTURE}${sound}`,
        sound,
        notes: [],
        volume: 1,
        muted: false,
      });
      if (!voice) return;
      voice.gain.gain.value = 1;
      voice.adapter.noteOn(midi, velocity);
      voice.sounding.add(midi);
    },
    [voiceFor],
  );
  const liveOff = useCallback((midi: number) => {
    voices.current.forEach((voice, id) => {
      if (!id.startsWith(CAPTURE) || !voice.sounding.has(midi)) return;
      voice.adapter.noteOff(midi);
      voice.sounding.delete(midi);
    });
  }, []);

  /** Levels, mutes and the solo, heard at once. */
  const mix = useCallback((layers: readonly PlayerLayer[]) => {
    layersRef.current = layers;
    layers.forEach((layer) =>
      voices.current.get(layer.id)?.gain.gain.rampTo(gainFor(layer), 0.02),
    );
  }, []);

  const setSolo = useCallback(
    (id: string | null) => {
      soloRef.current = id;
      setSoloState(id);
      mix(layersRef.current);
    },
    [mix],
  );

  /** One note on a layer's sound, as feedback. */
  const audition = useCallback(
    async (layer: PlayerLayer, midi: number, velocity = 96) => {
      if (Tone.getContext().state !== 'running') await Tone.start();
      const voice = await voiceFor({ ...layer, muted: false });
      if (!voice) return;
      voice.gain.gain.value = layer.volume;
      voice.adapter.noteOn(midi, velocity);
      voice.adapter.noteOff(midi, Tone.now() + 0.5);
    },
    [voiceFor],
  );

  /**
   * A synth layer's live engine, made if it isn't yet, so the synth panel
   * can edit what the band plays.
   */
  const synthEngine = useCallback(
    async (layer: PlayerLayer): Promise<SynthEngine | null> => {
      if (Tone.getContext().state !== 'running') await Tone.start();
      const voice = await voiceFor(layer);
      return synthEngineOf(voice?.adapter);
    },
    [voiceFor],
  );

  /**
   * The layer's sound changed name but not patch (a synth patch saved under
   * a new name): keep its voice, which already plays it.
   */
  const renameSound = useCallback((id: string, sound: string) => {
    const voice = voices.current.get(id);
    if (voice) voice.sound = sound;
  }, []);

  /**
   * A sound changed under the same name (a sampled sound given more
   * samples): stop, and let the next play load it again.
   */
  const reloadSound = useCallback(
    (sound: string) => {
      stop();
      [...voices.current.entries()]
        .filter(([, voice]) => voice.sound === sound)
        .forEach(([id]) => disposeVoice(id));
    },
    [stop, disposeVoice],
  );

  // Follow the transport for the playhead while playing.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setPosition(Tone.getTransport().ticks / scale());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Leaving the editor stops everything. Owned here, not in a useMemo.
  useEffect(
    () => () => {
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel();
      transport.loop = false;
      [...voices.current.keys()].forEach(disposeVoice);
      unclickRef.current?.();
      clickRef.current?.dispose();
      clickRef.current = null;
    },
    [disposeVoice],
  );

  return {
    play,
    stop,
    mix,
    setSolo,
    solo,
    audition,
    synthEngine,
    renameSound,
    reloadSound,
    currentTick,
    liveOn,
    liveOff,
    position,
    playing,
    loading,
  };
}
