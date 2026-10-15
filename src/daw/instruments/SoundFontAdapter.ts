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
// Channels held by live SoundFont tracks. Each track's GM program lives on its
// channel in the shared synth, so two tracks on one channel overwrite each
// other's sound — channels are handed back on dispose and reused.
const channelsInUse = new Set<number>();
let nextChannel = 0;

/** Allocate a free MIDI channel, skipping channel 9 (GM drums). With all 15
 *  taken (16+ SoundFont tracks), channels are shared round-robin. */
function allocateChannel(): number {
  for (let i = 0; i < 16; i++) {
    const ch = (nextChannel + i) % 16;
    if (ch === 9 || channelsInUse.has(ch)) continue;
    channelsInUse.add(ch);
    nextChannel = (ch + 1) % 16;
    return ch;
  }
  let ch = nextChannel++ % 16;
  if (ch === 9) ch = nextChannel++ % 16;
  return ch;
}

function releaseChannel(ch: number): void {
  channelsInUse.delete(ch);
}

// ---------------------------------------------------------------------------
// SoundFontAdapter
// ---------------------------------------------------------------------------

export class SoundFontAdapter implements InstrumentAdapter {
  private channel = 0;
  private hasChannel = false;
  private program: number;
  // The native node this adapter's channel output is wired to (the track
  // input, or the speakers when that bridge failed), so dispose undoes it.
  private connectedNode: AudioNode | null = null;
  private activator: ConstantSourceNode | null = null;

  constructor(program: number = 0) {
    this.program = program;
  }

  async init(ctx: AudioContext, outputNode: AudioNode): Promise<void> {
    this.channel = allocateChannel();
    this.hasChannel = true;
    try {
      await this.attach(ctx, outputNode);
    } catch (err) {
      // Hand the channel back. An export's offline graph is out of the live
      // synth's reach, so every bounce fails here; keeping the channel would
      // use one up per export until live tracks had to share channels, and
      // tracks on one channel hear each other.
      this.release();
      throw err;
    }
  }

  private async attach(
    ctx: AudioContext,
    outputNode: AudioNode,
  ): Promise<void> {
    if (!synthInitPromise) {
      synthInitPromise = initSharedSynth(ctx);
    }
    await synthInitPromise;

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
    // Only this track's channel: the synth's connect() wires all 17 worklet
    // outputs, so every SoundFont track would also play every other one's
    // notes (and mute/solo/FX couldn't isolate it).
    try {
      sharedSynth!.connectChannel(nativeOutput, this.channel);
      this.connectedNode = nativeOutput;
    } catch {
      // Fallback: connect to speakers if cross-context bridge fails
      const nativeCtx: AudioContext =
        (ctx as MaybeNativeContext)._nativeContext ?? ctx;
      sharedSynth!.connectChannel(nativeCtx.destination, this.channel);
      this.connectedNode = nativeCtx.destination;
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

  noteOn(note: number, velocity: number, time?: number): void {
    if (!sharedSynth || !synthReady) {
      return;
    }
    sharedSynth.noteOn(
      this.channel,
      note,
      velocity,
      time !== undefined ? { time } : undefined,
    );
  }

  noteOff(note: number, time?: number): void {
    if (!sharedSynth || !synthReady) return;
    sharedSynth.noteOff(
      this.channel,
      note,
      time !== undefined ? { time } : undefined,
    );
  }

  cc(controller: number, value: number, time?: number): void {
    if (!sharedSynth || !synthReady) return;
    sharedSynth.controllerChange(
      this.channel,
      controller as any,
      value,
      time !== undefined ? { time } : undefined,
    );
  }

  pitchBend(value: number, time?: number): void {
    if (!sharedSynth || !synthReady) return;
    // -1…+1 → 14-bit MIDI pitch wheel (0…16383, centre 8192)
    const raw = Math.min(16383, Math.max(0, Math.round((value + 1) * 8192)));
    sharedSynth.pitchWheel(
      this.channel,
      raw,
      time !== undefined ? { time } : undefined,
    );
  }

  allNotesOff(): void {
    if (sharedSynth) sharedSynth.controllerChange(this.channel, 123, 0);
  }

  panic(): void {
    this.allNotesOff();
  }

  dispose(): void {
    this.allNotesOff();
    this.release();
  }

  /** Unwire the channel output and hand back the channel and activator. */
  private release(): void {
    // Undo only this channel's wire: disconnect(node) would cut every output
    // to that node, silencing another adapter that shares it (the Learn
    // backing track points both of its adapters at the speakers).
    if (sharedSynth && this.connectedNode) {
      try {
        sharedSynth.disconnectChannel(this.connectedNode, this.channel);
      } catch {
        /* may already be disconnected */
      }
    }
    this.connectedNode = null;
    if (this.hasChannel) {
      releaseChannel(this.channel);
      this.hasChannel = false;
    }
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

  // Tracks take only their own channel's dry output, so nothing listens to
  // the synth-wide GS reverb/chorus output any more: switch the effects off
  // rather than render them unheard. Reverb comes from the DAW's own track
  // FX and return buses.
  sharedSynth.setSystemParameter('effectsEnabled', false);

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

  // Don't connect to destination — each SoundFontAdapter instance connects
  // its own channel of the shared synth to its track's output node, so audio
  // flows through the DAW's per-track effect chain and mastering chain.

  synthReady = true;
}
