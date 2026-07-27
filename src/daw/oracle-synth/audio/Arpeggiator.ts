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

export class Arpeggiator {
  private heldNotes = new Map<number, number>(); // note → velocity
  private pattern: number[] = [];
  private patternIndex = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentNote: number | null = null;
  private velocity = 0.8;
  private bpm = 120;
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
    private outputNoteOn: (note: number, velocity: number) => void,
    private outputNoteOff: (note: number) => void,
  ) {}

  setParams(params: ArpParams): void {
    const wasEnabled = this.params.enabled;
    this.params = params;

    if (!params.enabled && wasEnabled) {
      this.stopArp();
      return;
    }

    if (params.enabled && this.heldNotes.size > 0) {
      this.rebuildAndRestart();
    }
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
    if (this.intervalId !== null && this.params.enabled) {
      this.restartTimer();
    }
  }

  /**
   * Live chord context from the DAW's music-intelligence bus. When
   * `chordAware` is on, held notes snap to these chord tones. The pattern
   * is rebuilt in place (no timer restart) so the arp transitions smoothly
   * as the progression moves.
   */
  setChordContext(chordPcs: number[] | null): void {
    this.chordMask =
      chordPcs && chordPcs.length > 0
        ? chordPcs.reduce((mask, pc) => mask | (1 << ((pc % 12) + 12) % 12), 0)
        : 0;

    if (
      this.params.enabled &&
      this.params.chordAware &&
      this.heldNotes.size > 0
    ) {
      this.rebuildPattern();
      if (this.patternIndex >= this.pattern.length) {
        this.patternIndex = 0;
      }
    }
  }

  noteOn(note: number, velocity: number): void {
    this.heldNotes.set(note, velocity);
    this.velocity = velocity;

    if (this.params.enabled) {
      this.rebuildAndRestart();
    }
  }

  noteOff(note: number): void {
    this.heldNotes.delete(note);

    if (this.heldNotes.size === 0) {
      this.stopArp();
    } else if (this.params.enabled) {
      this.rebuildPattern();
      // Clamp index if pattern shortened
      if (this.patternIndex >= this.pattern.length) {
        this.patternIndex = 0;
      }
    }
  }

  allNotesOff(): void {
    this.heldNotes.clear();
    this.stopArp();
  }

  dispose(): void {
    this.allNotesOff();
  }

  private rebuildAndRestart(): void {
    this.rebuildPattern();
    this.patternIndex = 0;
    this.restartTimer();
    // Play first note immediately
    this.tick();
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

  private getIntervalMs(): number {
    const beats = rateDivToBeats(this.params.rate);
    return (beats * 60000) / this.bpm;
  }

  private restartTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    const ms = this.getIntervalMs();
    this.intervalId = setInterval(() => this.tick(), ms);
  }

  private tick(): void {
    if (this.pattern.length === 0) return;

    // Turn off previous note
    if (this.currentNote !== null) {
      this.outputNoteOff(this.currentNote);
      this.currentNote = null;
    }

    // Play next note in pattern
    const note = this.pattern[this.patternIndex % this.pattern.length];
    this.outputNoteOn(note, this.velocity);
    this.currentNote = note;

    this.patternIndex = (this.patternIndex + 1) % this.pattern.length;
  }

  private stopArp(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.currentNote !== null) {
      this.outputNoteOff(this.currentNote);
      this.currentNote = null;
    }
    this.patternIndex = 0;
    this.pattern = [];
  }
}
