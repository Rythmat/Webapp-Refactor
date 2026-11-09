// ── ma-dynamics: the gate, the sidechain ducker and an envelope follower ────
// One AudioWorkletProcessor, three modes (processorOptions.mode):
//
//   'gate'     input 0 → output, gained by a sample-accurate gate: it opens
//              while the input's peak over the last DETECT_WINDOW samples is
//              at or above `threshold`, stays open for `hold` seconds after,
//              then falls to −`range` dB. The gain glides with a time
//              constant of attack/3 opening and release/3 closing (the old
//              main-thread gate's curve, without its 16 ms poll).
//   'ducker'   input 0 (signal) × gain, keyed by input 1 (the key track):
//              while the key's peak is at or above `threshold` the reduction
//              moves toward `amount` (attack), else back to 0 (release).
//   'follower' input 0's RMS over DETECT_WINDOW samples, × sensitivity × 10,
//              capped at 1 and smoothed (attack rising, decay falling); the
//              envelope (0–1) is the output, a control signal for the wah.
//
// The parameters are k-rate AudioParams, so an offline render that sets them
// before it starts hears them from its first sample. The gate and the ducker
// post their gain reduction ({type:'gr', db}) about 30 times a second while
// it changes. A {type:'dispose'} message makes process() return false.

/* global sampleRate */

const DETECT_WINDOW = 256; // the old analysers' window, in samples
const REPORT_HZ = 30;

function dbToGain(db) {
  return Math.pow(10, db / 20);
}

/** The per-sample coefficient of a one-pole glide with time constant `tau` s. */
function onePole(tau, rate) {
  return 1 - Math.exp(-1 / (Math.max(1e-6, tau) * rate));
}

class DynamicsProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = 'k-rate';
    return [
      {
        name: 'threshold',
        defaultValue: -40,
        minValue: -120,
        maxValue: 0,
        automationRate: k,
      },
      {
        name: 'range',
        defaultValue: 40,
        minValue: 0,
        maxValue: 120,
        automationRate: k,
      },
      {
        name: 'hold',
        defaultValue: 0.01,
        minValue: 0,
        maxValue: 5,
        automationRate: k,
      },
      {
        name: 'attack',
        defaultValue: 0.001,
        minValue: 0,
        maxValue: 5,
        automationRate: k,
      },
      {
        name: 'release',
        defaultValue: 0.1,
        minValue: 0,
        maxValue: 10,
        automationRate: k,
      },
      {
        name: 'amount',
        defaultValue: 0.3,
        minValue: 0,
        maxValue: 1,
        automationRate: k,
      },
      {
        name: 'sensitivity',
        defaultValue: 5,
        minValue: 0,
        maxValue: 100,
        automationRate: k,
      },
    ];
  }

  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.mode =
      opts.mode === 'ducker' || opts.mode === 'follower' ? opts.mode : 'gate';
    this.alive = true;
    // Gate: whether it is open, samples since the detector last saw a peak
    // over the threshold, hold samples left, and the current gain.
    this.open = true;
    this.sinceAbove = DETECT_WINDOW;
    this.holdLeft = 0;
    this.gain = 1;
    // The gain the last block ended on, for the reports.
    this.reduction = 1;
    // Ducker: the reduction envelope, 0 (none) to `amount`.
    this.env = 0;
    // Follower: a ring of squared samples and their running sum.
    this.squares = new Float32Array(DETECT_WINDOW);
    this.squareAt = 0;
    this.squareSum = 0;
    this.level = 0;
    // Gain-reduction reports.
    this.reportEvery = Math.max(128, Math.round(sampleRate / REPORT_HZ));
    this.sinceReport = 0;
    this.lastReported = 0;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'dispose') {
        this.alive = false;
        this.port.onmessage = null;
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.alive) return false;
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const frames = output[0].length;
    if (this.mode === 'follower') {
      this.follow(inputs[0], output, frames, parameters);
      return true;
    }
    const gains =
      this.mode === 'gate'
        ? this.gateGains(inputs[0], frames, parameters)
        : this.duckGains(inputs[1], frames, parameters);
    const input = inputs[0];
    for (let ch = 0; ch < output.length; ch++) {
      const out = output[ch];
      // A mono input feeds every output channel (the up-mix a stereo node
      // after it would make anyway); no input is silence.
      const src =
        input && input.length > 0
          ? input[Math.min(ch, input.length - 1)]
          : null;
      if (!src) {
        out.fill(0);
        continue;
      }
      for (let i = 0; i < frames; i++) out[i] = src[i] * gains[i];
    }
    this.report(frames);
    return true;
  }

  /** The gate's gain for each sample of this block. */
  gateGains(input, frames, p) {
    const gains = this.block(frames);
    const threshold = dbToGain(p.threshold[0]);
    const closed = dbToGain(-p.range[0]);
    const hold = p.hold[0] * sampleRate;
    const openCoeff = onePole(Math.max(0.001, p.attack[0] / 3), sampleRate);
    const closeCoeff = onePole(Math.max(0.005, p.release[0] / 3), sampleRate);
    const channels = input ? input.length : 0;
    for (let i = 0; i < frames; i++) {
      let peak = 0;
      for (let ch = 0; ch < channels; ch++) {
        const a = Math.abs(input[ch][i]);
        if (a > peak) peak = a;
      }
      if (peak >= threshold) this.sinceAbove = 0;
      else if (this.sinceAbove < DETECT_WINDOW) this.sinceAbove++;
      if (this.sinceAbove < DETECT_WINDOW) {
        this.open = true;
        this.holdLeft = hold;
      } else if (this.holdLeft > 0) {
        this.holdLeft--;
      } else {
        this.open = false;
      }
      const target = this.open ? 1 : closed;
      this.gain += (target - this.gain) * (this.open ? openCoeff : closeCoeff);
      gains[i] = this.gain;
    }
    this.reduction = this.gain;
    return gains;
  }

  /** The ducker's gain for each sample of this block, keyed by `key`. */
  duckGains(key, frames, p) {
    const gains = this.block(frames);
    const threshold = dbToGain(p.threshold[0]);
    const amount = p.amount[0];
    const attack = onePole(Math.max(0.001, p.attack[0]), sampleRate);
    const release = onePole(Math.max(0.001, p.release[0]), sampleRate);
    const channels = key ? key.length : 0;
    for (let i = 0; i < frames; i++) {
      let peak = 0;
      for (let ch = 0; ch < channels; ch++) {
        const a = Math.abs(key[ch][i]);
        if (a > peak) peak = a;
      }
      if (peak >= threshold) this.sinceAbove = 0;
      else if (this.sinceAbove < DETECT_WINDOW) this.sinceAbove++;
      const target = this.sinceAbove < DETECT_WINDOW ? amount : 0;
      this.env += (target - this.env) * (target > this.env ? attack : release);
      gains[i] = Math.max(0, 1 - this.env);
    }
    this.reduction = gains[frames - 1];
    return gains;
  }

  /** The follower's envelope, written to the output's first channel. */
  follow(input, output, frames, p) {
    const out = output[0];
    const channels = input ? input.length : 0;
    if (channels === 0) {
      // Bypassed (nothing connected): rest, so it starts from zero again.
      this.level = 0;
      this.squares.fill(0);
      this.squareSum = 0;
      out.fill(0);
      for (let ch = 1; ch < output.length; ch++) output[ch].fill(0);
      return;
    }
    const scale = p.sensitivity[0] * 10;
    const attack = onePole(p.attack[0], sampleRate);
    const decay = onePole(p.release[0], sampleRate);
    for (let i = 0; i < frames; i++) {
      let x = 0;
      for (let ch = 0; ch < channels; ch++) x += input[ch][i];
      x /= channels;
      const sq = x * x;
      this.squareSum += sq - this.squares[this.squareAt];
      this.squares[this.squareAt] = sq;
      this.squareAt++;
      if (this.squareAt === DETECT_WINDOW) {
        // Re-add the window once a lap, so rounding never accumulates.
        this.squareAt = 0;
        let sum = 0;
        for (let j = 0; j < DETECT_WINDOW; j++) sum += this.squares[j];
        this.squareSum = sum;
      }
      const rms = Math.sqrt(Math.max(0, this.squareSum) / DETECT_WINDOW);
      const target = Math.min(1, rms * scale);
      this.level +=
        (target - this.level) * (target > this.level ? attack : decay);
      out[i] = this.level;
    }
    for (let ch = 1; ch < output.length; ch++) output[ch].set(out);
  }

  /** A scratch buffer of `frames` gains. */
  block(frames) {
    if (!this.gains || this.gains.length !== frames)
      this.gains = new Float32Array(frames);
    return this.gains;
  }

  /** Posts the gain reduction (dB, ≤ 0) about REPORT_HZ times a second. */
  report(frames) {
    this.sinceReport += frames;
    if (this.sinceReport < this.reportEvery) return;
    this.sinceReport = 0;
    const db = 20 * Math.log10(Math.max(1e-4, this.reduction));
    if (Math.abs(db - this.lastReported) < 0.05) return;
    this.lastReported = db;
    this.port.postMessage({ type: 'gr', db });
  }
}

// The module can reach one AudioWorkletGlobalScope twice (through Tone's
// wrapper and on its native context); the second registration would throw
// and fail that load, so the name already being there is fine.
try {
  registerProcessor('ma-dynamics', DynamicsProcessor);
} catch (err) {
  if (!err || err.name !== 'NotSupportedError') throw err;
}
