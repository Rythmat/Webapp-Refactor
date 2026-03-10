import * as Tone from 'tone';

export class MetronomeEngine {
  private synth: Tone.MembraneSynth | null = null;
  private loopId: number | null = null;
  private enabled = false;
  private numerator = 4;
  private denominator = 4;

  init(destination: AudioNode): void {
    this.synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    });
    this.synth.connect(destination);
    this.synth.volume.value = -10; // quieter than instruments
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
    if (!this.synth || !this.enabled) return;
    this.stop(); // Clear any existing loop to prevent leaks on double-start

    // Determine beat interval based on denominator
    const interval =
      this.denominator === 8 ? '8n' : this.denominator === 2 ? '2n' : '4n'; // default: quarter note

    // Determine compound meter accent pattern (6/8, 9/8, 12/8)
    const isCompound =
      this.denominator === 8 && this.numerator % 3 === 0 && this.numerator >= 6;

    let beatCounter = 0;

    this.loopId = Tone.getTransport().scheduleRepeat((time) => {
      let pitch: string;
      if (beatCounter === 0) {
        // Beat 1 — always accented
        pitch = 'C5';
      } else if (isCompound && beatCounter % 3 === 0) {
        // Compound meter sub-group accent (e.g., beat 4 in 6/8, beats 4 & 7 in 9/8)
        pitch = 'C5';
      } else {
        pitch = 'C4';
      }
      this.synth!.triggerAttackRelease(pitch, '32n', time);
      beatCounter = (beatCounter + 1) % this.numerator;
    }, interval);
  }

  stop(): void {
    if (this.loopId !== null) {
      Tone.getTransport().clear(this.loopId);
      this.loopId = null;
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
    this.synth?.dispose();
  }
}
