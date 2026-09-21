// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import GenrePianoRoll from '@/curriculum/components/GenrePianoRoll';
import { LessonOverview } from '../LessonOverview';
import {
  buildPitchClassSpellingMap,
  spelledMidiNoteName,
} from '../noteSpellingLookup';

// Audio, the interactive keyboard and the Prism API aren't part of what's
// being checked here: the rendered note names.
vi.mock('tone', () => ({}));
vi.mock('@/audio/epSampler', () => ({
  startEpSampler: vi.fn(),
  triggerEpAttackRelease: vi.fn(),
}));
vi.mock('@/components/PianoKeyboard', () => ({ PianoKeyboard: () => null }));
vi.mock('@/hooks/data/prism', () => ({
  usePrismMode: () => ({ data: undefined }),
}));

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no ResizeObserver; LessonOverview's ScaledPiano only uses it to size the keyboard.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const render = (element: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(element));
  return container;
};

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ') ?? '';

describe('LessonOverview note spelling', () => {
  // Regression: B♭ / E♭ lessons rendered their overview in A♯ / D♯.
  it.each([
    ['B♭', 70, 'B♭, C, D, E♭, F, G, A', 'has 2 flats'],
    ['E♭', 63, 'E♭, F, G, A♭, B♭, C, D', 'has 3 flats'],
    ['D♭', 61, 'D♭, E♭, F, G♭, A♭, B♭, C', 'has 5 flats'],
    ['A♭', 68, 'A♭, B♭, C, D♭, E♭, F, G', 'has 4 flats'],
    ['F♯', 66, 'F♯, G♯, A♯, B, C♯, D♯, E♯', 'has 6 sharps'],
  ])('%s Ionian', (rootKey, rootMidi, notes, keySignature) => {
    const el = render(
      <LessonOverview mode="ionian" rootKey={rootKey} rootMidi={rootMidi} />,
    );
    expect(text(el)).toContain(`The notes of the scale are: ${notes}`);
    expect(text(el)).toContain(keySignature);
    expect(el.querySelector('h2')?.textContent).toMatch(
      new RegExp(`^${rootKey} `),
    );
  });

  it('spells modes one letter per degree (A♭ Dorian)', () => {
    const el = render(
      <LessonOverview mode="dorian" rootKey="A♭" rootMidi={68} />,
    );
    expect(text(el)).toContain(
      'The notes of the scale are: A♭, B♭, C♭, D♭, E♭, F, G♭',
    );
    expect(text(el)).toContain('has 6 flats');
  });
});

describe('GenrePianoRoll lane labels in B♭ Ionian', () => {
  const scaleMidis = [70, 72, 74, 75, 77, 79, 81, 82];
  const noteSpelling = buildPitchClassSpellingMap('ionian', 'B♭', scaleMidis);
  const events = scaleMidis.map((midi, i) => ({
    id: `n${i}`,
    pitchName: spelledMidiNoteName(midi, noteSpelling),
    startTicks: i * 480,
    durationTicks: 480,
  }));

  const laneLabels = (el: HTMLElement) =>
    [...el.querySelectorAll('div.sticky.left-0 > div')].map(
      (lane) => lane.textContent ?? '',
    );

  it('names every lane, including empty ones, with flats', () => {
    const el = render(
      <GenrePianoRoll bars={4} events={events} noteSpelling={noteSpelling} />,
    );
    const labels = laneLabels(el);
    // A4 (edge lane) up to B5 (edge lane), one lane per semitone.
    expect(labels).toEqual(
      'B5 B♭5 A5 A♭5 G5 G♭5 F5 E5 E♭5 D5 D♭5 C5 B4 B♭4 A4'.split(' '),
    );
    expect(labels.some((label) => /[#♯]/.test(label))).toBe(false);
  });
});
