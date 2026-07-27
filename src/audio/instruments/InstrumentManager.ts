// ── InstrumentManager ────────────────────────────────────────────────────────
// One instance of each instrument, loaded on demand, shared by every feature
// for the lifetime of the application.
//
// Registration is by factory rather than by eager construction, so an
// instrument's module (and its assets) only load when something actually asks
// for it — a visitor who never opens a music page never downloads a soundbank.

import type { Instrument } from './Instrument';
import { SoundFontInstrument } from './SoundFontInstrument';

/** Instruments the app can play. Add an id here and a factory below. */
export type InstrumentId = 'gm-soundfont';

const FACTORIES: Record<InstrumentId, () => Instrument> = {
  'gm-soundfont': () => new SoundFontInstrument(),
};

class InstrumentManager {
  private instances = new Map<InstrumentId, Instrument>();
  private loads = new Map<InstrumentId, Promise<Instrument>>();
  /**
   * How many features currently hold each instrument. Nothing is unloaded
   * today — these instruments are small in number and expensive to rebuild —
   * but the count is what a future memory-pressure policy will evict on, and
   * it is far easier to maintain from the start than to retrofit.
   */
  private holders = new Map<InstrumentId, number>();

  /** The instance, constructing it if needed. Does not wait for loading. */
  instance(id: InstrumentId): Instrument {
    let instrument = this.instances.get(id);
    if (!instrument) {
      instrument = FACTORIES[id]();
      this.instances.set(id, instrument);
    }
    return instrument;
  }

  /** Load (or join the in-flight load of) an instrument. */
  load(id: InstrumentId): Promise<Instrument> {
    const existing = this.loads.get(id);
    if (existing) return existing;

    const instrument = this.instance(id);
    const load = instrument
      .load()
      .then(() => instrument)
      .catch((err) => {
        // Drop the failed load so a later attempt can retry instead of
        // replaying the rejection forever.
        this.loads.delete(id);
        throw err;
      });
    this.loads.set(id, load);
    return load;
  }

  /** The instance if it is loaded and can sound right now, else undefined. */
  peek(id: InstrumentId): Instrument | undefined {
    const instrument = this.instances.get(id);
    return instrument?.isReady() ? instrument : undefined;
  }

  isReady(id: InstrumentId): boolean {
    return this.peek(id) !== undefined;
  }

  /** Warm instruments in parallel with rendering. Failures don't reject. */
  async preload(ids: readonly InstrumentId[]): Promise<void> {
    await Promise.all(ids.map((id) => this.load(id).catch(() => null)));
  }

  /** Register interest, for future eviction policy. Returns the release fn. */
  acquire(id: InstrumentId): () => void {
    this.holders.set(id, (this.holders.get(id) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holders.set(id, Math.max(0, (this.holders.get(id) ?? 1) - 1));
    };
  }

  holderCount(id: InstrumentId): number {
    return this.holders.get(id) ?? 0;
  }
}

export const instrumentManager = new InstrumentManager();
