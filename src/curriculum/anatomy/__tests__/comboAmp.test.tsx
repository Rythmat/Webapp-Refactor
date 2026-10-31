// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import ComboAmpAnatomyPage from '../ComboAmpAnatomyPage';
import { termCopy } from '../anatomyCopy';
import { paintOrder, poseFor } from '../anatomyPose';
import { compiledInstrument, describe as describeModel } from '../compileModel';
import { projectOffset } from '../iso';

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
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

const tube = compiledInstrument('tubeAmp', false);
const solid = compiledInstrument('solidStateAmp', false);
const names = (model: typeof tube) => model.terms.map((t) => t.name);

describe('what differs between them', () => {
  it('the tube amp has tubes, an output transformer and standby', () => {
    for (const term of [
      'Preamp Tubes',
      'Power Tubes',
      'Output Transformer',
      'Standby Switch',
      'Reverb Tank',
    ]) {
      expect(names(tube)).toContain(term);
      expect(names(solid)).not.toContain(term);
    }
  });

  it('the solid state amp has a board, transistors and a heat sink', () => {
    for (const term of ['Circuit Board', 'Power Transistors', 'Heat Sink']) {
      expect(names(solid)).toContain(term);
      expect(names(tube)).not.toContain(term);
    }
  });

  it('both share the rest, so a choice survives switching', () => {
    for (const term of [
      'Cabinet',
      'Grille Cloth',
      'Baffle',
      'Back Panels',
      'Handle',
      'Feet',
      'Control Panel',
      'Input Jack',
      'Volume',
      'Tone Controls',
      'Reverb',
      'Power Switch',
      'Pilot Light',
      'Speaker',
      'Cone',
      'Dust Cap',
      'Voice Coil',
      'Magnet',
      'Speaker Cable',
      'Chassis',
      'Power Transformer',
      'Filter Capacitors',
    ]) {
      expect(names(tube), term).toContain(term);
      expect(names(solid), term).toContain(term);
    }
  });

  it('reads as a tube and a solid-state combo amp', () => {
    expect(describeModel(tube)).toBe('a tube combo amp');
    expect(describeModel(solid)).toBe('a solid-state combo amp');
  });
});

describe('the safety message', () => {
  it.each(['tubeAmp', 'solidStateAmp'] as const)(
    '%s: warns against opening the chassis',
    (kind) => {
      const copy = termCopy(kind, 'chassis');
      expect(copy?.why).toContain('Don’t open it yourself');
      expect(copy?.why).toMatch(/unplugged|stored charge/);
    },
  );

  it('warns of stored charge in the capacitors', () => {
    expect(termCopy('tubeAmp', 'filterCaps')?.why).toContain(
      'dangerous charge',
    );
  });

  it('warns against running a tube amp without a speaker', () => {
    expect(termCopy('tubeAmp', 'outputTransformer')?.why).toContain(
      'without a speaker',
    );
  });
});

describe('poses', () => {
  const at = (order: readonly string[], id: string) => order.indexOf(id);

  it('paints the near side of the cabinet over what is inside', () => {
    const order = paintOrder(tube, poseFor(tube, 0, null));
    expect(at(order, 'cabinetFar')).toBeLessThan(at(order, 'powerTubes'));
    expect(at(order, 'powerTubes')).toBeLessThan(at(order, 'cabinetNear'));
    expect(at(order, 'cabinetNear')).toBeLessThan(at(order, 'grille'));
  });

  it('hangs the tubes under the chassis, which clears them when lifted', () => {
    const pose = poseFor(tube, 1, 'powerTubes');
    expect(pose.powerTubes.state).toBe('lit');
    expect(pose.chassis.offset[2]).toBeGreaterThan(pose.powerTubes.offset[2]);
    expect(pose.grille.offset).toEqual([0, 0, 0]);
  });

  it('keeps the tubes and board clear of the cabinet when apart', () => {
    // They are what sets the two amps apart, so they must be easy to see.
    const top = (model: typeof tube, id: string) => {
      const { box } = model.partById[id];
      return box.y1 + projectOffset(model.partById[id].explode)[1];
    };
    const cabinetTop = tube.partById.cabinetNear.box.y0;
    expect(top(tube, 'powerTubes')).toBeLessThan(cabinetTop + 20);
    expect(tube.partById.powerTubes.explode[2]).toBeGreaterThan(
      solid.partById.circuitBoard.explode[2] - 2,
    );
    expect(tube.partById.chassis.explode[2]).toBeGreaterThan(
      tube.partById.powerTubes.explode[2],
    );
  });

  it('lists the case first and the speaker after the electronics', () => {
    expect(tube.familyOrder?.[0]).toBe('case');
    expect(tube.familyOrder?.indexOf('sound')).toBeGreaterThan(
      tube.familyOrder?.indexOf('engine') ?? 99,
    );
  });

  it('takes the cloth and baffle off to show the speaker', () => {
    const pose = poseFor(solid, 1, 'cone');
    expect(pose.cone.state).toBe('lit');
    expect(pose.grille.offset[0]).toBeLessThan(pose.cone.offset[0]);
    expect(pose.baffle.offset[0]).toBeLessThan(pose.cone.offset[0]);
    // Out to the side too, so they can't hide it.
    expect(pose.grille.offset[1]).toBeLessThan(-10);
    expect(pose.baffle.offset[1]).toBeLessThan(-10);
  });

  it('comes apart in the speaker’s real order, front to back', () => {
    const reach = [
      'magnet',
      'speakerFrame',
      'voiceCoil',
      'cone',
      'dustCap',
    ].map((id) => tube.partById[id].explode[0]);
    expect(reach).toEqual([...reach].sort((a, b) => b - a));
  });
});

function Search() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}

describe('the page', () => {
  const open = (url = '') =>
    render(
      <MemoryRouter initialEntries={[`/learn/gear/combo-amp${url}`]}>
        <ComboAmpAnatomyPage />
        <Search />
      </MemoryRouter>,
    );
  const search = () => screen.getByTestId('search').textContent;

  afterEach(cleanup);
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it('offers Tube Amp and Solid State Amp, the tube amp first', () => {
    open();
    expect(screen.getByRole('radio', { name: 'Tube Amp' })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Solid State Amp' }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-guitar]')).toHaveAttribute(
      'data-guitar',
      'tubeAmp',
    );
  });

  it('opens the solid state amp from a short URL word', () => {
    open('?kind=solid-state');
    expect(document.querySelector('[data-guitar]')).toHaveAttribute(
      'data-guitar',
      'solidStateAmp',
    );
  });

  it('keeps a shared part when switching, and drops one only one has', () => {
    open('?part=cone');
    fireEvent.click(screen.getByRole('radio', { name: 'Solid State Amp' }));
    expect(search()).toContain('kind=solid-state');
    expect(search()).toContain('part=cone');
    fireEvent.click(screen.getByRole('radio', { name: 'Tube Amp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Power Tubes' }));
    expect(search()).toContain('part=powerTubes');
    fireEvent.click(screen.getByRole('radio', { name: 'Solid State Amp' }));
    expect(search()).not.toContain('part=');
  });

  it('leaves the student’s instrument alone', () => {
    useInstrumentStore.getState().setInstrument('guitar');
    open();
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
    useInstrumentStore.getState().setInstrument('piano');
  });

  it('finishes a build by offering the other amp by name', () => {
    open('?tab=build');
    for (const step of tube.buildOrder) {
      fireEvent.click(screen.getByTestId(`part-${step.parts[0]}`));
    }
    expect(
      screen.getByRole('button', { name: 'Build the solid state amp' }),
    ).toBeInTheDocument();
  });
});
