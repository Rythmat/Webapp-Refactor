// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { useStore } from '@/daw/store';
import { SettingsModal, inputOptions, midiStatusText } from '../SettingsModal';

// ── Audio & MIDI settings (plan 2.3; shell-21, engine-hooks-27) ─────────────
// Opening the dialog asks the browser for nothing: it used to open the
// microphone to read device names, so every look at Settings meant a
// permission prompt. MIDI says which of its four states it is in, where the
// top bar used to show a red "MIDI" with no keyboard plugged in.

const getUserMedia = vi.fn();

beforeAll(installDomShims);
beforeEach(() => {
  getUserMedia.mockReset();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia,
      // No permission yet: Chrome lists one unnamed input and output.
      enumerateDevices: vi.fn(async () => [
        { deviceId: '', kind: 'audioinput', label: '', groupId: '' },
        { deviceId: '', kind: 'audiooutput', label: '', groupId: '' },
      ]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: vi.fn(async () => ({ state: 'prompt' })) },
  });
  useStore.setState({
    settingsOpen: true,
    inputDeviceId: null,
    midiStatus: 'no-device',
    inputs: [],
  });
});
afterEach(cleanup);

describe('SettingsModal', () => {
  it('opens as the Audio & MIDI dialog without asking for the microphone', async () => {
    await act(async () => {
      render(<SettingsModal />);
    });
    expect(screen.getByRole('dialog', { name: 'Audio & MIDI' })).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Choosing an input asks the browser for microphone/),
    ).toBeTruthy();
    expect(screen.getByTestId('midi-status').textContent).toBe(
      'No MIDI keyboard connected',
    );
    // The channel views that changed nothing are gone.
    expect(screen.queryByText('Input Config')).toBeNull();
  });
});

describe('midiStatusText', () => {
  it('names each state in plain words', () => {
    expect(midiStatusText('ready', ['Keystation 49'])).toBe(
      'MIDI: Keystation 49',
    );
    expect(midiStatusText('ready', ['A', 'B'])).toBe(
      'MIDI: 2 keyboards (A, B)',
    );
    expect(midiStatusText('no-device', [])).toBe('No MIDI keyboard connected');
    expect(midiStatusText('unsupported', [])).toMatch(/Chrome or Edge/);
    expect(midiStatusText('denied', [])).toMatch(/blocked/);
  });
});

describe('inputOptions', () => {
  it('offers the default microphone while the names are hidden', () => {
    expect(inputOptions([{ id: '', label: '', groupId: '' }])).toEqual([
      { value: 'default', label: 'Default microphone' },
    ]);
  });

  it('uses the names once the microphone is allowed', () => {
    expect(
      inputOptions([
        { id: 'default', label: '', groupId: 'g' },
        { id: 'abc', label: 'Scarlett 2i2', groupId: 'g' },
      ]),
    ).toEqual([
      { value: 'default', label: 'Default microphone' },
      { value: 'abc', label: 'Scarlett 2i2' },
    ]);
  });
});
