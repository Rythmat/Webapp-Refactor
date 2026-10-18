// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── The Mix view (milestone 2.10) ──────────────────────────────────────────
// A strip per track and per return, the master column at the right, the
// lessons' anchors, an empty state with no tracks, and the clicks that open
// a rack in the RackDock (rackTarget.openRack) with the right target.

const h = vi.hoisted(() => ({ openRack: vi.fn() }));
vi.mock('../rackTarget', () => ({ openRack: h.openRack }));

import { useStore } from '@/daw/store';
import { MixView } from '../MixView';
import { MIX_STRIP_PX } from '../MixStrip';

const s = () => useStore.getState();
let ids: string[];

// jsdom has no 2D canvas: the meters and the spectrum just don't draw.
const getContext = HTMLCanvasElement.prototype.getContext;
const scrollIntoView = vi.fn();
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof getContext;
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = getContext;
});

beforeEach(() => {
  useStore.setState({
    tracks: [],
    selectedTrackId: null,
    remoteUsers: new Map(),
    mixRack: null,
    muteAllSet: null,
    masteringFxChain: [],
  });
  ids = [
    s().addTrack('midi', 'piano-sampler', 'Rhodes'),
    s().addTrack('midi', 'drum-machine', 'Drums'),
    s().addTrack('audio', 'vocal-fx', 'Vox'),
  ];
  s().setSelectedTrackId(null);
  h.openRack.mockClear();
  scrollIntoView.mockClear();
});

afterEach(cleanup);

const strips = () => screen.getAllByTestId('mix-strip');
const stripOf = (name: string) =>
  screen.getByRole('group', { name: `${name} strip` });

describe('MixView', () => {
  it('shows a strip per track, then the returns, and the master column', () => {
    render(<MixView isReady={false} />);
    const view = screen.getByTestId('mix-view');
    expect(view).toHaveAttribute('data-ds', 'v2');
    expect(strips().map((el) => el.dataset.trackId)).toEqual(ids);
    expect(strips()[0].style.width).toBe(`${MIX_STRIP_PX}px`);
    expect(MIX_STRIP_PX).toBe(96);
    const returns = screen.getAllByTestId('return-strip');
    expect(returns.map((el) => el.dataset.returnId)).toEqual(['A', 'B']);
    // The returns come after the tracks, in the one scrolling row.
    const row = screen.getByTestId('mix-strips');
    expect(
      Array.from(row.children).map((el) => el.getAttribute('data-testid')),
    ).toEqual([
      'mix-strip',
      'mix-strip',
      'mix-strip',
      'return-strip',
      'return-strip',
    ]);
    expect(screen.getByTestId('master-column').style.width).toBe('240px');
  });

  it('keeps the lessons’ anchors', () => {
    const { container } = render(<MixView isReady={false} />);
    const anchor = (id: string) =>
      container.querySelectorAll(`[data-tutorial-id="${id}"]`);
    expect(anchor('mixer-section')).toHaveLength(1);
    expect(anchor('mixer-section')[0]).toBe(screen.getByTestId('mix-strips'));
    // One send knob per strip per return.
    expect(anchor('mixer-sends-A')).toHaveLength(3);
    expect(anchor('mixer-sends-B')).toHaveLength(3);
    expect(anchor('return-strip-A')).toHaveLength(1);
    expect(anchor('return-strip-B')).toHaveLength(1);
    expect(anchor('master-strip')).toHaveLength(1);
    expect(anchor('mastering-section')).toHaveLength(1);
  });

  it('says how to start with no tracks, and still shows returns and master', () => {
    useStore.setState({ tracks: [] });
    render(<MixView isReady={false} />);
    expect(screen.getByText('Add tracks to see the mixer')).toBeInTheDocument();
    expect(screen.queryAllByTestId('mix-strip')).toHaveLength(0);
    expect(screen.getAllByTestId('return-strip')).toHaveLength(2);
    expect(screen.getByTestId('master-column')).toBeInTheDocument();
  });

  it('a strip’s effects open its rack on that effect', () => {
    s().addActiveEffect(ids[1], 'compressor');
    s().addActiveEffect(ids[1], 'eq');
    render(<MixView isReady={false} />);
    const list = within(stripOf('Drums')).getByRole('group', {
      name: 'Effects on Drums',
    });
    fireEvent.click(within(list).getByRole('button', { name: /^EQ on Drums/ }));
    expect(h.openRack).toHaveBeenLastCalledWith(
      { kind: 'track', id: ids[1] },
      'eq',
    );
  });

  it('an empty strip says Add effect, which opens its rack', () => {
    render(<MixView isReady={false} />);
    fireEvent.click(
      within(stripOf('Vox')).getByRole('button', {
        name: 'Add an effect to Vox',
      }),
    );
    expect(h.openRack).toHaveBeenLastCalledWith({ kind: 'track', id: ids[2] });
  });

  it('shows three names and +N for the rest', () => {
    for (const fx of ['compressor', 'eq', 'gate', 'delay'] as const) {
      s().addActiveEffect(ids[0], fx);
    }
    render(<MixView isReady={false} />);
    const strip = stripOf('Rhodes');
    expect(within(strip).getAllByTestId('insert-effect')).toHaveLength(3);
    const more = within(strip).getByTestId('insert-more');
    expect(more).toHaveTextContent('+1');
    fireEvent.click(more);
    expect(h.openRack).toHaveBeenLastCalledWith({ kind: 'track', id: ids[0] });
  });

  it('marks an effect that is off by its power dot', () => {
    s().addActiveEffect(ids[0], 'compressor');
    s().updateTrackEffects(ids[0], {
      compressor: { ...s().tracks[0].effects.compressor, enabled: false },
    });
    render(<MixView isReady={false} />);
    const dot = within(stripOf('Rhodes')).getByTestId('insert-power');
    expect(dot).not.toHaveAttribute('data-on');
    expect(
      within(stripOf('Rhodes')).getByRole('button', {
        name: /Compressor on Rhodes \(off\)/,
      }),
    ).toBeInTheDocument();
  });

  it('a return strip, its name or its effects open the return’s rack', () => {
    render(<MixView isReady={false} />);
    const a = screen.getByRole('group', { name: 'Return A · Reverb strip' });
    fireEvent.click(a);
    expect(h.openRack).toHaveBeenLastCalledWith({ kind: 'return', id: 'A' });
    h.openRack.mockClear();
    fireEvent.click(
      within(a).getByRole('button', { name: /Return A · Reverb: show/ }),
    );
    expect(h.openRack).toHaveBeenCalledTimes(1);
    expect(h.openRack).toHaveBeenLastCalledWith({ kind: 'return', id: 'A' });
    h.openRack.mockClear();
    fireEvent.click(
      within(a).getByRole('button', { name: /^Reverb on Return A/ }),
    );
    expect(h.openRack).toHaveBeenCalledTimes(1);
    expect(h.openRack).toHaveBeenLastCalledWith(
      { kind: 'return', id: 'A' },
      'reverb',
    );
  });

  it('a click on a return’s fader doesn’t open its rack', () => {
    render(<MixView isReady={false} />);
    fireEvent.click(screen.getAllByTestId('return-strip-fader')[1]);
    expect(h.openRack).not.toHaveBeenCalled();
  });

  it('the master chain opens the master rack', () => {
    s().addMasteringFx('compressor');
    render(<MixView isReady={false} />);
    const mastering = screen.getByRole('region', { name: 'Mastering' });
    fireEvent.click(
      within(mastering).getByRole('button', { name: /^Compressor on Master/ }),
    );
    expect(h.openRack).toHaveBeenLastCalledWith(
      { kind: 'master' },
      'compressor',
    );
  });

  it('marks the list of the rack that is open', () => {
    useStore.setState({ mixRack: { kind: 'track', id: ids[1] } });
    render(<MixView isReady={false} />);
    const lists = screen.getAllByTestId('insert-list');
    expect(lists.filter((el) => el.dataset.open).length).toBe(1);
    expect(within(stripOf('Drums')).getByTestId('insert-list')).toHaveAttribute(
      'data-open',
      'true',
    );
  });

  it('a click on a strip’s name selects its track', () => {
    render(<MixView isReady={false} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Drums: select the track' }),
    );
    expect(s().selectedTrackId).toBe(ids[1]);
    expect(stripOf('Drums')).toHaveAttribute('data-selected', 'true');
  });

  it('scrolls the selected track’s strip into view', () => {
    render(<MixView isReady={false} />);
    scrollIntoView.mockClear();
    act(() => s().setSelectedTrackId(ids[2]));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(stripOf('Vox'));
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
  });
});
