/**
 * useBackingTrack.ts — Multi-track backing engine for play-along activities.
 *
 * Sound engine (in priority order):
 *   1. Real instruments — DrumMachineEngine + SamplerInstrument + epSamplerV2
 *      All accept time parameter — sample-accurate scheduling
 *   2. SF2 fallback — SoundFontAdapter (if real engines fail)
 *   3. Tone.js synths — last resort
 *
 * Note patterns: backingPatterns.ts (v10 engine proven in Logic Pro).
 * Rules encoded:
 *   - Never 4+ consecutive 16th notes on kick (validated globally)
 *   - Approach always precedes goal (atomic cells)
 *   - Max 4 chromatic approaches per 4-bar phrase
 *   - Structured 4-bar loop, max 1 variation in bars 5-8
 *   - Double chromatic above: 33% at cadence bars only
 */

import { useRef, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { startTone } from '@/audio/core/toneBridge';
import { DrumMachineEngine } from '../../daw/instruments/DrumMachineEngine';
// Bass uses direct Tone.Sampler for triggerAttackRelease (self-contained per note)
import { SoundFontAdapter } from '../../daw/instruments/SoundFontAdapter';
import { buildBackingNotes } from '../engine/genreGeneration/backingPatterns';
import {
  startEpSampler,
  triggerEpAttackRelease,
} from '../engine/genreGeneration/epSamplerV2';
import type { GenreNoteEvent } from '../engine/genreGeneration/resolveStepContent';
import type { ActivityStepV2 } from '../types/activity.v2';

// ── Bass sampler config (public/samples/bass-electric/) ─────────────────────

const BASS_ELECTRIC_CONFIG = {
  baseUrl: '/samples/bass-electric/',
  sampleMap: {
    'A#1': 'As1.mp3',
    'C#1': 'Cs1.mp3',
    E1: 'E1.mp3',
    G1: 'G1.mp3',
    'A#2': 'As2.mp3',
    'C#2': 'Cs2.mp3',
    E2: 'E2.mp3',
    G2: 'G2.mp3',
    'A#3': 'As3.mp3',
    'C#3': 'Cs3.mp3',
    E3: 'E3.mp3',
    G3: 'G3.mp3',
    'A#4': 'As4.mp3',
    'C#4': 'Cs4.mp3',
    E4: 'E4.mp3',
    G4: 'G4.mp3',
    'C#5': 'Cs5.mp3',
  },
};

// ── Hook ────────────────────────────────────────────────────────────────────

export function useBackingTrack(tempo: number) {
  const partsRef = useRef<Record<string, Tone.Part | undefined>>({});
  const isPlayingRef = useRef(false);

  // Real instrument engines
  const drumEngineRef = useRef<DrumMachineEngine | null>(null);
  const bassSamplerRef = useRef<Tone.Sampler | null>(null); // direct Tone.js Sampler
  const bassBridgeRef = useRef<Tone.Gain | null>(null);
  const drumBridgeRef = useRef<Tone.Gain | null>(null);
  const enginesReady = useRef(false);
  const enginesLoading = useRef(false);

  // SF2 fallback
  const sf2BassRef = useRef<SoundFontAdapter | null>(null);
  const sf2ChordsRef = useRef<SoundFontAdapter | null>(null);
  const sf2Ready = useRef(false);
  const sf2LoadingRef = useRef(false);
  const sf2NoteOffTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Pop chord voice — a warm detuned-saw pad/strings synth, used instead of
  // the electric piano sampler for any Pop backing. Plain Tone.js (not the
  // SF2/spessasynth path) — sample-accurate scheduling, no extra assets.
  const popPadSynthRef = useRef<Tone.PolySynth | null>(null);

  // Tone.js last resort
  const kickSynthRef = useRef<Tone.MembraneSynth | null>(null);
  const snareSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const hihatSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const bassSynthRef = useRef<Tone.MonoSynth | null>(null);
  const chordSynthRef = useRef<Tone.PolySynth | null>(null);

  const ensureFallbackSynths = useCallback(() => {
    if (!kickSynthRef.current) {
      kickSynthRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 5,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        volume: -4,
      }).toDestination();
    }
    if (!snareSynthRef.current) {
      snareSynthRef.current = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
        volume: -6,
      }).toDestination();
    }
    if (!hihatSynthRef.current) {
      hihatSynthRef.current = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 },
        volume: -12,
      }).toDestination();
    }
    if (!bassSynthRef.current) {
      bassSynthRef.current = new Tone.MonoSynth({
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
        oscillator: { type: 'triangle' },
        filterEnvelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.2,
          baseFrequency: 200,
          octaves: 2,
        },
        volume: -6,
      }).toDestination();
    }
    if (!chordSynthRef.current) {
      chordSynthRef.current = new Tone.PolySynth(Tone.Synth, {
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
        oscillator: { type: 'triangle' },
        volume: -10,
      }).toDestination();
    }
  }, []);

  // ── initSF2 (name preserved so GenreLessonContainerV2 needs no changes) ──

  const initSF2 = useCallback(async (): Promise<boolean> => {
    if (enginesReady.current) return true;
    if (enginesLoading.current) return false;
    enginesLoading.current = true;

    try {
      await startTone();
      const ctx = Tone.getContext().rawContext as AudioContext;

      // Bridge Tone.js Gain nodes route through standardized-audio-context
      // so SamplerInstrument/DrumMachineEngine audio reaches speakers.
      // (native AudioNode passed directly can be silent due to wrapper mismatch)
      drumBridgeRef.current = new Tone.Gain(1.38).toDestination();
      bassBridgeRef.current = new Tone.Gain(0.9).toDestination();

      // DrumMachineEngine — real .wav samples (kick, snare, hihat, etc.)
      try {
        drumEngineRef.current = new DrumMachineEngine();
        await drumEngineRef.current.init(
          ctx,
          drumBridgeRef.current.input as unknown as AudioNode,
        );
      } catch (drumErr) {
        console.warn('[useBackingTrack] DrumMachineEngine failed:', drumErr);
        drumEngineRef.current = null;
      }

      // Direct Tone.js Sampler for bass — using triggerAttackRelease
      // which is self-contained per note (no voice collision issues)
      await new Promise<void>((resolve) => {
        bassSamplerRef.current = new Tone.Sampler({
          urls: BASS_ELECTRIC_CONFIG.sampleMap,
          baseUrl: BASS_ELECTRIC_CONFIG.baseUrl,
          onload: () => resolve(),
        });
        bassSamplerRef.current.connect(bassBridgeRef.current!);
      });

      // EP1 sampler for chord stabs
      await startEpSampler();

      enginesReady.current = true;
      enginesLoading.current = false;
      console.log('[useBackingTrack] Real instruments loaded ✓', {
        drums: !!drumEngineRef.current,
        bassSampler: !!bassSamplerRef.current,
      });
      return true;
    } catch (err) {
      console.warn('[useBackingTrack] Real engines failed, trying SF2...', err);
      enginesLoading.current = false;

      try {
        if (sf2Ready.current) return true;
        if (sf2LoadingRef.current) return false;
        sf2LoadingRef.current = true;
        await startTone();
        const ctx = Tone.getContext().rawContext as AudioContext;
        const out = ctx.destination;
        sf2BassRef.current = new SoundFontAdapter(33);
        sf2ChordsRef.current = new SoundFontAdapter(4);
        await Promise.all([
          sf2BassRef.current.init(ctx, out),
          sf2ChordsRef.current.init(ctx, out),
        ]);
        sf2Ready.current = true;
        sf2LoadingRef.current = false;
        return true;
      } catch (sf2Err) {
        console.warn(
          '[useBackingTrack] SF2 also failed, using Tone.js synths',
          sf2Err,
        );
        sf2LoadingRef.current = false;
        ensureFallbackSynths();
        return false;
      }
    }
  }, [ensureFallbackSynths]);

  // ── Pop pad/strings voice ────────────────────────────────────────────────

  const ensurePopPad = useCallback((): boolean => {
    if (!popPadSynthRef.current) {
      popPadSynthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
        envelope: { attack: 0.4, decay: 0.3, sustain: 0.85, release: 1.4 },
        volume: -16,
      }).toDestination();
    }
    return true;
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      drumEngineRef.current?.dispose();
      bassSamplerRef.current?.dispose();
      drumBridgeRef.current?.dispose();
      bassBridgeRef.current?.dispose();
      kickSynthRef.current?.dispose();
      snareSynthRef.current?.dispose();
      hihatSynthRef.current?.dispose();
      bassSynthRef.current?.dispose();
      chordSynthRef.current?.dispose();
      sf2BassRef.current?.dispose();
      sf2ChordsRef.current?.dispose();
      popPadSynthRef.current?.dispose();
      drumEngineRef.current = null;
      bassSamplerRef.current = null;
      drumBridgeRef.current = null;
      bassBridgeRef.current = null;
      kickSynthRef.current = null;
      snareSynthRef.current = null;
      hihatSynthRef.current = null;
      bassSynthRef.current = null;
      chordSynthRef.current = null;
      sf2BassRef.current = null;
      sf2ChordsRef.current = null;
      popPadSynthRef.current = null;
    };
  }, []);

  const disposeAll = useCallback(() => {
    Object.values(partsRef.current).forEach((part) => {
      if (part) {
        try {
          part.stop(0);
        } catch {
          /* ignore negative time rounding */
        }
        part.dispose();
      }
    });
    partsRef.current = {};
    sf2NoteOffTimers.current.forEach(clearTimeout);
    sf2NoteOffTimers.current = [];
    drumEngineRef.current?.allNotesOff();
    bassSamplerRef.current?.releaseAll();
    sf2BassRef.current?.allNotesOff();
    sf2ChordsRef.current?.allNotesOff();
    popPadSynthRef.current?.releaseAll();
  }, []);

  const stopBacking = useCallback(() => {
    isPlayingRef.current = false;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().loop = false;
    disposeAll();
  }, [disposeAll]);

  // ── startBacking ──────────────────────────────────────────────────────────

  const startBacking = useCallback(
    async (
      step: ActivityStepV2,
      keyRoot: number,
      level: number = 1,
      styleRef: string = 'l1a',
      targetNotes: GenreNoteEvent[] = [],
      preStartCallback?: () => Promise<void>,
      genre: string = 'funk',
      countInTicks: number = 0,
    ) => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      disposeAll();
      await startTone();
      ensureFallbackSynths();
      const usePopPad = genre === 'pop' && ensurePopPad();

      Tone.getTransport().bpm.value = tempo;
      Tone.getTransport().loop = false;

      const useReal = enginesReady.current;
      const useSF2 = sf2Ready.current;
      const spt = 60 / (tempo * 480); // seconds per tick

      const allNotes = buildBackingNotes(
        step,
        keyRoot,
        level,
        styleRef,
        targetNotes,
        genre,
        countInTicks,
      );

      // Dev verification
      if (import.meta.env.DEV) {
        const kicks = allNotes
          .filter((n) => n.note === 36)
          .map((n) => n.onset)
          .sort((a, b) => a - b);
        let maxRun = 1,
          run = 1;
        for (let i = 1; i < kicks.length; i++) {
          run = kicks[i] - kicks[i - 1] <= 130 ? run + 1 : 1;
          maxRun = Math.max(maxRun, run);
        }
        console.assert(maxRun < 4, `[drums] kick run of ${maxRun}`);
        console.log(
          `[backing] ${allNotes.length} notes, max kick run: ${maxRun}`,
        );
      }

      // ── Drums ─────────────────────────────────────────────────────────────
      const drumEvents = allNotes
        .filter((n) => n.part === 'drums')
        .map((n) => ({
          time: n.onset * spt,
          note: n.note,
          velocity: n.velocity,
        }));

      if (drumEvents.length) {
        const drumPart = new Tone.Part(
          (time, value: { note: number; velocity: number }) => {
            if (useReal && drumEngineRef.current) {
              drumEngineRef.current.noteOn(value.note, value.velocity, time);
            } else {
              const vel = value.velocity / 127;
              if (value.note === 36)
                kickSynthRef.current?.triggerAttackRelease(
                  'C1',
                  '8n',
                  time,
                  vel,
                );
              else if (value.note === 38)
                snareSynthRef.current?.triggerAttackRelease('16n', time, vel);
              else if (value.note === 42) {
                // Closed hat chokes any sustaining open hat
                hihatSynthRef.current?.triggerRelease(time);
                hihatSynthRef.current?.triggerAttackRelease('32n', time, vel);
              } else if (value.note === 46)
                hihatSynthRef.current?.triggerAttackRelease(
                  '16n',
                  time,
                  vel * 0.8,
                );
            }
          },
          drumEvents,
        );
        drumPart.start(0);
        partsRef.current.drums = drumPart;
      }

      // ── Bass ──────────────────────────────────────────────────────────────
      // Two-voice alternating system (like index/middle finger plucking).
      // For 16th note pickups followed immediately by another note:
      //   - NO noteOff — the next noteOn on the SAME voice stops the string
      //   - This is how a real bass player works: new pluck kills old vibration
      // For notes with space after them: normal noteOff for clean cutoff.
      const rawBass = allNotes
        .filter((n) => n.part === 'bass')
        .sort((a, b) => a.onset - b.onset);

      // For each bass note, compute the duration it should actually sound.
      // If a 16th note is immediately followed by another note, its sounding
      // duration extends to the onset of the next note (the new pluck cuts
      // the string, like a real bass player).
      const IMMEDIATE_TICKS = 130; // just over one 16th (120t)
      const bassEvents = rawBass.map((n, i) => {
        const next = rawBass[i + 1];
        const isPickup =
          next != null && next.onset - n.onset <= IMMEDIATE_TICKS;
        // Pickup 16th: ring until next note starts (next pluck kills the string)
        // Normal note: use written duration
        const soundDur = isPickup ? next!.onset - n.onset : n.duration;
        return {
          time: n.onset * spt,
          note: n.note,
          velocity: n.velocity,
          durationSec: soundDur * spt,
          durationMs: soundDur * spt * 1000,
        };
      });

      if (bassEvents.length) {
        const bassPart = new Tone.Part(
          (
            time,
            value: {
              note: number;
              velocity: number;
              durationSec: number;
              durationMs: number;
            },
          ) => {
            if (useReal && bassSamplerRef.current) {
              // triggerAttackRelease is self-contained: each call creates its
              // own buffer source with its own stop timer. No voice collision.
              const noteName = Tone.Frequency(value.note, 'midi').toNote();
              bassSamplerRef.current.triggerAttackRelease(
                noteName,
                value.durationSec,
                time,
                value.velocity / 127,
              );
            } else if (useSF2 && sf2BassRef.current) {
              Tone.getDraw().schedule(() => {
                sf2BassRef.current!.noteOn(value.note, value.velocity);
                const t = setTimeout(
                  () => sf2BassRef.current?.noteOff(value.note),
                  value.durationMs,
                );
                sf2NoteOffTimers.current.push(t);
              }, time);
            } else {
              bassSynthRef.current?.triggerAttackRelease(
                Tone.Frequency(value.note, 'midi').toNote(),
                value.durationSec,
                time,
              );
            }
          },
          bassEvents,
        );
        bassPart.start(0);
        partsRef.current.bass = bassPart;
      }

      // ── Chords ────────────────────────────────────────────────────────────
      const chordEvents = allNotes
        .filter((n) => n.part === 'chords')
        .map((n) => ({
          time: n.onset * spt,
          note: n.note,
          velocity: n.velocity,
          durationSec: n.duration * spt,
          durationMs: n.duration * spt * 1000,
        }));

      if (chordEvents.length) {
        const chordPart = new Tone.Part(
          (
            time,
            value: {
              note: number;
              velocity: number;
              durationSec: number;
              durationMs: number;
            },
          ) => {
            if (usePopPad && popPadSynthRef.current) {
              // Pop chords use a pad/strings synth, never the electric piano
              popPadSynthRef.current.triggerAttackRelease(
                Tone.Frequency(value.note, 'midi').toNote(),
                value.durationSec,
                time,
                value.velocity / 127,
              );
            } else if (useReal) {
              // epSamplerV2 — FluidR3 EP1, sample-accurate with time param
              void triggerEpAttackRelease(
                Tone.Frequency(value.note, 'midi').toNote(),
                value.durationSec,
                value.velocity,
                time,
              );
            } else if (useSF2 && sf2ChordsRef.current) {
              Tone.getDraw().schedule(() => {
                sf2ChordsRef.current!.noteOn(value.note, value.velocity);
                const t = setTimeout(
                  () => sf2ChordsRef.current?.noteOff(value.note),
                  value.durationMs,
                );
                sf2NoteOffTimers.current.push(t);
              }, time);
            } else {
              chordSynthRef.current?.triggerAttackRelease(
                Tone.Frequency(value.note, 'midi').toNote(),
                value.durationSec,
                time,
              );
            }
          },
          chordEvents,
        );
        chordPart.start(0);
        partsRef.current.chords = chordPart;
      }

      if (preStartCallback) await preStartCallback();
      Tone.getTransport().start('+0.1');
      isPlayingRef.current = true;
    },
    [tempo, disposeAll, ensureFallbackSynths],
  );

  return {
    startBacking,
    stopBacking,
    initSF2,
    sf2Ready: enginesReady.current || sf2Ready.current,
  };
}
