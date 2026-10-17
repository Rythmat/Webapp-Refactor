// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import { MusicLiteracyEditor } from '../MusicLiteracyEditor';

/**
 * The lesson editor on Part 1 (the test fixture): steps added, copied,
 * moved and deleted, a note and a rest changed, chips dragged into a new
 * order and rests put before and after notes, and a save that goes through
 * only when the body schema accepts the lesson, laid out as its file.
 */

const store = vi.hoisted(() => ({
  save: vi.fn(async (_kind: string, _body: unknown) => {}),
  remove: vi.fn(async (_kind: string, _id: string) => {}),
}));
vi.mock('../../drumGrooves/instrumentStore', () => ({
  useInstrumentStore: () => ({
    save: store.save,
    remove: store.remove,
    served: () => false,
    canSave: () => true,
  }),
}));
// The preview plays on the Studio's sampler; here it only has to exist.
vi.mock('../useStepPreview', () => ({
  useStepPreview: () => ({
    play: vi.fn(async () => {}),
    stop: vi.fn(),
    playingStep: null,
    loading: false,
    lit: null,
  }),
}));
// The roll is the Parts editor, with the Studio behind it.
vi.mock('../LiteracyRoll', () => ({
  LiteracyRoll: () => <h1>Piano roll</h1>,
}));

const PART_1 = LITERACY_FIXTURE;

const mount = (path = '/console/music-literacy/literacy-fixture-part-1') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MusicLiteracyEditor lesson={PART_1} />
    </MemoryRouter>,
  );

/** The step rows' titles, in order. */
const titles = () =>
  [...document.querySelectorAll('[data-step]')].map(
    (row) =>
      row.querySelector('button[aria-expanded] span.truncate')?.textContent,
  );

const saveButton = () => screen.getByRole('button', { name: /^Save/ });

const savedBody = () =>
  store.save.mock.calls.at(-1)?.[1] as MusicLiteracyLesson;

beforeEach(() => {
  store.save.mockClear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the steps', () => {
  it('lists every step, the first one open', () => {
    mount();
    expect(titles()).toEqual(PART_1.steps.map((s) => s.title));
    expect(
      screen.getByRole('textbox', { name: 'Step 1 words, as sung' }),
    ).toBeDefined();
  });

  it('adds a step at the end and opens it', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
    expect(titles()).toHaveLength(PART_1.steps.length + 1);
    expect(titles().at(-1)).toBe('Step 8');
    expect(
      screen.getByRole('textbox', { name: 'Step 8 words, as sung' }),
    ).toBeDefined();
  });

  it('duplicates a step right after it', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate step 1' }));
    expect(titles().slice(0, 3)).toEqual([
      'A note called C',
      'A note called C (copy)',
      'The root is 1',
    ]);
  });

  it('moves a step down and back up', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Move step 1 down' }));
    expect(titles().slice(0, 2)).toEqual(['The root is 1', 'A note called C']);
    fireEvent.click(screen.getByRole('button', { name: 'Move step 2 up' }));
    expect(titles()).toEqual(PART_1.steps.map((s) => s.title));
  });

  it('deletes a step only once confirmed', () => {
    mount();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete step 2' }));
    expect(titles()).toHaveLength(PART_1.steps.length);
    fireEvent.click(screen.getByRole('button', { name: 'Delete step 2' }));
    expect(titles()).not.toContain('The root is 1');
    expect(titles()).toHaveLength(PART_1.steps.length - 1);
  });

  it('opens a segment in the piano roll on the same page', () => {
    mount('/console/music-literacy/literacy-fixture-part-1?roll=0:call');
    expect(screen.getByRole('heading', { name: 'Piano roll' })).toBeDefined();
  });
});

describe('saving', () => {
  it('has nothing to save until something changes', () => {
    mount();
    expect(saveButton().textContent).toBe('Saved');
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('saves a changed note and rhythm and a rest added to the call, in the file’s layout', async () => {
    mount();
    // "Hey" up to the 3, and "hey" (a quarter) down to an eighth.
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Step 1 note for “Hey” (syllable 1)',
      }),
      { target: { value: '3|0' } },
    );
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Step 1 length of “hey” (syllable 2)',
      }),
      { target: { value: '240' } },
    );
    // A rest, then a note after it, at the end of the call, which then
    // needs a second bar.
    fireEvent.click(screen.getByRole('button', { name: /Add rest/ }));
    fireEvent.click(screen.getByRole('button', { name: /Add note/ }));
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Step 1 call length in bars' }),
      { target: { value: '2' } },
    );
    fireEvent.click(saveButton());
    await waitFor(() => expect(store.save).toHaveBeenCalledTimes(1));
    const body = savedBody();
    expect(store.save.mock.calls[0][0]).toBe('music_literacy');
    const [first, second, third] = body.steps[0].words.notes;
    expect(first).toEqual({ tick: 0, duration: 480, degree: '3', text: 'Hey' });
    expect(second).toEqual({
      tick: 480,
      duration: 240,
      degree: '1',
      text: 'hey',
    });
    // Everything after it moved up an eighth.
    expect(third.tick).toBe(720);
    expect(body.steps[0].call).toEqual({
      bars: 2,
      notes: [
        ...PART_1.steps[0].call.notes,
        { tick: 1920, duration: 480, degree: '1' },
      ],
    });
    expect(body.steps.slice(1)).toEqual(PART_1.steps.slice(1));
    expect(Object.keys(body)).toEqual(Object.keys(PART_1));
  });

  it('refuses to save what the schema refuses, and says where', async () => {
    mount();
    fireEvent.click(
      screen.getByRole('button', { name: 'Step 1 title — click to edit' }),
    );
    const title = screen.getByRole('textbox', { name: 'Step 1 title' });
    fireEvent.change(title, { target: { value: '' } });
    fireEvent.blur(title);
    expect(
      screen.getAllByText('Step 1 · title: Can’t be empty.').length,
    ).toBeGreaterThan(0);
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(window, { key: 's', metaKey: true });
    expect(store.save).not.toHaveBeenCalled();
    // Undo puts the title back, and with it a lesson that may save.
    fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
    expect(screen.queryByText(/to fix before saving/)).toBeNull();
  });

  it('flags a call that runs past its bars, and saves once it has room', async () => {
    mount();
    const step = within(
      document.querySelector('[data-step="0"]') as HTMLElement,
    );
    fireEvent.click(step.getByRole('button', { name: /Add note/ }));
    fireEvent.click(step.getByRole('button', { name: /Add note/ }));
    expect(screen.getAllByText(/runs past its 1 bar/).length).toBeGreaterThan(
      0,
    );
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(
      step.getByRole('combobox', { name: 'Step 1 call length in bars' }),
      { target: { value: '2' } },
    );
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(saveButton());
    await waitFor(() => expect(store.save).toHaveBeenCalledTimes(1));
    expect(savedBody().steps[0].call.bars).toBe(2);
    expect(savedBody().steps[0].call.notes).toHaveLength(5);
  });
});

// jsdom has no PointerEvent; without one fireEvent drops the pointer's id,
// type and place, which the drag reads.
beforeAll(() => {
  if (window.PointerEvent) return;
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  window.PointerEvent = TestPointerEvent as typeof PointerEvent;
});

/** A row's chips laid out as the browser would: 100px apart, on one line. */
function layOutChips() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const left = Number(this.dataset.reorderItem ?? 0) * 100;
      return {
        left,
        right: left + 90,
        top: 0,
        bottom: 120,
        x: left,
        y: 0,
        width: 90,
        height: 120,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
}

/**
 * Drag the chip whose grip is named `grip` by its top line and let go at
 * `x` (chip n spans n·100 to n·100 + 90).
 */
function dragChip(grip: string | RegExp, x: number, pointerType = 'mouse') {
  const handle = screen.getByRole('button', { name: grip })
    .parentElement as HTMLElement;
  const from = Number(
    handle.closest<HTMLElement>('[data-reorder-item]')?.dataset.reorderItem,
  );
  const at = { pointerId: 1, pointerType, clientY: 10 };
  fireEvent.pointerDown(handle, { ...at, button: 0, clientX: from * 100 + 45 });
  fireEvent.pointerMove(handle, { ...at, clientX: (from * 100 + 45 + x) / 2 });
  fireEvent.pointerMove(handle, { ...at, clientX: x });
  fireEvent.pointerUp(handle, { ...at, clientX: x });
}

const wordsInput = () =>
  screen.getByRole('textbox', {
    name: 'Step 1 words, as sung',
  }) as HTMLInputElement;
const select = (name: string) =>
  screen.getByRole('combobox', { name }) as HTMLSelectElement;
const callDegrees = () =>
  [1, 2, 3].map((n) => select(`Step 1 call note ${n}: which note`).value);
const undo = () =>
  fireEvent.click(screen.getByRole('button', { name: /Undo/ }));

describe('dragging chips', () => {
  it('drags a syllable with its note and length, the typed line following, and undoes it in one step', () => {
    mount();
    layOutChips();
    // "play" up to the 5 first, so its note can be followed.
    fireEvent.change(select('Step 1 note for “play” (syllable 7)'), {
      target: { value: '5|0' },
    });
    // From the 7th chip into the gap before the first.
    dragChip(/^Step 1 move “play” \(syllable 7\)/, 10);
    expect(wordsInput().value).toBe(
      "play Hey hey hey I'm gon-na on a note called C",
    );
    expect(select('Step 1 note for “play” (syllable 1)').value).toBe('5|0');
    expect(select('Step 1 length of “play” (syllable 1)').value).toBe('480');
    expect(select('Step 1 length of “Hey” (syllable 2)').value).toBe('480');

    // One undo takes back the whole drag, and only the drag.
    undo();
    expect(wordsInput().value).toBe(
      "Hey hey hey I'm gon-na play on a note called C",
    );
    expect(select('Step 1 note for “play” (syllable 7)').value).toBe('5|0');
  });

  it('drags a note of the call, and undoes it in one step', () => {
    mount();
    layOutChips();
    fireEvent.change(select('Step 1 call note 1: which note'), {
      target: { value: '5|0' },
    });
    expect(callDegrees()).toEqual(['5|0', '1|0', '1|0']);
    // Note 1 into the gap after the last, by touch this time.
    dragChip(/^Step 1 call note 1: move/, 290, 'touch');
    expect(callDegrees()).toEqual(['1|0', '1|0', '5|0']);
    undo();
    expect(callDegrees()).toEqual(['5|0', '1|0', '1|0']);
  });

  it('shows where a chip would land while it is dragged, and Escape puts it back', () => {
    mount();
    layOutChips();
    const handle = screen.getByRole('button', {
      name: /^Step 1 call note 3: move/,
    }).parentElement as HTMLElement;
    const at = { pointerId: 1, pointerType: 'mouse', clientY: 10 };
    fireEvent.pointerDown(handle, { ...at, button: 0, clientX: 245 });
    fireEvent.pointerMove(handle, { ...at, clientX: 20 });
    const mark = document.querySelector('[data-drop-mark]');
    expect(mark?.getAttribute('data-drop-mark')).toBe('before');
    expect(
      mark?.closest('[data-reorder-item]')?.getAttribute('data-reorder-item'),
    ).toBe('0');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('[data-drop-mark]')).toBeNull();
    fireEvent.pointerUp(handle, { ...at, clientX: 20 });
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('moves a chip with Alt+→ on its grip, which keeps the focus', () => {
    mount();
    fireEvent.change(select('Step 1 call note 1: which note'), {
      target: { value: '5|0' },
    });
    const grip = screen.getByRole('button', {
      name: /^Step 1 call note 1: move/,
    });
    grip.focus();
    fireEvent.keyDown(grip, { key: 'ArrowRight', altKey: true });
    expect(callDegrees()).toEqual(['1|0', '5|0', '1|0']);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /^Step 1 call note 2: move/ }),
    );
    // Not without Alt: the arrows alone are left to the page.
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(callDegrees()).toEqual(['1|0', '5|0', '1|0']);
  });
});

describe('rests before and after a note', () => {
  it('adds rests before and after syllables and call notes, warns of an overrun, and saves the gaps', async () => {
    mount();
    // An eighth before the line, and a quarter between "Hey" and "hey".
    fireEvent.change(select('Step 1 add a rest before “Hey” (syllable 1)'), {
      target: { value: '240' },
    });
    fireEvent.change(select('Step 1 add a rest after “Hey” (syllable 1)'), {
      target: { value: '480' },
    });
    // The rest after "Hey" is the one before "hey": a second one there
    // makes it longer.
    fireEvent.change(select('Step 1 add a rest before “hey” (syllable 2)'), {
      target: { value: '240' },
    });
    expect(select('Step 1 rest before “hey” (syllable 2)').value).toBe('720');
    expect(screen.getByText(/The line runs .* past its 2 bars/)).toBeDefined();
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(select('Step 1 words length in bars'), {
      target: { value: '3' },
    });
    expect(screen.queryByText(/The line runs .* past its/)).toBeNull();

    // In the call: a quarter rest after note 1, an eighth before note 3.
    fireEvent.change(select('Step 1 call note 1: add a rest after'), {
      target: { value: '480' },
    });
    // Now chip 4 is the third note.
    fireEvent.change(select('Step 1 call note 4: add a rest before'), {
      target: { value: '240' },
    });
    expect(
      screen.getByText(/This runs an eighth past its 1 bar/),
    ).toBeDefined();
    fireEvent.change(select('Step 1 call length in bars'), {
      target: { value: '2' },
    });

    fireEvent.click(saveButton());
    await waitFor(() => expect(store.save).toHaveBeenCalledTimes(1));
    const step = savedBody().steps[0];
    const original = PART_1.steps[0];
    expect(step.words.bars).toBe(3);
    expect(step.words.notes.slice(0, 3).map((n) => n.tick)).toEqual([
      240,
      240 + 480 + 720,
      240 + 480 + 720 + 480,
    ]);
    // Every syllable after the rests comes 240 + 720 ticks later.
    expect(step.words.notes.slice(1).map((n) => n.tick - 960)).toEqual(
      original.words.notes.slice(1).map((n) => n.tick),
    );
    expect(step.call).toEqual({
      bars: 2,
      notes: [
        { tick: 0, duration: 480, degree: '1' },
        { tick: 960, duration: 480, degree: '1' },
        { tick: 1680, duration: 480, degree: '1' },
      ],
    });
  });

  it('takes a rest out from the rest itself', () => {
    mount();
    fireEvent.change(select('Step 1 add a rest before “Hey” (syllable 1)'), {
      target: { value: '480' },
    });
    fireEvent.change(select('Step 1 call note 2: add a rest before'), {
      target: { value: '960' },
    });
    expect(screen.getAllByText(/runs .* past its/)).toHaveLength(2);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove the Step 1 rest before “Hey” (syllable 1)',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Step 1 call rest 2' }),
    );
    expect(screen.queryByText(/runs .* past its/)).toBeNull();
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('a pickup', () => {
  /** Step 2, "When I play in a Key…", opened. */
  const openStep2 = () => {
    mount();
    fireEvent.click(
      document.querySelector('[data-step="1"] button[aria-expanded]')!,
    );
  };
  /** The chips and the double bar, in order: "When@4", "‖"… */
  const row = () =>
    [
      ...document.querySelectorAll<HTMLElement>(
        '[data-reorder-item], [data-downbeat-mark]',
      ),
    ]
      .filter(
        (el) =>
          el.hasAttribute('data-downbeat-mark') ||
          el
            .querySelector('[data-reorder-grip]')
            ?.getAttribute('aria-label')
            ?.startsWith('Step 2 move “'),
      )
      .map((el) => {
        if (el.hasAttribute('data-downbeat-mark')) return '‖';
        const head = el.querySelector('[data-reorder-grip]')!.parentElement!;
        return `${head.querySelector('.font-medium')?.textContent}@${head.querySelector('.tabular-nums')?.textContent}`;
      });

  it('moves "When I" onto 4 and its "and", before a double bar, and saves them there', async () => {
    openStep2();
    expect(row().slice(0, 3)).toEqual(['When@1·1', 'I@1·1&', 'play@1·2']);
    fireEvent.change(select('Step 2 words pickup'), {
      target: { value: '480' },
    });
    expect(row().slice(0, 4)).toEqual(['When@4', 'I@4&', '‖', 'play@1·1']);
    expect(document.querySelectorAll('[data-strip-double-bar]')).toHaveLength(
      1,
    );

    fireEvent.click(saveButton());
    await waitFor(() => expect(store.save).toHaveBeenCalledTimes(1));
    const words = savedBody().steps[1].words;
    expect(Object.keys(words)).toEqual(['bars', 'pickup', 'notes']);
    expect(words.pickup).toBe(480);
    expect(words.notes.map((n) => n.tick)).toEqual(
      PART_1.steps[1].words.notes.map((n) => n.tick - 480),
    );
  });

  it('takes a chip moved across the double bar into the pickup', () => {
    openStep2();
    fireEvent.change(select('Step 2 words pickup'), {
      target: { value: '480' },
    });
    fireEvent.keyDown(
      screen.getByRole('button', {
        name: /^Step 2 move “play” \(syllable 3\)/,
      }),
      { key: 'ArrowLeft', altKey: true },
    );
    // "play" is a quarter on the "and" of 4, held over the bar line.
    expect(row().slice(0, 4)).toEqual(['When@4', 'play@4&', '‖', 'I@1·1&']);
  });

  it('takes the pickup out again, the line back on the downbeat', () => {
    openStep2();
    fireEvent.change(select('Step 2 words pickup'), {
      target: { value: '480' },
    });
    fireEvent.change(select('Step 2 words pickup'), {
      target: { value: '0' },
    });
    expect(row().slice(0, 3)).toEqual(['When@1·1', 'I@1·1&', 'play@1·2']);
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });
});
