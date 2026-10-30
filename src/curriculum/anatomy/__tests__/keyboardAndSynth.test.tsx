// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import KeyboardAnatomyPage from '../KeyboardAnatomyPage';
import SynthAnatomyPage from '../SynthAnatomyPage';
import { termCopy } from '../anatomyCopy';
import { poseFor } from '../anatomyPose';
import { compiledInstrument, describe as describeModel } from '../compileModel';
import {
  blackKeySolids,
  keyboardHalf,
  pianoKeys,
  whiteKeySolids,
} from '../pianoKeys';

// The frame's rail and panels aren't this activity: the frame is tested with
// the lessons, and here it only needs to show its children.
vi.mock('@/curriculum/guitar/layout/LessonFrame', () => ({
  LessonFrame: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/curriculum/guitar/layout/GuitarLessonHeader', () => ({
  GuitarLessonHeader: () => null,
}));
vi.mock('@/curriculum/guitar/layout/LessonInsightPanel', () => ({
  LessonInsightPanel: () => null,
}));
vi.mock('@/curriculum/guitar/layout/settingsControls', async (original) => ({
  ...(await original<
    typeof import('@/curriculum/guitar/layout/settingsControls')
  >()),
  // Open, so its rows can be read.
  GuitarSheet: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

const keyboard = compiledInstrument('keyboard', false);
const synth = compiledInstrument('synth', false);
const names = (model: typeof keyboard) => model.terms.map((t) => t.name);

describe('key ranges', () => {
  it('has 61 keys on the keyboard, 36 white and 25 black, C to C', () => {
    const keys = pianoKeys(36, 96);
    expect(keys).toHaveLength(61);
    expect(keys.filter((k) => k.black)).toHaveLength(25);
    expect(keys[0].midi % 12).toBe(0);
    expect(keys[60].midi % 12).toBe(0);
    const spec = { frontU: 0, z: 1, low: 36, high: 96 };
    expect(whiteKeySolids(spec)).toHaveLength(36);
    expect(blackKeySolids(spec)).toHaveLength(25);
  });

  it('has 49 keys on the synth, 29 white and 20 black', () => {
    const keys = pianoKeys(36, 84);
    expect(keys).toHaveLength(49);
    expect(keys.filter((k) => k.black)).toHaveLength(20);
  });

  it('centres any range', () => {
    const keys = pianoKeys(36, 84);
    const half = keyboardHalf(36, 84);
    expect(keys[0].v).toBeCloseTo(-half + 0.927 / 2);
    expect(keys[48].v).toBeCloseTo(half - 0.927 / 2);
  });

  it('leaves a piano at 88', () => {
    expect(pianoKeys()).toHaveLength(88);
  });
});

describe('the keyboard', () => {
  it('has speakers and a screen; no hammers, strings or soundboard', () => {
    for (const term of [
      'Speakers',
      'Main Board',
      'Display',
      'Key Sensors',
      'Sustain Pedal',
      'Pitch Wheel',
      'Jacks',
    ]) {
      expect(names(keyboard)).toContain(term);
    }
    for (const term of ['Hammers', 'Strings', 'Soundboard', 'Oscillators']) {
      expect(names(keyboard)).not.toContain(term);
    }
  });

  it('says how it differs from a piano', () => {
    expect(termCopy('keyboard', 'keys')?.what).toContain('no hammers');
    expect(termCopy('keyboard', 'keys')?.what).toContain('61');
  });

  it('reads as an electronic keyboard', () => {
    expect(describeModel(keyboard)).toBe('an electronic keyboard');
  });

  it('opens the case to show the board', () => {
    const pose = poseFor(keyboard, 1, 'mainBoard');
    expect(pose.mainBoard.state).toBe('lit');
    expect(pose.topShell.offset[2]).toBeGreaterThan(pose.mainBoard.offset[2]);
  });
});

describe('the synth', () => {
  it('names its sound path and its two wheels', () => {
    for (const term of [
      'Oscillators',
      'Filter',
      'Amplifier',
      'Envelope',
      'LFO',
      'Pitch Wheel',
      'Mod Wheel',
      'MIDI Ports',
      'Audio Outputs',
      'Voice Board',
      'End Cheeks',
    ]) {
      expect(names(synth)).toContain(term);
    }
    for (const term of ['Speakers', 'Hammers', 'Strings']) {
      expect(names(synth)).not.toContain(term);
    }
  });

  it('lists the sound path in the order the sound travels', () => {
    const engine = synth.terms
      .filter((t) => t.family === 'engine')
      .map((t) => t.name);
    expect(engine).toEqual([
      'Oscillators',
      'Filter',
      'Amplifier',
      'Envelope',
      'LFO',
    ]);
  });

  it('lays the panel out in that order, left to right', () => {
    const middle = (id: string) => {
      const { box } = synth.partById[id];
      return (box.x0 + box.x1) / 2;
    };
    expect(middle('oscillators')).toBeLessThan(middle('filter'));
    expect(middle('filter')).toBeLessThan(middle('amplifier'));
  });

  it('puts the pitch wheel left of the mod wheel', () => {
    const left = (id: string) => synth.partById[id].box.x0;
    expect(left('pitchWheel')).toBeLessThan(left('modWheel'));
    expect(termCopy('synth', 'modWheel')?.what).toContain('stays');
    expect(termCopy('synth', 'pitchWheel')?.what).toContain('springs back');
  });

  it('explains ADSR', () => {
    expect(termCopy('synth', 'envelope')?.what).toContain(
      'attack, decay, sustain, release',
    );
  });

  it('reads as a hardware synth', () => {
    expect(describeModel(synth)).toBe('a hardware synth');
  });

  it('lifts a section out on its own', () => {
    const pose = poseFor(synth, 1, 'filter');
    expect(pose.filter.state).toBe('lit');
    expect(pose.filter.offset[2]).toBeGreaterThan(0);
    expect(pose.oscillators.offset).toEqual([0, 0, 0]);
  });

  it('takes the panel off to show the voice board', () => {
    const pose = poseFor(synth, 1, 'voiceBoard');
    expect(pose.panel.offset[2]).toBeGreaterThan(pose.voiceBoard.offset[2]);
    expect(pose.filter.offset).toEqual(pose.panel.offset);
  });
});

describe('what sits under the keys', () => {
  it.each(['keyboard', 'synth'] as const)(
    '%s: slides out in front of the keys, which would hide it',
    (kind) => {
      const model = compiledInstrument(kind, false);
      for (const term of ['keySensors', 'keybed']) {
        const pose = poseFor(model, 1, term);
        expect(pose[term].offset[0], term).toBeLessThan(-10);
        expect(pose.whiteKeys.offset, term).toEqual([0, 0, 0]);
      }
    },
  );
});

describe('the pages', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    useInstrumentStore.getState().setInstrument('guitar');
  });

  const open = (page: React.ReactElement, url = '') =>
    render(<MemoryRouter initialEntries={[`/x${url}`]}>{page}</MemoryRouter>);

  it.each([
    ['keyboard', <KeyboardAnatomyPage key="k" />, 'an electronic keyboard'],
    ['synth', <SynthAnatomyPage key="s" />, 'a hardware synth'],
  ] as const)(
    '%s: one instrument, taught under Keyboard',
    (kind, page, name) => {
      open(page);
      expect(document.querySelector('[data-guitar]')).toHaveAttribute(
        'data-guitar',
        kind,
      );
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.queryByText('Left-handed')).not.toBeInTheDocument();
      expect(useInstrumentStore.getState().instrument).toBe('piano');
      expect(
        screen.getByRole('img', { name: `Exploded diagram of ${name}` }),
      ).toBeInTheDocument();
    },
  );

  it.each([
    ['keyboard', <KeyboardAnatomyPage key="k" />] as const,
    ['synth', <SynthAnatomyPage key="s" />] as const,
  ])('%s: a finished build offers only to go again', (kind, page) => {
    open(page, '?tab=build');
    for (const step of compiledInstrument(kind, false).buildOrder) {
      fireEvent.click(screen.getByTestId(`part-${step.parts[0]}`));
    }
    expect(document.querySelector('[data-build-card]')).toHaveTextContent(
      'Built',
    );
    expect(
      screen.queryByRole('button', { name: /^Build the/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
  });

  it('restores a part from the URL', () => {
    open(<SynthAnatomyPage />, '?part=filter');
    expect(
      document
        .querySelector('[data-part="filter"]')
        ?.getAttribute('data-state'),
    ).toBe('lit');
  });
});
