import * as Tone from 'tone';

export class MetronomeEngine {
  private synth: Tone.MembraneSynth | null = null;
  private loopId: number | null = null;
  private enabled = false;

  init(destination: AudioNode): void {
    this.synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
    });
    this.synth.connect(destination);
    this.synth.volume.value = -10; // quieter than instruments
  }

  start(): void {
    if (!this.synth || !this.enabled) return;
    this.stop(); // Clear any existing loop to prevent leaks on double-start
    // Schedule a click on every quarter note beat
    this.loopId = Tone.getTransport().scheduleRepeat((time) => {
      // Higher pitch on beat 1 (of each bar)
      const position = Tone.getTransport().position;
      // position is "bars:quarters:sixteenths" string
      const beat = parseInt(String(position).split(':')[1], 10);
      const pitch = beat === 0 ? 'C5' : 'C4';
      this.synth!.triggerAttackRelease(pitch, '32n', time);
    }, '4n'); // every quarter note
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
