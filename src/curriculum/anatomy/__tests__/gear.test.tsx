// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import HeadphoneAnatomyPage from '../HeadphoneAnatomyPage';
import MicrophoneAnatomyPage from '../MicrophoneAnatomyPage';
import { termCopy } from '../anatomyCopy';
import { poseFor } from '../anatomyPose';
import { compiledInstrument, describe as describeModel } from '../compileModel';
import { compileDrawing, lathe, polyFace } from '../iso';

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

const headphones = compiledInstrument('headphones', false);
const microphone = compiledInstrument('microphone', false);
const names = (model: typeof headphones) => model.terms.map((t) => t.name);

describe('lathe', () => {
  const cylinder = lathe({
    origin: [0, 0, 0],
    axis: [0, 0, 1],
    profile: [
      [0, 1],
      [2, 1],
    ],
  });

  it('gives a round part a fill, a silhouette and its near end', () => {
    const drawing = compileDrawing([cylinder]);
    expect(drawing.fill).not.toBe('');
    expect(drawing.outline).not.toBe('');
    expect(drawing.ink).not.toBe('');
    expect(drawing.points.length).toBeGreaterThan(0);
  });

  it('reaches further across the page the wider the profile', () => {
    const width = (radius: number) => {
      const { points } = compileDrawing([
        lathe({
          origin: [0, 0, 0],
          axis: [0, 0, 1],
          profile: [
            [0, radius],
            [1, radius],
          ],
        }),
      ]);
      const xs = points.map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(width(2)).toBeCloseTo(width(1) * 2, 1);
  });

  it('draws a ring for each seam', () => {
    const plain = compileDrawing([cylinder]);
    const seamed = compileDrawing([
      lathe({
        origin: [0, 0, 0],
        axis: [0, 0, 1],
        profile: [
          [0, 1],
          [1, 1, 'seam'],
          [2, 1],
        ],
      }),
    ]);
    expect(seamed.ink.match(/M/g)!.length).toBe(
      plain.ink.match(/M/g)!.length + 1,
    );
  });

  it('leaves the middle of a bored part open', () => {
    const open = compileDrawing([
      lathe({
        origin: [0, 0, 0],
        axis: [0, 1, 0],
        profile: [
          [0, 2],
          [1, 2],
        ],
        bore: 1,
      }),
    ]);
    // The hole's own ring, as well as the rim.
    expect(open.ink.match(/M/g)!.length).toBe(2);
  });

  it('textures one way for a grip and both ways for mesh', () => {
    const textured = (texture: 'helix' | 'mesh') =>
      compileDrawing([
        lathe({
          origin: [0, 0, 0],
          axis: [0, 0, 1],
          profile: [
            [0, 1],
            [2, 1],
          ],
          texture,
          strands: 12,
        }),
      ]);
    expect(textured('helix').hatch).not.toBe('');
    expect(textured('helix').marks).toBe('');
    expect(textured('mesh').marks).not.toBe('');
    expect(textured('mesh').hatch).toBe('');
  });

  it('draws a flat face anywhere in space', () => {
    const face = compileDrawing([
      polyFace([
        [0, 0, 0],
        [1, 0, 1],
        [1, 1, 1],
      ]),
    ]);
    expect(face.fill.endsWith('Z')).toBe(true);
    expect(face.ink.endsWith('Z')).toBe(true);
  });
});

describe('the headphones', () => {
  it('names what is in the reference: band, cups, pads, driver, cable', () => {
    for (const term of [
      'Headband',
      'Headband Cushion',
      'Sliders',
      'Yokes',
      'Ear Pads',
      'Baffles',
      'Ear Cups',
      'Driver',
      'Diaphragm',
      'Voice Coil',
      'Magnet',
      'Internal Wire',
      'Cable',
      'Plug',
    ]) {
      expect(names(headphones)).toContain(term);
    }
  });

  it('comes apart both ways from the head', () => {
    for (const id of [
      'pad',
      'baffle',
      'diaphragm',
      'coil',
      'magnet',
      'shell',
    ]) {
      const left = headphones.partById[`${id}Left`].explode[1];
      const right = headphones.partById[`${id}Right`].explode[1];
      expect(left, id).toBeLessThan(0);
      expect(right, id).toBe(-left);
    }
  });

  it('textures the left coil where the left coil is', () => {
    // Its stretch mirrors with the side: unmirrored, the lines fall off the part.
    const { layers } = headphones.partById.coilLeft;
    const { box } = headphones.partById.coilLeft;
    const xs = [...layers[0].hatch.matchAll(/[ML](-?[\d.]+) /g)].map((m) =>
      Number(m[1]),
    );
    expect(xs.length).toBeGreaterThan(0);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(box.x0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(box.x1);
  });

  it('stacks each side in order, ear to shell', () => {
    const order = ['pad', 'baffle', 'diaphragm', 'coil', 'magnet', 'shell'];
    const reach = order.map(
      (id) => headphones.partById[`${id}Right`].explode[1],
    );
    expect(reach).toEqual([...reach].sort((a, b) => a - b));
  });

  it('lights both sides of a word, and goes home as a pair in Build it', () => {
    const pose = poseFor(headphones, 1, 'pad');
    expect(pose.padLeft.state).toBe('lit');
    expect(pose.padRight.state).toBe('lit');
    const step = headphones.buildOrder.find((s) => s.term === 'pad');
    expect(step?.parts).toEqual(['padLeft', 'padRight']);
  });

  it('reads as a pair of headphones', () => {
    expect(describeModel(headphones)).toBe('a pair of headphones');
  });
});

describe('the microphone', () => {
  it('names the stack in the reference, and what is inside it', () => {
    for (const term of [
      'Grille',
      'Grille Band',
      'Windscreen',
      'Capsule',
      'Diaphragm',
      'Voice Coil',
      'Magnet',
      'Shock Mount',
      'Handle',
      'On/Off Switch',
      'XLR Pins',
      'XLR Connector',
      'Cable',
    ]) {
      expect(names(microphone)).toContain(term);
    }
  });

  it('comes apart along one line, the head one way and the cable the other', () => {
    const along = (id: string) => {
      const [u, v, z] = microphone.partById[id].explode;
      return u * 0.62 + v * 0.2 + z * 0.76;
    };
    expect(along('grille')).toBeGreaterThan(along('windscreen'));
    expect(along('windscreen')).toBeGreaterThan(along('diaphragm'));
    expect(along('diaphragm')).toBeGreaterThan(along('magnet'));
    expect(along('magnet')).toBeGreaterThan(along('shockMount'));
    expect(along('shockMount')).toBeGreaterThan(0);
    expect(along('cable')).toBeLessThan(along('xlrConnector'));
    expect(along('xlrConnector')).toBeLessThan(0);
  });

  it('takes the head off to show the capsule', () => {
    const pose = poseFor(microphone, 1, 'diaphragm');
    expect(pose.diaphragm.state).toBe('lit');
    expect(pose.grille.offset[2]).toBeGreaterThan(pose.diaphragm.offset[2]);
    expect(pose.windscreen.offset[2]).toBeGreaterThan(pose.diaphragm.offset[2]);
  });

  it('says a dynamic microphone needs no power', () => {
    expect(termCopy('microphone', 'magnet')?.why).toContain('no power');
    expect(describeModel(microphone)).toBe('a dynamic microphone');
  });
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
  });

  const open = (page: React.ReactElement, url = '') =>
    render(<MemoryRouter initialEntries={[`/x${url}`]}>{page}</MemoryRouter>);

  it.each([
    [
      'headphones',
      <HeadphoneAnatomyPage key="h" />,
      'Exploded diagram of a pair of headphones',
    ],
    [
      'microphone',
      <MicrophoneAnatomyPage key="m" />,
      'Exploded diagram of a dynamic microphone',
    ],
  ] as const)(
    '%s: no choice to make, and it leaves the instrument alone',
    (kind, page, label) => {
      useInstrumentStore.getState().setInstrument('bass');
      open(page);
      expect(document.querySelector('[data-guitar]')).toHaveAttribute(
        'data-guitar',
        kind,
      );
      expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.queryByText('Left-handed')).not.toBeInTheDocument();
      expect(useInstrumentStore.getState().instrument).toBe('bass');
      useInstrumentStore.getState().setInstrument('piano');
    },
  );

  it.each([
    ['headphones', <HeadphoneAnatomyPage key="h" />] as const,
    ['microphone', <MicrophoneAnatomyPage key="m" />] as const,
  ])('%s: a build finishes and offers only to go again', (kind, page) => {
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
  });
});
