// ── NAM AudioWorklet Processor ────────────────────────────────────────────
// Neural Amp Modeler inference running in the audio thread.
// Supports LSTM, Linear, and WaveNet architectures (pure JavaScript, no WASM).
//
// Weight layout follows NeuralAmpModelerCore C++ exactly:
//   LSTM per-layer: W(4hs × (in+hs)) | b(4hs) | h0(hs) | c0(hs)
//   LSTM head:      weight(hs) | bias(1)
//   Linear:         kernel(receptive_field) | bias(1)?
//   WaveNet:        per LayerArray: rechannel(no bias) | per layer: conv+bias,
//                   mixin(no bias), layer1x1+bias | head_rechannel(±bias)
//                   then head_scale(1)

// ── Math helpers ──────────────────────────────────────────────────────────

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// ── LSTM Inference Engine ─────────────────────────────────────────────────

class LstmEngine {
  constructor(config, weights) {
    const numLayers = config.num_layers;
    const inputSize = config.input_size || 1;
    const hs = config.hidden_size;

    this.numLayers = numLayers;
    this.hiddenSize = hs;
    this.layers = [];

    let offset = 0;

    for (let l = 0; l < numLayers; l++) {
      const inSize = l === 0 ? inputSize : hs;
      const wRows = 4 * hs;
      const wCols = inSize + hs;
      const wSize = wRows * wCols;
      const bSize = 4 * hs;

      // W and b are read-only views into the weight buffer
      const W = new Float32Array(weights.buffer, offset * 4, wSize);
      offset += wSize;
      const b = new Float32Array(weights.buffer, offset * 4, bSize);
      offset += bSize;

      // Initial states — copy since they get mutated during inference
      const h = new Float32Array(hs);
      for (let i = 0; i < hs; i++) h[i] = weights[offset + i];
      offset += hs;
      const c = new Float32Array(hs);
      for (let i = 0; i < hs; i++) c[i] = weights[offset + i];
      offset += hs;

      this.layers.push({
        inSize,
        W, // (4*hs) × (inSize+hs), row-major
        b, // 4*hs
        wCols,
        h, // hidden state (mutable)
        c, // cell state (mutable)
        // Pre-allocated scratch buffers
        xh: new Float32Array(wCols), // concatenated [input, h]
        gates: new Float32Array(4 * hs), // i, f, g, o
      });
    }

    // Head: linear projection hidden_size → 1
    this.headW = new Float32Array(weights.buffer, offset * 4, hs);
    offset += hs;
    this.headBias = weights[offset];
    offset += 1;
  }

  processSample(x) {
    const hs = this.hiddenSize;
    let input = x;

    for (let l = 0; l < this.numLayers; l++) {
      const layer = this.layers[l];
      const inSize = layer.inSize;
      const xh = layer.xh;
      const W = layer.W;
      const b = layer.b;
      const gates = layer.gates;
      const wCols = layer.wCols;

      // Build xh = [input, h_prev]
      if (l === 0) {
        xh[0] = input;
      } else {
        // input is previous layer's hidden state
        const prevH = this.layers[l - 1].h;
        for (let i = 0; i < inSize; i++) xh[i] = prevH[i];
      }
      const h = layer.h;
      for (let i = 0; i < hs; i++) xh[inSize + i] = h[i];

      // Matrix multiply: gates = W × xh + b
      // W is row-major: W[row * wCols + col]
      for (let g = 0; g < 4 * hs; g++) {
        let sum = b[g];
        const rowOffset = g * wCols;
        for (let j = 0; j < wCols; j++) {
          sum += W[rowOffset + j] * xh[j];
        }
        gates[g] = sum;
      }

      // Apply gate activations and update states
      // Gate ordering: [input(0..hs), forget(hs..2hs), cell(2hs..3hs), output(3hs..4hs)]
      const c = layer.c;
      for (let i = 0; i < hs; i++) {
        const ig = sigmoid(gates[i]); // input gate
        const fg = sigmoid(gates[hs + i]); // forget gate
        const gg = Math.tanh(gates[2 * hs + i]); // cell gate
        const og = sigmoid(gates[3 * hs + i]); // output gate

        c[i] = fg * c[i] + ig * gg;
        h[i] = og * Math.tanh(c[i]);
      }
    }

    // Head projection: dot(lastH, headW) + headBias
    const lastH = this.layers[this.numLayers - 1].h;
    let output = this.headBias;
    for (let i = 0; i < hs; i++) {
      output += this.headW[i] * lastH[i];
    }
    return output;
  }
}

// ── Linear (FIR Convolution) Engine ───────────────────────────────────────

class LinearEngine {
  constructor(config, weights) {
    const rf = config.receptive_field;
    this.taps = rf;
    this.kernel = new Float32Array(weights.buffer, 0, rf);
    this.bias = config.bias ? weights[rf] : 0;

    // Circular buffer for input history
    this.history = new Float32Array(rf);
    this.historyIdx = 0;
  }

  processSample(x) {
    const taps = this.taps;
    const history = this.history;
    const kernel = this.kernel;

    // Write new sample into circular buffer
    history[this.historyIdx] = x;

    // FIR convolution
    let output = this.bias;
    for (let k = 0; k < taps; k++) {
      const idx = (this.historyIdx - k + taps) % taps;
      output += kernel[k] * history[idx];
    }

    this.historyIdx = (this.historyIdx + 1) % taps;
    return output;
  }
}

// ── WaveNet Inference Engine ──────────────────────────────────────────────
// Standard config: 2 layer arrays (16ch + 8ch), kernel_size=3, 10 dilations,
// Tanh activation, non-gated, with layer1x1 residual connections.
//
// Per-sample data flow:
//   For each LayerArray:
//     x = rechannel(input)            → write to per-layer ring buffers
//     For each dilated layer:
//       z = dilatedConv(ringBuf, d) + inputMixin(condition)
//       z = tanh(z)
//       headAccum += z
//       x = x + layer1x1(z)          → residual update for next layer
//     headOut = headRechannel(headAccum)
//   output = lastHeadOut × headScale

class WaveNetEngine {
  constructor(config, weights) {
    const layersConfig = config.layers;
    this.numArrays = layersConfig.length;
    this.arrays = [];

    let offset = 0;

    for (let a = 0; a < this.numArrays; a++) {
      const cfg = layersConfig[a];
      const ch = cfg.channels;
      const inp = cfg.input_size;
      const cond = cfg.condition_size;
      const hs = cfg.head_size;
      const k = cfg.kernel_size;
      const dils = cfg.dilations;
      const headBias = cfg.head_bias || false;

      // Rechannel Conv1x1: inp → ch (NO bias)
      const rechannelW = new Float32Array(ch * inp);
      for (let i = 0; i < ch * inp; i++) rechannelW[i] = weights[offset++];

      // Dilated layers
      const layers = [];
      for (let li = 0; li < dils.length; li++) {
        const d = dils[li];

        // Dilated Conv: ch → ch, kernel_size=k (WITH bias)
        const convSize = ch * ch * k;
        const convW = new Float32Array(convSize);
        for (let i = 0; i < convSize; i++) convW[i] = weights[offset++];
        const convB = new Float32Array(ch);
        for (let i = 0; i < ch; i++) convB[i] = weights[offset++];

        // Input Mixin Conv1x1: cond → ch (NO bias)
        const mixinSize = ch * cond;
        const mixinW = new Float32Array(mixinSize);
        for (let i = 0; i < mixinSize; i++) mixinW[i] = weights[offset++];

        // Layer 1x1 Conv: ch → ch (WITH bias) — residual projection
        const l1x1Size = ch * ch;
        const l1x1W = new Float32Array(l1x1Size);
        for (let i = 0; i < l1x1Size; i++) l1x1W[i] = weights[offset++];
        const l1x1B = new Float32Array(ch);
        for (let i = 0; i < ch; i++) l1x1B[i] = weights[offset++];

        // Ring buffer: stores ch values per time step
        // Size = d * (k-1) + 1 entries
        const ringSize = d * (k - 1) + 1;
        const ringBuf = new Float32Array(ringSize * ch);
        const ringIdx = { value: 0 };

        layers.push({
          dilation: d,
          kernelSize: k,
          channels: ch,
          convW, // [outCh × inCh × k], row-major
          convB, // [ch]
          mixinW, // [ch × cond], row-major
          l1x1W, // [ch × ch], row-major
          l1x1B, // [ch]
          ringBuf,
          ringSize,
          ringIdx,
        });
      }

      // Head Rechannel Conv1x1: ch → hs
      const headRechannelW = new Float32Array(hs * ch);
      for (let i = 0; i < hs * ch; i++) headRechannelW[i] = weights[offset++];
      const headRechannelB = headBias ? new Float32Array(hs) : null;
      if (headBias) {
        for (let i = 0; i < hs; i++) headRechannelB[i] = weights[offset++];
      }

      // Scratch buffers (pre-allocated, zero GC)
      const zBuf = new Float32Array(ch); // dilated conv + mixin output
      const headAccum = new Float32Array(ch); // accumulated head across layers
      const xBuf = new Float32Array(ch); // current residual state
      const l1x1Out = new Float32Array(ch); // layer1x1 output
      const headOut = new Float32Array(hs); // rechanneled head output

      this.arrays.push({
        cfg,
        channels: ch,
        inputSize: inp,
        condSize: cond,
        headSize: hs,
        rechannelW,
        layers,
        headRechannelW,
        headRechannelB,
        zBuf,
        headAccum,
        xBuf,
        l1x1Out,
        headOut,
      });
    }

    // Head scale (last weight)
    this.headScale = weights[offset++];

    // Prewarm with zeros to fill ring buffers
    this._prewarm();
  }

  _prewarm() {
    // Calculate total receptive field
    let totalRF = 0;
    for (let a = 0; a < this.numArrays; a++) {
      const cfg = this.arrays[a].cfg;
      const k = cfg.kernel_size;
      for (let i = 0; i < cfg.dilations.length; i++) {
        totalRF += cfg.dilations[i] * (k - 1);
      }
    }
    // Process zeros to fill all ring buffers
    for (let i = 0; i < totalRF; i++) {
      this.processSample(0);
    }
  }

  processSample(inputSample) {
    const condition = inputSample;
    let arrayInput = inputSample;
    let prevHeadOut = null;

    for (let a = 0; a < this.numArrays; a++) {
      const arr = this.arrays[a];
      const ch = arr.channels;
      const inp = arr.inputSize;
      const cond = arr.condSize;
      const hs = arr.headSize;
      const xBuf = arr.xBuf;
      const zBuf = arr.zBuf;
      const headAccum = arr.headAccum;
      const l1x1Out = arr.l1x1Out;
      const headOut = arr.headOut;

      // Rechannel: inp → ch (no bias)
      // Conv1x1: out[o] = sum_i(W[o*inp+i] * input_i)
      const rW = arr.rechannelW;
      if (a === 0 && inp === 1) {
        // Scalar input optimization for first array
        for (let o = 0; o < ch; o++) {
          xBuf[o] = rW[o] * arrayInput;
        }
      } else {
        // General case: arrayInput is the residual from previous array
        // For array 0 with inp=1, arrayInput is a scalar
        // For array 1+, arrayInput is stored in previous array's xBuf (ch values)
        const prevX = a === 0 ? null : this.arrays[a - 1].xBuf;
        for (let o = 0; o < ch; o++) {
          let sum = 0;
          const rowOff = o * inp;
          if (inp === 1) {
            sum = rW[rowOff] * arrayInput;
          } else {
            for (let i = 0; i < inp; i++) {
              sum += rW[rowOff + i] * prevX[i];
            }
          }
          xBuf[o] = sum;
        }
      }

      // Seed head accumulator from previous array's rechanneled head output
      // (matches PyTorch _LayerArray.forward() which passes head_input across arrays)
      if (prevHeadOut && prevHeadOut.length === ch) {
        for (let i = 0; i < ch; i++) headAccum[i] = prevHeadOut[i];
      } else {
        for (let i = 0; i < ch; i++) headAccum[i] = 0;
      }

      // Process dilated layers
      for (let li = 0; li < arr.layers.length; li++) {
        const layer = arr.layers[li];
        const d = layer.dilation;
        const k = layer.kernelSize;
        const ringBuf = layer.ringBuf;
        const ringSize = layer.ringSize;
        const ringPos = layer.ringIdx.value;
        const convW = layer.convW;
        const convB = layer.convB;
        const mixinW = layer.mixinW;

        // Write current x to this layer's ring buffer
        const writeOff = ringPos * ch;
        for (let i = 0; i < ch; i++) ringBuf[writeOff + i] = xBuf[i];

        // Dilated convolution: z = conv(ringBuf, d) + mixin(condition)
        // Conv1D weight layout: W[outCh][inCh][k] row-major
        // Taps: t-2d, t-d, t (for k=3)
        for (let o = 0; o < ch; o++) {
          let sum = convB[o];
          const wRowOff = o * ch * k;
          for (let kk = 0; kk < k; kk++) {
            // Lookback: kernel position kk maps to offset (kk - (k-1)) * d
            const lookback = (kk - (k - 1)) * d;
            const idx =
              (((ringPos + lookback) % ringSize) + ringSize) % ringSize;
            const bufOff = idx * ch;
            const wOff = wRowOff + kk;
            for (let i = 0; i < ch; i++) {
              sum += convW[wOff + i * k] * ringBuf[bufOff + i];
            }
          }
          // Add input mixin (condition → ch, no bias)
          // Mixin: W[o*cond..o*cond+cond] × condition
          if (cond === 1) {
            sum += mixinW[o] * condition;
          } else {
            const mOff = o * cond;
            for (let c = 0; c < cond; c++) {
              sum += mixinW[mOff + c] * condition; // condition is scalar for standard
            }
          }
          zBuf[o] = sum;
        }

        // Activation: tanh
        for (let i = 0; i < ch; i++) {
          zBuf[i] = Math.tanh(zBuf[i]);
        }

        // Head accumulation (skip connection)
        for (let i = 0; i < ch; i++) {
          headAccum[i] += zBuf[i];
        }

        // Layer 1x1 residual: x = x + Conv1x1(z)
        // l1x1: W[outCh][inCh] row-major + bias
        const l1W = layer.l1x1W;
        const l1B = layer.l1x1B;
        for (let o = 0; o < ch; o++) {
          let sum = l1B[o];
          const rowOff = o * ch;
          for (let i = 0; i < ch; i++) {
            sum += l1W[rowOff + i] * zBuf[i];
          }
          l1x1Out[o] = sum;
        }
        for (let i = 0; i < ch; i++) {
          xBuf[i] += l1x1Out[i];
        }

        // Advance ring buffer index
        layer.ringIdx.value = (ringPos + 1) % ringSize;
      }

      // Head rechannel: ch → hs
      const hrW = arr.headRechannelW;
      const hrB = arr.headRechannelB;
      for (let o = 0; o < hs; o++) {
        let sum = hrB ? hrB[o] : 0;
        const rowOff = o * ch;
        for (let i = 0; i < ch; i++) {
          sum += hrW[rowOff + i] * headAccum[i];
        }
        headOut[o] = sum;
      }

      prevHeadOut = headOut;
    }

    // Final output: last array's head output × headScale
    // For standard config, last array head_size=1
    return prevHeadOut[0] * this.headScale;
  }
}

// ── NAM Processor (AudioWorkletProcessor) ─────────────────────────────────

class NamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.engine = null;
    this.inputLevel = 1.0;
    this.outputLevel = 1.0;
    this.outputCompensation = 1.0;
    this.bypassed = false;

    this.port.onmessage = (e) => this._handleMessage(e.data);
  }

  _handleMessage(data) {
    switch (data.type) {
      case 'load-model':
        this._loadModel(data.model);
        break;
      case 'set-input-level':
        this.inputLevel = data.value;
        break;
      case 'set-output-level':
        this.outputLevel = data.value;
        break;
      case 'bypass':
        this.bypassed = data.value;
        break;
    }
  }

  _loadModel(modelData) {
    try {
      const { architecture, config, weights } = modelData;

      if (architecture === 'WaveNet') {
        this.engine = new WaveNetEngine(config, weights);
        // Compensate for low model gain: head_scale=0.02 × ~3.5 network gain ≈ 0.07x
        // 14x brings output to near-unity before user output level is applied
        this.outputCompensation = 14;
      } else if (architecture === 'LSTM') {
        this.engine = new LstmEngine(config, weights);
        this.outputCompensation = 1.0;
      } else if (architecture === 'Linear') {
        this.engine = new LinearEngine(config, weights);
        this.outputCompensation = 1.0;
      } else {
        this.port.postMessage({
          type: 'error',
          message: `Unsupported architecture: ${architecture}`,
        });
        return;
      }

      this.port.postMessage({
        type: 'model-loaded',
        architecture,
      });
    } catch (err) {
      this.port.postMessage({
        type: 'error',
        message: err.message || 'Failed to load model',
      });
    }
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    // Passthrough if no model loaded or bypassed
    if (!this.engine || this.bypassed) {
      output.set(input);
      return true;
    }

    const inLvl = this.inputLevel;
    const outLvl = this.outputLevel;

    for (let i = 0; i < input.length; i++) {
      const sample = input[i] * inLvl;
      output[i] =
        this.engine.processSample(sample) * outLvl * this.outputCompensation;
    }

    return true;
  }
}

registerProcessor('nam-processor', NamProcessor);
