// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GuitarActionBar,
  meterFraction,
  type GuitarActionBarProps,
} from '../GuitarActionBar';
import {
  fakeHandle,
  makeAssessment,
  makeInput,
  makeOffer,
  makePractice,
  makeResult,
  makeRun,
  makeTempo,
} from './fixtures';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(overrides: Partial<GuitarActionBarProps> = {}) {
  const props: GuitarActionBarProps = {
    state: 'preview',
    run: makeRun(),
    tempo: null,
    practice: makePractice(),
    input: makeInput(),
    result: null,
    offer: null,
    ...overrides,
  };
  const view = render(<GuitarActionBar {...props} />);
  const bar = screen.getByRole('region', { name: 'Lesson controls' });
  const buttons = () =>
    within(bar)
      .getAllByRole('button')
      .map((b) => b.textContent?.trim());
  const primary = () =>
    within(bar)
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('data-primary'))
      .map((b) => b.textContent?.trim());
  return { ...view, props, bar, buttons, primary };
}

describe('GuitarActionBar — preview', () => {
  it('the instruction, how the step listens, Demo · Practice · Play Now', () => {
    const { props, buttons, primary, container } = setup();
    expect(
      screen.getByText(/Play the notes of the scale from lowest to highest/),
    ).toBeInTheDocument();
    const mode = container.querySelector('[data-guitar-mode]')!;
    expect(mode).toHaveAttribute('data-guitar-mode', 'waitForMe');
    // The eye reads "Wait for me · 75%"; the words say what the 75% is.
    expect(mode.textContent).toMatch(/Wait for me.*Pass mark 75%/);
    expect(mode.textContent?.replace('Pass mark ', '')).toMatch(
      /^Wait for me\s·\s75%$/,
    );
    // Words, not a pill: it isn't a button, so it isn't outlined like one.
    expect(mode.className).not.toMatch(/(^| )(border|rounded-full)( |$)/);
    expect(mode.className).toMatch(/(^| )text-white\/55( |$)/);
    expect(buttons()).toEqual(['Demo', 'Practice', 'Play Now']);
    expect(primary()).toEqual(['Play Now']);
    // Free-time steps have no tempo.
    expect(screen.queryByRole('group', { name: 'Tempo' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));
    expect(props.run.demo.play).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Practice' }));
    expect(props.run.practise).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
    expect(props.run.playNow).toHaveBeenCalled();
  });

  it('keep-time steps: the tempo stepper and "Keep time · 60%"', () => {
    const tempo = makeTempo();
    const { container } = setup({
      tempo,
      run: makeRun({ listen: { mode: 'keepTime', passMarkPct: 60 } }),
    });
    expect(container.querySelector('[data-guitar-mode]')!.textContent).toMatch(
      /Keep time.*60%/,
    );
    const value = screen.getByRole('spinbutton', { name: 'Tempo' });
    fireEvent.keyDown(value, { key: 'ArrowUp' });
    expect(tempo.onChange).toHaveBeenCalledWith(61);
  });

  it('Demo becomes Stop demo while it plays', () => {
    const run = makeRun({
      demo: { playing: true, play: vi.fn(), stop: vi.fn() },
    });
    const { buttons } = setup({ run });
    expect(buttons()).toEqual(['Stop demo', 'Practice', 'Play Now']);
    fireEvent.click(screen.getByRole('button', { name: 'Stop demo' }));
    expect(run.demo.stop).toHaveBeenCalled();
    expect(run.demo.play).not.toHaveBeenCalled();
  });

  it('Play Now waits for the instruments', () => {
    setup({ run: makeRun({ loading: true }) });
    expect(
      screen.getByRole('button', { name: 'Loading instruments...' }),
    ).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Play Now' })).toBeNull();
  });

  it('on a Music Map, Practice is a menu: the whole step or a part', () => {
    const presets = [
      { id: 'map', label: 'Loop one pass of the map', start: vi.fn() },
      { id: 'half', label: 'Loop bars 1–2', start: vi.fn() },
    ];
    const run = makeRun();
    setup({ run, practice: makePractice({ presets }) });
    const trigger = screen.getByRole('button', { name: 'Practice' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.queryByRole('menu')).toBeNull();
    // Radix opens its menu from the keyboard in jsdom (no PointerEvent).
    fireEvent.keyDown(trigger, { key: 'Enter' });
    // Named by its trigger.
    const menu = screen.getByRole('menu', { name: 'Practice' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Whole step', 'Loop one pass of the map', 'Loop bars 1–2']);
    fireEvent.click(
      within(menu).getByRole('menuitem', { name: 'Loop bars 1–2' }),
    );
    expect(presets[1].start).toHaveBeenCalledTimes(1);
    expect(run.practise).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Practice' }), {
      key: 'Enter',
    });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Whole step' }));
    expect(run.practise).toHaveBeenCalledTimes(1);
  });
});

describe('GuitarActionBar — practice', () => {
  it('the loop, the speed trainer and the notes; tempo · Back · Demo · Perform', () => {
    const tempo = makeTempo();
    const run = makeRun({ state: 'practice' });
    const { primary, container } = setup({
      state: 'practice',
      run,
      tempo,
      practice: makePractice({
        notes: { handCareMs: 0, guideMuted: true },
      }),
    });
    const status = container.querySelector('[data-guitar-loop-status]')!;
    expect(status.textContent).toMatch(/Loop bars 1–2 · pass 3/);
    expect(
      screen.getByRole('switch', { name: 'Speed trainer' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The guide is off: your microphone can hear/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('spinbutton', { name: 'Tempo' }),
    ).toBeInTheDocument();
    const actions = container.querySelector('[data-bar-actions]')!;
    expect(
      within(actions as HTMLElement)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Back', 'Demo', 'Perform']);
    expect(primary()).toEqual(['Perform']);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(run.back).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Perform' }));
    expect(run.playNow).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));
    expect(run.demo.play).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Play Now' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Practice' })).toBeNull();
  });

  it('with no loop, says how to make one; free-time steps have no trainer', () => {
    setup({
      state: 'practice',
      run: makeRun({ state: 'practice' }),
      practice: makePractice({
        loopStatus: {
          loop: null,
          padBars: 0,
          passCount: 0,
          onPadChange: vi.fn(),
          onClear: vi.fn(),
        },
      }),
    });
    expect(
      screen.getByText('Tap a bar to loop it, or drag across bars.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Speed trainer' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Tempo' })).toBeNull();
  });

  it('shows the tempo the trainer plays', () => {
    setup({
      state: 'practice',
      run: makeRun({ state: 'practice' }),
      tempo: makeTempo({ bpm: 60, effectiveBpm: 42 }),
    });
    expect(screen.getByRole('spinbutton', { name: 'Tempo' })).toHaveTextContent(
      '42 bpm',
    );
  });
});

describe('GuitarActionBar — performance', () => {
  it('Listening · Keep time with a meter, the bpm read-only, and Stop', () => {
    vi.useFakeTimers();
    const handle = fakeHandle('listening', { level: 0 });
    const run = makeRun({
      state: 'performance',
      listen: { mode: 'keepTime', passMarkPct: 60 },
    });
    const { buttons, primary, container } = setup({
      state: 'performance',
      run,
      tempo: makeTempo({ bpm: 60, effectiveBpm: 60 }),
      input: makeInput({ handle, listening: true }),
    });
    expect(
      container.querySelector('[data-guitar-listening]')!.textContent,
    ).toMatch(/Listening · Keep time/);
    const meter = screen.getByRole('meter', { name: 'Input level' });
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    // The meter polls the live level (~15 Hz).
    (handle as { level: number }).level = 0.1; // −20 dBFS
    act(() => {
      vi.advanceTimersByTime(70);
    });
    expect(meter).toHaveAttribute('aria-valuenow', '67');
    expect(container.querySelector('[data-guitar-bpm]')!.textContent).toBe(
      '60 bpm',
    );
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(buttons()).toEqual(['Stop']);
    expect(primary()).toEqual(['Stop']);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(run.stopTake).toHaveBeenCalledTimes(1);
  });

  it('no meter for a MIDI guitar', () => {
    setup({
      state: 'performance',
      run: makeRun({ state: 'performance' }),
      input: makeInput({
        handle: fakeHandle('listening', { source: 'midi' }),
        listening: true,
      }),
    });
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.getByText(/Listening · Wait for me/)).toBeInTheDocument();
  });

  it('shows the missed-strum hint', () => {
    setup({
      state: 'performance',
      run: makeRun({
        state: 'performance',
        hint: 'Strum all the strings, from the lowest one down.',
      }),
    });
    expect(
      screen.getByText('Strum all the strings, from the lowest one down.'),
    ).toBeInTheDocument();
  });

  it('after 20 s of silence: Check the setup, Count it myself', () => {
    const silence = { checkSetup: vi.fn(), countItMyself: vi.fn() };
    const { buttons } = setup({
      state: 'performance',
      run: makeRun({ state: 'performance' }),
      input: makeInput({ silence }),
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /Not hearing your guitar\?/,
    );
    expect(buttons()).toEqual(['Check the setup', 'Count it myself', 'Stop']);
    fireEvent.click(screen.getByRole('button', { name: 'Check the setup' }));
    expect(silence.checkSetup).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Count it myself' }));
    expect(silence.countItMyself).toHaveBeenCalled();
  });

  it('without a setup to check, only Count it myself', () => {
    const { buttons } = setup({
      state: 'performance',
      run: makeRun({ state: 'performance' }),
      input: makeInput({ silence: { countItMyself: vi.fn() } }),
    });
    expect(buttons()).toEqual(['Count it myself', 'Stop']);
  });
});

describe('GuitarActionBar — result', () => {
  it('after a pass: Try Again, then Next as the primary', () => {
    const result = makeResult();
    const { buttons, primary } = setup({ state: 'result', result });
    expect(buttons()).toEqual(['Try Again', 'Next']);
    expect(primary()).toEqual(['Next']);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(result.next).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(result.retry).toHaveBeenCalled();
  });

  it('after a miss: Next, then Try Again as the primary', () => {
    const result = makeResult({ result: makeAssessment({ passed: false }) });
    const { buttons, primary } = setup({ state: 'result', result });
    expect(buttons()).toEqual(['Next', 'Try Again']);
    expect(primary()).toEqual(['Try Again']);
  });

  it('at the last step: Section Complete', () => {
    const { buttons } = setup({
      state: 'result',
      result: makeResult({ nextLabel: 'Section Complete' }),
    });
    expect(buttons()).toEqual(['Try Again', 'Section Complete']);
  });

  it('offers Count it myself when detection has had its turns', () => {
    const result = makeResult({
      result: makeAssessment({ passed: false }),
      canCountItMyself: true,
    });
    const { buttons } = setup({ state: 'result', result });
    expect(buttons()).toEqual(['Count it myself', 'Next', 'Try Again']);
    fireEvent.click(screen.getByRole('button', { name: 'Count it myself' }));
    expect(result.onCountItMyself).toHaveBeenCalled();
  });
});

describe('GuitarActionBar — section complete', () => {
  it('Enter Practice Track and Continue to …, copy unchanged', () => {
    const offer = makeOffer();
    const { buttons, primary } = setup({
      state: 'sectionComplete',
      offer,
      // The result underneath never shows its buttons.
      result: makeResult(),
    });
    expect(buttons()).toEqual(['Enter Practice Track', 'Continue to Chords']);
    expect(primary()).toEqual(['Continue to Chords']);
    fireEvent.click(
      screen.getByRole('button', { name: 'Enter Practice Track' }),
    );
    expect(offer.enterPracticeTrack).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Chords' }));
    expect(offer.onContinue).toHaveBeenCalled();
  });
});

describe('GuitarActionBar — keyboard focus across states', () => {
  const bar = (props: Partial<GuitarActionBarProps>) => (
    <GuitarActionBar
      state="preview"
      run={makeRun()}
      tempo={null}
      practice={makePractice()}
      input={makeInput()}
      result={null}
      offer={null}
      {...props}
    />
  );

  it('follows the button pressed to the next state’s main button', () => {
    const { rerender } = render(bar({}));
    screen.getByRole('button', { name: 'Play Now' }).focus();
    // Play Now → the take: Play Now is gone, Stop takes focus.
    rerender(
      bar({ state: 'performance', run: makeRun({ state: 'performance' }) }),
    );
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveFocus();
    // The take ends by itself → the result's main button.
    rerender(
      bar({
        state: 'result',
        result: makeResult({ result: makeAssessment({ passed: false }) }),
      }),
    );
    expect(screen.getByRole('button', { name: 'Try Again' })).toHaveFocus();
    // Section complete → Continue.
    rerender(bar({ state: 'sectionComplete', offer: makeOffer() }));
    expect(
      screen.getByRole('button', { name: 'Continue to Chords' }),
    ).toHaveFocus();
  });

  it('leaves focus alone when it was never in the bar', () => {
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        {bar({})}
      </>,
    );
    rerender(
      <>
        <button type="button">Elsewhere</button>
        {bar({ state: 'performance', run: makeRun({ state: 'performance' }) })}
      </>,
    );
    expect(document.body).toHaveFocus();
  });

  it('leaves focus where the student moved it', () => {
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        {bar({})}
      </>,
    );
    screen.getByRole('button', { name: 'Play Now' }).focus();
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    rerender(
      <>
        <button type="button">Elsewhere</button>
        {bar({ state: 'performance', run: makeRun({ state: 'performance' }) })}
      </>,
    );
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });

  it('…also after a click on the page in between (a blur with no target)', () => {
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        {bar({})}
      </>,
    );
    const playNow = screen.getByRole('button', { name: 'Play Now' });
    playNow.focus();
    playNow.blur(); // a click on the TAB: focus goes to the page
    screen.getByRole('button', { name: 'Elsewhere' }).focus(); // then Tab
    rerender(
      <>
        <button type="button">Elsewhere</button>
        {bar({ state: 'performance', run: makeRun({ state: 'performance' }) })}
      </>,
    );
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });
});

describe('meterFraction', () => {
  it('reads RMS on a dB scale from −60 dBFS', () => {
    expect(meterFraction(0)).toBe(0);
    expect(meterFraction(0.001)).toBeCloseTo(0);
    expect(meterFraction(0.1)).toBeCloseTo(2 / 3);
    expect(meterFraction(1)).toBe(1);
    expect(meterFraction(Number.NaN)).toBe(0);
  });
});

describe('GuitarActionBar — colour', () => {
  it('uses no key colour, blue or teal on any control', () => {
    for (const state of ['preview', 'practice', 'performance'] as const) {
      const { container } = setup({
        state,
        run: makeRun({ state: state === 'preview' ? 'preview' : state }),
        tempo: makeTempo(),
      });
      expect(container.innerHTML).not.toMatch(
        /#4a9eff|#7ecfcf|sky-500|D2404A|rgb\(210, 64, 74\)/i,
      );
      cleanup();
    }
  });
});
