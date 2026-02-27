import type { TrackEffect } from './effect-chain';

export interface MasteringChain {
  effects: TrackEffect[];
  description: string;
}

function generateId(): string {
  return 'master-' + Math.random().toString(36).substr(2, 9);
}

export function generateMasteringChain(
  targetLoudness: 'quiet' | 'moderate' | 'loud' = 'moderate',
): MasteringChain {
  const presets = {
    quiet:    { compThreshold: -12, limiterThreshold: -3, airGain: 1.0 },
    moderate: { compThreshold: -18, limiterThreshold: -1, airGain: 1.5 },
    loud:     { compThreshold: -24, limiterThreshold: -0.5, airGain: 2.0 },
  };

  const p = presets[targetLoudness];

  const effects: TrackEffect[] = [
    // 1. Sub-bass rumble cut (highpass at 30Hz)
    {
      id: generateId(),
      type: 'eq',
      enabled: true,
      params: { wet: 1.0, eqType: 'highpass', eqFrequency: 30, eqGain: 0, eqQ: 0.5 },
    },
    // 2. Gentle glue compression
    {
      id: generateId(),
      type: 'compressor',
      enabled: true,
      params: { wet: 1.0, threshold: p.compThreshold, knee: 10, ratio: 3, attack: 0.01, release: 0.15 },
    },
    // 3. Air / presence EQ (highshelf boost at 10kHz)
    {
      id: generateId(),
      type: 'eq',
      enabled: true,
      params: { wet: 1.0, eqType: 'highshelf', eqFrequency: 10000, eqGain: p.airGain, eqQ: 0.7 },
    },
    // 4. Brick-wall limiter
    {
      id: generateId(),
      type: 'limiter',
      enabled: true,
      params: { wet: 1.0, threshold: p.limiterThreshold, knee: 0, ratio: 20, attack: 0.001, release: 0.01 },
    },
  ];

  const loudnessLabel = { quiet: 'Gentle', moderate: 'Balanced', loud: 'Loud' }[targetLoudness];
  return { effects, description: `${loudnessLabel} mastering (compression + EQ + limiter)` };
}
