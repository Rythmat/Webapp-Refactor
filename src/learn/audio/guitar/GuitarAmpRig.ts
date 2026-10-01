/**
 * GuitarAmpRig.ts — The Studio's guitar rig, set up for a lesson.
 *
 * One GuitarFxAdapter (the Studio's guitar track instrument) on the app's
 * shared AudioContext, playing into the lesson output at the lesson volume.
 * It carries both directions of guitar sound: the student's live input (with
 * the chord analyser and clean pitch tap Studio's detection reads, and
 * optional monitoring through the amp) and the lesson's own guitar, which the
 * string voice plays into the amp's input.
 *
 * The chain is the Studio's default for a new guitar track — one NAM amp
 * block — with the amp from the guitar tone prefs. The amp stays bypassed
 * until its model has loaded: before that, NamAmpPedal would fall back to its
 * classic waveshaper, which is heavily driven at the default settings.
 *
 * One rig per session, shared by whoever needs it (guitar voice, input
 * engine): acquireGuitarAmpRig() / releaseGuitarAmpRig(), torn down on the
 * last release. Never closes the shared context.
 */

import { audioContextOwner } from '@/audio/core/AudioContextOwner';
import { mixer } from '@/audio/core/Mixer';
import type { NamModelFile } from '@/daw/audio/nam/NamModelParser';
import { fetchBundledModel } from '@/daw/audio/nam/NamModelStore';
import type { PedalBlockDescriptor } from '@/daw/audio/pedals/PedalProcessor';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { getAudioInputs } from '@/daw/midi/AudioInputEnumerator';
import { getLessonVolume, subscribeLessonVolume } from '../lessonVolumeStore';
import {
  GUITAR_AMP_MODELS,
  getGuitarTonePrefs,
  subscribeGuitarTonePrefs,
} from './guitarTonePrefs';
import type { GuitarInputRig } from './types';

/**
 * The amp block's params on a new Studio guitar track (GuitarBassView's
 * DEFAULT_CHAIN, which isn't exported). Keep in step with it.
 */
const STUDIO_AMP_PARAMS: Record<string, number> = {
  inputLevel: 0.5,
  bass: 0.5,
  mid: 0.5,
  treble: 0.5,
  presence: 0.5,
  outputLevel: 0.5,
  volume: 0.7,
};

/** Parsed models, kept so switching back to an amp doesn't re-fetch it. */
const modelCache = new Map<string, Promise<NamModelFile>>();

function fetchModel(url: string): Promise<NamModelFile> {
  let model = modelCache.get(url);
  if (!model) {
    model = fetchBundledModel(url);
    model.catch(() => modelCache.delete(url));
    modelCache.set(url, model);
  }
  return model;
}

/** The browser's default input where it names one, else the first. */
async function defaultInputId(): Promise<string | null> {
  const inputs = await getAudioInputs();
  return (inputs.find((d) => d.id === 'default') ?? inputs[0])?.id ?? null;
}

class GuitarAmpRig implements GuitarInputRig {
  private disposed = false;
  /** The amp last asked for (null = bypass); undefined before the first. */
  private wantedModelId: string | null | undefined;
  private loadedModelId: string | null = null;
  /** Model changes run one at a time, so the last one asked for wins. */
  private applying: Promise<void> = Promise.resolve();
  private readonly unsubscribers: (() => void)[];

  private constructor(
    readonly context: AudioContext,
    private readonly adapter: GuitarFxAdapter,
    private readonly output: GainNode,
  ) {
    this.unsubscribers = [
      subscribeLessonVolume(() => {
        output.gain.setTargetAtTime(
          getLessonVolume(),
          context.currentTime,
          0.01,
        );
      }),
      subscribeGuitarTonePrefs(() => this.followPrefs()),
    ];
  }

  static async create(): Promise<GuitarAmpRig> {
    const context = audioContextOwner.get();
    // The piano sampler's gain is linear in the lesson dial; so is this.
    const output = mixer.channel('instruments', getLessonVolume());
    const adapter = new GuitarFxAdapter();
    try {
      // The shared context is native, so no standardized-audio-context
      // unwrapping is needed: the adapter's _native* lookups fall through.
      await adapter.init(context, output);
    } catch (err) {
      adapter.dispose();
      output.disconnect();
      throw err;
    }
    // Hearing yourself through the amp is opt-in (headphones only).
    adapter.setMonitoring(false);
    const rig = new GuitarAmpRig(context, adapter, output);
    rig.syncAmp(false);
    rig.followPrefs();
    return rig;
  }

  async setDevice(
    deviceId: string | null,
    channelCount?: number,
  ): Promise<void> {
    const id = deviceId ?? (await defaultInputId());
    if (id === null) throw new Error('No audio input found');
    await this.adapter.setDevice(id, channelCount);
    // The adapter logs and swallows a failed open; forget the device so the
    // next attempt asks again, and let the caller know.
    if (!this.adapter.getPitchDetectSourceNode()) {
      await this.adapter.setDevice(null);
      throw new Error('Could not open the audio input');
    }
    // A new device gets a new input stage: trim it as before.
    this.setInputTrim(this.trimDb);
  }

  setChannel(channel: number): void {
    this.adapter.setChannelConfig({ mode: 'mono', channel });
  }

  private trimDb = 0;

  /**
   * The adapter's channel stage feeds its analysers, the pedals and amp, and
   * the monitor alike, so trim applies there: everything hears the same
   * level the setup's meter shows.
   */
  setInputTrim(db: number): void {
    this.trimDb = Number.isFinite(db) ? db : 0;
    const gain = (this.adapter.getPitchDetectSourceNode() as GainNode | null)
      ?.gain;
    if (typeof gain?.setTargetAtTime === 'function') {
      gain.setTargetAtTime(
        10 ** (this.trimDb / 20),
        this.context.currentTime,
        0.02,
      );
    }
  }

  setMonitoring(enabled: boolean): void {
    this.adapter.setMonitoring(enabled);
  }

  getChordAnalyserNode(): AnalyserNode | null {
    return this.adapter.getChordAnalyserNode();
  }

  getPitchDetectSourceNode(): AudioNode | null {
    return this.adapter.getPitchDetectSourceNode();
  }

  getInputLevel(): number {
    return this.adapter.getInputLevel();
  }

  getPlaybackInputNode(): AudioNode | null {
    return this.adapter.getNativePedalInputNode();
  }

  setAmpModel(modelId: string | null): Promise<void> {
    if (modelId === this.wantedModelId) return this.applying;
    this.wantedModelId = modelId;
    this.applying = this.applying
      .catch(() => {})
      .then(() => this.applyAmpModel(modelId));
    return this.applying;
  }

  /** Teardown for the last release; callers use releaseGuitarAmpRig(). */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.adapter.dispose();
    this.output.disconnect();
  }

  private followPrefs(): void {
    this.setAmpModel(getGuitarTonePrefs().ampModelId).catch((err: unknown) => {
      console.warn('[GuitarAmpRig] amp model failed to load:', err);
    });
  }

  private async applyAmpModel(modelId: string | null): Promise<void> {
    // Superseded while it waited its turn.
    if (this.disposed || modelId !== this.wantedModelId) return;
    if (modelId === null) {
      this.syncAmp(false);
      return;
    }
    try {
      if (modelId !== this.loadedModelId) {
        const entry = GUITAR_AMP_MODELS.find((m) => m.id === modelId);
        if (!entry?.url) throw new Error(`Unknown guitar amp "${modelId}"`);
        const model = await fetchModel(entry.url);
        if (this.disposed || modelId !== this.wantedModelId) return;
        await this.adapter.loadNamModel(model, entry.gainCompensation);
        this.loadedModelId = modelId;
        // What the Studio does once a model is in.
        this.adapter.setAmpSimMode('nam');
      }
      if (!this.disposed) this.syncAmp(true);
    } catch (err) {
      // Asking for the same amp again should retry, not replay the failure.
      if (this.wantedModelId === modelId) this.wantedModelId = undefined;
      throw err;
    }
  }

  private syncAmp(enabled: boolean): void {
    const block: PedalBlockDescriptor = {
      type: 'nam-amp',
      enabled,
      params: STUDIO_AMP_PARAMS,
      namModelId: this.loadedModelId,
    };
    this.adapter.syncChain([block]);
  }
}

let shared: Promise<GuitarAmpRig> | null = null;
let refs = 0;

/**
 * The session's guitar rig, built on first use. Each acquire that resolves
 * must be paired with one releaseGuitarAmpRig(); one that rejects must not.
 */
export async function acquireGuitarAmpRig(): Promise<GuitarInputRig> {
  refs += 1;
  shared ??= GuitarAmpRig.create();
  const pending = shared;
  try {
    return await pending;
  } catch (err) {
    refs -= 1;
    if (shared === pending) shared = null;
    throw err;
  }
}

/** Give back one acquire; the last one tears the rig down. */
export function releaseGuitarAmpRig(): void {
  if (refs === 0) return;
  refs -= 1;
  if (refs > 0) return;
  const rig = shared;
  shared = null;
  rig?.then(
    (r) => r.dispose(),
    () => {},
  );
}
