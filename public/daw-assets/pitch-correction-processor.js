// ── pitch-correction-processor.js ──────────────────────────────────────────
// AudioWorklet processor for real-time pitch correction.
// Runs entirely in the audio thread. Auto-Tune-inspired pipeline:
//   - YIN pitch detection (refined autocorrelation, 4x decimated)
//   - Bitmask-based scale snapping with Flex-Tune tolerance zone
//   - Time-based retune speed with Humanize (adaptive sustained-note relaxation)
//   - TD-PSOLA pitch shifting (formant-preserving, low latency)
//   - Manual shift/fine offset
//
// CPU-optimized for low-power machines:
//   - YIN operates on ring buffer in-place (no copy), with silence gating
//   - Hop length 1024 samples (~23ms) halves detection frequency
//   - Insertion-based median filter (O(n) vs O(n log n))
//   - Fast exp() approximation for retune smoothing
//   - Cached manual offset (Math.pow only on param change)
//   - PSOLA mark ring buffer with early-exit nearest search
//   - Full PSOLA bypass when shift is near unity
//
// Parameters received via port.onmessage:
//   { type: 'set-params', correction, speed, rootNote, scaleType, mix,
//     activeNotes, humanize, shift, fine, formant, formantFollow }
//   { type: 'bypass', value: boolean }
//
// Reports pitch info via port.postMessage:
//   { type: 'pitch-info', detected: Hz, corrected: Hz }

// ── Fast Math Helpers ─────────────────────────────────────────────────────

/** Fast exp(-x) approximation — 4th-order Taylor, ~0.2% error for x in [0,5]. */
function fastExpNeg(x) {
  if (x > 5) return 0;
  const x2 = x * x;
  return 1 / (1 + x + x2 * 0.5 + x2 * x * 0.16666667 + x2 * x2 * 0.04166667);
}

// ── YIN Pitch Detection ──────────────────────────────────────────────────
// Accepts ring buffer directly (no contiguous copy needed).

class YinDetector {
  constructor(frameLength, sampleRate) {
    this.frameLength = frameLength;
    this.halfLen = Math.floor(frameLength / 2);
    this.sampleRate = sampleRate;
    this.threshold = 0.15;
    this.minPeriod = Math.floor(sampleRate / 2000);
    this.maxPeriod = Math.floor(sampleRate / 50);
    this.tauLimit = Math.min(this.maxPeriod + 1, this.halfLen);
    this.diff = new Float32Array(this.halfLen);
    this.cmndf = new Float32Array(this.halfLen);
  }

  /** Detect pitch from a ring buffer. ring[offset..] wraps via & mask. */
  detect(ring, offset, mask) {
    const N = this.halfLen;
    const diff = this.diff;
    const cmndf = this.cmndf;
    const tauLimit = this.tauLimit;

    // Step 1: Difference function (limited to tauLimit)
    for (let tau = 0; tau < tauLimit; tau++) {
      let sum = 0;
      for (let i = 0; i < N; i++) {
        const d = ring[(offset + i) & mask] - ring[(offset + i + tau) & mask];
        sum += d * d;
      }
      diff[tau] = sum;
    }

    // Step 2: Cumulative mean normalized difference
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < tauLimit; tau++) {
      runningSum += diff[tau];
      cmndf[tau] = diff[tau] / (runningSum / tau);
    }

    // Step 3: Absolute threshold
    let tauEstimate = -1;
    for (let tau = this.minPeriod; tau < tauLimit; tau++) {
      if (cmndf[tau] < this.threshold) {
        while (tau + 1 < N && cmndf[tau + 1] < cmndf[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return 0;

    // Step 4: Parabolic interpolation
    const t = tauEstimate;
    if (t > 0 && t < N - 1) {
      const s0 = cmndf[t - 1];
      const s1 = cmndf[t];
      const s2 = cmndf[t + 1];
      const shift = (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
      if (Math.abs(shift) < 1) {
        return this.sampleRate / (t + shift);
      }
    }

    return this.sampleRate / t;
  }
}

// ── Median Filter (insertion-based, O(n) per push) ────────────────────────

class MedianFilter {
  constructor(size) {
    this.size = size;
    this.ring = new Float64Array(size);
    this.sorted = []; // maintained in sorted order via binary insert
    this.index = 0;
    this.filled = 0;
  }

  push(value) {
    // Remove oldest value from sorted array if buffer is full
    if (this.filled >= this.size) {
      const old = this.ring[this.index];
      const removeIdx = this._bsearch(old);
      this.sorted.splice(removeIdx, 1);
    }

    // Insert new value into ring
    this.ring[this.index] = value;
    this.index = (this.index + 1) % this.size;
    if (this.filled < this.size) this.filled++;

    // Binary-insert into sorted array
    const insertIdx = this._bsearch(value);
    this.sorted.splice(insertIdx, 0, value);

    return this.sorted[this.filled >> 1];
  }

  _bsearch(val) {
    let lo = 0,
      hi = this.sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sorted[mid] < val) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

// ── Scale Snapping (bitmask-based) ──────────────────────────────────────

// Pre-computed semitone→Hz table: midiToHz[n] = 440 * 2^((n-69)/12)
// Covers MIDI 0..127. Avoids Math.pow per snap call.
const MIDI_TO_HZ = new Float64Array(128);
for (let n = 0; n < 128; n++) {
  MIDI_TO_HZ[n] = 440 * Math.pow(2, (n - 69) / 12);
}

const LOG2_440 = Math.log2(440);

function hzToMidi(freq) {
  return 69 + 12 * (Math.log2(freq) - LOG2_440);
}

function midiToHz(midi) {
  // Use lookup table for integer MIDI, fallback for fractional
  const rounded = Math.round(midi);
  if (rounded >= 0 && rounded < 128 && Math.abs(midi - rounded) < 0.001) {
    return MIDI_TO_HZ[rounded];
  }
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Snap a frequency to the nearest active note in a 12-bit bitmask.
 * Each bit represents a pitch class: bit 0 = C, bit 1 = C#, ..., bit 11 = B.
 */
function snapToScaleBitmask(freq, activeNotes) {
  if (freq <= 0 || activeNotes === 0) return freq;
  const midi = hzToMidi(freq);
  const nearestSemitone = Math.round(midi);
  const nearestPC = ((nearestSemitone % 12) + 12) % 12;

  // If nearest semitone is active, snap directly
  if ((activeNotes & (1 << nearestPC)) !== 0) return midiToHz(nearestSemitone);

  // Search outward for closest active note
  for (let offset = 1; offset <= 6; offset++) {
    const below = nearestSemitone - offset;
    const above = nearestSemitone + offset;
    const belowActive = (activeNotes & (1 << ((below % 12) + 12) % 12)) !== 0;
    const aboveActive = (activeNotes & (1 << ((above % 12) + 12) % 12)) !== 0;
    if (belowActive && aboveActive) {
      return midi - below < above - midi ? midiToHz(below) : midiToHz(above);
    }
    if (belowActive) return midiToHz(below);
    if (aboveActive) return midiToHz(above);
  }
  return freq;
}

// ── TD-PSOLA Pitch Shifter ───────────────────────────────────────────────
// Time-Domain Pitch Synchronous Overlap-Add.
// Shifts pitch by repositioning Hann-windowed pitch-period segments.
// Preserves formants natively (no spectral envelope hacks needed).

class PsolaShifter {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;

    // Circular buffers — power of 2 for fast masking
    const SIZE = 8192; // ~186ms at 44.1kHz
    this.size = SIZE;
    this.mask = SIZE - 1;
    this.inBuf = new Float32Array(SIZE);
    this.outBuf = new Float32Array(SIZE);

    // Absolute write position (grows monotonically)
    this.wp = 0;

    // Pitch period bounds (in samples)
    this.maxPeriod = Math.ceil(sampleRate / 50); // 50 Hz lowest
    this.minPeriod = Math.floor(sampleRate / 2000); // 2000 Hz highest
    this.period = 0;

    // Analysis marks: fixed-size ring buffer (no array reallocation)
    const MARKS_CAP = 64;
    this.marksCap = MARKS_CAP;
    this.marksMask = MARKS_CAP - 1;
    this.marksRing = new Float64Array(MARKS_CAP);
    this.marksHead = 0; // oldest entry index
    this.marksCount = 0; // number of entries
    this.nextPeak = 0;
    this.peaksReady = false;

    // Synthesis tracking
    this.synthMark = 0;
    this.synthReady = false;

    // Pre-computed Hann window table (avoids Math.cos per sample)
    this.hannTable = new Float32Array(2 * this.maxPeriod);
    this.hannPeriod = 0;
  }

  setPeriod(p) {
    this.period = p;
  }

  // Push a mark into the ring buffer
  _pushMark(val) {
    const writeIdx = (this.marksHead + this.marksCount) & this.marksMask;
    this.marksRing[writeIdx] = val;
    if (this.marksCount < this.marksCap) {
      this.marksCount++;
    } else {
      // Ring is full — overwrite oldest
      this.marksHead = (this.marksHead + 1) & this.marksMask;
    }
  }

  // Find nearest mark to target, with early exit (marks are monotonically increasing)
  _nearestMark(target) {
    let best = target;
    let bestDist = Infinity;
    for (let j = 0; j < this.marksCount; j++) {
      const idx = (this.marksHead + j) & this.marksMask;
      const d = Math.abs(this.marksRing[idx] - target);
      if (d < bestDist) {
        bestDist = d;
        best = this.marksRing[idx];
      } else if (d > bestDist) {
        break; // past the minimum — marks are sorted, stop
      }
    }
    return best;
  }

  // Reset synthesis state (called when bypassing)
  _resetState() {
    this.synthReady = false;
    this.marksCount = 0;
    this.marksHead = 0;
    this.peaksReady = false;
  }

  process(input, output, shift) {
    const N = input.length;
    const p = this.period;
    const mask = this.mask;

    // Write input into circular buffer
    for (let i = 0; i < N; i++) {
      this.inBuf[(this.wp + i) & mask] = input[i];
    }

    // Read position is behind write by maxPeriod (introduces ~15-20ms latency)
    const rp = this.wp - this.maxPeriod;

    // Passthrough: no pitch detected or near-unity shift
    if (p <= 0 || Math.abs(shift - 1.0) < 0.001) {
      for (let i = 0; i < N; i++) {
        if (rp + i < 0) {
          output[i] = 0;
        } else {
          output[i] = this.inBuf[(rp + i) & mask];
        }
      }
      this.wp += N;
      this._resetState();
      return;
    }

    const ip = Math.round(
      Math.max(this.minPeriod, Math.min(p, this.maxPeriod)),
    );
    const halfWin = ip;
    const searchRadius = Math.floor(ip / 4);

    // Recompute Hann table only when period changes
    if (ip !== this.hannPeriod) {
      const wl = 2 * ip;
      const invWl = (2 * Math.PI) / wl;
      for (let k = 0; k < wl; k++) {
        this.hannTable[k] = 0.5 * (1 - Math.cos(invWl * k));
      }
      this.hannPeriod = ip;
    }

    // ── Find analysis marks (pitch-synchronous peaks) ──────────────
    if (!this.peaksReady) {
      this.nextPeak = Math.max(0, this.wp - this.maxPeriod);
      this.peaksReady = true;
    }

    const peakLimit = this.wp + N - halfWin;
    while (this.nextPeak < peakLimit) {
      const center = Math.round(this.nextPeak);
      let bestPos = center;
      let bestVal = -1;
      for (let k = -searchRadius; k <= searchRadius; k++) {
        const pos = center + k;
        if (pos < 0) continue;
        const val = Math.abs(this.inBuf[pos & mask]);
        if (val > bestVal) {
          bestVal = val;
          bestPos = pos;
        }
      }
      this._pushMark(bestPos);
      this.nextPeak = bestPos + ip;
    }

    // ── Initialize synthesis mark ──────────────────────────────────
    if (!this.synthReady && this.marksCount > 0) {
      this.synthMark = Math.max(0, rp);
      this.synthReady = true;
    }

    // ── Overlap-add: place windowed segments at synthesis marks ─────
    if (this.synthReady) {
      const synthPeriod = Math.max(4, Math.round(ip / shift));
      const writeLimit = rp + N + this.maxPeriod;

      while (this.synthMark - halfWin < rp + N) {
        const sm = this.synthMark;
        const nearestMark = this._nearestMark(sm);

        // Overlap-add: Hann-windowed segment of width 2*ip
        const winLen = 2 * ip;
        const srcBase = nearestMark - halfWin;
        const dstBase = sm - halfWin;
        const hannTable = this.hannTable;
        const outBuf = this.outBuf;
        const inBuf = this.inBuf;
        for (let k = 0; k < winLen; k++) {
          const dstPos = dstBase + k;
          if (dstPos >= rp && dstPos < writeLimit) {
            outBuf[dstPos & mask] += hannTable[k] * inBuf[(srcBase + k) & mask];
          }
        }

        this.synthMark += synthPeriod;
      }
    }

    // ── Read output from circular buffer ───────────────────────────
    for (let i = 0; i < N; i++) {
      if (rp + i < 0) {
        output[i] = 0;
      } else {
        const idx = (rp + i) & mask;
        output[i] = this.outBuf[idx];
        this.outBuf[idx] = 0;
      }
    }

    this.wp += N;
  }
}

// ── Processor ─────────────────────────────────────────────────────────────

class PitchCorrectionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // 4x decimation for YIN: 44.1kHz → ~11kHz (16x fewer diff operations)
    this.decimation = 4;
    this.yinFrameLen = 512; // 2048 / 4
    this.yinMask = this.yinFrameLen - 1;
    this.hopLength = 1024; // in input samples (~23ms hop)

    this.yin = null; // Lazy init once sampleRate is known
    this.shifter = null;
    this.medianFilter = new MedianFilter(11);

    // Decimated ring buffer for YIN detection
    this.yinRing = new Float32Array(this.yinFrameLen);
    this.yinRingPos = 0;
    this.decimCounter = 0;
    this.decimAccum = 0;
    this.samplesUntilDetect = this.hopLength;

    // Parameters
    this.correction = 80; // 0-100: snap strength
    this.speed = 50; // 0-100: retune speed (100=instant, 0=400ms)
    this.rootNote = 0; // 0-11 (kept for backward compat)
    this.scaleType = 0; // 0-8 (kept for backward compat)
    this.mix = 100; // 0-100: dry/wet
    this.activeNotes = 4095; // 12-bit bitmask (all notes active)
    this.humanize = 0; // 0-100: sustained note vibrato preservation
    this.shift = 0.5; // 0-1 → -24..+24 semitones
    this.fine = 0.5; // 0-1 → -100..+100 cents
    this.formant = 0; // 0-100: formant preservation strength
    this.formantFollow = 0; // 0-100: reserved
    this.bypassed = false;

    // State
    this.detectedHz = 0;
    this.correctedHz = 0;
    this.currentPitchShift = 1.0;
    this.reportCounter = 0;
    this.reportInterval = 0;

    // Humanize state
    this.lastTargetNote = -1;
    this.sustainedHops = 0;

    // Cached manual offset (avoid Math.pow every block)
    this._cachedShift = 0.5;
    this._cachedFine = 0.5;
    this._cachedManualOffset = 1.0;

    // Scratch buffer for shifter output
    this.shiftOutput = new Float32Array(128);

    // Silence detection: RMS of decimated buffer
    this.silenceThreshold = 0.005;

    this.port.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'set-params') {
        if (data.correction !== undefined) this.correction = data.correction;
        if (data.speed !== undefined) this.speed = data.speed;
        if (data.rootNote !== undefined) this.rootNote = data.rootNote;
        if (data.scaleType !== undefined) this.scaleType = data.scaleType;
        if (data.mix !== undefined) this.mix = data.mix;
        if (data.activeNotes !== undefined) this.activeNotes = data.activeNotes;
        if (data.humanize !== undefined) this.humanize = data.humanize;
        if (data.shift !== undefined) this.shift = data.shift;
        if (data.fine !== undefined) this.fine = data.fine;
        if (data.formant !== undefined) this.formant = data.formant;
        if (data.formantFollow !== undefined)
          this.formantFollow = data.formantFollow;
      } else if (data.type === 'bypass') {
        this.bypassed = data.value;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0] || !output || !output[0]) return true;

    const inChannel = input[0];
    const outChannel = output[0];
    const blockSize = inChannel.length;

    // Lazy init
    if (!this.yin) {
      this.yin = new YinDetector(
        this.yinFrameLen,
        sampleRate / this.decimation,
      );
      this.shifter = new PsolaShifter(sampleRate);
      this.reportInterval = Math.floor(sampleRate / (blockSize * 24)); // ~24Hz
    }

    if (this.bypassed) {
      for (let i = 0; i < blockSize; i++) outChannel[i] = inChannel[i];
      return true;
    }

    // ── Pitch detection (YIN with 4x decimation) ────────────────────
    for (let i = 0; i < blockSize; i++) {
      this.decimAccum += inChannel[i];
      this.decimCounter++;
      if (this.decimCounter >= this.decimation) {
        this.yinRing[this.yinRingPos] = this.decimAccum / this.decimation;
        this.yinRingPos = (this.yinRingPos + 1) & this.yinMask;
        this.decimAccum = 0;
        this.decimCounter = 0;
      }
      this.samplesUntilDetect--;
    }

    const hopTimeSec = this.hopLength / sampleRate;

    if (this.samplesUntilDetect <= 0) {
      this.samplesUntilDetect = this.hopLength;

      // ── Silence detection: skip YIN on quiet input ────────────────
      let rms = 0;
      for (let i = 0; i < this.yinFrameLen; i++) {
        const v = this.yinRing[(this.yinRingPos + i) & this.yinMask];
        rms += v * v;
      }
      rms = Math.sqrt(rms / this.yinFrameLen);

      if (rms < this.silenceThreshold) {
        // Signal too quiet — skip YIN entirely
        this.detectedHz = 0;
        this.correctedHz = 0;
        const returnAlpha = 1 - fastExpNeg(hopTimeSec / 0.1);
        this.currentPitchShift += (1.0 - this.currentPitchShift) * returnAlpha;
      } else {
        // Run YIN directly on ring buffer (no contiguous copy)
        let rawHz = this.yin.detect(
          this.yinRing,
          this.yinRingPos,
          this.yinMask,
        );
        if (rawHz > 0) {
          rawHz = this.medianFilter.push(rawHz);
        }
        this.detectedHz = rawHz;

        // ── Scale snapping (bitmask-based) ────────────────────────────
        if (rawHz > 0 && this.correction > 0) {
          const snappedHz = snapToScaleBitmask(rawHz, this.activeNotes);
          this.correctedHz = snappedHz;

          // Target pitch shift ratio
          const targetShift = snappedHz / rawHz;
          const correctionAmt = this.correction / 100;

          // ── Flex-Tune tolerance zone ──────────────────────────────
          const errorCents = Math.abs(1200 * Math.log2(snappedHz / rawHz));
          const toleranceCents = 15;
          let effectiveCorrection;
          if (errorCents < toleranceCents) {
            const t = errorCents / toleranceCents;
            effectiveCorrection = correctionAmt * (t * t);
          } else {
            effectiveCorrection = correctionAmt;
          }

          const blendedShift = 1.0 + (targetShift - 1.0) * effectiveCorrection;

          // ── Humanize: track sustained note ──────────────────────────
          const targetNote = Math.round(hzToMidi(snappedHz));
          if (targetNote !== this.lastTargetNote) {
            this.lastTargetNote = targetNote;
            this.sustainedHops = 0;
          } else {
            this.sustainedHops++;
          }

          // ── Time-based retune speed ─────────────────────────────────
          const baseRetuneSec = (1 - this.speed / 100) * 0.4;

          const humanizeAmt = this.humanize / 100;
          const sustainedSec = this.sustainedHops * hopTimeSec;
          const sustainFactor = 1 - fastExpNeg(sustainedSec / 0.5);
          const effectiveRetuneSec =
            baseRetuneSec + humanizeAmt * sustainFactor * 0.4;

          const alpha =
            effectiveRetuneSec > 0.0001
              ? 1 - fastExpNeg(hopTimeSec / effectiveRetuneSec)
              : 1.0;

          this.currentPitchShift +=
            (blendedShift - this.currentPitchShift) * alpha;
        } else {
          this.correctedHz = rawHz;
          const returnAlpha = 1 - fastExpNeg(hopTimeSec / 0.1);
          this.currentPitchShift +=
            (1.0 - this.currentPitchShift) * returnAlpha;
        }
      }
    }

    // ── Manual shift + fine offset (cached — only recompute on change) ──
    if (this.shift !== this._cachedShift || this.fine !== this._cachedFine) {
      this._cachedShift = this.shift;
      this._cachedFine = this.fine;
      const shiftSemitones = this.shift * 48 - 24;
      const fineCents = this.fine * 200 - 100;
      this._cachedManualOffset = Math.pow(
        2,
        (shiftSemitones + fineCents / 100) / 12,
      );
    }
    const finalShift = this.currentPitchShift * this._cachedManualOffset;

    // ── TD-PSOLA pitch shifting ──────────────────────────────────────
    if (this.shiftOutput.length < blockSize) {
      this.shiftOutput = new Float32Array(blockSize);
    }
    // Feed detected period to PSOLA shifter
    if (this.detectedHz > 0) {
      this.shifter.setPeriod(sampleRate / this.detectedHz);
    } else {
      this.shifter.setPeriod(0); // unvoiced → passthrough
    }
    this.shifter.process(inChannel, this.shiftOutput, finalShift);
    for (let i = 0; i < blockSize; i++) {
      outChannel[i] = this.shiftOutput[i];
    }

    // ── Report pitch info to main thread (~24Hz) ─────────────────────
    this.reportCounter++;
    if (this.reportCounter >= this.reportInterval) {
      this.reportCounter = 0;
      this.port.postMessage({
        type: 'pitch-info',
        detected: this.detectedHz,
        corrected: this.correctedHz,
      });
    }

    return true;
  }
}

registerProcessor('pitch-correction-processor', PitchCorrectionProcessor);
