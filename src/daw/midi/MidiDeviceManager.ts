import { WebMidi } from 'webmidi';

// ── Types ──────────────────────────────────────────────────────────────

export interface MidiDeviceInfo {
  id: string;
  name: string;
  type: 'input' | 'output';
}

interface MidiControlChangeEvent {
  controller: { number: number };
  rawValue?: number;
}

// ── Manager ────────────────────────────────────────────────────────────

/**
 * Manages MIDI device enumeration and live note subscriptions
 * using the WebMidi.js 3.x library.
 */
export class MidiDeviceManager {
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;
  private onChangeCallbacks: Array<() => void> = [];

  /** Enable MIDI access and start listening for device hot-plug events.
   *  @returns `true` if MIDI was successfully enabled, `false` if unavailable.
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await WebMidi.enable({ sysex: false });
        this.initialized = true;

        WebMidi.addListener('connected', () => this.notifyChange());
        WebMidi.addListener('disconnected', () => this.notifyChange());
        return true;
      } catch {
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /** List all currently connected MIDI input devices. */
  getInputs(): MidiDeviceInfo[] {
    return WebMidi.inputs.map((i) => ({
      id: i.id,
      name: i.name,
      type: 'input' as const,
    }));
  }

  /** List all currently connected MIDI output devices. */
  getOutputs(): MidiDeviceInfo[] {
    return WebMidi.outputs.map((o) => ({
      id: o.id,
      name: o.name,
      type: 'output' as const,
    }));
  }

  /**
   * Register a callback invoked whenever a MIDI device is connected or disconnected.
   * @returns An unsubscribe function.
   */
  onDeviceChange(callback: () => void): () => void {
    this.onChangeCallbacks.push(callback);
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(
        (c) => c !== callback,
      );
    };
  }

  /**
   * Subscribe to note and CC events from a specific MIDI input device.
   * @param inputId - The device ID (from getInputs())
   * @param onNoteOn - Called with MIDI note (0-127) and velocity (0-127)
   * @param onNoteOff - Called with MIDI note (0-127)
   * @param onCC - Optional: called with controller number (0-127) and value (0-127)
   * @returns An unsubscribe function.
   */
  subscribeToInput(
    inputId: string,
    onNoteOn: (note: number, velocity: number) => void,
    onNoteOff: (note: number) => void,
    onCC?: (cc: number, value: number) => void,
  ): () => void {
    const input = WebMidi.getInputById(inputId);
    if (!input) {
      return () => {};
    }
    const handleNoteOn = (e: { note: { number: number; attack: number } }) => {
      onNoteOn(e.note.number, Math.round(e.note.attack * 127));
    };
    const handleNoteOff = (e: { note: { number: number } }) => {
      onNoteOff(e.note.number);
    };
    const handleCC = onCC
      ? (e: MidiControlChangeEvent) => {
          onCC(e.controller.number, e.rawValue ?? 0);
        }
      : null;

    input.addListener('noteon', handleNoteOn);
    input.addListener('noteoff', handleNoteOff);
    if (handleCC) input.addListener('controlchange', handleCC);

    return () => {
      input.removeListener('noteon', handleNoteOn);
      input.removeListener('noteoff', handleNoteOff);
      if (handleCC) input.removeListener('controlchange', handleCC);
    };
  }

  private notifyChange(): void {
    for (const cb of this.onChangeCallbacks) cb();
  }

  dispose(): void {
    this.onChangeCallbacks = [];
    if (this.initialized) {
      WebMidi.disable();
      this.initialized = false;
    }
  }
}

/** Singleton instance for app-wide use. */
export const midiDeviceManager = new MidiDeviceManager();
