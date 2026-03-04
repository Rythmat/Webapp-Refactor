// ── NAM Model Parser ──────────────────────────────────────────────────────
// Parses .nam JSON files (Neural Amp Modeler format).
// Reference: https://github.com/sdatkinson/neural-amp-modeler

// ── Types ─────────────────────────────────────────────────────────────────

export interface NamMetadata {
  name?: string;
  modeled_by?: string;
  gear_type?: string;
  tone_type?: string;
  gear_make?: string;
  gear_model?: string;
}

export interface LstmConfig {
  num_layers: number;
  input_size: number;
  hidden_size: number;
}

export interface LinearConfig {
  receptive_field: number;
  bias: boolean;
}

export interface WaveNetLayerConfig {
  input_size: number;
  condition_size: number;
  head_size: number;
  channels: number;
  kernel_size: number;
  dilations: number[];
  activation: string;
  gated: boolean;
  head_bias: boolean;
}

export interface WaveNetConfig {
  layers: WaveNetLayerConfig[];
  head: unknown | null;
  head_scale: number;
}

export type NamArchitecture = 'LSTM' | 'WaveNet' | 'ConvNet' | 'Linear';

export interface NamModelFile {
  version: string;
  architecture: NamArchitecture;
  config: LstmConfig | LinearConfig | WaveNetConfig | Record<string, unknown>;
  weights: number[];
  sample_rate?: number;
  metadata?: NamMetadata;
}

// Supported architectures for JS inference
const JS_SUPPORTED: Set<NamArchitecture> = new Set(['LSTM', 'Linear', 'WaveNet']);

// ── Parser ────────────────────────────────────────────────────────────────

export function parseNamFile(json: string): NamModelFile {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON — could not parse .nam file');
  }

  // Required fields
  if (typeof raw.version !== 'string') {
    throw new Error('Missing or invalid "version" field');
  }
  if (typeof raw.architecture !== 'string') {
    throw new Error('Missing or invalid "architecture" field');
  }
  if (!raw.config || typeof raw.config !== 'object') {
    throw new Error('Missing or invalid "config" field');
  }
  if (!Array.isArray(raw.weights)) {
    throw new Error('Missing or invalid "weights" field');
  }

  const architecture = raw.architecture as NamArchitecture;
  const validArchs: NamArchitecture[] = ['LSTM', 'WaveNet', 'ConvNet', 'Linear'];
  if (!validArchs.includes(architecture)) {
    throw new Error(`Unknown architecture: "${raw.architecture}"`);
  }

  const config = raw.config as Record<string, unknown>;
  const weights = raw.weights as number[];

  // Validate weight count for supported architectures
  if (architecture === 'LSTM') {
    validateLstmWeights(config as unknown as LstmConfig, weights.length);
  } else if (architecture === 'Linear') {
    validateLinearWeights(config as unknown as LinearConfig, weights.length);
  } else if (architecture === 'WaveNet') {
    validateWaveNetConfig(config as unknown as WaveNetConfig);
    validateWaveNetWeights(config as unknown as WaveNetConfig, weights.length);
  }

  return {
    version: raw.version as string,
    architecture,
    config: config as NamModelFile['config'],
    weights,
    sample_rate: typeof raw.sample_rate === 'number' ? raw.sample_rate : undefined,
    metadata: raw.metadata && typeof raw.metadata === 'object'
      ? raw.metadata as NamMetadata
      : undefined,
  };
}

export function isSupported(model: NamModelFile): boolean {
  return JS_SUPPORTED.has(model.architecture);
}

export function getModelDisplayName(model: NamModelFile): string {
  if (model.metadata?.name) return model.metadata.name;
  if (model.metadata?.gear_model) return model.metadata.gear_model;
  return `${model.architecture} Model`;
}

// ── Validation helpers ────────────────────────────────────────────────────

function validateLstmWeights(config: LstmConfig, count: number): void {
  const { num_layers, input_size, hidden_size } = config;
  if (!num_layers || !hidden_size) {
    throw new Error('LSTM config missing num_layers or hidden_size');
  }

  let expected = 0;
  for (let l = 0; l < num_layers; l++) {
    const inSize = l === 0 ? (input_size ?? 1) : hidden_size;
    // W: (4*hs) × (in+hs) row-major
    expected += 4 * hidden_size * (inSize + hidden_size);
    // b: 4*hs
    expected += 4 * hidden_size;
    // h0, c0
    expected += hidden_size;
    expected += hidden_size;
  }
  // Head: weight (hs) + bias (1)
  expected += hidden_size + 1;

  if (count !== expected) {
    throw new Error(
      `LSTM weight count mismatch: expected ${expected}, got ${count} ` +
      `(layers=${num_layers}, hidden=${hidden_size}, input=${input_size ?? 1})`,
    );
  }
}

function validateLinearWeights(config: LinearConfig, count: number): void {
  const { receptive_field, bias } = config;
  if (!receptive_field) {
    throw new Error('Linear config missing receptive_field');
  }
  const expected = receptive_field + (bias ? 1 : 0);
  if (count !== expected) {
    throw new Error(
      `Linear weight count mismatch: expected ${expected}, got ${count} ` +
      `(receptive_field=${receptive_field}, bias=${bias})`,
    );
  }
}

function validateWaveNetConfig(config: WaveNetConfig): void {
  if (!Array.isArray(config.layers) || config.layers.length === 0) {
    throw new Error('WaveNet config missing or empty "layers" array');
  }
  for (let i = 0; i < config.layers.length; i++) {
    const l = config.layers[i];
    if (!l.channels || !l.kernel_size || !Array.isArray(l.dilations) || l.dilations.length === 0) {
      throw new Error(`WaveNet layer[${i}] missing channels, kernel_size, or dilations`);
    }
    // Only support standard (non-gated, Tanh) for JS inference
    if (l.gated) {
      throw new Error(
        'Gated WaveNet models are not yet supported in JS inference. ' +
        'Please use a standard (non-gated) model.',
      );
    }
    if (l.activation !== 'Tanh') {
      throw new Error(
        `WaveNet activation "${l.activation}" is not yet supported. ` +
        'Please use a model with Tanh activation.',
      );
    }
  }
  if (config.head !== null && config.head !== undefined) {
    throw new Error('WaveNet models with a head network are not yet supported.');
  }
}

function validateWaveNetWeights(config: WaveNetConfig, count: number): void {
  let expected = 0;
  for (const l of config.layers) {
    const ch = l.channels;
    const inp = l.input_size;
    const cond = l.condition_size;
    const hs = l.head_size;
    const k = l.kernel_size;
    const nDil = l.dilations.length;

    // Rechannel Conv1x1: inp → ch (no bias)
    expected += ch * inp;
    // Per dilated layer:
    //   Dilated Conv: ch → ch, k (with bias)
    //   Input Mixin Conv1x1: cond → ch (no bias)
    //   Layer 1x1 Conv: ch → ch (with bias)
    expected += nDil * ((ch * ch * k + ch) + (ch * cond) + (ch * ch + ch));
    // Head Rechannel Conv1x1: ch → hs (± bias)
    expected += hs * ch + (l.head_bias ? hs : 0);
  }
  // head_scale (last weight)
  expected += 1;

  if (count !== expected) {
    throw new Error(
      `WaveNet weight count mismatch: expected ${expected}, got ${count}`,
    );
  }
}
