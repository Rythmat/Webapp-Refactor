import * as Tone from 'tone';
import { DEFAULT_CLICK_DB, type ClickSound } from './clickSounds';
import { createClickVoice, type ClickVoice } from './clickVoice';

/** Transport ticks per beat in `denominator` time: the note value the
 *  denominator names (2 = half, 4 = quarter, 8 = eighth, 16 = sixteenth), the
 *  same beat the count-in clicks. */
export function ticksPerBeat(denominator: number, ppq: number): number {
  return (ppq * 4) / denominator;
}

/** Which beat of the bar (0-based) the transport position `ticks` falls on. */
export function beatInBarAt(
  ticks: number,
  numerator: number,
  beatTicks: number,
): number {
  const beat = Math.round(ticks / beatTicks);
  return ((beat % numerator) + numerator) % numerator;
}

/** The click for beat `beatInBar` (0-based) of a numerator/denominator bar:
 *  accented on beat 1 and, in compound metres (6/8, 9/8, 12/8), on each
 *  group of three. Shared with the count-in so both click the same bar. */
export function clickPitch(
  beatInBar: number,
  numerator: number,
  denominator: number,
): 'C5' | 'C4' {
  if (beatInBar === 0) return 'C5';
  const isCompound = denominator === 8 && numerator % 3 === 0 && numerator >= 6;
  return isCompound && beatInBar % 3 === 0 ? 'C5' : 'C4';
}

export class MetronomeEngine {
  private voice: ClickVoice | null = null;
  private destination: AudioNode | null = null;
  private sound: ClickSound = 'click';
  private volumeDb = DEFAULT_CLICK_DB;
  private loopId: number | null = null;
  // The transport the repeat lives on: Tone's global one is swapped for an
  // offline one while an export renders.
  private loopTransport: ReturnType<typeof Tone.getTransport> | null = null;
  private enabled = false;
  private numerator = 4;
  private denominator = 4;

  /**
   * `destination` is the output itself (clickVoice.ts): the click goes
   * around the master fader and the mastering chain.
   */
  init(
    destination: AudioNode,
    sound: ClickSound = 'click',
    volumeDb = DEFAULT_CLICK_DB,
  ): void {
    this.destination = destination;
    this.sound = sound;
    this.volumeDb = volumeDb;
    this.voice = createClickVoice(sound, destination, volumeDb);
  }

  /** The student's click sound: the next click plays it. */
  setSound(sound: ClickSound): void {
    if (sound === this.sound || !this.destination) return;
    this.sound = sound;
    this.voice?.dispose();
    this.voice = createClickVoice(sound, this.destination, this.volumeDb);
  }

  setVolume(db: number): void {
    this.volumeDb = db;
    this.voice?.setVolume(db);
  }

  setTimeSignature(numerator: number, denominator: number): void {
    this.numerator = numerator;
    this.denominator = denominator;
    // Restart if currently playing to pick up new meter
    if (this.enabled && Tone.getTransport().state === 'started') {
      this.start();
    }
  }

  start(): void {
    if (!this.voice || !this.enabled) return;
    this.stop(); // Clear any existing loop to prevent leaks on double-start

    const transport = Tone.getTransport();
    const { numerator, denominator } = this;
    const beatTicks = ticksPerBeat(denominator, transport.PPQ);

    // The grid is anchored at tick 0, not at the play position, so the clicks
    // stay on the beat after a mid-beat pause/resume and on every loop lap
    // (Tone re-derives a repeat's next tick from its start time). The accent
    // comes from where the click falls in the bar, not from a click count.
    this.loopTransport = transport;
    this.loopId = transport.scheduleRepeat(
      (time) => {
        const beat = beatInBarAt(
          transport.getTicksAtTime(time),
          numerator,
          beatTicks,
        );
        this.voice?.trigger(
          clickPitch(beat, numerator, denominator) === 'C5',
          time,
        );
      },
      `${beatTicks}i`,
      0,
    );
  }

  stop(): void {
    if (this.loopId !== null) {
      (this.loopTransport ?? Tone.getTransport()).clear(this.loopId);
      this.loopId = null;
      this.loopTransport = null;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && Tone.getTransport().state === 'started') {
      this.start();
    } else {
      this.stop();
    }
  }

  dispose(): void {
    this.stop();
    this.voice?.dispose();
    this.voice = null;
  }
}
