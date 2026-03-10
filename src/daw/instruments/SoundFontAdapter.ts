import type { InstrumentAdapter } from './InstrumentAdapter';

// ---------------------------------------------------------------------------
// Singleton SpessaSynth worklet synth — shared across all SoundFont tracks.
// Each track claims a MIDI channel (0-15, skipping 9 = drums).
// ---------------------------------------------------------------------------

type WorkletSynth = import('spessasynth_lib').WorkletSynthesizer;
type MaybeNativeContext = AudioContext & { _nativeContext?: AudioContext };
type MaybeNativeAudioNode = AudioNode & { _nativeAudioNode?: AudioNode };
type SynthWithWorklet = WorkletSynth & { worklet?: EventTarget };

/** Race a promise against a timeout — surfaces hangs as errors. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`[SoundFont] TIMEOUT after ${ms}ms: ${label}`)),
        ms,
      ),
    ),
  ]);
}

let sharedSynth: WorkletSynth | null = null;
let synthReady = false;
let synthInitPromise: Promise<void> | null = null;
let nextChannel = 0;

/** Allocate a MIDI channel, skipping channel 9 (GM drums). */
function allocateChannel(): number {
  let ch = nextChannel++ % 16;
  if (ch === 9) ch = nextChannel++ % 16;
  return ch;
}

// ---------------------------------------------------------------------------
// SoundFontAdapter
// ---------------------------------------------------------------------------

export class SoundFontAdapter implements InstrumentAdapter {
  private channel = 0;
  private program: number;
  private outputNode: AudioNode | null = null;
  private activator: ConstantSourceNode | null = null;

  constructor(program: number = 0) {
    this.program = program;
  }

  async init(ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    this.channel = allocateChannel();

    if (!synthInitPromise) {
      synthInitPromise = initSharedSynth(ctx);
    }
    await synthInitPromise;

    this.outputNode = outputNode;

    // standardized-audio-context (used by Tone.js) keeps wrapped nodes in a
    // "passive" state with native output connections disconnected until they
    // receive a connection through the wrapper's .connect() API. SpessaSynth
    // connects at the native level (bypassing the wrapper), so the wrapper
    // never activates the output chain.
    // Fix: a silent ConstantSourceNode connected through the wrapper makes the
    // output node "active", re-establishing all native connections in the chain.
    this.activator = ctx.createConstantSource();
    this.activator!.offset.value = 0;
    this.activator!.start();
    this.activator!.connect(outputNode);

    // SpessaSynth uses the native AudioContext, but DAW nodes are created
    // with standardized-audio-context (Tone.js wrapper). Extract the native
    // AudioNode to ensure cross-context compatibility.
    const nativeOutput =
      (outputNode as MaybeNativeAudioNode)._nativeAudioNode ?? outputNode;
    try {
      sharedSynth!.connect(nativeOutput);
    } catch {
      // Fallback: connect to speakers if cross-context bridge fails
      const nativeCtx: AudioContext =
        (ctx as MaybeNativeContext)._nativeContext ?? ctx;
      sharedSynth!.connect(nativeCtx.destination);
    }

    // Set GM program for this channel
    sharedSynth!.programChange(this.channel, this.program);
  }

  setProgram(program: number): void {
    this.program = program;
    if (sharedSynth && synthReady) {
      sharedSynth.programChange(this.channel, this.program);
    }
  }

  getProgram(): number {
    return this.program;
  }

  getChannel(): number {
    return this.channel;
  }

  noteOn(note: number, velocity: number, _time?: number): void {
    if (!sharedSynth || !synthReady) {
      return;
    }
    sharedSynth.noteOn(this.channel, note, velocity);
  }

  noteOff(note: number, _time?: number): void {
    if (!sharedSynth || !synthReady) return;
    sharedSynth.noteOff(this.channel, note);
  }

  cc(controller: number, value: number, _time?: number): void {
    if (!sharedSynth || !synthReady) return;
    sharedSynth.controllerChange(this.channel, controller as any, value);
  }

  allNotesOff(): void {
    if (sharedSynth) sharedSynth.controllerChange(this.channel, 123, 0);
  }

  panic(): void {
    this.allNotesOff();
  }

  dispose(): void {
    this.allNotesOff();
    if (this.activator) {
      try {
        this.activator.stop();
      } catch {
        /* may already be stopped */
      }
      try {
        this.activator.disconnect();
      } catch {
        /* may already be disconnected */
      }
      this.activator = null;
    }
    if (sharedSynth && this.outputNode) {
      const nativeOutput =
        (this.outputNode as MaybeNativeAudioNode)._nativeAudioNode ??
        this.outputNode;
      try {
        sharedSynth.disconnect(nativeOutput);
      } catch {
        /* may already be disconnected */
      }
    }
    this.outputNode = null;
  }
}

// ---------------------------------------------------------------------------
// Lazy singleton init
// ---------------------------------------------------------------------------

async function initSharedSynth(ctx: AudioContext): Promise<void> {
  // Tone.js v15 uses standardized-audio-context which wraps the native AudioContext.
  // SpessaSynth's WorkletSynthesizer needs the true native AudioContext because
  // the browser's AudioWorkletNode constructor rejects the wrapper.
  const nativeCtx: AudioContext =
    (ctx as MaybeNativeContext)._nativeContext ?? ctx;
  if (nativeCtx.state === 'suspended') {
    await nativeCtx.resume();
  }

  await withTimeout(
    nativeCtx.audioWorklet.addModule(
      '/daw-assets/spessasynth_processor.min.js',
    ),
    10_000,
    'addModule',
  );

  const { WorkletSynthesizer } = await import('spessasynth_lib');

  sharedSynth = new WorkletSynthesizer(nativeCtx);

  // Surface worklet-level errors that would otherwise be silent
  (sharedSynth as SynthWithWorklet).worklet?.addEventListener?.(
    'processorerror',
    (_e: Event) => {},
  );

  await withTimeout(sharedSynth.isReady, 15_000, 'isReady');

  const sfResponse = await withTimeout(
    fetch('/daw-assets/GeneralUser_GS.sf2'),
    30_000,
    'fetch SF2',
  );
  if (!sfResponse.ok)
    throw new Error(`SoundFont fetch failed: ${sfResponse.status}`);
  const sfData = await sfResponse.arrayBuffer();

  await withTimeout(
    sharedSynth.soundBankManager.addSoundBank(sfData, 'gm'),
    30_000,
    'addSoundBank',
  );

  // Don't connect to destination — each SoundFontAdapter instance will
  // connect the shared synth to its track's outputNode so audio flows
  // through the DAW's per-track effect chain and mastering chain.

  synthReady = true;
}
