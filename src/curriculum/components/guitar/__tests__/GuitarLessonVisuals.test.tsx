// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { toPianoRollEvents } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type { ActivityStepV2 } from '@/curriculum/types/activity.v2';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import {
  GuitarLessonVisuals,
  useGuitarTabLayers,
  type GuitarLessonVisualsProps,
} from '../GuitarLessonVisuals';

const RED = '#D2404A';
const flow = buildGuitarAppliedTheoryFundamentalsFlow('C');

function stepOf(suffix: string): ActivityStepV2 {
  const tag = `guitar_fund:${suffix} | applied_theory_guitar`;
  const step = flow.sections.flatMap((s) => s.steps).find((s) => s.tag === tag);
  if (!step) throw new Error(`no step ${tag}`);
  return step;
}

/** A step's visuals as the container would render them. */
function renderVisuals(
  suffix: string,
  over: Partial<GuitarLessonVisualsProps> = {},
) {
  const step = stepOf(suffix);
  const countInOffset = over.inTime ? 1920 : 0;
  const events = toPianoRollEvents(step.targetNotes ?? [], RED, 60).map(
    (e) => ({ ...e, startTicks: e.startTicks + countInOffset }),
  );
  const props: GuitarLessonVisualsProps = {
    step,
    events,
    keyCenter: 'C',
    keyColor: RED,
    activityState: 'preview',
    inTime: false,
    countInOffset,
    currentTickRef: { current: 0 },
    activeMidis: [],
    demoHighlightMidis: new Set(),
    isPlayingDemo: false,
    practiceHighlightMidis: new Set(),
    targetMidiSet: new Set(events.map((e) => e.midi!)),
    ...over,
  };
  const view = render(<GuitarLessonVisuals {...props} />);
  return { ...view, props, events };
}

const chordItems = () =>
  within(screen.getByRole('list', { name: 'Chords' })).getAllByRole('listitem');
const currentItem = () =>
  chordItems().findIndex((li) => li.getAttribute('aria-current') === 'step');
const fretboardRoles = (host: Element) =>
  [...host.querySelectorAll('[data-role]')]
    .map(
      (m) =>
        `${m.getAttribute('data-role')} ${m.getAttribute('data-string')}:${m.getAttribute('data-fret')}`,
    )
    .sort();

/** The x a diagram's geometry puts an element at. */
function xOf(el: Element | null): number {
  const match = /translate\(([-\d.]+)/.exec(
    el?.getAttribute('transform') ?? '',
  );
  if (!match) throw new Error('element has no translate');
  return Number(match[1]);
}

// A hand-driven animation frame for the playhead polling.
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
function flushFrame() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(0)));
}

beforeEach(() => {
  useInstrumentStore.setState({ leftHanded: false });
  useGuitarDisplaySettings.setState({
    chordBoxLabels: 'fingers',
    scaleLabels: 'fingers',
    chordFretboardLabels: 'fingers',
    showSteps: false,
  });
  frames.clear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GuitarLessonVisuals', () => {
  it('shows a chord step as a strip of chord boxes beside the fretboard', () => {
    const { container } = renderVisuals('play_chords_oot');
    expect(chordItems()).toHaveLength(4);
    expect(currentItem()).toBe(0);
    expect(
      chordItems()[0]
        .querySelector('[data-diagram-state]')
        ?.getAttribute('data-diagram-state'),
    ).toBe('current');
    expect(screen.queryByRole('img', { name: /Major Scale/ })).toBeNull();
    expect(
      screen.getByRole('img', { name: /^Fretboard, frets 0 to 5/ }),
    ).toBeTruthy();
    // Preview: the first chord to play, the second as the look-ahead.
    expect(fretboardRoles(container)).toEqual(
      [
        'target 5:3',
        'target 4:2',
        'target 3:0',
        'target 2:1',
        'target 1:0',
        'next 4:0',
        'next 3:2',
        'next 2:3',
        'next 1:1',
      ].sort(),
    );
  });

  it('shows a scale step as its scale box, ringing the next note', () => {
    const { container } = renderVisuals('major_scale_ascending_oot');
    expect(screen.queryByRole('list', { name: 'Chords' })).toBeNull();
    const box = screen.getByRole('img', { name: /^C Major Scale: 8 notes/ });
    expect(box.getAttribute('aria-label')).toContain('next: string 6 fret 8');
    // The whole position lies faintly under the note to play.
    const roles = fretboardRoles(container);
    expect(roles.filter((r) => r.startsWith('context'))).toHaveLength(6);
    expect(roles).toContain('target 6:8');
    expect(roles).toContain('next 6:10');
  });

  it('shows a Music Map one box per bar', () => {
    renderVisuals('music_map_ex4');
    expect(chordItems()).toHaveLength(4);
  });

  it('mirrors every diagram when the left-handed toggle is on', () => {
    const { container } = renderVisuals('play_chords_oot');
    const toggle = screen.getByRole('button', { name: 'Left-handed' });
    const dot = () =>
      chordItems()[0].querySelector(
        '[data-dot][data-string="5"][data-fret="3"]',
      );
    const before = xOf(dot());
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('svg[data-mirrored]')).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(useInstrumentStore.getState().leftHanded).toBe(true);
    expect(container.querySelector('svg[data-mirrored]')).toBeTruthy();
    expect(xOf(dot())).not.toBe(before);
  });

  it('mirrors the scale box too', () => {
    useInstrumentStore.setState({ leftHanded: true });
    const { container } = renderVisuals('major_scale_ascending_oot');
    const lowString = container.querySelector(
      '[data-dot][data-string="6"][data-fret="8"]',
    );
    const highString = container.querySelector(
      '[data-dot][data-string="4"][data-fret="7"]',
    );
    // String 6 sits on the right for a left-hander.
    expect(xOf(lowString)).toBeGreaterThan(xOf(highString));
  });

  it('shows the input status and plays a shape with "Hear it"', () => {
    const onHearShape = vi.fn();
    renderVisuals('play_chords_oot', {
      inputStatus: <span>Mic · ready</span>,
      onHearShape,
    });
    expect(screen.getByText('Mic · ready')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hear D minor' }));
    expect(onHearShape).toHaveBeenCalledWith('X-X-0-2-3-1');
  });

  it('marks the current box heard, and puts diagnostics on it alone', () => {
    renderVisuals('play_chords_oot', {
      heardChord: { label: 'C', confidence: 0.9, matchesCurrent: true },
      diagnostics: { missingPcs: [4], extraPcs: [] },
    });
    const states = chordItems().map((li) =>
      li
        .querySelector('[data-diagram-state]')
        ?.getAttribute('data-diagram-state'),
    );
    expect(states).toEqual(['heard', 'idle', 'idle', 'idle']);
    const missing = chordItems().map(
      (li) => li.querySelectorAll('[data-state="missing"]').length,
    );
    // E is on strings 4 and 1 of the C shape; E minor is left alone.
    expect(missing).toEqual([2, 0, 0, 0]);
  });

  it('shows the chord-tone hint in the legend line and rings its string', () => {
    const hint =
      'Missing the 5 (G). In this shape it is on string 3. Check that nothing is touching that string.';
    const { container } = renderVisuals('play_chords_oot', {
      diagnostics: { missingPcs: [], extraPcs: [], hint, ringStrings: [3] },
    });
    expect(screen.getByRole('status')).toHaveTextContent(hint);
    expect(container.querySelector('[data-label-legend]')).toBeNull();
    // G is the open third string of the C shape: its marker is ringed.
    expect(
      chordItems()[0]
        .querySelector('[data-marker="open"][data-string="3"]')
        ?.getAttribute('data-state'),
    ).toBe('missing');
  });

  it('follows the playhead in time', () => {
    const currentTickRef = { current: 0 };
    const { container } = renderVisuals('play_chords_whole', {
      inTime: true,
      activityState: 'performance',
      currentTickRef,
    });
    expect(currentItem()).toBe(0);

    // Third chord: its onset plus the count-in bar.
    currentTickRef.current = 3840 + 1920 + 10;
    flushFrame();
    expect(currentItem()).toBe(2);
    expect(fretboardRoles(container)).toContain('target 6:0');
  });

  it('follows the completed notes out of time', () => {
    const { container, events, rerender, props } = renderVisuals(
      'play_chords_oot',
      { activityState: 'practice' },
    );
    const noteHoldMeta = Object.fromEntries(
      events.map((e) => [
        e.id,
        {
          isCompleted: e.startTicks === 0,
          isCurrentChord: e.startTicks <= 960,
          holdProgress: e.startTicks === 0 ? 1 : 0,
        },
      ]),
    );
    rerender(<GuitarLessonVisuals {...props} noteHoldMeta={noteHoldMeta} />);
    expect(currentItem()).toBe(1);
    // D minor to play, E minor next; C's checks stay where E minor doesn't
    // need the spot.
    const roles = fretboardRoles(container);
    expect(roles.filter((r) => r.startsWith('target'))).toHaveLength(4);
    expect(roles.filter((r) => r.startsWith('next'))).toHaveLength(6);
    expect(roles.filter((r) => r.startsWith('done'))).toEqual([
      'done 2:1',
      'done 5:3',
    ]);
  });
});

/** The fretboard marker at a spot. */
const fretMarker = (host: Element, string: number, fret: number) =>
  host.querySelector(
    `[data-marker][data-string="${string}"][data-fret="${fret}"]`,
  );
const radios = () =>
  within(screen.getByRole('radiogroup', { name: 'Dot labels' }))
    .getAllByRole('radio')
    .map(
      (r) =>
        `${r.textContent}${r.getAttribute('aria-checked') === 'true' ? '*' : ''}`,
    );
const legend = (host: Element) =>
  host.querySelector('[data-label-legend]')?.textContent ?? null;

describe('GuitarLessonVisuals theory layer', () => {
  it('labels a scale step with fingers by default, and switches to key numbers', () => {
    const { container } = renderVisuals('major_scale_ascending_oot');
    expect(radios()).toEqual(['Fingers*', 'Notes', 'Key numbers']);
    expect(legend(container)).toBe(
      'Numbers show which finger to use. 1 is your index finger.',
    );
    // C major, finger 1 on fret 7: the first note (string 6 fret 8) is finger 2.
    expect(fretMarker(container, 6, 8)?.textContent).toBe('2');
    expect(
      screen.getByRole('img', { name: /play C, finger 2 on string 6 fret 8/ }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Key numbers' }));

    expect(useGuitarDisplaySettings.getState().scaleLabels).toBe('keyNumbers');
    expect(localStorage.getItem('music-atlas-guitar-display')).toContain(
      '"scaleLabels":"keyNumbers"',
    );
    expect(radios()).toEqual(['Fingers', 'Notes', 'Key numbers*']);
    expect(fretMarker(container, 6, 8)?.textContent).toBe('1');
    expect(fretMarker(container, 6, 10)?.querySelector('rect')).toBeTruthy();
    expect(legend(container)).toBe(
      "Numbers show each note's place in the key. 1 is home.",
    );
    const box = screen.getByRole('img', { name: /^C Major Scale: 8 notes/ });
    expect(box.getAttribute('aria-label')).toContain(
      'key numbers 1 2 3 4 5 6 7 1',
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Notes' }));
    expect(fretMarker(container, 6, 8)?.textContent).toBe('C');
    expect(legend(container)).toBeNull();
  });

  it('moves the label choice with the arrow keys', () => {
    renderVisuals('major_scale_ascending_oot');
    const group = screen.getByRole('radiogroup', { name: 'Dot labels' });
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(useGuitarDisplaySettings.getState().scaleLabels).toBe('notes');
    expect(document.activeElement?.textContent).toBe('Notes');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(useGuitarDisplaySettings.getState().scaleLabels).toBe('keyNumbers');
  });

  it('switches a chord step’s boxes and fretboard to chord tones together', () => {
    const { container } = renderVisuals('play_chords_oot');
    expect(radios()).toEqual(['Fingers*', 'Notes', 'Chord tones']);
    // Open C: string 5 fret 3 is finger 3; the open strings carry no finger.
    expect(fretMarker(container, 5, 3)?.textContent).toBe('3');
    expect(fretMarker(container, 3, 0)?.querySelector('text')).toBeNull();
    const firstBox = () => chordItems()[0];
    expect(
      firstBox().querySelector('[data-dot][data-string="5"]')?.textContent,
    ).toBe('3');

    fireEvent.click(screen.getByRole('radio', { name: 'Chord tones' }));

    const settings = useGuitarDisplaySettings.getState();
    expect(settings.chordFretboardLabels).toBe('chordTones');
    expect(settings.chordBoxLabels).toBe('chordTones');
    expect(fretMarker(container, 5, 3)?.textContent).toBe('R');
    expect(fretMarker(container, 3, 0)?.textContent).toBe('5');
    expect(
      firstBox().querySelector('[data-dot][data-string="5"]')?.textContent,
    ).toBe('R');
    expect(legend(container)).toBe(
      'R is the root. 3, 5 and 7 count up from the root. ♭ means one fret lower.',
    );
    // The next chord (D minor) is labelled from its own root.
    expect(fretMarker(container, 2, 3)?.textContent).toBe('R');
    expect(fretMarker(container, 1, 1)?.textContent).toBe('♭3');

    // A chord box has no Notes mode: it goes back to fingers.
    fireEvent.click(screen.getByRole('radio', { name: 'Notes' }));
    expect(useGuitarDisplaySettings.getState().chordBoxLabels).toBe('fingers');
    expect(fretMarker(container, 5, 3)?.textContent).toBe('C');
    expect(
      firstBox().querySelector('[data-dot][data-string="5"]')?.textContent,
    ).toBe('3');
  });

  it('puts formula and family lines on every chord box of the strip', () => {
    renderVisuals('music_map_ex4');
    const formulas = chordItems().map(
      (li) => li.querySelector('[data-formula]')?.textContent,
    );
    expect(formulas).toEqual(['R 3 5 7', 'R 3 5 ♭7', 'R 3 5 7', 'R ♭3 5 ♭7']);
    for (const li of chordItems()) {
      expect(li.querySelector('[data-family]')?.textContent).toMatch(
        /^Root on string 5 · drop 2Movable$/,
      );
    }
  });

  it('shows half steps on A1 only when asked, with their legend', () => {
    const { container } = renderVisuals('major_scale_ascending_oot');
    const toggle = screen.getByRole('button', { name: 'Show steps' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[data-bracket]')).toBeNull();

    fireEvent.click(toggle);

    expect(useGuitarDisplaySettings.getState().showSteps).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    // E-F on string 5 and B-C on string 4.
    expect(
      [...container.querySelectorAll('[data-bracket="H"]')].map(
        (b) =>
          `${b.getAttribute('data-string')}:${b.getAttribute('data-from')}-${b.getAttribute('data-to')}`,
      ),
    ).toEqual(['5:7-8', '4:9-10']);
    expect(legend(container)).toContain(
      'W is a whole step (2 frets). H is a half step (1 fret).',
    );
  });

  it('draws the octave and the (i) note on A1, the ghosts on A4, neither on A2', () => {
    const a1 = renderVisuals('major_scale_ascending_oot').container;
    expect(a1.querySelector('[data-connector="octave"]')).toBeTruthy();
    expect(a1.querySelector('[data-ghost]')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'About the C Major Scale' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'About the C Major Scale' })
        .textContent,
    ).toContain('What is Ionian?');
    cleanup();

    const a4 = renderVisuals('pentatonic_scale_ascending_oot').container;
    expect(a4.querySelector('[data-connector="octave"]')).toBeTruthy();
    expect(a4.querySelectorAll('[data-ghost]').length).toBeGreaterThan(0);
    expect(a4.querySelector('[data-ghost-legend]')?.textContent).toBe(
      'not in the pentatonic',
    );
    expect(screen.queryByRole('button', { name: 'Show steps' })).toBeNull();
    cleanup();

    const a2 = renderVisuals('contour_a_oot').container;
    expect(a2.querySelector('[data-connector]')).toBeNull();
    expect(a2.querySelector('[data-ghost]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show steps' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^About the/ })).toBeNull();
  });
});

describe('useGuitarTabLayers', () => {
  function layers(suffix: string, inTime = false) {
    const step = stepOf(suffix);
    const countInOffset = inTime ? 1920 : 0;
    const events = toPianoRollEvents(step.targetNotes ?? [], RED, 60).map(
      (e) => ({ ...e, startTicks: e.startTicks + countInOffset }),
    );
    const { result } = renderHook(() =>
      useGuitarTabLayers({ step, keyCenter: 'C', events, countInOffset }),
    );
    return { result, events };
  }

  it('is empty for a step that is not a guitar step, or has no key', () => {
    useGuitarDisplaySettings.setState({
      showSteps: true,
      chordFretboardLabels: 'chordTones',
    });
    const step = stepOf('major_scale_ascending_oot');
    const piano = { ...step, guitar: undefined };
    const run = (s: typeof step | null, key: 'C' | null) =>
      renderHook(() =>
        useGuitarTabLayers({
          step: s,
          keyCenter: key,
          events: [],
          countInOffset: 0,
        }),
      ).result.current;
    expect(run(piano, 'C')).toEqual({});
    expect(run(step, null)).toEqual({});
    expect(run(null, 'C')).toEqual({});
  });

  it('is empty by default: badges and chips are off', () => {
    expect(layers('major_scale_ascending_oot').result.current).toEqual({});
    expect(layers('arpeggio_7th_degree1_oot').result.current).toEqual({});
  });

  it('gives an A1 step W / H chips with "Show steps"', () => {
    useGuitarDisplaySettings.setState({ showSteps: true });
    const { result, events } = layers('major_scale_ascending_it', true);
    const chips = result.current.stepChips!;
    expect(chips.map((c) => c.size).join(' ')).toBe('W W H W W W H');
    expect(chips[0]).toMatchObject({
      fromId: events[0].id,
      toId: events[1].id,
      spoken: 'C to D: whole step',
    });
    expect(chips[2].spoken).toBe('E to F: half step');
    // Only A1: a pentatonic step has no chips.
    expect(layers('pentatonic_scale_ascending_oot').result.current).toEqual({});
  });

  it('annotates an arpeggio’s notes with chord tones in Chord tones mode', () => {
    useGuitarDisplaySettings.setState({ chordFretboardLabels: 'chordTones' });
    const { result, events } = layers('arpeggio_7th_degree1_it', true);
    const tones = events.map((e) => result.current.noteAnnotations!.get(e.id));
    // C major 7, X-3-5-4-5-X, up and back down.
    expect(tones.slice(0, 4)).toEqual(['R', '5', '7', '3']);
    expect(tones.every(Boolean)).toBe(true);
    const dm = layers('arpeggio_degree2_oot').result.current.noteAnnotations!;
    expect([...dm.values()]).toContain('♭3');
    // Strummed chords are not arpeggios.
    expect(layers('play_chords_oot').result.current).toEqual({});
  });

  it('writes key numbers under a scale or melody step’s notes in Key numbers mode', () => {
    useGuitarDisplaySettings.setState({ scaleLabels: 'keyNumbers' });
    const { result, events } = layers('major_scale_ascending_oot');
    expect(
      events.map((e) => result.current.noteAnnotations!.get(e.id)),
    ).toEqual(['1', '2', '3', '4', '5', '6', '7', '1']);
    expect(result.current.stepChips).toBeUndefined();
    // A melody too: every note is a 1-7 of the key.
    const melody = layers('contour_a_oot');
    const numbers = melody.events.map((e) =>
      melody.result.current.noteAnnotations!.get(e.id),
    );
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) expect(n).toMatch(/^[1-7]$/);
    // With "Show steps" the chips ride above and the numbers below.
    useGuitarDisplaySettings.setState({ showSteps: true });
    const both = layers('major_scale_ascending_oot').result.current;
    expect(both.stepChips).toHaveLength(7);
    expect(both.noteAnnotations?.size).toBe(8);
  });

  it('keeps each step to its own kind of annotation', () => {
    // Key numbers are a scale-step choice: an arpeggio keeps its chord tones.
    useGuitarDisplaySettings.setState({
      scaleLabels: 'keyNumbers',
      chordFretboardLabels: 'fingers',
    });
    expect(layers('arpeggio_7th_degree1_oot').result.current).toEqual({});
    useGuitarDisplaySettings.setState({ chordFretboardLabels: 'chordTones' });
    const { result, events } = layers('arpeggio_7th_degree1_oot');
    expect(result.current.noteAnnotations!.get(events[0].id)).toBe('R');
    // Chord tones are a chord-step choice: a scale step shows nothing for it.
    useGuitarDisplaySettings.setState({ scaleLabels: 'notes' });
    expect(layers('major_scale_ascending_oot').result.current).toEqual({});
  });
});
