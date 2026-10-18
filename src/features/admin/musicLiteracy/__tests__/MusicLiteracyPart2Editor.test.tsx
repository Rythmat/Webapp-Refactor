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
import type {
  LiteracyMelodicEchoStep,
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import {
  PART2_FIXTURE,
  PART2_GATED_FIXTURE,
  PART2_STEPS,
} from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import {
  DEFAULT_LESSON_GOAL,
  MODULE_GOALS,
} from '@/curriculum/engine/musicLiteracy/modules';
import { MusicLiteracyEditor } from '../MusicLiteracyEditor';
import { choiceOf, STEP_CHOICES } from '../literacyKinds';
import { canonicalLesson, lessonIssues } from '../literacyLesson';
import { dropSlot, stepDropAt } from '../useStepDrag';

/**
 * The lesson editor on Part 2 (the test fixture: one step of every kind):
 * Add step's menu, each kind's editor round-tripping through the file's
 * layout, the chord rhythm's totals, the template, the saved-progression
 * pickers (earlier steps' names only), sections, the lesson's settings, and
 * the schema's problems shown at the field they're about.
 *
 *   0 choose key       1 1-3-5 (Choose a Color)   2 choose mode
 *   3 1-7-1 (Create a Melody)
 *   4 the 1 chord · 5 choose X (saves one-x) · 6 plays one-x · 7 X 1 (Chords)
 *   8 choose four (saves four) · 9 replays four (7th Chords)
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
const preview = vi.hoisted(() => ({ play: vi.fn(async () => {}) }));
vi.mock('../useStepPreview', () => ({
  useStepPreview: () => ({
    play: preview.play,
    stop: vi.fn(),
    playingStep: null,
    loading: false,
    lit: null,
  }),
}));
vi.mock('../LiteracyRoll', () => ({
  LiteracyRoll: () => <h1>Piano roll</h1>,
}));

const mount = (lesson: MusicLiteracyLesson = PART2_FIXTURE) =>
  render(
    <MemoryRouter initialEntries={[`/console/music-literacy/${lesson.id}`]}>
      <MusicLiteracyEditor lesson={lesson} />
    </MemoryRouter>,
  );

const row = (index: number) =>
  document.querySelector(`[data-step="${index}"]`) as HTMLElement;
const step = (index: number) => within(row(index));
const openStep = (index: number) => {
  const toggle = row(index).querySelector('button[aria-expanded]')!;
  if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle);
  return step(index);
};
const field = (index: number, name: string) =>
  row(index).querySelector(`[data-field="${name}"]`) as HTMLElement;
const select = (name: string) =>
  screen.getByRole('combobox', { name }) as HTMLSelectElement;
const radio = (group: string, name: string) =>
  within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', {
    name,
  });
const options = (name: string) => [...select(name).options].map((o) => o.value);
const saveButton = () =>
  screen.getByRole('button', { name: /^Save/ }) as HTMLButtonElement;

/** Save, and the body saved: in the file's layout, and one the schema takes. */
async function saved(): Promise<MusicLiteracyLesson> {
  fireEvent.click(saveButton());
  await waitFor(() => expect(store.save).toHaveBeenCalledTimes(1));
  const body = store.save.mock.calls[0][1] as MusicLiteracyLesson;
  expect(JSON.stringify(body)).toBe(JSON.stringify(canonicalLesson(body)));
  expect(lessonIssues(body)).toEqual([]);
  return body;
}

/** The lesson's file, with its step at `index` as `step`. */
const withStep = (index: number, next: LiteracyStep): MusicLiteracyLesson =>
  canonicalLesson({
    ...PART2_FIXTURE,
    steps: PART2_FIXTURE.steps.map((s, i) => (i === index ? next : s)),
  });

beforeEach(() => {
  store.save.mockClear();
  preview.play.mockClear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Add step', () => {
  it('makes a step of each kind from its menu, each saved as the file has it', async () => {
    mount();
    const at = PART2_FIXTURE.steps.length;
    /** What each kind's editor, opened, shows first. */
    const opened: Record<string, (n: number) => unknown> = {
      melody: (n) => step(n).getByRole('button', { name: /Add words/ }),
      chords: (n) => select(`Step ${n + 1} bar 1 chord`),
      chooseKey: (n) => step(n).getByText(/The circle of fifths/),
      chooseMode: (n) => step(n).getByText(/Two buttons, Major and Minor/),
      chooseChords: (n) =>
        step(n).getByRole('button', { name: /template bar 2: X/ }),
      replay: (n) => select(`Step ${n + 1} progression`),
    };
    for (const [n, info] of STEP_CHOICES.entries()) {
      fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
      const item = screen.getByRole('menuitem', {
        name: new RegExp(info.name.replace(/[()]/g, '\\$&')),
      });
      expect(item.textContent).toContain(info.description);
      fireEvent.click(item);
      // At the end, opened, its kind's editor showing.
      expect(document.querySelectorAll('[data-step]')).toHaveLength(at + n + 1);
      expect(opened[info.choice](at + n)).toBeTruthy();
    }
    const body = await saved();
    expect(body.steps.slice(at).map(choiceOf)).toEqual(
      STEP_CHOICES.map((info) => info.choice),
    );
    expect(body.steps.slice(at).every((s) => s.section === '7th Chords')).toBe(
      true,
    );
  });

  it('adds a step at the end of a section from its header', () => {
    mount();
    fireEvent.click(
      screen.getByRole('button', { name: 'Add a step to Create a Melody' }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: /Call and response \(chords\)/ }),
    );
    // In after 1-7-1, and in its section.
    const group = document.querySelector('[data-section="Create a Melody"]')!;
    expect(group.querySelectorAll('[data-step]')).toHaveLength(2);
    expect(select('Step 5 bar 1 chord')).toBeDefined();
  });

  it('offers the choose steps only when students pick the key', () => {
    mount({
      ...LITERACY_FIXTURE,
      steps: LITERACY_FIXTURE.steps.slice(0, 1),
    } as MusicLiteracyLesson);
    fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
    const key = screen.getByRole('menuitem', { name: /Choose a key/ });
    expect((key as HTMLButtonElement).disabled).toBe(true);
    expect(key.textContent).toMatch(/set “Who picks the key” to Student/);
    expect(
      (
        screen.getByRole('menuitem', {
          name: /Choose a chord/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});

describe('a chord call', () => {
  it('edits its chords, harmony and rhythm, and saves them in the file’s layout', async () => {
    mount();
    const s = openStep(4);
    // 1 and 4, then a 5, then back to the 1.
    fireEvent.change(select('Step 5 bar 2 chord'), { target: { value: '5' } });
    fireEvent.click(s.getByRole('button', { name: 'Add bar' }));
    fireEvent.change(select('Step 5 bar 3 chord'), { target: { value: '1' } });
    fireEvent.click(radio('Step 5 harmony', '7ths'));
    // The labels follow: the 5 with its 7th is "5 dom7", and in minor "5 min7".
    expect(select('Step 5 bar 2 chord').selectedOptions[0].textContent).toBe(
      '5 · 5 dom7',
    );
    expect(row(4).querySelector('[data-chord-bar="1"]')?.textContent).toContain(
      'in minor: 5 min7',
    );
    fireEvent.change(select('Step 5 rhythm strike 3: how long'), {
      target: { value: '480' },
    });
    fireEvent.click(s.getByRole('button', { name: 'Add strike' }));
    const body = await saved();
    expect(body).toEqual(
      withStep(4, {
        tag: 'the-1-chord',
        section: 'Chords',
        title: 'The 1 chord',
        call: {
          chords: ['1', '5', '1'],
          rhythm: [480, 480, 480, 480],
          harmony: 'sevenths',
        },
      }),
    );
  });

  it('marks the diminished chords unavailable, in both modes when the student picks', () => {
    mount();
    openStep(4);
    const bar = select('Step 5 bar 1 chord');
    const off = [...bar.options].filter((o) => o.disabled);
    expect(off.map((o) => o.textContent)).toEqual([
      '2 · not used (diminished in minor)',
      '7 · not used (diminished in major)',
    ]);
  });

  it('adds up its rhythm against the bar', () => {
    mount();
    const s = openStep(4);
    const total = () =>
      row(4).querySelector('[data-rhythm-total]')?.textContent;
    expect(total()).toBe('3 strikes, 4 beats: a full bar.');
    fireEvent.click(
      s.getByRole('button', { name: 'Remove Step 5 rhythm strike 3' }),
    );
    expect(total()).toBe(
      '2 strikes, 2 beats, then 2 beats of rest to the bar line.',
    );
    expect(row(4).textContent).toMatch(/rest2 beats, to the bar line/);
    fireEvent.click(s.getByRole('button', { name: 'Add strike' }));
    fireEvent.change(select('Step 5 rhythm strike 3: how long'), {
      target: { value: '1440' },
    });
    expect(total()).toBe(
      '3 strikes, 5 beats: 1 beat longer than the bar. Shorten a strike or take one out.',
    );
    // The schema's word, at the rhythm, and no saving until it fits.
    expect(field(4, 'call.rhythm').textContent).toContain(
      'A chord rhythm runs past its bar',
    );
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Short, short, long' }));
    expect(total()).toBe('3 strikes, 4 beats: a full bar.');
    expect(field(4, 'call.rhythm').querySelector('[data-field-issues]')).toBe(
      null,
    );
    expect(screen.queryByText(/to fix before saving/)).toBeNull();
  });

  it('plays a progression saved before it, or takes its X from one', async () => {
    mount();
    openStep(6);
    // Only one-x is saved before step 7; four comes later.
    expect(options('Step 7 saved progression')).toEqual(['one-x']);
    fireEvent.click(radio('Step 7 chords from', 'Its own chords'));
    fireEvent.change(select('Step 7 bar 1 chord'), { target: { value: 'X' } });
    expect(select('Step 7 X comes from').value).toBe('one-x');
    const body = await saved();
    expect(body.steps[6]).toEqual({
      tag: 'play-1-x',
      section: 'Chords',
      title: 'Play 1 X',
      call: {
        chords: ['X', '1'],
        progression: 'one-x',
        rhythm: [480, 480, 960],
        harmony: 'triads',
      },
    });
  });

  it('offers no saved progression before any is saved', () => {
    mount();
    openStep(4);
    expect(
      (
        radio(
          'Step 5 chords from',
          'Use a saved progression',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

describe('a choose-chords step', () => {
  it('edits its template, harmony and saved name, the steps that play it following', async () => {
    mount();
    const s = openStep(5);
    const bar = (n: number) =>
      s.getByRole('button', { name: new RegExp(`^Step 6 template bar ${n}:`) });
    fireEvent.click(bar(1));
    expect(bar(1).getAttribute('aria-label')).toMatch(/X, the student picks/);
    fireEvent.click(s.getByRole('button', { name: 'Add bar' }));
    fireEvent.click(s.getByRole('button', { name: 'Add bar' }));
    fireEvent.click(
      s.getByRole('button', { name: 'Remove Step 6 template bar 2' }),
    );
    expect(row(5).textContent).toContain('| X | X | X | · 3 X bars to fill');
    fireEvent.click(radio('Step 6 harmony', '7ths'));
    const name = s.getByRole('textbox', { name: 'Step 6 saved as' });
    fireEvent.change(name, { target: { value: 'My X' } });
    fireEvent.blur(name);
    const body = await saved();
    expect(body.steps[5]).toEqual({
      kind: 'chooseChords',
      tag: 'choose-x',
      section: 'Chords',
      title: 'Choose your X',
      template: ['X', 'X', 'X'],
      distinct: 1,
      harmony: 'sevenths',
      saveAs: 'my-x',
    });
    expect(body.steps.slice(6, 8).map((st) => 'call' in st && st.call)).toEqual(
      [
        expect.objectContaining({ progression: 'my-x' }),
        expect.objectContaining({ progression: 'my-x' }),
      ],
    );
  });

  it('shows both palettes and plays a sample of the template', () => {
    mount();
    openStep(5);
    const palette = (mode: string) =>
      row(5).querySelector(`[data-palette="${mode}"]`)?.textContent;
    expect(palette('major')).toContain('2 min3 min4 maj5 maj6 min');
    expect(palette('minor')).toContain('♭3 maj4 min5 min♭6 maj♭7 maj');
    fireEvent.click(screen.getByRole('button', { name: 'Play sample' }));
    expect(preview.play).toHaveBeenCalledWith(
      expect.objectContaining({ id: PART2_FIXTURE.id }),
      5,
      expect.objectContaining({
        call: {
          chords: ['1', '4'],
          rhythm: [480, 480, 960],
          harmony: 'triads',
        },
      }),
    );
  });

  it('says so at the step that can’t take two chords for its X', () => {
    mount();
    const s = openStep(5);
    fireEvent.click(s.getByRole('button', { name: 'Add bar' }));
    fireEvent.change(select('Step 6 different chords'), {
      target: { value: '2' },
    });
    openStep(7);
    expect(field(7, 'call.chords').textContent).toContain(
      'X stands for one chord, but "one-x" has 2: play the progression itself',
    );
  });
});

describe('a replay', () => {
  it('picks a progression saved before it, its harmonies and a rhythm', async () => {
    mount();
    const s = openStep(9);
    expect(options('Step 10 progression')).toEqual(['one-x', 'four']);
    fireEvent.change(select('Step 10 progression'), {
      target: { value: 'one-x' },
    });
    fireEvent.change(select('Step 10 harmony 1'), {
      target: { value: 'sevenths' },
    });
    fireEvent.click(
      s.getByRole('button', { name: 'Remove Step 10 harmony 2' }),
    );
    fireEvent.click(s.getByRole('checkbox', { name: 'Its own rhythm' }));
    const body = await saved();
    expect(body.steps[9]).toEqual({
      kind: 'replay',
      tag: 'hear-four',
      section: '7th Chords',
      title: 'Your four, with 7ths',
      progression: 'one-x',
      harmonies: ['sevenths'],
      rhythm: [480, 480, 960],
    });
  });

  it('leaves the default harmonies out of the file', () => {
    mount();
    const s = openStep(9);
    fireEvent.click(s.getByRole('button', { name: /Add a time through/ }));
    expect(options('Step 10 harmony 3')).toBeDefined();
    fireEvent.click(
      s.getByRole('button', { name: 'Remove Step 10 harmony 3' }),
    );
    // Triads then 7ths again: nothing to save.
    expect(saveButton().disabled).toBe(true);
  });
});

describe('a melody', () => {
  it('offers 1–7 only under scale numbering, takes words and gives them back, and sets its create round’s bars', async () => {
    mount();
    const s = openStep(1);
    const picker = select('Step 2 call note 1: which note');
    expect([...picker.options].map((o) => o.value).slice(0, 7)).toEqual(
      ['1', '2', '3', '4', '5', '6', '7'].map((d) => `${d}|0`),
    );
    expect(picker.title).toMatch(/major or minor/);
    expect(row(1).textContent).toContain(
      'Numbers follow major or minor: in minor, 3, 6 and 7 are ♭3, ♭6 and ♭7.',
    );
    fireEvent.click(s.getByRole('button', { name: /Add words/ }));
    expect(
      s.getByRole('textbox', { name: 'Step 2 words, as sung' }),
    ).toBeDefined();
    fireEvent.click(s.getByRole('button', { name: /Remove words/ }));
    expect(
      s.queryByRole('textbox', { name: 'Step 2 words, as sung' }),
    ).toBeNull();
    // In its module's create round, by default; no challenge to set.
    expect(
      radio('Step 2 in the create round', 'In it').getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.queryByRole('radiogroup', { name: /Step 2 challenge/ }),
    ).toBeNull();
    fireEvent.change(select('Step 2 create pass bars'), {
      target: { value: '2' },
    });
    const body = await saved();
    expect(body.steps[1]).toEqual({
      tag: 'one-three-five',
      section: 'Choose a Color',
      title: '1-3-5',
      call: (PART2_FIXTURE.steps[1] as LiteracyMelodicEchoStep).call,
      passes: { createBars: 2 },
    });
  });

  it('leaves a step out of its module’s round, and puts it back', async () => {
    mount();
    openStep(3);
    expect(field(3, 'passes').textContent).toContain(
      'Once students pass “Create a Melody”, its create round goes through its steps again.',
    );
    fireEvent.click(radio('Step 4 in the create round', 'Skip this step'));
    // Out of the round: no bars to set.
    expect(
      screen.queryByRole('combobox', { name: 'Step 4 create pass bars' }),
    ).toBeNull();
    const body = await saved();
    expect(body.steps[3]).toMatchObject({ passes: { create: false } });
    fireEvent.click(radio('Step 4 in the create round', 'In it'));
    expect(saveButton().textContent).toBe('Save');
  });

  it('says so when its module has no round', () => {
    mount({
      ...PART2_FIXTURE,
      modules: [{ title: 'Create a Melody', round: 'none' }],
    });
    openStep(3);
    expect(field(3, 'passes').textContent).toContain(
      '“Create a Melody” has no round: set one on its header.',
    );
    expect(
      screen.queryByRole('radiogroup', {
        name: 'Step 4 in the create round',
      }),
    ).toBeNull();
  });

  it('flags a flat under scale numbering on its note', () => {
    mount({
      ...PART2_FIXTURE,
      steps: PART2_FIXTURE.steps.map((st, i) =>
        i === 1 && 'call' in st && !('harmony' in st.call)
          ? {
              ...st,
              call: {
                ...st.call,
                notes: st.call.notes.map((n, j) =>
                  j === 1 ? { ...n, degree: 'b3' as const } : n,
                ),
              },
            }
          : st,
      ),
    });
    openStep(1);
    const picker = select('Step 2 call note 2: which note');
    expect(picker.getAttribute('aria-invalid')).toBe('true');
    expect(picker.selectedOptions[0].textContent).toBe('♭3 (use 1–7)');
    expect(field(1, 'call').textContent).toContain(
      'Scale numbering writes the plain degrees 1–7: the mode gives the flats',
    );
  });
});

describe('the choose steps', () => {
  it('edit their title and direction, and say what the student sees', async () => {
    mount();
    // Step 1 is open.
    expect(row(0).textContent).toContain('What the student sees');
    expect(row(0).textContent).toContain('The circle of fifths');
    fireEvent.click(
      screen.getByRole('button', { name: 'Step 1 direction — click to edit' }),
    );
    const direction = screen.getByRole('textbox', { name: 'Step 1 direction' });
    fireEvent.change(direction, { target: { value: 'Tap a color.' } });
    fireEvent.blur(direction);
    const body = await saved();
    expect(body.steps[0]).toEqual({
      kind: 'chooseKey',
      tag: 'choose-key',
      title: 'Choose your key',
      direction: 'Tap a color.',
    });
  });

  it('say so when the lesson picks the key, and put it back', () => {
    mount();
    fireEvent.click(radio('Who picks the key', 'Lesson'));
    expect(row(0).textContent).toContain(
      'Only a lesson whose key is the student’s choice asks for it',
    );
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Let students pick the key' }),
    );
    expect(
      radio('Who picks the key', 'Student').getAttribute('aria-checked'),
    ).toBe('true');
    expect(saveButton().disabled).toBe(true); // Nothing changed.
  });
});

describe('the gate', () => {
  const header = (title: string) =>
    document.querySelector(`[data-section="${title}"] [data-gate-header]`);

  it('heads the first section of choose steps alone as the gate, with no goal or round', () => {
    mount(PART2_GATED_FIXTURE);
    expect(header('Choose a Color')?.textContent).toBe(
      'Gatethe student’s key and major/minor',
    );
    expect(
      document.querySelector('[data-section="Choose a Color"] [data-gate-note]')
        ?.textContent,
    ).toContain('No goal or round');
    // The modules have their settings; the gate none.
    expect(
      [...document.querySelectorAll('[data-module-settings]')].map((m) =>
        m.getAttribute('data-module-settings'),
      ),
    ).toEqual(['Create a Melody', 'Chords', '7th Chords']);
    expect(
      screen.queryByRole('textbox', { name: 'Choose a Color goal' }),
    ).toBeNull();
    // Its choose steps are where they belong: no warning.
    expect(row(0).textContent).not.toContain('outside the gate');
    expect(document.querySelector('[data-choose-warning]')).toBeNull();
    // A lesson whose first section holds an echo has no gate.
    cleanup();
    mount();
    expect(header('Choose a Color')).toBeNull();
    expect(
      document.querySelector('[data-module-settings="Choose a Color"]'),
    ).toBeTruthy();
  });

  it('warns at a choose step outside it, and moves it in', async () => {
    const again: MusicLiteracyLesson = {
      ...PART2_GATED_FIXTURE,
      steps: [
        ...PART2_GATED_FIXTURE.steps.slice(0, 1),
        ...PART2_GATED_FIXTURE.steps.slice(2, 4),
        { ...PART2_STEPS.mode, section: 'Chords' },
        ...PART2_GATED_FIXTURE.steps.slice(4),
      ],
    };
    mount(again);
    // Step 4, major or minor, asks again in Chords.
    expect(row(3).textContent).toContain('outside the gate');
    const opened = openStep(3);
    expect(row(3).querySelector('[data-choose-warning]')?.textContent).toBe(
      'Students choose the key and major/minor once, in “Choose a Color” at the start. This step asks again: move it there, or delete it.',
    );
    fireEvent.click(
      opened.getByRole('button', { name: 'Move it to the gate' }),
    );
    // Last in the gate, after the key, and still the step open.
    const gate = document.querySelector('[data-section="Choose a Color"]')!;
    expect(
      [...gate.querySelectorAll<HTMLElement>('[data-step]')].map(
        (r) => r.dataset.step,
      ),
    ).toEqual(['0', '1']);
    expect(row(1).textContent).toContain('Major or minor?');
    expect(
      row(1)
        .querySelector('button[aria-expanded]')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(document.querySelector('[data-choose-warning]')).toBeNull();
    const body = await saved();
    expect(body.steps.slice(0, 3).map((st) => [st.tag, st.section])).toEqual([
      ['choose-key', 'Choose a Color'],
      ['choose-mode', 'Choose a Color'],
      ['one-three-five', 'Create a Melody'],
    ]);
  });

  it('says how to make one when the lesson has none', () => {
    mount();
    expect(row(2).textContent).toContain('not in a gate');
    openStep(2);
    expect(row(2).querySelector('[data-choose-warning]')?.textContent).toBe(
      'Students choose the key and major/minor once, at the start: put the choose steps alone in the first section, and it becomes the gate.',
    );
    expect(
      within(row(2)).queryByRole('button', { name: 'Move it to the gate' }),
    ).toBeNull();
  });
});

describe('the lesson’s settings', () => {
  it('sets the numbers, the default round and the goal', async () => {
    mount();
    expect(
      radio('Numbers', 'Follow major/minor').getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.click(radio('Numbers', 'As written'));
    expect(radio('Lesson round', 'Create').getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(
      document.querySelector('[data-field="passes"]')?.textContent,
    ).toContain('Round, after each module');
    // The goal: the default shown until one is written.
    const goal = screen.getByRole('textbox', {
      name: 'Lesson goal',
    }) as HTMLInputElement;
    expect(goal.value).toBe('');
    expect(goal.placeholder).toContain(DEFAULT_LESSON_GOAL);
    fireEvent.click(radio('Lesson round', 'Challenge'));
    fireEvent.change(goal, {
      target: { value: 'Make it, then play it twice.' },
    });
    fireEvent.blur(goal);
    const body = await saved();
    expect(body).not.toHaveProperty('numbering');
    // The challenge is the default round: no passes at all.
    expect(body).not.toHaveProperty('passes');
    expect(body.goal).toBe('Make it, then play it twice.');
    // In the file, after the passes it would have and before the tempo.
    expect(Object.keys(body).indexOf('goal')).toBe(
      Object.keys(body).indexOf('tempo') - 1,
    );
  });

  it('turns the round off, and the create round back on', async () => {
    mount();
    fireEvent.click(radio('Lesson round', 'None'));
    expect(
      document.querySelector('[data-field="passes"]')?.textContent,
    ).toContain('Nothing more: students go on.');
    let body = await saved();
    expect(body.passes).toEqual({ challenge: false });
    store.save.mockClear();
    fireEvent.click(radio('Lesson round', 'Create'));
    body = await saved();
    expect(body.passes).toEqual({ challenge: false, create: true });
  });

  it('keeps them folded away for a Part 1 lesson', () => {
    mount(LITERACY_FIXTURE);
    const more = screen.getByRole('button', { name: /More settings/ });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('radiogroup', { name: 'Numbers' })).toBeNull();
    fireEvent.click(more);
    expect(
      radio('Who picks the key', 'Lesson').getAttribute('aria-checked'),
    ).toBe('true');
    // One module, the whole lesson: its round, the challenge.
    expect(
      radio('Lesson round', 'Challenge').getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      document.querySelector('[data-field="passes"]')?.textContent,
    ).toContain('Round, at the end');
    // No goal: no card at its start.
    expect(
      (screen.getByRole('textbox', { name: 'Lesson goal' }) as HTMLInputElement)
        .placeholder,
    ).toBe('None: no goal card at the start');
    // No sections in Part 1: no headers.
    expect(
      screen.queryByRole('button', { name: /^Hide the steps/ }),
    ).toBeNull();
  });
});

describe('sections', () => {
  const groups = () =>
    [...document.querySelectorAll<HTMLElement>('[data-step-group]')].map(
      (g) =>
        `${g.dataset.section}:${[...g.querySelectorAll<HTMLElement>('[data-step]')].map((r) => r.dataset.step).join(',')}`,
    );

  it('groups the steps under their sections, and folds one away', () => {
    mount();
    expect(groups()).toEqual([
      ':0',
      'Choose a Color:1',
      ':2',
      'Create a Melody:3',
      'Chords:4,5,6,7',
      '7th Chords:8,9',
    ]);
    fireEvent.click(
      screen.getByRole('button', { name: 'Hide the steps in Chords' }),
    );
    expect(groups()[4]).toBe('Chords:');
    fireEvent.click(
      screen.getByRole('button', { name: 'Show the steps in Chords' }),
    );
    expect(groups()[4]).toBe('Chords:4,5,6,7');
  });

  it('moves a step within its section, over the edge into the next, and by its grip’s keys', async () => {
    mount();
    // Play 1 X below X 1: both still after the step that saves one-x.
    fireEvent.click(screen.getByRole('button', { name: 'Move step 7 down' }));
    expect(groups()[4]).toBe('Chords:4,5,6,7');
    expect(row(7).textContent).toContain('Play 1 X');
    // The first of Chords, up: into Create a Melody, where it is.
    fireEvent.click(screen.getByRole('button', { name: 'Move step 5 up' }));
    expect(groups().slice(3, 5)).toEqual([
      'Create a Melody:3,4',
      'Chords:5,6,7',
    ]);
    // Alt+↓ on the last of Chords' grip: into 7th Chords, where it is.
    fireEvent.keyDown(
      screen.getByRole('button', { name: /^Move step 8 \(drag/ }),
      { key: 'ArrowDown', altKey: true },
    );
    expect(groups().slice(4)).toEqual(['Chords:5,6', '7th Chords:7,8,9']);
    const body = await saved();
    expect(body.steps.map((s) => s.tag).slice(3, 10)).toEqual([
      'one-seven-one',
      'the-1-chord',
      'choose-x',
      'play-x-1',
      'play-1-x',
      'choose-four',
      'hear-four',
    ]);
    expect(body.steps[4].section).toBe('Create a Melody');
    expect(body.steps[7].section).toBe('7th Chords');
  });

  it('won’t let a step play a progression before it is saved', () => {
    mount();
    // Play 1 X above the step that saves its progression.
    fireEvent.click(screen.getByRole('button', { name: 'Move step 7 up' }));
    expect(row(5).textContent).toContain('1 to fix');
    expect(
      screen.getByRole('button', {
        name: /^Step 6 · saved progression: No choose-chords step before this one saves "one-x"/,
      }),
    ).toBeDefined();
    expect(saveButton().disabled).toBe(true);
  });

  it('renames a section from its header, and puts a step in a new one', async () => {
    mount();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Section name, Chords — click to edit',
      }),
    );
    const name = screen.getByRole('textbox', { name: 'Section name, Chords' });
    fireEvent.change(name, { target: { value: 'Chord Calls' } });
    fireEvent.blur(name);
    expect(groups()[4]).toBe('Chord Calls:4,5,6,7');
    openStep(3);
    expect(options('Step 4 section')).toEqual([
      '',
      'Choose a Color',
      'Create a Melody',
      'Chord Calls',
      '7th Chords',
      '\u0000new',
    ]);
    fireEvent.change(select('Step 4 section'), {
      target: { value: '\u0000new' },
    });
    const fresh = screen.getByRole('textbox', {
      name: 'Step 4 section: the new section’s name',
    });
    fireEvent.change(fresh, { target: { value: 'Warm-up' } });
    fireEvent.keyDown(fresh, { key: 'Enter' });
    expect(groups()[3]).toBe('Warm-up:3');
    const body = await saved();
    expect(body.steps.map((s) => s.section ?? null)).toEqual([
      null,
      'Choose a Color',
      null,
      'Warm-up',
      'Chord Calls',
      'Chord Calls',
      'Chord Calls',
      'Chord Calls',
      '7th Chords',
      '7th Chords',
    ]);
  });

  it('sets each module’s goal and round on its section’s header', async () => {
    mount();
    const settings = (title: string) =>
      document.querySelector(`[data-module-settings="${title}"]`)!;
    // Every titled section has them; the steps with none, no header of their own.
    expect(
      [...document.querySelectorAll('[data-module-settings]')].map((m) =>
        m.getAttribute('data-module-settings'),
      ),
    ).toEqual(['Choose a Color', 'Create a Melody', 'Chords', '7th Chords']);
    // The lesson's default round, and the default goal for what it plays.
    expect(radio('Chords round', 'Create').getAttribute('aria-checked')).toBe(
      'true',
    );
    const goal = screen.getByRole('textbox', {
      name: 'Chords goal',
    }) as HTMLInputElement;
    expect(goal.placeholder).toBe(`${MODULE_GOALS.comping} (the default)`);
    // 7th Chords has no echo: nothing to create on.
    expect(settings('7th Chords').textContent).toContain(
      'No call-and-response steps here yet',
    );

    fireEvent.click(radio('Choose a Color round', 'None'));
    expect(settings('Choose a Color').textContent).toContain(
      'Nothing more: students go on.',
    );
    fireEvent.change(goal, {
      target: { value: 'Comp on your chords, twice.' },
    });
    fireEvent.keyDown(goal, { key: 'Enter' });
    fireEvent.click(radio('Create a Melody round', 'Challenge'));
    expect(settings('Create a Melody').textContent).toContain(
      'playing ALL the notes along with Atlas',
    );
    const body = await saved();
    // In the order of their sections.
    expect(body.modules).toEqual([
      { title: 'Choose a Color', round: 'none' },
      { title: 'Create a Melody', round: 'challenge' },
      { title: 'Chords', goal: 'Comp on your chords, twice.' },
    ]);
  });

  it('keeps a module with its section when the section is renamed, and lets one go with its last step', async () => {
    mount({
      ...PART2_FIXTURE,
      modules: [
        { title: 'Chords', goal: 'Comp it.', round: 'create' },
        { title: 'Create a Melody', round: 'none' },
      ],
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Section name, Chords — click to edit',
      }),
    );
    const name = screen.getByRole('textbox', { name: 'Section name, Chords' });
    fireEvent.change(name, { target: { value: 'Comping' } });
    fireEvent.blur(name);
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Comping goal',
        }) as HTMLInputElement
      ).value,
    ).toBe('Comp it.');
    // Create a Melody's one step moved into Choose a Color: its module goes.
    openStep(3);
    fireEvent.change(select('Step 4 section'), {
      target: { value: 'Choose a Color' },
    });
    const body = await saved();
    expect(body.modules).toEqual([
      { title: 'Comping', goal: 'Comp it.', round: 'create' },
    ]);
  });

  it('names a module’s problem by its title', () => {
    mount({
      ...PART2_FIXTURE,
      modules: [{ title: 'Warm-up' }],
    });
    // Listed above, and under the lesson's settings.
    expect(
      screen.getAllByText(
        'Module “Warm-up”: No steps are in a section called "Warm-up"',
      ).length,
    ).toBeGreaterThan(0);
    expect(saveButton().disabled).toBe(true);
  });

  it('drops a dragged step in the gap under the pointer, a folded section’s at its end', () => {
    const box = (top: number, bottom: number, index: number) => ({
      top,
      bottom,
      index,
    });
    const measured = [
      { top: 0, bottom: 100, steps: [box(30, 60, 0), box(60, 90, 1)] },
      { top: 100, bottom: 130, steps: [] }, // folded
      { top: 130, bottom: 230, steps: [box(160, 190, 3)] },
    ];
    expect(stepDropAt(measured, 40)).toEqual({ group: 0, before: 0 });
    expect(stepDropAt(measured, 80)).toEqual({ group: 0, before: null });
    expect(stepDropAt(measured, 115)).toEqual({ group: 1, before: null });
    expect(stepDropAt(measured, 500)).toEqual({ group: 2, before: null });
    const sections = [
      { title: 'A', steps: [0, 1] },
      { title: 'B', steps: [2] },
      { title: 'C', steps: [3] },
    ];
    expect(dropSlot(sections, { group: 1, before: null })).toBe(3);
    expect(dropSlot(sections, { group: 0, before: 1 })).toBe(1);
  });
});

describe('the problems', () => {
  it('shows each at its field, and the list above opens its step', () => {
    mount();
    const s = openStep(5);
    // No X left: the template says so.
    fireEvent.click(s.getByRole('button', { name: /^Step 6 template bar 2:/ }));
    expect(field(5, 'template').textContent).toContain(
      'A template needs an X bar for the student to choose',
    );
    expect(row(5).textContent).toContain('1 to fix');
    // From another step, the list at the top brings it back.
    openStep(0);
    expect(row(5).querySelector('[data-field="template"]')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Step 6 · template: A template needs an X bar for the student to choose',
      }),
    );
    expect(field(5, 'template')).not.toBeNull();
  });

  it('marks a diminished chord a file has on its bar', () => {
    mount(
      withStep(4, {
        tag: 'the-1-chord',
        section: 'Chords',
        title: 'The 1 chord',
        call: {
          chords: ['7', '1'],
          rhythm: [480, 480, 960],
          harmony: 'triads',
        },
      }),
    );
    openStep(4);
    expect(select('Step 5 bar 1 chord').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(field(4, 'call.chords').textContent).toContain(
      'The 7 chord is diminished in major: use another',
    );
    expect(saveButton().disabled).toBe(true);
  });
});
