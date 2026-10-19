// @vitest-environment jsdom
/**
 * The Library panel (milestone 2.14, contract D): one search, the ♡ filter
 * and three filter menus whose choices say how many items each leaves, tag
 * chips, "Fits your song" while nothing narrows the list, and a section per
 * kind with its count. ♡ keeps an item in the student's prefs, + adds it,
 * Escape keeps its editor meaning, a row drags the Library's payload, and a search
 * that finds nothing offers Clear. (A template's click is pinned in
 * libraryBody.templateClick.test.tsx.)
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const h = vi.hoisted(() => ({
  addItemAsTrack: vi.fn(async () => true),
  openTemplate: vi.fn(),
  startPreview: vi.fn(async () => {}),
  stopPreview: vi.fn(),
  releasePreviewVoices: vi.fn(),
}));

vi.mock('../addItem', () => ({
  addItemAsTrack: h.addItemAsTrack,
  openTemplate: h.openTemplate,
}));
vi.mock('../preview', () => ({
  startPreview: h.startPreview,
  stopPreview: h.stopPreview,
  releasePreviewVoices: h.releasePreviewVoices,
}));
// No SERUM pack installed, and no network in a test.
vi.mock('@/daw/oracle-synth/store/presets/packLoader', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  fetchPackManifest: async () => null,
}));

import { listLiveParts } from '@/curriculum/engine/parts/registry';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { BrowserPanel } from '../BrowserPanel';
import { useBrowserStore } from '../browserStore';
import { EMPTY_QUERY } from '../query';

const browser = () => screen.getByTestId('library-browser');
const search = () => screen.getByTestId('library-search') as HTMLInputElement;
const section = (type: string) => {
  const el = browser().querySelector<HTMLElement>(
    `[data-testid="library-section"][data-type="${type}"]`,
  );
  if (!el) throw new Error(`No ${type} section`);
  return el;
};
const sectionCount = (type: string) =>
  Number(
    section(type).querySelector('[data-count]')?.getAttribute('data-count'),
  );
const rowsOf = (el: HTMLElement) => [
  ...el.querySelectorAll<HTMLElement>('li[data-testid="library-row"]'),
];
const firstPart = () => rowsOf(section('part'))[0];
/** How many items the sections list, all kinds together. */
const listed = () =>
  screen
    .getAllByTestId('library-section')
    .reduce(
      (n, el) =>
        n +
        Number(el.querySelector('[data-count]')?.getAttribute('data-count')),
      0,
    );

function type(text: string) {
  fireEvent.change(search(), { target: { value: text } });
}

/** Opens a filter menu from the keyboard, as Radix takes it in jsdom. */
async function openFilter(facet: string) {
  const trigger = screen.getByTestId(`library-filter-${facet}`);
  act(() => trigger.focus());
  fireEvent.keyDown(trigger, { key: 'Enter' });
  return screen.findByTestId('library-filter-menu');
}

beforeAll(installDomShims);

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useBrowserStore.setState({
    query: EMPTY_QUERY,
    preview: null,
    question: null,
    adding: [],
    dragging: null,
    dragged: null,
  });
  for (const fn of Object.values(h)) fn.mockClear();
});

afterEach(cleanup);

describe('the Library panel', () => {
  it('shows the search, the filters and a section per kind with its count', () => {
    render(<BrowserPanel />);
    expect(search()).toHaveAttribute('type', 'search');
    for (const id of ['favourites', 'instrument', 'genre', 'type']) {
      expect(screen.getByTestId(`library-filter-${id}`)).toBeInTheDocument();
    }
    // Nothing is narrowed, so there is nothing to clear.
    expect(screen.queryByTestId('library-filter-clear')).toBeNull();

    const types = [
      ...browser().querySelectorAll('[data-testid="library-section"]'),
    ].map((el) => el.getAttribute('data-type'));
    expect(types).toEqual(['part', 'groove', 'kit', 'preset', 'template']);
    expect(sectionCount('part')).toBe(listLiveParts().length);
    expect(rowsOf(section('part'))).toHaveLength(listLiveParts().length);
    expect(sectionCount('groove')).toBe(GROOVES.length);
    expect(sectionCount('kit')).toBe(DRUM_KIT_CONFIGS.length);
    expect(sectionCount('template')).toBe(4);

    const row = firstPart();
    expect(row.getAttribute('data-item-id')).toMatch(/^part:/);
    expect(row).toHaveAttribute('draggable', 'true');
    expect(within(row).getByTestId('library-row-meta').textContent).toMatch(
      /BPM/,
    );
    expect(within(row).getByTestId('library-preview')).toHaveAttribute(
      'data-state',
      'idle',
    );
  });

  it('opens a filter menu whose choices say their counts', async () => {
    render(<BrowserPanel />);
    const menu = await openFilter('instrument');
    const items = [
      ...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    ];
    expect(items.map((i) => i.getAttribute('data-value'))).toEqual([
      '',
      'drums',
      'bass',
      'keys',
      'guitar',
      'synth',
      'strings',
      'brass',
    ]);
    const count = (value: string) =>
      Number(
        menu
          .querySelector(`[data-value="${value}"] [data-count]`)
          ?.getAttribute('data-count'),
      );
    expect(count('drums')).toBe(GROOVES.length + DRUM_KIT_CONFIGS.length);
    const named = items
      .slice(1)
      .reduce(
        (n, i) =>
          n +
          Number(i.querySelector('[data-count]')!.getAttribute('data-count')),
        0,
      );
    expect(count('')).toBe(named);

    // Picking one filters the list and offers Clear.
    fireEvent.click(menu.querySelector('[data-value="drums"]')!);
    await waitFor(() =>
      expect(useBrowserStore.getState().query.instrument).toBe('drums'),
    );
    expect(screen.queryByTestId('library-filter-clear')).toBeInTheDocument();
    expect(
      browser().querySelector(
        '[data-testid="library-section"][data-type="part"]',
      ),
    ).toBeNull();
    expect(screen.queryByTestId('library-fits')).toBeNull();
  });

  it('counts each kind in the Type menu', async () => {
    render(<BrowserPanel />);
    const menu = await openFilter('type');
    expect(
      menu
        .querySelector('[data-value="part"] [data-count]')
        ?.getAttribute('data-count'),
    ).toBe(String(listLiveParts().length));
  });

  it('shows tag chips that narrow the list', () => {
    render(<BrowserPanel />);
    const chips = screen.getAllByTestId('library-chip');
    expect(chips.length).toBeGreaterThan(0);
    // Two rows at the Inspector's width.
    expect(chips.length).toBeLessThanOrEqual(6);
    const chip = chips[0];
    const tag = chip.getAttribute('data-tag')!;
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    const before = listed();
    fireEvent.click(chip);
    expect(useBrowserStore.getState().query.tags).toEqual([tag]);
    // The list really narrows, to something.
    const after = listed();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    expect(
      screen
        .getAllByTestId('library-chip')
        .find((c) => c.getAttribute('data-tag') === tag),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('library-fits')).toBeNull();
  });

  it('offers what an empty song lacks, drums first, with its reason', () => {
    render(<BrowserPanel />);
    const fits = screen.getByTestId('library-fits');
    expect(
      within(fits).getByTestId('library-fits-reason').textContent,
    ).toContain('no drums yet');
    expect(
      within(fits).getByTestId('library-fits-reason').textContent,
    ).toContain('No key yet');
    const picks = rowsOf(fits);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.length).toBeLessThanOrEqual(5);
    expect(['groove', 'kit']).toContain(picks[0].getAttribute('data-type'));
  });

  it('hides Fits your song while a search narrows the list', () => {
    render(<BrowserPanel />);
    type('bass');
    expect(screen.queryByTestId('library-fits')).toBeNull();
    expect(screen.getByTestId('library-search-clear')).toBeInTheDocument();
    expect(sectionCount('part')).toBeGreaterThan(0);
    expect(sectionCount('part')).toBeLessThan(listLiveParts().length);
    fireEvent.click(screen.getByTestId('library-search-clear'));
    expect(search().value).toBe('');
    expect(screen.getByTestId('library-fits')).toBeInTheDocument();
  });

  it('keeps a ♡ in the student’s favourites', () => {
    render(<BrowserPanel />);
    const row = firstPart();
    const id = row.getAttribute('data-item-id')!;
    const heart = within(row).getByTestId('library-favourite');
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(heart);
    expect(useStore.getState().libraryFavourites).toEqual([id]);
    expect(
      within(firstPart()).getByTestId('library-favourite'),
    ).toHaveAttribute('aria-pressed', 'true');

    // The ♡ filter shows only favourites.
    fireEvent.click(screen.getByTestId('library-filter-favourites'));
    expect(
      screen.getAllByTestId('library-row').map((r) => r.dataset.itemId),
    ).toEqual([id]);

    fireEvent.click(within(firstPart()).getByTestId('library-favourite'));
    expect(useStore.getState().libraryFavourites).toEqual([]);
  });

  it('adds an item on +', () => {
    render(<BrowserPanel />);
    const row = firstPart();
    fireEvent.click(within(row).getByTestId('library-add'));
    expect(h.addItemAsTrack).toHaveBeenCalledTimes(1);
    expect(h.addItemAsTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: row.getAttribute('data-item-id') }),
    );
  });

  it('previews on ▶ and shows it playing', () => {
    render(<BrowserPanel />);
    const row = firstPart();
    const id = row.getAttribute('data-item-id')!;
    fireEvent.click(within(row).getByTestId('library-preview'));
    expect(h.startPreview).toHaveBeenCalledWith(
      expect.objectContaining({ id }),
      null,
      useStore.getState().bpm,
    );
    act(() =>
      useBrowserStore.getState().setPreview({ itemId: id, status: 'playing' }),
    );
    const button = within(firstPart()).getByTestId('library-preview');
    expect(button).toHaveAttribute('data-state', 'playing');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    // ■ stops it.
    fireEvent.click(button);
    expect(h.stopPreview).toHaveBeenCalled();
  });

  // Escape stays the editor's (Stop, closing what is open): the key
  // dispatcher takes it before the panel would, so the panel takes none
  // (review U1). ■, another ▶ and Play stop a preview.
  it('takes no Escape of its own', () => {
    render(<BrowserPanel />);
    const id = firstPart().getAttribute('data-item-id')!;
    act(() =>
      useBrowserStore.getState().setPreview({ itemId: id, status: 'playing' }),
    );
    h.stopPreview.mockClear();
    fireEvent.keyDown(search(), { key: 'Escape' });
    expect(h.stopPreview).not.toHaveBeenCalled();
  });

  it('drags a part row as the Library’s payload', () => {
    render(<BrowserPanel />);
    const row = firstPart();
    const id = row.getAttribute('data-item-id')!;
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (mime: string, value: string) => data.set(mime, value),
      getData: (mime: string) => data.get(mime) ?? '',
      effectAllowed: 'none',
    };
    fireEvent.dragStart(row, { dataTransfer });
    expect(JSON.parse(data.get('application/x-prism-library')!)).toEqual({
      kind: 'library-item',
      itemId: id,
    });
    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(useBrowserStore.getState().dragging?.id).toBe(id);
    fireEvent.dragEnd(row);
    expect(useBrowserStore.getState().dragging).toBeNull();
    // The drop's handler still knows what was dragged.
    expect(useBrowserStore.getState().dragged?.id).toBe(id);
  });

  it('says nothing matches, with a Clear that brings the list back', () => {
    render(<BrowserPanel />);
    type('zzqqxx no such thing');
    const empty = screen.getByTestId('library-empty');
    expect(screen.queryAllByTestId('library-section')).toHaveLength(0);
    fireEvent.click(within(empty).getByRole('button', { name: 'Clear' }));
    expect(useBrowserStore.getState().query).toEqual(EMPTY_QUERY);
    expect(screen.queryByTestId('library-empty')).toBeNull();
    expect(screen.getAllByTestId('library-section').length).toBe(5);
  });

  // Review fixes (2.14): a preview stops when the song records, the kept
  // voices go with a new session, and a tempo question goes with the panel.
  it('stops a preview when the song starts recording', () => {
    render(<BrowserPanel />);
    h.stopPreview.mockClear();
    act(() => useStore.setState({ isRecording: true }));
    expect(h.stopPreview).toHaveBeenCalled();
  });

  it('lets the kept voices go when a new session opens', () => {
    render(<BrowserPanel />);
    h.releasePreviewVoices.mockClear();
    act(() => {
      bumpSessionGeneration('test');
    });
    expect(h.releasePreviewVoices).toHaveBeenCalled();
  });

  it('cancels a waiting tempo question when the panel closes', () => {
    const { unmount } = render(<BrowserPanel />);
    const answer = vi.fn();
    act(() =>
      useBrowserStore.getState().ask({
        itemId: 'groove:x',
        name: 'Hip Hop 1',
        itemBpm: 60,
        songBpm: 120,
        answer,
      }),
    );
    expect(screen.getByTestId('library-tempo-question')).toBeInTheDocument();
    h.releasePreviewVoices.mockClear();
    unmount();
    expect(answer).toHaveBeenCalledTimes(1);
    expect(answer).toHaveBeenCalledWith(null);
    expect(useBrowserStore.getState().question).toBeNull();
    expect(h.releasePreviewVoices).toHaveBeenCalled();
  });
});
