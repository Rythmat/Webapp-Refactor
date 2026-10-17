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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import { getMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import { MusicLiteracyEditor } from '../MusicLiteracyEditor';

/**
 * The lesson editor on Part 1: steps added, copied, moved and deleted, a
 * note and a rest changed, and a save that goes through only when the body
 * schema accepts the lesson, laid out as its file.
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

const PART_1 = getMusicLiteracy('music-literacy-part-1') as MusicLiteracyLesson;

const mount = (path = '/console/music-literacy/music-literacy-part-1') =>
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
    mount('/console/music-literacy/music-literacy-part-1?roll=0:call');
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
