// ── Automation param allow-list (Phase 7) ──────────────────────────────────
// The closed set of paramIds a lane may target, their UI ranges, and the
// resolver that maps a paramId to the AudioParam ramp target(s) on a TrackEngine.
// Only continuous, offline-renderable params are here — gate/ducker (JS poll
// loops, absent from the bounce), reverb.decay (IR swap), per-band EQ (doesn't
// fit the flat grammar) and curve-regen params (saturator.drive) are excluded so
// live playback and the offline bounce stay at parity. Keep in sync with
// EffectChain.getAutomationTargets.

import type { TrackEngine } from './TrackEngine';
import type { AutomationTarget } from './automation';
import type { EffectSlotType } from './EffectChain';

export interface AutomationParamDef {
  /** paramId, e.g. 'volume', 'send.A', 'effect.reverb.wet'. */
  id: string;
  label: string;
  group: 'Mixer' | 'Effect';
  /** Lane value range (the natural param range shown in the UI). */
  min: number;
  max: number;
  step: number;
  /** For effect params: the slot that must be in Track.activeEffects to offer it. */
  slot?: EffectSlotType;
}

export const AUTOMATION_PARAMS: AutomationParamDef[] = [
  { id: 'volume', label: 'Volume', group: 'Mixer', min: 0, max: 1, step: 0.01 },
  { id: 'pan', label: 'Pan', group: 'Mixer', min: -1, max: 1, step: 0.01 },
  { id: 'send.A', label: 'Send A', group: 'Mixer', min: 0, max: 1, step: 0.01 },
  { id: 'send.B', label: 'Send B', group: 'Mixer', min: 0, max: 1, step: 0.01 },
  {
    id: 'effect.reverb.wet',
    label: 'Reverb Wet',
    group: 'Effect',
    slot: 'reverb',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'effect.delay.wet',
    label: 'Delay Wet',
    group: 'Effect',
    slot: 'delay',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    id: 'effect.delay.feedback',
    label: 'Delay Feedback',
    group: 'Effect',
    slot: 'delay',
    min: 0,
    max: 0.95,
    step: 0.01,
  },
  {
    id: 'effect.presence.amount',
    label: 'Presence',
    group: 'Effect',
    slot: 'presence',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    id: 'effect.saturator.mix',
    label: 'Saturator Mix',
    group: 'Effect',
    slot: 'saturator',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    id: 'effect.multiband.depth',
    label: 'OTT Depth',
    group: 'Effect',
    slot: 'multiband',
    min: 0,
    max: 1,
    step: 0.01,
  },
];

const PARAM_MAP = new Map(AUTOMATION_PARAMS.map((p) => [p.id, p]));

export function getAutomationParamDef(
  id: string,
): AutomationParamDef | undefined {
  return PARAM_MAP.get(id);
}

export function isAutomatableParam(id: string): boolean {
  return PARAM_MAP.has(id);
}

/** Clamp a lane value into its param's declared range. A non-finite value (from
 *  corrupt data or a bad drag) resolves to the param's min rather than flowing
 *  NaN into an AudioParam ramp (which throws / poisons the signal). */
export function clampParamValue(id: string, value: number): number {
  const def = PARAM_MAP.get(id);
  if (!def) return value;
  if (!Number.isFinite(value)) return def.min;
  return Math.max(def.min, Math.min(def.max, value));
}

/**
 * Resolve a paramId to its ramp target(s) on a TrackEngine. Returns [] when the
 * target isn't wired yet (a send with no bus) or the paramId is unknown — the
 * scheduler then skips that lane. Send/effect targets require the engine to have
 * been set up (setSend / updateEffects) first.
 */
export function resolveAutomationTargets(
  paramId: string,
  te: TrackEngine,
): AutomationTarget[] {
  if (paramId === 'volume') {
    return [{ param: te.getVolumeParam(), map: (v) => v }];
  }
  if (paramId === 'pan') {
    return [{ param: te.getPanParam(), map: (v) => v }];
  }
  if (paramId.startsWith('send.')) {
    const returnId = paramId.slice('send.'.length);
    const param = te.getSendParam(returnId);
    return param ? [{ param, map: (v) => v }] : [];
  }
  if (paramId.startsWith('effect.')) {
    // effect.<slot>.<param>; <slot> may contain a hyphen ('de-esser') but no dot,
    // so split on the FIRST dot after the 'effect.' prefix.
    const rest = paramId.slice('effect.'.length);
    const dot = rest.indexOf('.');
    if (dot < 0) return [];
    const slot = rest.slice(0, dot) as EffectSlotType;
    const param = rest.slice(dot + 1);
    return te.getEffectChain().getAutomationTargets(slot, param);
  }
  return [];
}
