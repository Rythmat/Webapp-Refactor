// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import {
  getGuitarTonePrefs,
  setGuitarTonePrefs,
} from '@/learn/audio/guitar/guitarTonePrefs';
import {
  getLessonVolume,
  setLessonVolume,
} from '@/learn/audio/lessonVolumeStore';
import {
  getPracticeSettings,
  setMetronomeEnabled,
} from '@/learn/audio/practiceSettingsStore';
import { getGuitarView } from '@/lib/notation/guitarViewPreference';
import {
  GuitarSettingsSheet,
  type GuitarSettingsSheetProps,
} from '../GuitarSettingsSheet';
import type { InputModel, TheoryModel } from '../types';
import { handleFor, inputFor, theoryFor } from './sheetFixtures';

vi.mock('@/audio/pianoSampler', () => ({ setPianoSamplerVolume: vi.fn() }));
const voice = vi.hoisted(() => ({
  load: vi.fn(async () => {}),
  strumGuitarChord: vi.fn(),
}));
vi.mock('@/learn/audio/guitar/guitarVoice', () => ({
  guitarLessonVoice: { load: voice.load },
  strumGuitarChord: voice.strumGuitarChord,
}));

function renderSheet(
  key: GuitarKeyName,
  id: string,
  over: {
    theory?: Partial<TheoryModel>;
    input?: Partial<InputModel>;
    props?: Partial<GuitarSettingsSheetProps>;
  } = {},
) {
  const props: GuitarSettingsSheetProps = {
    open: true,
    onOpenChange: vi.fn(),
    theory: theoryFor(key, id, over.theory),
    input: inputFor(over.input),
    ...over.props,
  };
  const view = render(<GuitarSettingsSheet {...props} />);
  return { ...view, props };
}

const sheet = () => screen.getByRole('dialog', { name: 'Lesson settings' });
const row = (name: string) => screen.queryByRole('switch', { name });
const display = () => useGuitarDisplaySettings.getState();

beforeEach(() => {
  localStorage.clear();
  useGuitarDisplaySettings.setState({
    scaleLabels: 'fingers',
    chordFretboardLabels: 'fingers',
    chordBoxLabels: 'fingers',
    showSteps: false,
    showChordJobs: false,
    showSharedNotes: true,
    showRomanNumerals: false,
    dismissedNotes: [],
  });
  useInstrumentStore.setState({ leftHanded: false });
  setGuitarTonePrefs({ tone: 'amp', ampModelId: 'nam-clean-twin' });
  setMetronomeEnabled(true);
  setLessonVolume(0.8);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GuitarSettingsSheet: the sheet', () => {
  it('groups the controls as Display, Sound and Input, and renders nothing closed', () => {
    const { rerender, props } = renderSheet('C', 'A1.1', {
      props: { open: false },
    });
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(<GuitarSettingsSheet {...props} open />);
    expect(
      within(sheet())
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Display', 'Sound', 'Input']);
  });

  it('is not modal: the lesson beside it stays live', () => {
    render(<button type="button">Play now</button>);
    renderSheet('C', 'A1.1');
    // A modal sheet hides the rest of the page from assistive tech.
    expect(screen.getByRole('button', { name: 'Play now' })).toBeTruthy();
  });

  it('focuses its title on open, or the group it was opened at', () => {
    const first = renderSheet('C', 'A1.1');
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Lesson settings' }),
    );
    first.unmount();

    renderSheet('C', 'A1.1', { props: { focusGroup: 'input' } });
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Input' }),
    );
  });

  it('gives focus back to the button that opened it', async () => {
    const onOpenChange = vi.fn();
    const props: GuitarSettingsSheetProps = {
      open: false,
      onOpenChange,
      theory: theoryFor('C', 'A1.1'),
      input: inputFor(),
    };
    const view = render(
      <>
        <button type="button">Lesson settings</button>
        <GuitarSettingsSheet {...props} />
      </>,
    );
    const gear = screen.getByRole('button', { name: 'Lesson settings' });
    gear.focus();
    const reopen = (open: boolean) =>
      view.rerender(
        <>
          <button type="button">Lesson settings</button>
          <GuitarSettingsSheet {...props} open={open} />
        </>,
      );
    reopen(true);
    expect(document.activeElement).not.toBe(gear);
    fireEvent.click(within(sheet()).getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    reopen(false);
    // Radix returns focus a tick after the sheet unmounts.
    await waitFor(() => expect(document.activeElement).toBe(gear));
  });

  it('leaves focus where it went when it moves out to the lesson (Shift+Tab)', async () => {
    const onOpenChange = vi.fn();
    const props: GuitarSettingsSheetProps = {
      open: false,
      onOpenChange,
      theory: theoryFor('C', 'A1.1'),
      input: inputFor(),
    };
    const lesson = (open: boolean) => (
      <>
        <button type="button">Gear</button>
        <button type="button">Play now</button>
        <GuitarSettingsSheet {...props} open={open} />
      </>
    );
    const view = render(lesson(false));
    screen.getByRole('button', { name: 'Gear' }).focus();
    view.rerender(lesson(true));
    const play = screen.getByRole('button', { name: 'Play now' });
    act(() => play.focus());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    view.rerender(lesson(false));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(document.activeElement).toBe(play);
  });

  // Safari, and Firefox on a Mac, don't focus a button that is clicked: the
  // gear press leaves focus on the page.
  describe('opened by a click that left focus on the page', () => {
    function renderWithGear(onOpenChange = vi.fn()) {
      const props: GuitarSettingsSheetProps = {
        open: false,
        onOpenChange,
        theory: theoryFor('C', 'A1.1'),
        input: inputFor(),
      };
      const lesson = (open: boolean) => (
        <>
          <button type="button" aria-haspopup="dialog" aria-expanded={open}>
            Gear
          </button>
          <button type="button">Play now</button>
          <GuitarSettingsSheet {...props} open={open} />
        </>
      );
      const view = render(lesson(false));
      (document.activeElement as HTMLElement | null)?.blur();
      expect(document.activeElement).toBe(document.body);
      view.rerender(lesson(true));
      return { ...view, onOpenChange, lesson };
    }
    // Radix listens for presses outside from the tick after it opens.
    const nextTick = () =>
      act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

    it('still closes on a press on the lesson', async () => {
      const { onOpenChange } = renderWithGear();
      await nextTick();
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Play now' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('takes a press on its own button as not outside, and gives focus back to it', async () => {
      const { onOpenChange, rerender, lesson } = renderWithGear();
      await nextTick();
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Gear' }));
      expect(onOpenChange).not.toHaveBeenCalled();

      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      rerender(lesson(false));
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: 'Gear' }),
        ),
      );
    });
  });
});

describe('GuitarSettingsSheet: Display', () => {
  it('switches TAB and notation in the guitar view preference', () => {
    renderSheet('C', 'A1.1');
    const tab = screen.getByRole('radio', { name: 'Tablature' });
    const notation = screen.getByRole('radio', { name: 'Notation' });
    expect(tab).toHaveAttribute('aria-checked', 'true');
    expect(tab).toHaveTextContent('TAB');

    fireEvent.click(notation);
    expect(getGuitarView()).toBe('notation');
    expect(notation).toHaveAttribute('aria-checked', 'true');
    // Arrow keys move the choice, as in any radio group.
    fireEvent.keyDown(notation, { key: 'ArrowLeft' });
    expect(getGuitarView()).toBe('tab');
    expect(document.activeElement).toBe(tab);
  });

  it("sets scale steps' dot labels, with the legend as the row's helper", () => {
    renderSheet('C', 'A1.1');
    const group = screen.getByRole('radiogroup', { name: 'Dot labels' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['Fingers', 'Notes', 'Key numbers']);
    expect(
      screen.getByText(
        'Numbers show which finger to use. 1 is your index finger.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('radio', { name: 'Key numbers' }));
    expect(display().scaleLabels).toBe('keyNumbers');
    expect(
      screen.getByText("Numbers show each note's place in the key. 1 is home."),
    ).toBeInTheDocument();
    // Notes needs no legend.
    fireEvent.click(within(group).getByRole('radio', { name: 'Notes' }));
    expect(display().scaleLabels).toBe('notes');
    expect(screen.queryByText(/Numbers show/)).toBeNull();
  });

  it("sets chord steps' dot labels on the fretboard and the chord boxes", () => {
    renderSheet('C', 'B1.1');
    fireEvent.click(screen.getByRole('radio', { name: 'Chord tones' }));
    expect(display().chordFretboardLabels).toBe('chordTones');
    expect(display().chordBoxLabels).toBe('chordTones');
    expect(display().scaleLabels).toBe('fingers');
  });

  it('offers whole and half steps on A1 only', () => {
    const view = renderSheet('C', 'A1.1');
    const steps = row('Whole and half steps')!;
    expect(steps).toHaveAccessibleDescription(
      'W is a whole step (2 frets). H is a half step (1 fret).',
    );
    expect(steps).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(steps);
    expect(display().showSteps).toBe(true);
    expect(steps).toHaveAttribute('aria-checked', 'true');
    view.unmount();

    renderSheet('C', 'A2.1');
    expect(row('Whole and half steps')).toBeNull();
  });

  it('offers chord jobs on Music Maps only', () => {
    const view = renderSheet('C', 'D3.4');
    fireEvent.click(row('Chord jobs')!);
    expect(display().showChordJobs).toBe(true);
    expect(display().showSharedNotes).toBe(true);
    view.unmount();

    renderSheet('C', 'B2.1');
    expect(row('Chord jobs')).toBeNull();
  });

  it('offers shared notes on steps that change chords only', () => {
    const view = renderSheet('C', 'B2.1');
    fireEvent.click(row('Shared notes')!);
    expect(display().showSharedNotes).toBe(false);
    expect(display().showChordJobs).toBe(false);
    view.unmount();

    renderSheet('C', 'B1.1');
    expect(row('Shared notes')).toBeNull();
  });

  it('follows what the step shows: a loop of one chord changes nothing', () => {
    const loop = { ...theoryFor('C', 'B2.1').step };
    loop.guitar = {
      ...loop.guitar!,
      shapeIds: loop.guitar!.shapeIds!.slice(0, 1),
    };
    renderSheet('C', 'B2.1', { theory: { displayStep: loop } });
    expect(row('Shared notes')).toBeNull();
  });

  it('offers Roman numerals to teachers, from Section B on', () => {
    const cases: [string, boolean, boolean][] = [
      ['A1.1', true, false],
      ['B1.1', false, false],
      ['B1.1', true, true],
      ['D3.4', true, true],
    ];
    for (const [id, canShowRoman, shown] of cases) {
      const view = renderSheet('C', id, { theory: { canShowRoman } });
      expect(!!row('Roman numerals')).toBe(shown);
      view.unmount();
    }
    renderSheet('C', 'B1.1', { theory: { canShowRoman: true } });
    fireEvent.click(row('Roman numerals')!);
    expect(display().showRomanNumerals).toBe(true);
  });

  it('mirrors the diagrams for a left-handed player', () => {
    renderSheet('C', 'A1.1');
    // A switch's knob jumps rather than slides under reduced motion.
    expect(row('Left-handed')).toHaveClass(
      'motion-reduce:[&>span]:transition-none',
    );
    fireEvent.click(row('Left-handed')!);
    expect(useInstrumentStore.getState().leftHanded).toBe(true);
    expect(display().showSteps).toBe(false);
  });
});

describe('GuitarSettingsSheet: Sound', () => {
  it('changes the tone, telling the lesson before the preview sounds', async () => {
    const onTonePreview = vi.fn();
    renderSheet('C', 'A1.1', { input: { onTonePreview } });
    const tone = screen.getByRole('combobox', { name: 'Guitar tone' });
    expect(tone).toHaveValue('nam-clean-twin');
    expect(
      within(tone)
        .getAllByRole('group')
        .map((g) => g.getAttribute('label')),
    ).toEqual(['Clean', 'Crunch', 'Hi Gain']);

    await act(async () => {
      fireEvent.change(tone, { target: { value: 'acoustic' } });
    });
    expect(getGuitarTonePrefs().tone).toBe('acoustic');
    expect(onTonePreview).toHaveBeenCalledTimes(1);
    expect(voice.strumGuitarChord).toHaveBeenCalled();
  });

  it('turns monitoring on only while the guitar is heard', () => {
    const off = renderSheet('C', 'A1.1');
    const disabled = row('Monitor through amp')!;
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAccessibleDescription(
      'Turn on audio input to hear yourself.',
    );
    off.unmount();

    const onMonitorChange = vi.fn();
    renderSheet('C', 'A1.1', { input: { listening: true, onMonitorChange } });
    const monitor = row('Monitor through amp')!;
    expect(monitor).toHaveAccessibleDescription(
      'Headphones only: speakers feed back into the mic.',
    );
    fireEvent.click(monitor);
    expect(onMonitorChange).toHaveBeenCalledWith(true);
  });

  it('switches the metronome in the practice settings', () => {
    renderSheet('C', 'A1.1');
    const metronome = row('Metronome')!;
    expect(metronome).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(metronome);
    expect(getPracticeSettings().metronomeEnabled).toBe(false);
    expect(useInstrumentStore.getState().leftHanded).toBe(false);
  });

  it('sets the lesson volume', () => {
    renderSheet('C', 'A1.1');
    const volume = screen.getByRole('slider', { name: 'Volume' });
    expect(volume).toHaveAttribute('aria-valuenow', '80');
    expect(volume).toHaveAttribute('aria-valuetext', '80%');
    fireEvent.keyDown(volume, { key: 'ArrowRight' });
    expect(getLessonVolume()).toBeCloseTo(0.81);
    fireEvent.keyDown(volume, { key: 'Home' });
    expect(getLessonVolume()).toBe(0);
    expect(volume).toHaveAttribute('aria-valuetext', 'Muted');
  });

  it('opens audio timing after closing the sheet', () => {
    const openAudioTiming = vi.fn();
    const { props } = renderSheet('C', 'A1.1', {
      input: { outputLatencyMs: 120, openAudioTiming },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Audio timing · 120 ms' }),
    );
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(openAudioTiming).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(props.onOpenChange).mock.invocationCallOrder[0],
    ).toBeLessThan(openAudioTiming.mock.invocationCallOrder[0]);
  });
});

describe('GuitarSettingsSheet: Input', () => {
  it('shows the input chip, and opens setup after closing the sheet', () => {
    const openSetup = vi.fn();
    const { props } = renderSheet('C', 'A1.1', {
      input: {
        openSetup,
        handle: handleFor({ status: 'needs-setup' }),
      },
    });
    const chip = screen.getByRole('group', { name: 'Guitar input' });
    expect(chip).toHaveTextContent('Set up guitar');
    // The chip as it is, lifted to the sheet's type and targets around it.
    expect(chip.parentElement).toHaveClass(
      '[&_[role=group]]:text-xs',
      '[&_[role=group]_button]:min-h-9',
      'motion-reduce:[&_.animate-spin]:animate-none',
    );

    fireEvent.click(within(chip).getByRole('button', { name: 'Set up' }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(openSetup).toHaveBeenCalledWith(undefined);
    expect(
      vi.mocked(props.onOpenChange).mock.invocationCallOrder[0],
    ).toBeLessThan(openSetup.mock.invocationCallOrder[0]);
  });

  it("closes first from the chip's own Set up too, at the page it asks for", () => {
    const openSetup = vi.fn();
    const { props } = renderSheet('C', 'A1.1', {
      input: { openSetup, handle: handleFor({ status: 'denied' }) },
    });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Guitar input' })).getByRole(
        'button',
        { name: 'Set up' },
      ),
    );
    expect(openSetup).toHaveBeenCalledWith('mic');
    expect(
      vi.mocked(props.onOpenChange).mock.invocationCallOrder[0],
    ).toBeLessThan(openSetup.mock.invocationCallOrder[0]);
  });

  it('leaves Input out when the lesson has no guitar input', () => {
    renderSheet('C', 'A1.1', { input: { handle: null } });
    expect(
      within(sheet())
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Display', 'Sound']);
    expect(screen.queryByRole('group', { name: 'Guitar input' })).toBeNull();
  });
});
