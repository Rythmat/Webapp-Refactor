import { useEffect } from 'react';
import { SynthEngine } from '../audio/SynthEngine';
import { scaleMask } from '../audio/ScaleQuantizer';
import { useSynthStore } from '../store';
import { loadOraclePacks } from '../store/presets/packLoader';
import { shallow } from 'zustand/shallow';
import {
  acquireModIndicatorEngine,
  releaseModIndicatorEngine,
} from './useModIndicator';
import type { KeyScaleParams } from '../store/slices/keyScaleSlice';

function pushKeyScale(engine: SynthEngine, ks: KeyScaleParams): void {
  engine.setKeyScale(scaleMask(ks.rootPc, ks.mode), ks.snapMode, ks.enabled);
}

export function useSyncStoreToEngine(engine: SynthEngine | null) {
  useEffect(() => {
    if (!engine) return;

    // Expose the live engine to the modulation-ring indicator hook
    acquireModIndicatorEngine(engine);

    // Load factory extension packs (idempotent; silent when none installed)
    void loadOraclePacks();

    const unsubs: (() => void)[] = [];

    // Oscillator 1
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.oscillators[0],
        (osc) => {
          engine.setOscillatorParams(0, osc);
          void engine.ensureWavetables([osc.wavetable]);
        },
        { equalityFn: shallow },
      ),
    );

    // Oscillator 2
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.oscillators[1],
        (osc) => {
          engine.setOscillatorParams(1, osc);
          void engine.ensureWavetables([osc.wavetable]);
        },
        { equalityFn: shallow },
      ),
    );

    // Sub oscillator
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.subOscillator,
        (sub) => engine.setSubOscillatorParams(sub),
        { equalityFn: shallow },
      ),
    );

    // Noise
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.noise,
        (noise) => engine.setNoiseParams(noise),
        { equalityFn: shallow },
      ),
    );

    // Filter 1
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.filters[0],
        (flt) => engine.setFilterParams(0, flt),
        { equalityFn: shallow },
      ),
    );

    // Filter 2
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.filters[1],
        (flt) => engine.setFilterParams(1, flt),
        { equalityFn: shallow },
      ),
    );

    // Envelope 1
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.envelopes[0],
        (env) => engine.setEnvelopeParams(0, env),
        { equalityFn: shallow },
      ),
    );

    // Envelope 2
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.envelopes[1],
        (env) => engine.setEnvelopeParams(1, env),
        { equalityFn: shallow },
      ),
    );

    // Master volume
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.masterVolume,
        (vol) => engine.setMasterVolume(vol),
      ),
    );

    // Voice mode
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.voiceMode,
        (mode) => engine.setVoiceMode(mode),
      ),
    );

    // Voice count
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.voiceCount,
        (count) => engine.setVoiceCount(count),
      ),
    );

    // Glide
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.glide,
        (glide) => engine.setGlide(glide),
      ),
    );

    // Spread
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.spread,
        (spread) => engine.setSpread(spread),
      ),
    );

    // Pitch bend
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.pitchBend,
        (val) => engine.setPitchBend(val),
      ),
    );

    // Pitch bend range
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.pitchBendRange,
        (semitones) => engine.setPitchBendRange(semitones),
      ),
    );

    // Mod wheel
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.modWheel,
        (val) => engine.setModWheel(val),
      ),
    );

    // BPM → LFO bar durations
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.bpm,
        (bpm) => engine.setBPM(bpm),
      ),
    );

    // LFO bar nodes + smooth (subscribe to each bar of each LFO)
    for (let lfo = 0; lfo < 4; lfo++) {
      for (let bar = 0; bar < 4; bar++) {
        const li = lfo;
        const bi = bar;
        unsubs.push(
          useSynthStore.subscribe(
            (state) => state.lfos[li].bars[bi],
            (nodes) => engine.setLFONodes(li, bi, nodes),
          ),
        );
        unsubs.push(
          useSynthStore.subscribe(
            (state) => state.lfos[li].smooths[bi],
            (smooth) => engine.setLFOSmooth(li, bi, smooth),
          ),
        );
      }
    }

    // Modulation routes
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.modRoutes,
        (routes) => engine.setModRoutes(routes),
      ),
    );

    // FX: Drive
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.fx.drive,
        (drive) => engine.setDriveParams(drive),
        { equalityFn: shallow },
      ),
    );

    // FX: Chorus
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.fx.chorus,
        (chorus) => engine.setChorusParams(chorus),
        { equalityFn: shallow },
      ),
    );

    // FX: Phaser
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.fx.phaser,
        (phaser) => engine.setPhaserParams(phaser),
        { equalityFn: shallow },
      ),
    );

    // FX: Delay
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.fx.delay,
        (delay) => engine.setDelayParams(delay),
        { equalityFn: shallow },
      ),
    );

    // FX: Reverb
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.fx.reverb,
        (reverb) => engine.setReverbParams(reverb),
        { equalityFn: shallow },
      ),
    );

    // FX: Compressor
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.fx.compressor,
        (comp) => engine.setCompressorParams(comp),
        { equalityFn: shallow },
      ),
    );

    // Routing
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.routing,
        (routing) => engine.setRouting(routing),
        { equalityFn: shallow },
      ),
    );

    // Arpeggiator
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.arp,
        (arp) => engine.setArpParams(arp),
        { equalityFn: shallow },
      ),
    );

    // Macros
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.macros,
        (macros, prev) => {
          for (let i = 0; i < macros.length; i++) {
            if (!prev || macros[i].value !== prev[i]?.value) {
              engine.setMacro(i, macros[i].value);
            }
          }
        },
      ),
    );

    // Key/Scale lock
    unsubs.push(
      useSynthStore.subscribe(
        (state) => state.keyScale,
        (ks) => pushKeyScale(engine, ks),
        { equalityFn: shallow },
      ),
    );

    // Initial sync — subscriptions only fire on changes, not initial values.
    // Push the current store state to the engine so defaults are applied.
    const s = useSynthStore.getState();
    engine.setOscillatorParams(0, s.oscillators[0]);
    engine.setOscillatorParams(1, s.oscillators[1]);
    void engine.ensureWavetables([
      s.oscillators[0].wavetable,
      s.oscillators[1].wavetable,
    ]);
    engine.setSubOscillatorParams(s.subOscillator);
    engine.setNoiseParams(s.noise);
    engine.setFilterParams(0, s.filters[0]);
    engine.setFilterParams(1, s.filters[1]);
    engine.setEnvelopeParams(0, s.envelopes[0]);
    engine.setEnvelopeParams(1, s.envelopes[1]);
    engine.setMasterVolume(s.masterVolume);
    engine.setVoiceMode(s.voiceMode);
    engine.setVoiceCount(s.voiceCount);
    engine.setGlide(s.glide);
    engine.setSpread(s.spread);
    engine.setPitchBendRange(s.pitchBendRange);
    engine.setBPM(s.bpm);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        engine.setLFONodes(i, j, s.lfos[i].bars[j]);
        engine.setLFOSmooth(i, j, s.lfos[i].smooths[j]);
      }
    }
    engine.setModRoutes(s.modRoutes);
    engine.setDriveParams(s.fx.drive);
    engine.setChorusParams(s.fx.chorus);
    engine.setPhaserParams(s.fx.phaser);
    engine.setDelayParams(s.fx.delay);
    engine.setReverbParams(s.fx.reverb);
    engine.setCompressorParams(s.fx.compressor);
    engine.setRouting(s.routing);
    engine.setArpParams(s.arp);
    for (let i = 0; i < s.macros.length; i++) {
      engine.setMacro(i, s.macros[i].value);
    }
    pushKeyScale(engine, s.keyScale);

    return () => {
      releaseModIndicatorEngine(engine);
      unsubs.forEach((fn) => fn());
    };
  }, [engine]);
}
