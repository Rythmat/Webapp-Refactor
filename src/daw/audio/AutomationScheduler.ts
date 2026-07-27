// ── AutomationScheduler (Phase 7) ──────────────────────────────────────────
// Rides parameter-automation lanes onto their AudioParams. Mirrors
// AudioClipScheduler: the LIVE path is transport-tick-anchored (Tone.Transport
// schedule) so it survives seek + loop and — because it schedules AudioParam
// ramps, not a JS poll loop — it also renders under Tone.Offline. The OFFLINE
// path is a simpler single-pass absolute schedule (applyOfflineAutomation).
//
// Value flow per lane: sampleAutomation → clampParamValue → target.map → the
// AudioParam. Wet/dry pairs and dB-scaled params ride via target.map (see
// automationParams / EffectChain.getAutomationTargets).
//
// Seek limitation (shared with the whole engine): the play/stop scheduling
// effect only re-runs on play/pause/stop, and nothing reschedules on a mid-play
// seek — MIDI, audio clips AND automation all rely on transport-tick events, so
// a FORWARD seek skips breakpoints it jumped over until the next one fires.
// Automation deliberately matches that existing MIDI/clip behavior rather than
// adding a divergent seek handler.

import * as Tone from 'tone';
import type { TrackEngine } from './TrackEngine';
import { sampleAutomation, type AutomationLanes } from './automation';
import { clampParamValue, resolveAutomationTargets } from './automationParams';

const PPQ = 480;

export class AutomationScheduler {
  // Per-track transport event ids (for transport.clear on reschedule/cancel).
  private trackEvents = new Map<string, number[]>();
  // Per-track AudioParams touched, so cancelAll can clear their scheduled ramps.
  private trackParams = new Map<string, Set<AudioParam>>();

  /**
   * (Re)schedule a track's live automation starting from `currentTick`. Clears
   * this track's prior events first, so it is safe to call repeatedly — the
   * playback engine re-asserts after the static track-sync stomps a param.
   */
  scheduleTrack(
    trackId: string,
    te: TrackEngine,
    lanes: AutomationLanes | undefined,
    currentTick: number,
    bpm: number,
  ): void {
    this.clearTrack(trackId);
    if (!lanes) return;

    const secPerTick = 60 / bpm / PPQ;
    const transport = Tone.getTransport();
    const now = Tone.getContext().now();
    const ids: number[] = [];
    const params = new Set<AudioParam>();

    for (const [paramId, points] of Object.entries(lanes)) {
      if (!points || points.length === 0) continue;
      const targets = resolveAutomationTargets(paramId, te);
      if (targets.length === 0) continue;

      const clampV = (raw: number) => clampParamValue(paramId, raw);

      // Anchor: the interpolated value at the playhead, applied immediately.
      const anchor = clampV(
        sampleAutomation(points, currentTick) ?? points[0].value,
      );
      for (const tg of targets) {
        tg.param.cancelScheduledValues(now);
        tg.param.setValueAtTime(tg.map(anchor), now);
        params.add(tg.param);
      }

      // First breakpoint strictly after the playhead.
      let k = 0;
      while (k < points.length && points[k].tick <= currentTick) k++;

      // Partial current segment: ramp from the anchor to points[k], in real time
      // (the playhead started mid-segment). Uses context time, like the mid-clip
      // branch of AudioClipScheduler.
      if (k < points.length) {
        const kv = clampV(points[k].value);
        const endSec = now + (points[k].tick - currentTick) * secPerTick;
        for (const tg of targets) {
          tg.param.linearRampToValueAtTime(tg.map(kv), Math.max(now, endSec));
        }
      }

      // Future full segments [j, j+1]: transport-anchored so seek/loop re-fire
      // them and Tone.Offline renders them.
      for (let j = k; j < points.length - 1; j++) {
        const p0 = points[j];
        const p1 = points[j + 1];
        const v0 = clampV(p0.value);
        const v1 = clampV(p1.value);
        const durSec = (p1.tick - p0.tick) * secPerTick;
        const id = transport.schedule((time) => {
          for (const tg of targets) {
            tg.param.setValueAtTime(tg.map(v0), time);
            tg.param.linearRampToValueAtTime(tg.map(v1), time + durSec);
          }
        }, `${p0.tick}i`);
        ids.push(id);
      }
    }

    this.trackEvents.set(trackId, ids);
    this.trackParams.set(trackId, params);
  }

  /**
   * Clear a single track's automation: cancels its scheduled transport events
   * AND the in-flight ramps on every param it touched. Cancelling the param
   * ramps is what lets a DELETED lane snap back — the caller re-applies the
   * static value afterwards (a scheduleTrack for a still-present lane re-anchors
   * it, so freezing here first is harmless there).
   */
  clearTrack(trackId: string): void {
    const ids = this.trackEvents.get(trackId);
    if (ids) {
      const transport = Tone.getTransport();
      for (const id of ids) transport.clear(id);
    }
    const params = this.trackParams.get(trackId);
    if (params) {
      const now = Tone.getContext().now();
      for (const p of params) p.cancelScheduledValues(now);
    }
    this.trackEvents.delete(trackId);
    this.trackParams.delete(trackId);
  }

  /**
   * Cancel ALL automation: clears every transport event AND cancels scheduled
   * ramps on every touched AudioParam (so a following static `.value =` write
   * isn't overridden by a lingering ramp). The caller must re-apply static
   * values afterwards to snap params back to the fader/knob positions.
   */
  cancelAll(): void {
    const transport = Tone.getTransport();
    const now = Tone.getContext().now();
    for (const ids of this.trackEvents.values()) {
      for (const id of ids) transport.clear(id);
    }
    for (const params of this.trackParams.values()) {
      for (const p of params) p.cancelScheduledValues(now);
    }
    this.trackEvents.clear();
    this.trackParams.clear();
  }
}

/**
 * Offline single-pass automation for the bounce render. Schedules absolute-time
 * ramps directly on the params (no transport events needed — one pass, no seek).
 * `startTick` shifts the render window to t=0, matching MIDI/clip scheduling.
 */
export function applyOfflineAutomation(
  te: TrackEngine,
  lanes: AutomationLanes | undefined,
  startTick: number,
  bpm: number,
): void {
  if (!lanes) return;
  const secPerTick = 60 / bpm / PPQ;

  for (const [paramId, points] of Object.entries(lanes)) {
    if (!points || points.length === 0) continue;
    const targets = resolveAutomationTargets(paramId, te);
    if (targets.length === 0) continue;

    const clampV = (raw: number) => clampParamValue(paramId, raw);
    // Anchor at the window start (interpolated); holds before the first point.
    const anchor = clampV(
      sampleAutomation(points, startTick) ?? points[0].value,
    );
    for (const tg of targets) tg.param.setValueAtTime(tg.map(anchor), 0);

    for (const pt of points) {
      if (pt.tick <= startTick) continue; // negative/zero time throws; anchor covers it
      const sec = (pt.tick - startTick) * secPerTick;
      const v = clampV(pt.value);
      for (const tg of targets)
        tg.param.linearRampToValueAtTime(tg.map(v), sec);
    }
  }
}
