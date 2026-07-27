// ── Mixer ────────────────────────────────────────────────────────────────────
// Named buses between sound sources and the master chain:
//
//     instrument ─┐
//     clip ───────┤
//     metronome ──┼→ bus → masterChain → destination
//     ui ─────────┘
//
// Two things fall out of naming the buses. Categories become independently
// controllable (duck the game bus under narration; mute UI clicks without
// touching music). And a source type is added by declaring a bus name, not by
// rewiring the graph — which is what keeps future features from becoming
// architectural changes.

import { audioContextOwner } from './AudioContextOwner';
import { masterChain } from './MasterChain';

export type BusName =
  /** Live + scheduled instrument playback (synths, samplers, soundfont). */
  | 'instruments'
  /** Prerecorded clips: narration, sound effects, backing tracks. */
  | 'clips'
  /** Metronome clicks — separate so they can be levelled independently. */
  | 'metronome'
  /** UI feedback sounds. */
  | 'ui'
  /** Arcade game engines. */
  | 'games';

class Mixer {
  private buses = new Map<BusName, GainNode>();

  /** The shared bus for a category, created on first use. */
  bus(name: BusName): GainNode {
    let bus = this.buses.get(name);
    if (!bus) {
      bus = audioContextOwner.get().createGain();
      bus.connect(masterChain.getInput());
      this.buses.set(name, bus);
    }
    return bus;
  }

  /**
   * A per-instance gain node feeding a bus. This is the unit of ownership: a
   * game, instrument or clip owns its channel and disconnects it when done,
   * without ever touching the shared graph above it.
   */
  channel(name: BusName, volume = 1): GainNode {
    const channel = audioContextOwner.get().createGain();
    channel.gain.value = volume;
    channel.connect(this.bus(name));
    return channel;
  }

  /** Level for a whole category (0–1). */
  setBusVolume(name: BusName, volume: number): void {
    const bus = this.bus(name);
    bus.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      bus.context.currentTime,
      0.01,
    );
  }
}

export const mixer = new Mixer();
