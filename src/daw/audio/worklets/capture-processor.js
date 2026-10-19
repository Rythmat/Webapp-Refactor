// ── capture-processor.js ───────────────────────────────────────────────────
// AudioWorklet tap for recording (milestone 1.11 d), loaded through
// graph/workletRegistry. It passes nothing on and
// changes nothing: it tells the main thread when its first frame was
// captured, on the context's clock, and posts the take's first frames so the
// recorder can line the decoded MediaRecorder audio up with them.
//
// Messages to the main thread:
//   { type: 'start', contextTime }            the first frame's context time
//   { type: 'pcm', channels: Float32Array[] } a chunk (mono or stereo)
//   { type: 'done' }                          after a 'stop', all chunks sent
// Messages from the main thread:
//   { type: 'stop' }                          flush and stop posting
//   { type: 'dispose' }                       stop at once (workletRegistry)
//
// processorOptions: { maxFrames } — how many frames to post at most (the
// alignment needs the first couple of seconds, not the whole take).

/* global sampleRate, currentTime */

const CHUNK_FRAMES = 4096;

class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.maxFrames = opts.maxFrames > 0 ? opts.maxFrames : 3 * sampleRate;
    this.posted = 0;
    this.started = false;
    this.stopped = false;
    this.chunk = null;
    this.filled = 0;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'stop') {
        this.flush();
        this.stopped = true;
        this.port.postMessage({ type: 'done' });
      } else if (e.data && e.data.type === 'dispose') {
        this.stopped = true;
      }
    };
  }

  flush() {
    if (!this.chunk || this.filled === 0) return;
    const channels = this.chunk.map((c) => c.slice(0, this.filled));
    this.port.postMessage(
      { type: 'pcm', channels },
      channels.map((c) => c.buffer),
    );
    this.posted += this.filled;
    this.filled = 0;
  }

  process(inputs) {
    if (this.stopped) return false;
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    if (!this.started) {
      this.started = true;
      // currentTime is the context time of this block's first frame.
      this.port.postMessage({ type: 'start', contextTime: currentTime });
    }
    if (this.posted >= this.maxFrames) return true;
    const channelCount = Math.min(2, input.length);
    if (!this.chunk || this.chunk.length !== channelCount) {
      this.flush();
      this.chunk = [];
      for (let c = 0; c < channelCount; c++) {
        this.chunk.push(new Float32Array(CHUNK_FRAMES));
      }
      this.filled = 0;
    }
    const frames = input[0].length;
    let read = 0;
    while (read < frames) {
      const n = Math.min(frames - read, CHUNK_FRAMES - this.filled);
      for (let c = 0; c < channelCount; c++) {
        this.chunk[c].set(input[c].subarray(read, read + n), this.filled);
      }
      this.filled += n;
      read += n;
      if (this.filled === CHUNK_FRAMES) {
        this.flush();
        if (this.posted >= this.maxFrames) break;
      }
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
