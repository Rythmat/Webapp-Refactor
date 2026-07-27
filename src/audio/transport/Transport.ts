// ── Transport ────────────────────────────────────────────────────────────────
// The application's tempo and meter — one value, one owner, observable.
//
// Scope note: this is deliberately *not* a play/stop/position transport yet.
// Tone's global transport still owns lesson playback position, and the DAW owns
// its own; two competing position clocks would be worse than the current one.
// What the app needs today is a single answer to "what tempo are we at", so
// that a metronome, a backing track and a lesson can't disagree — and a place
// for position to live later, when transport ownership moves here.

const MIN_BPM = 20;
const MAX_BPM = 300;

type TempoListener = (bpm: number) => void;

class Transport {
  private bpmValue = 120;
  private beatsPerBarValue = 4;
  private listeners = new Set<TempoListener>();

  get bpm(): number {
    return this.bpmValue;
  }

  get beatsPerBar(): number {
    return this.beatsPerBarValue;
  }

  /** Seconds between beats at the current tempo. */
  get secondsPerBeat(): number {
    return 60 / this.bpmValue;
  }

  setTempo(bpm: number): void {
    const next = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
    if (next === this.bpmValue) return;
    this.bpmValue = next;
    for (const listener of this.listeners) {
      try {
        listener(next);
      } catch (err) {
        console.error('[Transport] tempo listener failed', err);
      }
    }
  }

  setBeatsPerBar(beats: number): void {
    this.beatsPerBarValue = Math.max(1, Math.round(beats));
  }

  /** Observe tempo changes. Returns the unsubscribe function. */
  onTempoChange(listener: TempoListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const transport = new Transport();
export { Transport };
