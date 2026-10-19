import { ArpParams, ArpStyle, RateDiv } from './types';
import { quantizePitch } from './ScaleQuantizer';

/** Convert a RateDiv to a number of beats (quarter notes). */
function rateDivToBeats(div: RateDiv): number {
  switch (div) {
    case '4':
      return 16;
    case '2':
      return 8;
    case '1':
      return 4;
    case '1/2d':
      return 3;
    case '1/2':
      return 2;
    case '1/2t':
      return 4 / 3;
    case '1/4d':
      return 1.5;
    case '1/4':
      return 1;
    case '1/4t':
      return 2 / 3;
    case '1/8d':
      return 0.75;
    case '1/8':
      return 0.5;
    case '1/8t':
      return 1 / 3;
    case '1/16d':
      return 0.375;
    case '1/16':
      return 0.25;
    case '1/16t':
      return 1 / 6;
    case '1/32':
      return 0.125;
    case '1/32t':
      return 1 / 12;
    case '1/64':
      return 0.0625;
    default:
      return 0.5;
  }
}

function buildPattern(
  heldNotes: number[],
  distance: number,
  step: number,
  style: ArpStyle,
): number[] {
  // For each step repetition, transpose all held notes by step_index * distance
  const allNotes: number[] = [];
  for (let s = 0; s < step; s++) {
    const transpose = s * distance;
    for (const note of heldNotes) {
      allNotes.push(note + transpose);
    }
  }

  // Sort ascending and remove duplicates
  const sorted = [...new Set(allNotes)].sort((a, b) => a - b);

  if (sorted.length <= 1) return sorted;

  switch (style) {
    case 'up':
      return sorted;
    case 'down':
      return [...sorted].reverse();
    case 'upDown': {
      const down = [...sorted].reverse().slice(1, -1);
      return [...sorted, ...down];
    }
    case 'downUp': {
      const reversed = [...sorted].reverse();
      const up = [...reversed].reverse().slice(1, -1);
      return [...reversed, ...up];
    }
    default:
      return sorted;
  }
}

/** How far ahead of the context clock the live pump schedules steps. */
const PUMP_HORIZON = 0.04;
/** How often the live pump wakes (ms). Only the horizon sets the timing. */
const PUMP_INTERVAL_MS = 20;

export interface ArpClock {
  /** The context clock: steps are placed on it. */
  now: () => number;
  /**
   * Whether a wall-clock pump may run. False for an offline render: there,
   * every note event arrives before rendering starts, and the steps between
   * two events are generated when the later event arrives.
   */
  live: boolean;
}

/**
 * Arpeggiator on context time. Each step has an exact time: the first is
 * the time of the key that started the arp, the next ones follow at the rate
 * (from the BPM), and every output note carries its time. Steps are made
 * lazily: an incoming event first emits every step before its own time (with
 * the keys held until then), so a chord whose notes arrive one call at a time
 * still starts as one chord. While keys are held live, a small pump keeps
 * steps scheduled a little ahead of the clock.
 */
export class Arpeggiator {
  private heldNotes = new Map<number, number>(); // note → velocity
  private pattern: number[] = [];
  private patternIndex = 0;
  private currentNote: number | null = null;
  /** When the sounding arp note started. */
  private currentNoteAt = 0;
  private velocity = 0.8;
  private bpm = 120;
  /** Time of the next step not yet emitted (null while stopped). */
  private nextStepAt: number | null = null;
  private pumpId: ReturnType<typeof setInterval> | null = null;
  private pumpQueued = false;
  // 12-bit pitch-class mask of the live-detected chord (0 = no context)
  private chordMask = 0;
  private params: ArpParams = {
    enabled: false,
    rate: '1/8',
    style: 'up',
    distance: 12,
    step: 1,
    chordAware: false,
  };

  constructor(
    private outputNoteOn: (
      note: number,
      velocity: number,
      time: number,
    ) => void,
    private outputNoteOff: (note: number, time: number) => void,
    private clock: ArpClock = { now: () => 0, live: false },
  ) {}

  /**
   * Rate, style, range and chord settings. Whether the arp is on is the
   * engine's business (it routes keys here or not), so `enabled` is only
   * stored.
   */
  setParams(params: ArpParams): void {
    this.flush(this.clock.now());
    this.params = params;
    if (this.heldNotes.size > 0) {
      this.rebuildPattern();
      if (this.patternIndex >= this.pattern.length) this.patternIndex = 0;
    }
  }

  /** The step length changes from the next step on. */
  setBPM(bpm: number): void {
    this.flush(this.clock.now());
    this.bpm = Math.max(1, bpm);
  }

  /**
   * Live chord context from the DAW's music-intelligence bus. When
   * `chordAware` is on, held notes snap to these chord tones. The pattern
   * is rebuilt in place (the step grid keeps going) so the arp transitions
   * smoothly as the progression moves.
   */
  setChordContext(chordPcs: number[] | null): void {
    this.chordMask =
      chordPcs && chordPcs.length > 0
        ? chordPcs.reduce((mask, pc) => mask | (1 << ((pc % 12) + 12) % 12), 0)
        : 0;

    if (this.params.chordAware && this.heldNotes.size > 0) {
      this.rebuildPattern();
      if (this.patternIndex >= this.pattern.length) {
        this.patternIndex = 0;
      }
    }
  }

  /** Holds `note` from `time` (the clock's now when omitted). */
  noteOn(note: number, velocity: number, time?: number): void {
    const t = time ?? this.clock.now();
    this.flush(t);
    this.heldNotes.set(note, velocity);
    this.velocity = velocity;
    this.rebuildPattern();
    if (this.nextStepAt === null) {
      // The arp starts on this key's time.
      this.patternIndex = 0;
      this.nextStepAt = t;
    }
    this.startPump();
  }

  /** Lets go of `note` at `time`; the last key stops the arp there. */
  noteOff(note: number, time?: number): void {
    const t = time ?? this.clock.now();
    this.flush(t);
    this.heldNotes.delete(note);

    if (this.heldNotes.size === 0) {
      this.stopArp(t);
    } else {
      this.rebuildPattern();
      // Clamp index if pattern shortened
      if (this.patternIndex >= this.pattern.length) {
        this.patternIndex = 0;
      }
    }
  }

  /** Lets go of every key at `time` (now when omitted). */
  allNotesOff(time?: number): void {
    const t = time ?? this.clock.now();
    this.flush(t);
    this.heldNotes.clear();
    this.stopArp(t);
  }

  /** The keys the arp holds (note → velocity), e.g. to hand them back. */
  getHeldNotes(): Map<number, number> {
    return new Map(this.heldNotes);
  }

  dispose(): void {
    this.allNotesOff();
    this.stopPump();
  }

  /** Step length in seconds at the current BPM and rate. */
  getStepSeconds(): number {
    return (rateDivToBeats(this.params.rate) * 60) / this.bpm;
  }

  /** Emits every step that starts before `until`. */
  private flush(until: number): void {
    if (this.nextStepAt === null) return;
    const step = this.getStepSeconds();
    while (this.nextStepAt !== null && this.nextStepAt < until) {
      this.tick(this.nextStepAt);
      this.nextStepAt += step;
    }
  }

  private rebuildPattern(): void {
    if (this.heldNotes.size === 0) {
      this.pattern = [];
      return;
    }

    let notes = [...this.heldNotes.keys()].sort((a, b) => a - b);

    // Chord-aware: constrain held notes to the live-detected chord tones,
    // preserving register. Held notes stay the seed, so the arp responds
    // instantly even when the bus chord lags the progression.
    if (this.params.chordAware && this.chordMask !== 0) {
      notes = [
        ...new Set(
          notes.map((n) => quantizePitch(n, this.chordMask, 'nearest')),
        ),
      ].sort((a, b) => a - b);
    }

    this.pattern = buildPattern(
      notes,
      this.params.distance,
      this.params.step,
      this.params.style,
    );
  }

  private tick(time: number): void {
    if (this.pattern.length === 0) return;

    // Turn off previous note
    if (this.currentNote !== null) {
      this.outputNoteOff(this.currentNote, time);
      this.currentNote = null;
    }

    // Play next note in pattern
    const note = this.pattern[this.patternIndex % this.pattern.length];
    this.outputNoteOn(note, this.velocity, time);
    this.currentNote = note;
    this.currentNoteAt = time;

    this.patternIndex = (this.patternIndex + 1) % this.pattern.length;
  }

  private stopArp(time: number): void {
    this.nextStepAt = null;
    if (this.currentNote !== null) {
      // A live stop can come before a step the pump already placed ahead;
      // that note then ends where it starts (silent) rather than before.
      this.outputNoteOff(this.currentNote, Math.max(time, this.currentNoteAt));
      this.currentNote = null;
    }
    this.patternIndex = 0;
    this.pattern = [];
    this.stopPump();
  }

  /**
   * Live only: keeps steps scheduled up to a little past the clock while
   * keys are held. A microtask runs it right after the current call stack,
   * so the notes of a chord played in one go all land in the first step.
   */
  private startPump(): void {
    if (!this.clock.live) return;
    if (!this.pumpQueued) {
      this.pumpQueued = true;
      queueMicrotask(() => {
        this.pumpQueued = false;
        this.pump();
      });
    }
    if (this.pumpId === null) {
      this.pumpId = setInterval(() => this.pump(), PUMP_INTERVAL_MS);
    }
  }

  private pump(): void {
    if (this.nextStepAt === null) {
      this.stopPump();
      return;
    }
    this.flush(this.clock.now() + PUMP_HORIZON);
  }

  private stopPump(): void {
    if (this.pumpId !== null) {
      clearInterval(this.pumpId);
      this.pumpId = null;
    }
  }
}
