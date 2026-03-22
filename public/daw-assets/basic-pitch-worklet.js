// ── basic-pitch-worklet ───────────────────────────────────────────────────
// AudioWorklet processor for capturing audio with deterministic timing
// and forwarding it to a companion Web Worker for basic-pitch ML inference.
//
// Architecture:
//   AudioWorkletProcessor (audio thread, 128-sample blocks)
//     → accumulate in ring buffer
//     → when enough samples: post to Worker via MessagePort
//     → Worker runs TF.js inference
//     → Worker posts results back
//     → Worklet forwards to main thread
//
// Why AudioWorklet instead of ScriptProcessorNode:
//   - ScriptProcessorNode runs on main thread (blocks UI)
//   - AudioWorklet runs on audio thread with consistent timing
//   - No deprecated API warnings
//
// Why not run TF.js here directly:
//   - AudioWorkletGlobalScope has no WebGL/WebGPU context
//   - TF.js requires one of these backends for GPU acceleration
//   - So inference stays in a Worker, but audio capture is here

const TARGET_SAMPLE_RATE = 22050;
const CHUNK_SIZE = 4096; // Send chunks of this size to worker

class BasicPitchCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    /** @type {Float32Array} Accumulation buffer. */
    this._buffer = new Float32Array(CHUNK_SIZE);

    /** @type {number} Write position in accumulation buffer. */
    this._writePos = 0;

    /** @type {boolean} Whether to capture audio. */
    this._active = true;

    /** @type {number} Source sample rate (set from first process call). */
    this._sourceSampleRate = 0;

    // Listen for control messages from main thread
    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'stop') {
        this._active = false;
      } else if (msg.type === 'start') {
        this._active = true;
        this._writePos = 0;
      }
    };
  }

  /**
   * @param {Float32Array[][]} inputs
   * @param {Float32Array[][]} outputs
   * @param {Object} parameters
   * @returns {boolean}
   */
  process(inputs, outputs, parameters) {
    if (!this._active) return true;

    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const channelData = input[0]; // mono channel

    // Set source sample rate from AudioWorklet context
    if (this._sourceSampleRate === 0) {
      this._sourceSampleRate = sampleRate; // global in AudioWorkletGlobalScope
    }

    // Accumulate samples
    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._writePos++] = channelData[i];

      if (this._writePos >= CHUNK_SIZE) {
        // Buffer full — send to main thread (which forwards to ML Worker)
        // Copy buffer before sending (transferable)
        const chunk = new Float32Array(this._buffer);
        this.port.postMessage(
          {
            type: 'audio',
            samples: chunk,
            sampleRate: this._sourceSampleRate,
          },
          [chunk.buffer],
        );
        this._writePos = 0;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('basic-pitch-capture', BasicPitchCaptureProcessor);
