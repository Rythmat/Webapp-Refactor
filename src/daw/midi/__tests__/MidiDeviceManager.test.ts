/**
 * WebMidi.js loads with the first init(), not with the editor (milestone
 * 1.12a): before it there are no devices and nothing to subscribe to, after
 * it the manager reads WebMidi as before.
 *
 * Run: npx vitest run src/daw/midi/__tests__/MidiDeviceManager.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MidiDeviceManager } from '../MidiDeviceManager';

const webmidi = vi.hoisted(() => {
  const input = {
    id: 'in-1',
    name: 'Keys',
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  return {
    input,
    WebMidi: {
      enable: vi.fn(async () => {}),
      disable: vi.fn(async () => {}),
      addListener: vi.fn(),
      inputs: [input],
      outputs: [{ id: 'out-1', name: 'Synth' }],
      getInputById: vi.fn((id: string) => (id === 'in-1' ? input : undefined)),
    },
  };
});

vi.mock('webmidi', () => ({ WebMidi: webmidi.WebMidi }));

// A browser with Web MIDI.
beforeEach(() => {
  vi.stubGlobal('navigator', { requestMIDIAccess: vi.fn() });
});
afterEach(() => {
  vi.unstubAllGlobals();
  webmidi.WebMidi.enable.mockImplementation(async () => {});
});

describe('MidiDeviceManager', () => {
  it('lists nothing and subscribes to nothing before init', () => {
    const manager = new MidiDeviceManager();
    expect(manager.getInputs()).toEqual([]);
    expect(manager.getOutputs()).toEqual([]);
    const stop = manager.subscribeToInput('in-1', vi.fn(), vi.fn());
    stop();
    expect(webmidi.input.addListener).not.toHaveBeenCalled();
    expect(webmidi.WebMidi.enable).not.toHaveBeenCalled();
  });

  it('loads WebMidi on init and reads it after', async () => {
    const manager = new MidiDeviceManager();
    await expect(manager.init()).resolves.toBe(true);
    expect(webmidi.WebMidi.enable).toHaveBeenCalledWith({ sysex: false });
    expect(manager.getInputs()).toEqual([
      { id: 'in-1', name: 'Keys', type: 'input' },
    ]);
    expect(manager.getOutputs()).toEqual([
      { id: 'out-1', name: 'Synth', type: 'output' },
    ]);
    const stop = manager.subscribeToInput('in-1', vi.fn(), vi.fn());
    expect(webmidi.input.addListener).toHaveBeenCalledWith(
      'noteon',
      expect.any(Function),
    );
    stop();
    manager.dispose();
    expect(webmidi.WebMidi.disable).toHaveBeenCalled();
  });

  it('says MIDI is unavailable when enabling fails', async () => {
    webmidi.WebMidi.enable.mockRejectedValueOnce(new Error('denied'));
    const manager = new MidiDeviceManager();
    await expect(manager.init()).resolves.toBe(false);
    expect(manager.getInputs()).toEqual([]);
  });
});

// ── Why MIDI is off (engine-hooks-27) ────────────────────────────────────────
// Settings says which: no Web MIDI in this browser, or the page refused it.
describe('MidiDeviceManager failures', () => {
  it('says unsupported when the browser has no Web MIDI', async () => {
    vi.stubGlobal('navigator', {});
    const manager = new MidiDeviceManager();
    await expect(manager.init()).resolves.toBe(false);
    expect(manager.failure).toBe('unsupported');
  });

  it('says denied when the browser refuses the page', async () => {
    webmidi.WebMidi.enable.mockImplementation(async () => {
      throw new Error('The request was denied');
    });
    const manager = new MidiDeviceManager();
    await expect(manager.init()).resolves.toBe(false);
    expect(manager.failure).toBe('denied');
  });
});
