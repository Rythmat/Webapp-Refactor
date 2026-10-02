// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTone } from '@/audio/core/toneBridge';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import type {
  GuitarChordEvent,
  GuitarInputHandle,
  GuitarInputPrefs,
} from '@/learn/audio/guitar/types';
import {
  GuitarInputSetup,
  type GuitarInputSetupProps,
} from '../GuitarInputSetup';

const devices = vi.hoisted(() => ({
  getAudioInputs: vi.fn(),
  probeDeviceChannelCount: vi.fn(),
}));
vi.mock('@/daw/midi/AudioInputEnumerator', () => devices);

const click = vi.hoisted(() => ({ playClick: vi.fn() }));
vi.mock('@/learn/audio/metronomeClick', () => click);
vi.mock('@/audio/core/toneBridge', () => ({
  startTone: vi.fn(async () => {}),
}));
/** Tone's usual lookAhead: a click sounds 100 ms after it is sent. */
vi.mock('tone', () => ({ getContext: () => ({ lookAhead: 0.1 }) }));

// The real tuner reaches the Studio store; the setup only has to hand it the
// handle's analyser.
vi.mock('@/daw/components/Controls/TunerDisplay', () => ({
  TunerDisplay: (props: {
    externalAnalyser: AnalyserNode | null;
    instrumentType: string;
    deviceId: string | null;
  }) => (
    <div
      data-testid="tuner"
      data-instrument={props.instrumentType}
      data-external={props.externalAnalyser === ANALYSER ? 'yes' : 'no'}
      data-device={String(props.deviceId)}
    />
  ),
}));

const ANALYSER = { fftSize: 4096 } as AnalyserNode;

const PREFS: GuitarInputPrefs = {
  source: 'audio',
  deviceId: null,
  channel: 0,
  trimDb: 0,
  gateRms: 0.01,
  inputLatencyMs: 0,
  bleedDetected: false,
  monitorThroughAmp: false,
};

function makeHandle(
  over: Partial<GuitarInputHandle> = {},
  prefs: Partial<GuitarInputPrefs> = {},
): GuitarInputHandle {
  return {
    status: 'needs-setup',
    prefs: { ...PREFS, ...prefs },
    level: 0,
    error: null,
    enable: vi.fn(async () => {}),
    restart: vi.fn(async () => {}),
    setEvaluationMode: vi.fn(),
    setSuppressed: vi.fn(),
    setExpectedNotes: vi.fn(),
    setKeyContext: vi.fn(),
    calibrateGate: vi.fn(async () => 0.012),
    getTunerAnalyser: vi.fn(() => ANALYSER),
    getLastChroma: vi.fn(() => null),
    getRig: vi.fn(() => null),
    ...over,
  };
}

/** The Learn input's subscriber sets, driven by hand. */
function makeInput() {
  const notes = new Set<(event: MidiNoteEvent) => void>();
  const chords = new Set<(event: GuitarChordEvent) => void>();
  const emitChord = (event: Partial<GuitarChordEvent>) =>
    chords.forEach((cb) =>
      cb({
        phase: 'on',
        strumId: 1,
        rootPc: 0,
        quality: '',
        pcs: [],
        confidence: 0.9,
        onsetPerfMs: performance.now(),
        source: 'audio',
        ...event,
      }),
    );
  return {
    subscribeNoteOn: vi.fn((cb: (event: MidiNoteEvent) => void) => {
      notes.add(cb);
      return () => void notes.delete(cb);
    }),
    subscribeChord: vi.fn((cb: (event: GuitarChordEvent) => void) => {
      chords.add(cb);
      return () => void chords.delete(cb);
    }),
    note: (number: number, source: 'audio' | 'midi' = 'audio') =>
      act(() =>
        notes.forEach((cb) =>
          cb({ number, velocity: 90, duration: 0, source }),
        ),
      ),
    chord: (event: Partial<GuitarChordEvent>) => act(() => emitChord(event)),
    /** Outside act: for callbacks the component itself is awaiting. */
    emitChord,
    listeners: () => notes.size + chords.size,
  };
}

function renderSetup(over: Partial<GuitarInputSetupProps> = {}) {
  const input = makeInput();
  const props: GuitarInputSetupProps = {
    open: true,
    onClose: vi.fn(),
    handle: makeHandle(),
    subscribeNoteOn: input.subscribeNoteOn,
    subscribeChord: input.subscribeChord,
    onPlayTestChord: vi.fn(async () => {}),
    ...over,
  };
  const view = render(<GuitarInputSetup {...props} />);
  /** The Learn input re-renders with a new handle as its state changes. */
  const update = (next: Partial<GuitarInputHandle>) => {
    props.handle = { ...props.handle, ...next };
    view.rerender(<GuitarInputSetup {...props} />);
  };
  return { ...view, input, props, handle: props.handle, update };
}

const title = () => screen.getByRole('heading').textContent;
/** Results must sit in a live region, so screen readers announce them. */
const announced = (text: RegExp) =>
  screen.getByText(text).closest('[role="status"]');
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const press = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }));
const lastMode = (handle: GuitarInputHandle) =>
  vi.mocked(handle.setEvaluationMode).mock.calls.at(-1)?.[0];

beforeEach(() => {
  devices.getAudioInputs.mockResolvedValue([
    { id: 'default', label: 'Default - Built-in', groupId: 'a' },
    { id: 'usb', label: 'USB Interface', groupId: 'b' },
  ]);
  devices.probeDeviceChannelCount.mockResolvedValue(4);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('GuitarInputSetup: source and microphone', () => {
  it('opens on the source step without touching the microphone', () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });
    const { handle } = renderSetup();

    expect(title()).toBe('How does your guitar connect?');
    expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Microphone or audio interface/ }),
    ).toBeChecked();
    expect(screen.getByText(/30 to 60 cm/)).toBeInTheDocument();
    expect(handle.enable).not.toHaveBeenCalled();
    expect(devices.getAudioInputs).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(lastMode(handle)).toBe('off');
  });

  it('asks for the microphone only from the explainer button', async () => {
    const { handle, update } = renderSetup();
    press('Next');

    expect(title()).toBe('Turn the microphone on');
    expect(screen.getByText(/your browser asks/)).toBeInTheDocument();
    expect(handle.enable).not.toHaveBeenCalled();

    await act(async () => press(/Turn microphone on/));
    expect(handle.enable).toHaveBeenCalledTimes(1);

    update({ status: 'listening' });
    expect(title()).toBe('Check the level');
  });

  it('saves the audio source on Next, and enables only from the button', async () => {
    const { handle } = renderSetup({
      handle: makeHandle({}, { source: 'midi' }),
    });
    fireEvent.click(
      screen.getByRole('radio', { name: /Microphone or audio interface/ }),
    );
    press('Next');
    expect(handle.restart).toHaveBeenCalledWith({ source: 'audio' });
    expect(handle.enable).not.toHaveBeenCalled();
    await act(async () => press(/Turn microphone on/));

    expect(vi.mocked(handle.restart).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(handle.enable).mock.invocationCallOrder[0],
    );
  });

  it('shows how to allow the mic when denied, and falls back to MIDI', async () => {
    const { handle, update, input } = renderSetup();
    press('Next');
    await act(async () => press(/Turn microphone on/));
    update({ status: 'denied' });

    expect(announced(/The microphone is blocked\./)).not.toBeNull();
    for (const browser of [
      'Chrome or Edge',
      'Safari on a Mac',
      'Chromebook',
      'iPad',
    ]) {
      expect(screen.getByText(browser)).toBeInTheDocument();
    }
    await act(async () => press('Try again'));
    expect(handle.enable).toHaveBeenCalledTimes(2);

    press('Use MIDI guitar instead');
    expect(handle.restart).toHaveBeenCalledWith({ source: 'midi' });
    expect(title()).toBe('Play a note');
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();

    input.note(64, 'midi');
    expect(screen.getByText(/Got it: E4/)).toBeInTheDocument();
    press('Next');
    expect(title()).toBe('All set');
    expect(handle.restart).toHaveBeenCalledWith({
      setupCompletedAt: expect.any(Number),
    });
  });

  it('passes over the mic checks when the mic stays off', () => {
    const { handle } = renderSetup();
    press('Next');
    press('Skip');

    expect(title()).toBe('All set');
    expect(handle.enable).not.toHaveBeenCalled();
    expect(
      screen.getByText('The microphone is still off.'),
    ).toBeInTheDocument();
    expect(screen.queryByText("You're ready to play.")).toBeNull();
    press('Back');
    expect(title()).toBe('Turn the microphone on');
  });

  it('runs a MIDI guitar through a note check only', () => {
    const { handle, input } = renderSetup();
    fireEvent.click(screen.getByRole('radio', { name: /MIDI guitar/ }));
    press('Next');

    expect(handle.restart).toHaveBeenCalledWith({ source: 'midi' });
    expect(title()).toBe('Play a note');
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();

    input.note(52, 'audio');
    expect(screen.queryByText(/Got it/)).not.toBeInTheDocument();
    input.note(45, 'midi');
    expect(announced(/Got it: A2/)).not.toBeNull();
    expect(handle.enable).not.toHaveBeenCalled();
  });

  it('explains a missing microphone and tries again', async () => {
    const { handle } = renderSetup({
      handle: makeHandle({ status: 'no-device' }),
      initialStep: 'mic',
    });
    expect(announced(/can't find a microphone/)).not.toBeNull();
    await act(async () => press('Try again'));
    expect(handle.enable).toHaveBeenCalledTimes(1);
  });

  it('waits on a mic check while the browser asks, listing nothing', async () => {
    const { update } = renderSetup({
      handle: makeHandle({ status: 'requesting-permission' }),
      initialStep: 'level',
    });
    await act(async () => {});
    expect(title()).toBe('Check the level');
    expect(screen.getByText(/Waiting for your browser/)).toBeInTheDocument();
    expect(devices.getAudioInputs).not.toHaveBeenCalled();

    update({ status: 'listening' });
    await act(async () => {});
    expect(
      screen.getByRole('combobox', { name: 'Input device' }),
    ).toBeVisible();
    expect(devices.getAudioInputs).toHaveBeenCalledTimes(1);
  });
});

describe('GuitarInputSetup: level, room and tuner', () => {
  const listening = () =>
    makeHandle({ status: 'listening', level: 0.1 }, { trimDb: 3 });

  it('picks the device and channel, meters the level and trims', async () => {
    const handle = listening();
    renderSetup({ handle, initialStep: 'level' });
    await act(async () => {});

    expect(title()).toBe('Check the level');
    expect(lastMode(handle)).toBe('off');
    expect(handle.setKeyContext).not.toHaveBeenCalled();
    expect(screen.getByRole('meter', { name: 'Input level' })).toHaveAttribute(
      'aria-valuenow',
      '67',
    );
    const device = screen.getByRole('combobox', { name: 'Input device' });
    expect(
      within(device)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Default microphone', 'USB Interface']);
    expect(
      screen.queryByRole('combobox', { name: 'Input channel' }),
    ).toBeNull();

    await act(async () => {
      fireEvent.change(device, { target: { value: 'usb' } });
    });
    expect(handle.restart).toHaveBeenCalledWith({
      deviceId: 'usb',
      channel: 0,
    });
    expect(devices.probeDeviceChannelCount).toHaveBeenCalledWith('usb');
    const channel = screen.getByRole('combobox', { name: 'Input channel' });
    expect(within(channel).getAllByRole('option')).toHaveLength(4);
    fireEvent.change(channel, { target: { value: '1' } });
    expect(handle.restart).toHaveBeenCalledWith({ channel: 1 });

    expect(screen.getByText('Boost: +3 dB')).toBeInTheDocument();
    press(/Louder/);
    expect(handle.restart).toHaveBeenCalledWith({ trimDb: 6 });
    press(/Quieter/);
    press(/Quieter/);
    expect(handle.restart).toHaveBeenLastCalledWith({ trimDb: 0 });
  });

  it('measures the room for 2 seconds', async () => {
    let measured = (_gate: number) => {};
    const handle = makeHandle({
      status: 'listening',
      calibrateGate: vi.fn(
        () => new Promise<number>((resolve) => (measured = resolve)),
      ),
    });
    renderSetup({ handle, initialStep: 'quiet' });
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();

    press('Start');
    expect(handle.calibrateGate).toHaveBeenCalledWith(2000);
    // A screen reader speaking now would be measured as room noise.
    expect(
      screen.getByText('Stay quiet…').closest('[role="status"]'),
    ).toBeNull();
    await act(async () => measured(0.012));
    expect(announced(/We know how quiet your room is/)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('loads the tuner on the handle analyser', async () => {
    renderSetup({ handle: listening(), initialStep: 'tuner' });
    const tuner = await screen.findByTestId('tuner');
    expect(tuner.dataset).toMatchObject({
      instrument: 'guitar',
      external: 'yes',
      device: 'null',
    });
  });

  it('starts a mic check at the mic step while the mic is off', () => {
    const { handle } = renderSetup({ initialStep: 'tuner' });
    expect(title()).toBe('Turn the microphone on');
    expect(handle.getTunerAnalyser).not.toHaveBeenCalled();
  });
});

describe('GuitarInputSetup: string and chord checks', () => {
  const listening = () => makeHandle({ status: 'listening' });

  it('hears the low E, then the high e, by pitch class and octave', () => {
    const { handle, input } = renderSetup({
      handle: listening(),
      initialStep: 'strings',
    });
    expect(lastMode(handle)).toBe('notes');
    expect(handle.setSuppressed).toHaveBeenLastCalledWith(false);
    // The lesson's note prior and key must not tilt the check.
    expect(handle.setExpectedNotes).toHaveBeenLastCalledWith(null);
    expect(handle.setKeyContext).toHaveBeenLastCalledWith(0, MAJOR);
    const rows = () => [
      screen.getByText(/low E string/).closest('li'),
      screen.getByText(/high e string/).closest('li'),
    ];

    input.note(41); // F
    input.note(40, 'midi'); // not the mic
    input.note(16); // two octaves down
    input.note(64); // the high string comes second
    expect(rows()[0]).toHaveTextContent('Listening…');

    input.note(52); // low E heard an octave up
    expect(rows()[0]).toHaveTextContent('Heard it');
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();

    input.note(52); // could be the low string still ringing
    input.note(88); // two octaves up
    expect(rows()[1]).toHaveTextContent('Listening…');
    input.note(76);
    expect(rows()[1]).toHaveTextContent('Heard it');
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('gives low-string advice after 8 s and lets the student go on', () => {
    vi.useFakeTimers();
    const { input } = renderSetup({
      handle: listening(),
      initialStep: 'strings',
    });
    act(() => vi.advanceTimersByTime(7900));
    expect(screen.queryByText(/can't hear the low string/)).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByText(/can't hear the low string/)).toBeInTheDocument();
    expect(
      screen.getByText(/audio interface hears low strings/),
    ).toBeInTheDocument();

    press('Continue anyway');
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    input.note(64);
    expect(screen.getByText('Heard it')).toBeInTheDocument();
  });

  it('passes E minor on its pitch classes, not its name', () => {
    const { handle, input } = renderSetup({
      handle: listening(),
      initialStep: 'chord',
    });
    expect(lastMode(handle)).toBe('chords');
    // E minor's root is outside some lesson keys (D♭, E♭, A♭): check in C.
    expect(handle.setKeyContext).toHaveBeenLastCalledWith(0, MAJOR);

    // Named E minor, but an open D string rang too.
    const em7 = { rootPc: 4, quality: 'minor', pcs: [4, 7, 11, 2] };
    input.chord(em7);
    expect(announced(/Not quite\. We heard E, G, B, D/)).not.toBeNull();

    input.chord({ pcs: [] }); // an attack with nothing named
    expect(announced(/not clearly/)).not.toBeNull();

    input.chord(em7);
    input.chord({ unclear: true, rootPc: 4, pcs: [4, 7, 11] });
    expect(screen.getByText(/not clearly/)).toBeInTheDocument();

    input.chord({
      rootPc: 4,
      quality: 'minor',
      pcs: [4, 7, 11],
      source: 'midi',
    });
    expect(screen.queryByText(/That's E minor/)).toBeNull();

    // E G B under another name still counts.
    input.chord({ rootPc: 7, quality: '', pcs: [11, 7, 4], phase: 'change' });
    expect(announced(/That's E minor/)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /E minor: 0 2 2 0 0 0/ }),
    ).toBeInTheDocument();
  });
});

describe('GuitarInputSetup: speaker echo and timing', () => {
  const listening = (prefs: Partial<GuitarInputPrefs> = {}) =>
    makeHandle({ status: 'listening' }, prefs);

  it('flags bleed when C major is heard while the test chord plays', async () => {
    vi.useFakeTimers();
    const input = makeInput();
    const handle = listening();
    const onPlayTestChord = vi.fn(async () => {
      input.emitChord({ rootPc: 0, quality: 'major', pcs: [0, 4, 7] });
    });
    render(
      <GuitarInputSetup
        open
        onClose={vi.fn()}
        handle={handle}
        subscribeNoteOn={input.subscribeNoteOn}
        subscribeChord={input.subscribeChord}
        onPlayTestChord={onPlayTestChord}
        initialStep="bleed"
      />,
    );
    expect(lastMode(handle)).toBe('chords');
    expect(screen.getByText(/Bluetooth headset/)).toBeInTheDocument();

    press('Play test chord');
    await act(() => vi.advanceTimersByTimeAsync(1200));

    expect(onPlayTestChord).toHaveBeenCalledTimes(1);
    expect(handle.restart).toHaveBeenCalledWith({ bleedDetected: true });
    expect(announced(/heard the app's own sound/)).not.toBeNull();
    expect(screen.getByText(/Use headphones/)).toBeInTheDocument();
    expect(input.listeners()).toBe(0);
  });

  it('clears bleed when the speakers are not heard', async () => {
    vi.useFakeTimers();
    const { handle } = renderSetup({
      handle: listening({ bleedDetected: true }),
      initialStep: 'bleed',
    });
    press('Play test chord');
    await act(() => vi.advanceTimersByTimeAsync(1200));

    expect(handle.restart).toHaveBeenCalledWith({ bleedDetected: false });
    expect(screen.getByText(/did not hear the speakers/)).toBeInTheDocument();
  });

  it('sets the input delay from the median strum offset', async () => {
    vi.useFakeTimers();
    const input = makeInput();
    const handle = listening({ inputLatencyMs: 10 });
    // Strum − heard click per click: the 5th is too late to pair, and the
    // 7th is a slip the median shrugs off (a mean would not).
    const offsets = [30, 25, 35, 30, 400, 28, 300, 30];
    const heardLagMs = (0.1 + 0.2) * 1000; // lookAhead + output delay
    click.playClick.mockImplementation(() => {
      const offset = offsets[click.playClick.mock.calls.length - 1];
      input.emitChord({ onsetPerfMs: performance.now() + heardLagMs + offset });
      // An 'off' is not a strum.
      input.emitChord({ phase: 'off', onsetPerfMs: performance.now() });
    });
    render(
      <GuitarInputSetup
        open
        onClose={vi.fn()}
        handle={handle}
        subscribeNoteOn={input.subscribeNoteOn}
        subscribeChord={input.subscribeChord}
        onPlayTestChord={vi.fn(async () => {})}
        outputLatencySec={0.2}
        initialStep="timing"
      />,
    );
    expect(screen.getByText(/Bluetooth often does this/)).toBeInTheDocument();

    press('Start');
    await act(() => vi.advanceTimersByTimeAsync(1000 + 8 * 750 + 500));

    expect(click.playClick).toHaveBeenCalledTimes(8);
    expect(click.playClick.mock.calls.map(([down]) => down)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    // Median of the 7 paired offsets is 30, added to the saved 10.
    expect(handle.restart).toHaveBeenCalledWith({ inputLatencyMs: 40 });
    expect(screen.getByText(/input delay is about 40 ms/)).toBeInTheDocument();
    expect(input.listeners()).toBe(0);
  });

  it('asks again when too few strums were heard', async () => {
    vi.useFakeTimers();
    const input = makeInput();
    const handle = listening();
    click.playClick.mockImplementation(() => {
      if (click.playClick.mock.calls.length <= 3) {
        input.emitChord({ onsetPerfMs: performance.now() + 100 });
      }
    });
    render(
      <GuitarInputSetup
        open
        onClose={vi.fn()}
        handle={handle}
        subscribeNoteOn={input.subscribeNoteOn}
        subscribeChord={input.subscribeChord}
        onPlayTestChord={vi.fn(async () => {})}
        initialStep="timing"
      />,
    );
    expect(screen.queryByText(/Bluetooth often does this/)).toBeNull();
    press('Start');
    await act(() => vi.advanceTimersByTimeAsync(1000 + 8 * 750 + 500));

    expect(screen.getByText(/We heard 3 of 8 strums/)).toBeInTheDocument();
    expect(handle.restart).not.toHaveBeenCalledWith(
      expect.objectContaining({ inputLatencyMs: expect.any(Number) }),
    );
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });

  it('re-measures from scratch when the saved delay is far off', async () => {
    vi.useFakeTimers();
    const input = makeInput();
    // Saved 300 ms, really 40: events arrive 260 ms "early" once the saved
    // delay is taken off, too early to pair if it weren't put back.
    const handle = listening({ inputLatencyMs: 300 });
    click.playClick.mockImplementation(() => {
      const heardAt = performance.now() + 100; // lookAhead
      input.emitChord({ onsetPerfMs: heardAt + 40 - 300 });
    });
    render(
      <GuitarInputSetup
        open
        onClose={vi.fn()}
        handle={handle}
        subscribeNoteOn={input.subscribeNoteOn}
        subscribeChord={input.subscribeChord}
        onPlayTestChord={vi.fn(async () => {})}
        initialStep="timing"
      />,
    );
    press('Start');
    await act(() => vi.advanceTimersByTimeAsync(1000 + 8 * 750 + 500));

    expect(handle.restart).toHaveBeenCalledWith({ inputLatencyMs: 40 });
    expect(announced(/input delay is about 40 ms/)).not.toBeNull();
  });

  it('says so when the clicks cannot play', async () => {
    vi.mocked(startTone).mockRejectedValueOnce(new Error('blocked'));
    const input = makeInput();
    render(
      <GuitarInputSetup
        open
        onClose={vi.fn()}
        handle={listening()}
        subscribeNoteOn={input.subscribeNoteOn}
        subscribeChord={input.subscribeChord}
        onPlayTestChord={vi.fn(async () => {})}
        initialStep="timing"
      />,
    );
    await act(async () => press('Start'));

    expect(announced(/couldn't play the clicks/)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(click.playClick).not.toHaveBeenCalled();
    expect(input.listeners()).toBe(0);
  });
});

describe('GuitarInputSetup: lifecycle', () => {
  it('turns the detector off and saves nothing when closed early', () => {
    const { handle, props, rerender } = renderSetup({
      handle: makeHandle({ status: 'listening' }),
      initialStep: 'chord',
    });
    expect(lastMode(handle)).toBe('chords');

    press('Close');
    expect(props.onClose).toHaveBeenCalled();
    rerender(<GuitarInputSetup {...props} open={false} />);
    expect(lastMode(handle)).toBe('off');
    expect(handle.restart).not.toHaveBeenCalledWith(
      expect.objectContaining({ setupCompletedAt: expect.any(Number) }),
    );
  });

  it('walks the whole audio flow with every check skipped', () => {
    const { handle, props } = renderSetup({
      handle: makeHandle({ status: 'listening' }),
    });
    const titles = [title()];
    while (!screen.queryByRole('button', { name: 'Done' })) {
      press(/^(Next|Skip)$/);
      titles.push(title());
    }
    expect(titles).toEqual([
      'How does your guitar connect?',
      'Turn the microphone on',
      'Check the level',
      'Measure the room',
      'Tune up',
      'Check the low and high strings',
      'Strum a chord',
      'Check for echo',
      'Check your timing',
      'All set',
    ]);
    expect(screen.getByText("You're ready to play.")).toBeInTheDocument();
    expect(handle.restart).toHaveBeenCalledWith({
      setupCompletedAt: expect.any(Number),
    });
    const progress = screen.getByRole('list', { name: 'Setup progress' });
    expect(within(progress).getAllByRole('listitem')).toHaveLength(10);
    expect(
      within(progress)
        .getAllByRole('listitem')
        .findIndex((li) => li.getAttribute('aria-current') === 'step'),
    ).toBe(9);

    press('Done');
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe('GuitarInputSetup: the landing look', () => {
  it('shows progress as one segment per step, the current one thicker', () => {
    renderSetup();
    press('Next');
    const segments = within(
      screen.getByRole('list', { name: 'Setup progress' }),
    ).getAllByRole('listitem');
    expect(segments).toHaveLength(10);
    expect(segments[1]).toHaveAttribute('aria-current', 'step');
    expect(segments[1]).toHaveClass('h-1');
    expect(segments[0]).toHaveClass('h-0.5');
    expect(segments[2]).toHaveClass('h-0.5');
    expect(segments[1]).toHaveTextContent('Turn the microphone on');
  });

  it('draws Next as the white pill and Skip as the outlined one, never brand yellow', () => {
    renderSetup();
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveClass('bg-white', 'text-[#101012]', 'font-normal');
    expect(next).not.toHaveClass('bg-brand-base');
    press('Next');
    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(skip).toHaveClass('border-white/15', 'bg-white/[0.04]');
    expect(skip).not.toHaveClass('bg-white');
  });

  it('fades without zooming under reduced motion, with a gutter on a phone', () => {
    renderSetup();
    expect(screen.getByRole('dialog')).toHaveClass(
      'w-[calc(100%-2rem)]',
      'max-w-[480px]',
      'motion-reduce:data-[state=open]:zoom-in-100',
      'motion-reduce:data-[state=open]:slide-in-from-top-1/2',
    );
  });

  it('marks the chosen input with a brighter outline', () => {
    renderSetup();
    const option = (name: RegExp) =>
      screen.getByRole('radio', { name }).closest('label');
    expect(option(/Microphone or audio interface/)).toHaveClass(
      'border-white/40',
      'bg-white/[0.06]',
    );
    expect(option(/MIDI guitar/)).toHaveClass('border-white/10');
    fireEvent.click(screen.getByRole('radio', { name: /MIDI guitar/ }));
    expect(option(/MIDI guitar/)).toHaveClass('border-white/40');
  });
});
