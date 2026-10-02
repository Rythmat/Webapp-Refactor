// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  GraphSettingsPanel,
  type GraphPanelSettings,
  type GraphSettingsPanelProps,
  type SettingsSectionId,
} from '../GraphSettingsPanel';
import {
  newGroupColor,
  PRESET_GROUPS,
  type ColorGroup,
} from '../model/colorGroups';
import {
  defaultGraphSettings,
  MAX_GROUPS,
  SLIDER_RANGES,
} from '../model/graphSettings';
import { dropIndexFor, moveGroup } from '../settings/GroupsSection';
import { steppedValue } from '../settings/SettingControls';

/*
 * The settings panel, drawn in jsdom: what it shows closed and open, every
 * control's range, step and name, the search box's pause, Restore defaults,
 * and the Groups editor (edit, colour, add, delete, reorder by pointer and
 * keyboard, inline query errors, hover).
 *
 * jsdom has no PointerEvent, so pointer events would arrive without their
 * coordinates. A MouseEvent with a pointer id stands in for it here.
 */

beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class TestPointerEvent extends MouseEvent {
      readonly pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    window.PointerEvent =
      TestPointerEvent as unknown as typeof window.PointerEvent;
  }
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const FAMILIES = {
  genres: true,
  time: true,
  theory: true,
  instruments: true,
  regions: true,
} as const;

/**
 * Obsidian's stock settings, straight from the settings model, so these
 * tests also show the panel takes the model's settings for either mode as
 * they are.
 */
const DEFAULTS = defaultGraphSettings();
const GLOBAL: GraphPanelSettings = DEFAULTS.global;
const LOCAL: GraphPanelSettings = DEFAULTS.local;

const GROUPS: ColorGroup[] = [
  { query: 'kind:song', color: '#eeecf8' },
  { query: 'kind:artist', color: '#3987e5' },
  { query: 'kind:event', color: '#d95926' },
];

const ALL_OPEN: Record<SettingsSectionId, boolean> = {
  filters: false,
  groups: false,
  display: false,
  forces: false,
};

function renderPanel(props: Partial<GraphSettingsPanelProps> = {}) {
  const spies = {
    onChange: vi.fn(),
    onGroupsChange: vi.fn(),
    onGroupHover: vi.fn(),
    onRestoreDefaults: vi.fn(),
    onAnimate: vi.fn(),
    onOpenChange: vi.fn(),
    onCollapsedChange: vi.fn(),
  };
  const all: GraphSettingsPanelProps = {
    mode: 'global',
    settings: GLOBAL,
    groups: GROUPS,
    ...spies,
    ...props,
  };
  const view = render(<GraphSettingsPanel {...all} />);
  const rerender = (next: Partial<GraphSettingsPanelProps>) =>
    view.rerender(<GraphSettingsPanel {...all} {...next} />);
  return { ...spies, rerender, view };
}

/** The panel open with every section expanded, as most tests want it. */
const renderOpen = (props: Partial<GraphSettingsPanelProps> = {}) =>
  renderPanel({ open: true, collapsed: ALL_OPEN, ...props });

/**
 * The panel inside a parent that keeps its settings and groups, the way the
 * Mind Map will: changes come back as new props.
 */
function Harness({
  initialGroups = GROUPS,
  onGroupsChange,
  onRestoreDefaults,
  ...rest
}: Partial<GraphSettingsPanelProps> & { initialGroups?: ColorGroup[] }) {
  const [groups, setGroups] = useState<ColorGroup[]>(initialGroups);
  const [settings, setSettings] = useState<GraphPanelSettings>(GLOBAL);
  return (
    <GraphSettingsPanel
      mode="global"
      open
      collapsed={ALL_OPEN}
      onGroupHover={() => {}}
      {...rest}
      settings={settings}
      groups={groups}
      onChange={(patch) =>
        setSettings((s) => ({
          filters: { ...s.filters, ...patch.filters },
          display: { ...s.display, ...patch.display },
          forces: { ...s.forces, ...patch.forces },
        }))
      }
      onGroupsChange={(next) => {
        onGroupsChange?.(next);
        setGroups(next);
      }}
      onRestoreDefaults={() => {
        onRestoreDefaults?.();
        setSettings(GLOBAL);
        setGroups(GROUPS);
      }}
    />
  );
}

const slider = (name: string) => screen.getByRole('slider', { name });
const toggle = (name: string) => screen.getByRole('switch', { name });

/** A slider's range, step-free, as its ARIA attributes give it. */
const rangeOf = (el: HTMLElement) => ({
  min: Number(el.getAttribute('aria-valuemin')),
  max: Number(el.getAttribute('aria-valuemax')),
  now: Number(el.getAttribute('aria-valuenow')),
  text: el.getAttribute('aria-valuetext'),
});

// ── Closed and open ─────────────────────────────────────────────────────────

describe('GraphSettingsPanel: closed and open', () => {
  it('starts closed: a gear and, in the global graph, the timelapse wand', () => {
    const { onAnimate } = renderPanel();
    expect(screen.queryByRole('region', { name: 'Graph settings' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Open graph settings' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Start timelapse animation' }),
    );
    expect(onAnimate).toHaveBeenCalledOnce();
  });

  it('has no wand in a local graph', () => {
    renderPanel({ mode: 'local', settings: LOCAL });
    expect(
      screen.getByRole('button', { name: 'Open graph settings' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Start timelapse animation' }),
    ).toBeNull();
  });

  it('turns the wand off while the timelapse cannot play', () => {
    renderPanel({ animateDisabled: true });
    expect(
      screen.getByRole('button', { name: 'Start timelapse animation' }),
    ).toBeDisabled();
  });

  it('opens from the gear onto the close button, and closes back onto the gear', () => {
    const { onOpenChange } = renderPanel();
    fireEvent.click(
      screen.getByRole('button', { name: 'Open graph settings' }),
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    const panel = screen.getByRole('region', { name: 'Graph settings' });
    const close = within(panel).getByRole('button', {
      name: 'Close graph settings',
    });
    expect(close).toHaveFocus();
    expect(
      within(panel).getByRole('button', { name: 'Restore default settings' }),
    ).toBeInTheDocument();
    // The wand is the closed panel's; open, the Display section has Animate.
    expect(
      screen.queryByRole('button', { name: 'Start timelapse animation' }),
    ).toBeNull();

    fireEvent.click(close);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('region', { name: 'Graph settings' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Open graph settings' }),
    ).toHaveFocus();
  });

  it('follows an `open` it is given over its own state', () => {
    const { rerender, onOpenChange } = renderPanel({ open: true });
    expect(
      screen.getByRole('region', { name: 'Graph settings' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close graph settings' }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // The parent has not closed it, so it stays open.
    expect(
      screen.getByRole('region', { name: 'Graph settings' }),
    ).toBeInTheDocument();
    rerender({ open: false });
    expect(screen.queryByRole('region', { name: 'Graph settings' })).toBeNull();
  });
});

// ── Look ────────────────────────────────────────────────────────────────────

describe('GraphSettingsPanel: Obsidian geometry', () => {
  it('is a 240 px card 12 px in from the top right, 8 px round, on the console’s raised surface with a hairline border', () => {
    renderPanel({ open: true });
    const panel = screen.getByRole('region', { name: 'Graph settings' });
    const classes = panel.className.split(/\s+/);
    for (const c of [
      'absolute',
      'right-3',
      'top-3',
      'w-[240px]',
      'rounded-lg',
      'border',
      'border-border',
      'bg-popover',
      'text-foreground',
      'overflow-y-auto',
      // Above the stage's banner and zoom buttons (z-20), and never
      // taller than the stage less the 12 px inset above and below.
      'z-30',
      'max-h-[calc(100%-24px)]',
    ]) {
      expect(classes).toContain(c);
    }
  });

  it('closed, sits on the app’s own background with no frame', () => {
    renderPanel();
    const closed = document.querySelector('[data-graph-settings="closed"]')!;
    expect(closed.className).toContain('bg-[hsl(var(--ui-background))]');
    expect(closed.className).toContain('border-transparent');
    expect(closed.className).toContain('right-3');
    expect(closed.className).toContain('z-30');
    // Only as wide as the gear and the wand, so it hides no more of the
    // graph than they do, wherever it is put.
    expect(closed.className).toContain('w-fit');
  });

  it('leaves placing to its parent when not floating', () => {
    renderPanel({ open: true, floating: false });
    const panel = screen.getByRole('region', { name: 'Graph settings' });
    expect(panel.className).not.toMatch(/(^| )absolute( |$)/);
    expect(panel.className).not.toContain('right-3');
    // The parent's height is the limit, and the panel takes the pointer
    // even inside a parent that lets it through to the graph.
    expect(panel.className).toContain('max-h-full');
    expect(panel.className).toContain('pointer-events-auto');
    cleanup();
    renderPanel({ floating: false });
    const closed = document.querySelector('[data-graph-settings="closed"]')!;
    expect(closed.className).toContain('w-fit');
  });

  it('has 13 px, weight-500 section headers', () => {
    renderPanel({ open: true });
    const header = screen.getByRole('button', { name: 'Filters' });
    expect(header.className).toContain('text-[13px]');
    expect(header.className).toContain('font-medium');
  });

  it('uses no yellow anywhere', () => {
    renderOpen({
      settings: { ...GLOBAL, filters: { ...GLOBAL.filters, tags: true } },
    });
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toMatch(/yellow|amber|#ffcb30|#ffd700|#fbbf24|#facc15/);
  });
});

// ── Sections ────────────────────────────────────────────────────────────────

describe('GraphSettingsPanel: sections', () => {
  it('lists Filters, Groups, Display and Forces as headings, all collapsed at first', () => {
    renderPanel({ open: true });
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Filters', 'Groups', 'Display', 'Forces']);
    for (const name of headings) {
      expect(screen.getByRole('button', { name: name! })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    }
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
  });

  it('opens and closes a section from its header and reports the change', () => {
    const { onCollapsedChange } = renderPanel({ open: true });
    const filters = screen.getByRole('button', { name: 'Filters' });
    fireEvent.click(filters);
    expect(filters).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('searchbox', { name: 'Search items' }),
    ).toBeInTheDocument();
    expect(onCollapsedChange).toHaveBeenLastCalledWith({
      filters: false,
      groups: true,
      display: true,
      forces: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Forces' }));
    expect(screen.getAllByRole('slider')).toHaveLength(4);

    fireEvent.click(filters);
    expect(filters).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(onCollapsedChange).toHaveBeenLastCalledWith({
      filters: true,
      groups: true,
      display: true,
      forces: false,
    });
  });

  it('follows a `collapsed` it is given', () => {
    renderPanel({ open: true, collapsed: { display: false } });
    expect(screen.getByRole('button', { name: 'Display' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(slider('Node size')).toBeInTheDocument();
  });
});

// ── Filters ─────────────────────────────────────────────────────────────────

describe('GraphSettingsPanel: Filters', () => {
  it('global: the search box and Obsidian’s switches, with Orphans and no local controls', () => {
    renderOpen();
    const search = screen.getByRole('searchbox', { name: 'Search items' });
    expect(search).toHaveAttribute('placeholder', 'Search items…');
    const states = Object.fromEntries(
      [
        'Tags',
        'Curriculum',
        'Existing items only',
        'Guessed links',
        'Unconfirmed links',
        'Orphans',
        'Arrows',
        'Link confidence',
      ].map((name) => [name, toggle(name).getAttribute('aria-checked')]),
    );
    expect(states).toEqual({
      Tags: 'false',
      Curriculum: 'false',
      'Existing items only': 'false',
      'Guessed links': 'true',
      'Unconfirmed links': 'true',
      Orphans: 'true',
      Arrows: 'false',
      'Link confidence': 'true',
    });
    expect(screen.queryByRole('slider', { name: 'Depth' })).toBeNull();
    for (const name of ['Incoming links', 'Outgoing links', 'Neighbor links']) {
      expect(screen.queryByRole('switch', { name })).toBeNull();
    }
  });

  it('local: Depth 1–5 and the three link switches, and no Orphans', () => {
    const { onChange } = renderOpen({ mode: 'local', settings: LOCAL });
    const depth = slider('Depth');
    expect(rangeOf(depth)).toMatchObject({ min: 1, max: 5, now: 1, text: '1' });
    expect(depth).toHaveAccessibleDescription(
      'Show items this number of links away',
    );
    fireEvent.keyDown(depth, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ filters: { depth: 2 } });
    fireEvent.keyDown(depth, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith({ filters: { depth: 5 } });

    expect(toggle('Incoming links')).toHaveAttribute('aria-checked', 'true');
    expect(toggle('Outgoing links')).toHaveAttribute('aria-checked', 'true');
    expect(toggle('Neighbor links')).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle('Neighbor links'));
    expect(onChange).toHaveBeenLastCalledWith({
      filters: { neighborLinks: true },
    });
    fireEvent.click(toggle('Incoming links'));
    expect(onChange).toHaveBeenLastCalledWith({ filters: { incoming: false } });
    expect(screen.queryByRole('switch', { name: 'Orphans' })).toBeNull();
    // The global-only Animate button is gone too.
    expect(screen.queryByRole('button', { name: 'Animate' })).toBeNull();
  });

  it('local: Depth follows the URL when the page passes it, and reports there only', () => {
    const onDepthChange = vi.fn();
    const { onChange, rerender } = renderOpen({
      mode: 'local',
      // The stored settings say 1; the URL says 3, and the URL wins.
      settings: LOCAL,
      depth: 3,
      onDepthChange,
    });
    const depth = slider('Depth');
    expect(rangeOf(depth)).toMatchObject({ now: 3, text: '3' });
    fireEvent.keyDown(depth, { key: 'ArrowRight' });
    expect(onDepthChange).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(depth, { key: 'Home' });
    expect(onDepthChange).toHaveBeenLastCalledWith(1);
    // Never through the settings, so the stored depth cannot compete.
    expect(onChange).not.toHaveBeenCalled();

    // The URL moved on (Back, or a link): the slider follows it.
    rerender({ mode: 'local', settings: LOCAL, depth: 5, onDepthChange });
    expect(rangeOf(slider('Depth'))).toMatchObject({ now: 5, text: '5' });
  });

  it('reports each switch as a filters patch', () => {
    const { onChange } = renderOpen();
    const cases: [string, Record<string, boolean>][] = [
      ['Tags', { tags: true }],
      ['Curriculum', { curriculum: true }],
      ['Existing items only', { existingOnly: true }],
      ['Guessed links', { guessed: false }],
      ['Unconfirmed links', { unconfirmed: false }],
      ['Orphans', { orphans: false }],
    ];
    for (const [name, patch] of cases) {
      fireEvent.click(toggle(name));
      expect(onChange).toHaveBeenLastCalledWith({ filters: patch });
    }
  });

  it('describes each switch as Obsidian’s tooltip does', () => {
    renderOpen();
    expect(toggle('Orphans')).toHaveAccessibleDescription(
      'Show items that are not linked to any other item',
    );
    expect(toggle('Existing items only')).toHaveAccessibleDescription(
      'When enabled, links to items that do not exist yet are not shown',
    );
    expect(toggle('Guessed links')).toHaveAccessibleDescription(
      'Show links guessed from a name',
    );
  });

  it('shows the tag family chips only while Tags is on', () => {
    const { onChange, rerender } = renderOpen();
    expect(screen.queryByRole('group', { name: 'Tag families' })).toBeNull();
    rerender({
      settings: { ...GLOBAL, filters: { ...GLOBAL.filters, tags: true } },
    });
    const chips = within(
      screen.getByRole('group', { name: 'Tag families' }),
    ).getAllByRole('button');
    expect(chips.map((c) => c.textContent)).toEqual([
      'Genres',
      'Time',
      'Theory',
      'Instruments',
      'Regions',
    ]);
    for (const chip of chips)
      expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Time' }));
    expect(onChange).toHaveBeenLastCalledWith({
      filters: { tagFamilies: { ...FAMILIES, time: false } },
    });
  });
});

// ── Search ──────────────────────────────────────────────────────────────────

describe('GraphSettingsPanel: search', () => {
  it('applies what is typed once typing pauses for 250 ms', () => {
    vi.useFakeTimers();
    const { onChange } = renderOpen();
    const search = screen.getByRole('searchbox', { name: 'Search items' });
    fireEvent.change(search, { target: { value: 'ro' } });
    fireEvent.change(search, { target: { value: 'rock' } });
    expect(search).toHaveValue('rock');
    act(() => vi.advanceTimersByTime(249));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ filters: { search: 'rock' } });
  });

  it('applies at once on Enter, and clears from its button', () => {
    vi.useFakeTimers();
    const { onChange } = renderOpen();
    const search = screen.getByRole('searchbox', { name: 'Search items' });
    fireEvent.change(search, { target: { value: 'kind:artist' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({
      filters: { search: 'kind:artist' },
    });
    act(() => vi.advanceTimersByTime(500));
    expect(onChange).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenLastCalledWith({ filters: { search: '' } });
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });

  it('shows a search it is handed from outside', () => {
    const { rerender } = renderOpen();
    rerender({
      settings: { ...GLOBAL, filters: { ...GLOBAL.filters, search: 'toto' } },
    });
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue(
      'toto',
    );
  });

  it('does not lose typing when its section closes before the pause ends', () => {
    vi.useFakeTimers();
    render(<Harness collapsed={undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), {
      target: { value: 'disco' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.queryByRole('searchbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue(
      'disco',
    );
  });
});

// ── Display ─────────────────────────────────────────────────────────────────

describe('GraphSettingsPanel: Display', () => {
  it('has Obsidian’s ranges and steps', () => {
    const { onChange } = renderOpen();
    const fade = slider('Text fade threshold');
    expect(rangeOf(fade)).toMatchObject({
      min: -3,
      max: 3,
      now: 0,
      text: '0.0',
    });
    fireEvent.keyDown(fade, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ display: { textFade: 0.1 } });
    fireEvent.keyDown(fade, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ display: { textFade: -3 } });

    const node = slider('Node size');
    expect(rangeOf(node)).toMatchObject({
      min: 0.1,
      max: 5,
      now: 1,
      text: '1',
    });
    fireEvent.keyDown(node, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ display: { nodeSize: 1.05 } });
    fireEvent.keyDown(node, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ display: { nodeSize: 0.1 } });

    const line = slider('Link thickness');
    expect(rangeOf(line)).toMatchObject({
      min: 0.1,
      max: 5,
      now: 1,
      text: '1',
    });
    fireEvent.keyDown(line, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith({ display: { lineSize: 5 } });
    fireEvent.keyDown(line, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({ display: { lineSize: 0.95 } });
  });

  it('writes a negative fade with a minus sign', () => {
    renderOpen({
      settings: { ...GLOBAL, display: { ...GLOBAL.display, textFade: -2.1 } },
    });
    expect(slider('Text fade threshold')).toHaveAttribute(
      'aria-valuetext',
      '−2.1',
    );
  });

  it('shows the value over the knob, as Obsidian’s slider tooltip does', () => {
    renderOpen();
    const tip = slider('Node size').querySelector('[data-slider-tooltip]');
    expect(tip).toHaveTextContent('1');
    expect(tip).toHaveAttribute('aria-hidden', 'true');
  });

  it('switches Arrows and Link confidence, and animates from the global graph', () => {
    const { onChange, onAnimate } = renderOpen();
    fireEvent.click(toggle('Arrows'));
    expect(onChange).toHaveBeenLastCalledWith({ display: { arrows: true } });
    fireEvent.click(toggle('Link confidence'));
    expect(onChange).toHaveBeenLastCalledWith({
      display: { confidence: false },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Animate' }));
    expect(onAnimate).toHaveBeenCalledOnce();
  });

  it('turns Animate off while the timelapse cannot play', () => {
    renderOpen({ animateDisabled: true });
    expect(screen.getByRole('button', { name: 'Animate' })).toBeDisabled();
  });
});

// ── Forces ──────────────────────────────────────────────────────────────────

describe('GraphSettingsPanel: Forces', () => {
  it('has Obsidian’s four sliders, ranges and stock positions', () => {
    const { onChange } = renderOpen();
    const center = slider('Center force');
    expect(rangeOf(center)).toMatchObject({ min: 0, max: 1, text: '0.52' });
    expect(rangeOf(center).now).toBeCloseTo(0.5187, 4);
    fireEvent.keyDown(center, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { center: 0.53 } });

    const repel = slider('Repel force');
    expect(rangeOf(repel)).toMatchObject({
      min: 0,
      max: 20,
      now: 10,
      text: '10',
    });
    fireEvent.keyDown(repel, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { repel: 10.1 } });
    fireEvent.keyDown(repel, { key: 'PageUp' });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { repel: 11 } });

    const link = slider('Link force');
    expect(rangeOf(link)).toMatchObject({
      min: 0,
      max: 1,
      now: 1,
      text: '1.00',
    });
    fireEvent.keyDown(link, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { link: 0.99 } });

    const distance = slider('Link distance');
    expect(rangeOf(distance)).toMatchObject({
      min: 30,
      max: 500,
      now: 250,
      text: '250',
    });
    fireEvent.keyDown(distance, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({
      forces: { linkDistance: 251 },
    });
    fireEvent.keyDown(distance, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { linkDistance: 30 } });
  });

  it('takes every slider’s range and drag step from the settings model', () => {
    renderOpen({ mode: 'local', settings: LOCAL });
    const sliders: [string, keyof typeof SLIDER_RANGES][] = [
      ['Depth', 'depth'],
      ['Text fade threshold', 'textFade'],
      ['Node size', 'nodeSize'],
      ['Link thickness', 'lineSize'],
      ['Center force', 'center'],
      ['Repel force', 'repel'],
      ['Link force', 'link'],
      ['Link distance', 'linkDistance'],
    ];
    for (const [name, key] of sliders) {
      const { min, max } = rangeOf(slider(name));
      expect({ name, min, max }).toEqual({
        name,
        min: SLIDER_RANGES[key].min,
        max: SLIDER_RANGES[key].max,
      });
    }
    // Obsidian's ranges, pinned here as well.
    expect(SLIDER_RANGES).toMatchObject({
      center: { min: 0, max: 1 },
      repel: { min: 0, max: 20 },
      link: { min: 0, max: 1 },
      linkDistance: { min: 30, max: 500, step: 1 },
      textFade: { min: -3, max: 3, step: 0.1 },
      nodeSize: { min: 0.1, max: 5 },
      lineSize: { min: 0.1, max: 5 },
      depth: { min: 1, max: 5, step: 1 },
    });
  });

  it('moves the fine-grained sliders by a usable step from the keyboard', () => {
    const { onChange } = renderOpen();
    // Shift with an arrow skips ten key steps, as Page Up does.
    fireEvent.keyDown(slider('Center force'), {
      key: 'ArrowRight',
      shiftKey: true,
    });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { center: 0.62 } });
    fireEvent.keyDown(slider('Center force'), { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { center: 0.51 } });
    fireEvent.keyDown(slider('Repel force'), { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { repel: 9 } });
    // At the end of the range a key does nothing.
    onChange.mockClear();
    fireEvent.keyDown(slider('Link force'), { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();
    // Home and End are still the slider's own.
    fireEvent.keyDown(slider('Link force'), { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ forces: { link: 0 } });
  });

  it('steps on the key step’s grid and stays in range', () => {
    const range = { min: 0.1, max: 5, keyStep: 0.05 };
    expect(steppedValue(1.59892361111111, 1, range)).toBe(1.65);
    expect(steppedValue(1, -1, range)).toBe(0.95);
    expect(steppedValue(0.12, -10, range)).toBe(0.1);
    expect(steppedValue(4.99, 10, range)).toBe(5);
    expect(
      steppedValue(0.518713248970312, 1, { min: 0, max: 1, keyStep: 0.01 }),
    ).toBe(0.53);
  });

  it('shows the same sliders in a local graph', () => {
    renderOpen({ mode: 'local', settings: LOCAL });
    expect(
      screen
        .getAllByRole('slider')
        .map((s) => s.getAttribute('aria-labelledby')),
    ).toHaveLength(8);
    for (const name of [
      'Center force',
      'Repel force',
      'Link force',
      'Link distance',
    ]) {
      expect(slider(name)).toBeInTheDocument();
    }
  });
});

// ── Restore defaults ────────────────────────────────────────────────────────

describe('GraphSettingsPanel: Restore default settings', () => {
  it('asks the parent to restore', () => {
    const { onRestoreDefaults } = renderOpen();
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore default settings' }),
    );
    expect(onRestoreDefaults).toHaveBeenCalledOnce();
  });

  it('shows the restored settings and groups', () => {
    vi.useFakeTimers();
    render(<Harness />);
    fireEvent.click(toggle('Tags'));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), {
      target: { value: 'soul' },
    });
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Delete group 1' }));
    fireEvent.keyDown(slider('Repel force'), { key: 'End' });
    expect(toggle('Tags')).toHaveAttribute('aria-checked', 'true');
    expect(slider('Repel force')).toHaveAttribute('aria-valuenow', '20');
    expect(
      screen.getAllByRole('textbox', { name: /^Group \d query$/ }),
    ).toHaveLength(2);

    fireEvent.click(
      screen.getByRole('button', { name: 'Restore default settings' }),
    );
    expect(toggle('Tags')).toHaveAttribute('aria-checked', 'false');
    expect(slider('Repel force')).toHaveAttribute('aria-valuenow', '10');
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue(
      '',
    );
    expect(
      screen
        .getAllByRole('textbox', { name: /^Group \d query$/ })
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['kind:song', 'kind:artist', 'kind:event']);
  });
});

// ── Groups ──────────────────────────────────────────────────────────────────

const queryInputs = () =>
  screen.getAllByRole('textbox', {
    name: /^Group \d+ query$/,
  }) as HTMLInputElement[];
const queries = () => queryInputs().map((input) => input.value);

describe('GraphSettingsPanel: Groups', () => {
  it('draws a row per group: query, count, round swatch and delete', () => {
    renderOpen({ groupCounts: [1204, 1, 0] });
    expect(queries()).toEqual(['kind:song', 'kind:artist', 'kind:event']);
    for (const input of queryInputs()) {
      expect(input).toHaveAttribute('placeholder', 'Enter query…');
    }
    const swatch = screen.getByLabelText('Group 2 colour') as HTMLInputElement;
    expect(swatch.type).toBe('color');
    expect(swatch.value).toBe('#3987e5');
    expect(swatch.className).toContain('rounded-full');
    expect(
      screen.getByRole('button', { name: 'Delete group 3' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move group 1' }),
    ).toBeInTheDocument();
    // The count is shown beside the query and read as its description.
    expect(screen.getByText('1,204')).toBeInTheDocument();
    expect(queryInputs()[0]).toHaveAccessibleDescription('1,204 items');
    expect(queryInputs()[1]).toHaveAccessibleDescription('1 item');
    expect(
      screen.getByRole('button', { name: 'New group' }).className,
    ).toContain('w-full');
  });

  it('names a preset row by its name over its query, any other row by its query or its place', () => {
    renderOpen({
      groups: [
        PRESET_GROUPS[0],
        PRESET_GROUPS[10],
        { query: 'kind:artist tag:jazz', color: '#3987e5' },
        { query: '', color: '#d95926' },
      ],
      groupCounts: [12, 3, 4, null],
    });
    const list = screen.getByRole('list', { name: 'Colour groups' });
    const titles = within(list)
      .getAllByRole('listitem')
      .map((row) => row.querySelector('[data-group-title]')?.textContent);
    expect(titles).toEqual([
      'Songs',
      'Studios & Labels',
      'kind:artist tag:jazz',
      'Group 4',
    ]);
    // The query is each row's second line, smaller and quieter, and still
    // the field that edits it.
    expect(queries()).toEqual([
      'kind:song',
      'kind:studio OR kind:label',
      'kind:artist tag:jazz',
      '',
    ]);
    expect(queryInputs()[0].className).toMatch(
      /\btext-xs\b.*\btext-muted-foreground\b/,
    );
    // A preset's query is described by its name and its count; a group
    // called by its query needs no name read twice.
    expect(queryInputs()[0]).toHaveAccessibleDescription('Songs 12 items');
    expect(queryInputs()[1]).toHaveAccessibleDescription(
      'Studios & Labels 3 items',
    );
    expect(queryInputs()[2]).toHaveAccessibleDescription('4 items');
  });

  it('reports an edited query and a new colour', () => {
    const { onGroupsChange } = renderOpen();
    fireEvent.change(queryInputs()[1], { target: { value: 'kind:artists' } });
    expect(onGroupsChange).toHaveBeenLastCalledWith([
      GROUPS[0],
      { query: 'kind:artists', color: '#3987e5' },
      GROUPS[2],
    ]);
    fireEvent.change(screen.getByLabelText('Group 3 colour'), {
      target: { value: '#123456' },
    });
    expect(onGroupsChange).toHaveBeenLastCalledWith([
      GROUPS[0],
      GROUPS[1],
      { query: 'kind:event', color: '#123456' },
    ]);
  });

  it('gives the native swatch a #rrggbb even for short or translucent colours', () => {
    renderOpen({
      groups: [
        { query: 'a', color: '#abc' },
        { query: 'b', color: '#11223380' },
        { query: 'c', color: 'not a colour' },
      ],
    });
    expect(
      (screen.getByLabelText('Group 1 colour') as HTMLInputElement).value,
    ).toBe('#aabbcc');
    expect(
      (screen.getByLabelText('Group 2 colour') as HTMLInputElement).value,
    ).toBe('#112233');
    expect(
      (screen.getByLabelText('Group 3 colour') as HTMLInputElement).value,
    ).toBe('#000000');
  });

  it('adds a group with Obsidian’s next colour and puts focus in its query', () => {
    const onGroupsChange = vi.fn();
    render(<Harness onGroupsChange={onGroupsChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'New group' }));
    expect(onGroupsChange).toHaveBeenLastCalledWith([
      ...GROUPS,
      { query: '', color: newGroupColor(GROUPS) },
    ]);
    expect(queryInputs()).toHaveLength(4);
    expect(queryInputs()[3]).toHaveFocus();
    expect(queryInputs()[3]).toHaveValue('');
  });

  it('stops queries at the length the settings keep, and groups at the most it keeps', () => {
    renderOpen({
      groups: Array.from({ length: MAX_GROUPS }, (_, i) => ({
        query: `kind:song ${i}`,
        color: '#eeecf8',
      })),
    });
    expect(queryInputs()).toHaveLength(MAX_GROUPS);
    expect(queryInputs()[0]).toHaveAttribute('maxlength', '500');
    expect(
      screen.getByRole('searchbox', { name: 'Search items' }),
    ).toHaveAttribute('maxlength', '500');
    expect(screen.getByRole('button', { name: 'New group' })).toBeDisabled();
  });

  it('deletes a group, then focuses the query that took its place', () => {
    const onGroupsChange = vi.fn();
    render(<Harness onGroupsChange={onGroupsChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete group 2' }));
    expect(onGroupsChange).toHaveBeenLastCalledWith([GROUPS[0], GROUPS[2]]);
    expect(queries()).toEqual(['kind:song', 'kind:event']);
    expect(queryInputs()[1]).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Delete group 2' }));
    expect(queryInputs()[0]).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Delete group 1' }));
    expect(screen.queryAllByRole('textbox', { name: /^Group/ })).toHaveLength(
      0,
    );
    expect(screen.getByRole('button', { name: 'New group' })).toHaveFocus();
  });

  it('shows a query error under its row and marks the field', () => {
    renderOpen({
      queryErrors: [
        null,
        { message: 'There is no field "colour:"', start: 0, end: 7 },
        'Close the bracket',
      ],
    });
    const [first, second, third] = queryInputs();
    expect(first).not.toHaveAttribute('aria-invalid');
    expect(second).toHaveAttribute('aria-invalid', 'true');
    expect(second).toHaveAccessibleDescription('There is no field "colour:"');
    expect(third).toHaveAccessibleDescription('Close the bracket');
    const row = second.closest('li')!;
    expect(
      within(row).getByText('There is no field "colour:"'),
    ).toBeInTheDocument();
  });

  it('lights a group while its row is pointed at or focused', () => {
    const { onGroupHover } = renderOpen();
    const rows = document.querySelectorAll('[data-group-row]');
    fireEvent.pointerEnter(rows[1]);
    expect(onGroupHover).toHaveBeenLastCalledWith(1);
    fireEvent.pointerEnter(rows[2]);
    expect(onGroupHover).toHaveBeenLastCalledWith(2);
    fireEvent.pointerLeave(screen.getByRole('list', { name: 'Colour groups' }));
    expect(onGroupHover).toHaveBeenLastCalledWith(null);

    fireEvent.focus(queryInputs()[0]);
    expect(onGroupHover).toHaveBeenLastCalledWith(0);
    fireEvent.blur(queryInputs()[0], { relatedTarget: document.body });
    expect(onGroupHover).toHaveBeenLastCalledWith(null);
  });

  it('lets the lit group go when the section closes under the pointer', () => {
    const onGroupHover = vi.fn();
    render(<Harness collapsed={undefined} onGroupHover={onGroupHover} />);
    fireEvent.click(screen.getByRole('button', { name: 'Groups' }));
    fireEvent.pointerEnter(document.querySelectorAll('[data-group-row]')[2]);
    expect(onGroupHover).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: 'Groups' }));
    expect(onGroupHover).toHaveBeenLastCalledWith(null);
  });
});

// ── Reordering ──────────────────────────────────────────────────────────────

describe('GraphSettingsPanel: reordering groups', () => {
  it('moves a group with Alt+↑ and Alt+↓ on its grip, and keeps focus on it', () => {
    const onGroupsChange = vi.fn();
    render(<Harness onGroupsChange={onGroupsChange} />);
    const grip = screen.getByRole('button', { name: 'Move group 2' });
    expect(grip).toHaveAccessibleDescription(/Alt with the up or down arrow/);
    grip.focus();
    fireEvent.keyDown(grip, { key: 'ArrowUp', altKey: true });
    expect(onGroupsChange).toHaveBeenLastCalledWith([
      GROUPS[1],
      GROUPS[0],
      GROUPS[2],
    ]);
    expect(queries()).toEqual(['kind:artist', 'kind:song', 'kind:event']);
    expect(screen.getByRole('button', { name: 'Move group 1' })).toHaveFocus();
    expect(
      screen.getByText('Group moved to position 1 of 3.'),
    ).toBeInTheDocument();

    // Already first: nothing to do.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move group 1' }), {
      key: 'ArrowUp',
      altKey: true,
    });
    expect(onGroupsChange).toHaveBeenCalledOnce();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Move group 1' }), {
      key: 'ArrowDown',
      altKey: true,
    });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move group 2' }), {
      key: 'ArrowDown',
      altKey: true,
    });
    expect(queries()).toEqual(['kind:song', 'kind:event', 'kind:artist']);
    expect(screen.getByRole('button', { name: 'Move group 3' })).toHaveFocus();

    // Already last.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move group 3' }), {
      key: 'ArrowDown',
      altKey: true,
    });
    expect(onGroupsChange).toHaveBeenCalledTimes(3);
  });

  it('ignores the arrows without Alt', () => {
    const { onGroupsChange } = renderOpen();
    const grip = screen.getByRole('button', { name: 'Move group 2' });
    fireEvent.keyDown(grip, { key: 'ArrowUp' });
    fireEvent.keyDown(grip, { key: 'ArrowDown', metaKey: true, altKey: true });
    expect(onGroupsChange).not.toHaveBeenCalled();
  });

  /** Lays the rows out 30 px tall from the top, as a browser would. */
  function layRowsOut() {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        const row = this.getAttribute('data-group-row');
        const top = row === null ? 0 : Number(row) * 30;
        return {
          top,
          bottom: top + 30,
          height: 30,
          left: 0,
          right: 200,
          width: 200,
          x: 0,
          y: top,
          toJSON: () => ({}),
        } as DOMRect;
      },
    );
  }

  it('drags a group by its grip to where it is dropped', () => {
    layRowsOut();
    const onGroupsChange = vi.fn();
    render(<Harness onGroupsChange={onGroupsChange} />);
    const grip = screen.getByRole('button', { name: 'Move group 1' });
    fireEvent.pointerDown(grip, { button: 0, clientX: 5, clientY: 15 });
    expect(grip).toHaveFocus();
    fireEvent.pointerMove(window, { clientX: 5, clientY: 50 });
    const rows = document.querySelectorAll('[data-group-row]');
    expect(rows[0]).toHaveAttribute('data-dragging');
    expect((rows[0] as HTMLElement).style.transform).toBe('translateY(35px)');
    // Past the middle of the second row, short of the third's: between them.
    expect(rows[2]).toHaveAttribute('data-drop', 'above');

    fireEvent.pointerMove(window, { clientX: 5, clientY: 80 });
    expect(rows[2]).toHaveAttribute('data-drop', 'below');
    fireEvent.pointerUp(window, { clientX: 5, clientY: 80 });
    expect(onGroupsChange).toHaveBeenLastCalledWith([
      GROUPS[1],
      GROUPS[2],
      GROUPS[0],
    ]);
    expect(queries()).toEqual(['kind:artist', 'kind:event', 'kind:song']);
    expect(document.querySelector('[data-dragging]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Move group 3' })).toHaveFocus();
  });

  it('treats a press that moves less than 5 px as no drag', () => {
    layRowsOut();
    const onGroupsChange = vi.fn();
    render(<Harness onGroupsChange={onGroupsChange} />);
    const grip = screen.getByRole('button', { name: 'Move group 3' });
    fireEvent.pointerDown(grip, { button: 0, clientX: 5, clientY: 75 });
    fireEvent.pointerMove(window, { clientX: 7, clientY: 72 });
    expect(document.querySelector('[data-dragging]')).toBeNull();
    fireEvent.pointerUp(window, { clientX: 7, clientY: 72 });
    expect(onGroupsChange).not.toHaveBeenCalled();
  });

  it('puts the group back when the drag is cancelled with Escape', () => {
    layRowsOut();
    const onGroupsChange = vi.fn();
    render(<Harness onGroupsChange={onGroupsChange} />);
    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Move group 3' }),
      {
        button: 0,
        clientX: 5,
        clientY: 75,
      },
    );
    fireEvent.pointerMove(window, { clientX: 5, clientY: 5 });
    expect(document.querySelector('[data-dragging]')).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('[data-dragging]')).toBeNull();
    fireEvent.pointerUp(window, { clientX: 5, clientY: 5 });
    expect(onGroupsChange).not.toHaveBeenCalled();
    expect(queries()).toEqual(['kind:song', 'kind:artist', 'kind:event']);
  });

  it('works out drop points and moves as Obsidian does', () => {
    const rects = [0, 30, 60, 90].map((top) => ({ top, height: 30 }));
    expect(dropIndexFor(10, rects, 2)).toBe(0);
    expect(dropIndexFor(44, rects, 0)).toBe(0);
    expect(dropIndexFor(46, rects, 0)).toBe(1);
    expect(dropIndexFor(200, rects, 1)).toBe(3);
    expect(moveGroup(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveGroup(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveGroup(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });
});

// ── Names and isolation ─────────────────────────────────────────────────────

describe('GraphSettingsPanel: accessibility and isolation', () => {
  it('names every control, in both modes', () => {
    for (const [mode, settings] of [
      ['global', GLOBAL],
      ['local', LOCAL],
    ] as const) {
      renderOpen({
        mode,
        settings: { ...settings, filters: { ...settings.filters, tags: true } },
        groupCounts: [3, 2, 1],
      });
      const controls = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('switch'),
        ...screen.getAllByRole('slider'),
        ...screen.getAllByRole('textbox'),
        ...screen.getAllByRole('searchbox'),
        ...Array.from(document.querySelectorAll('input[type="color"]')),
      ];
      expect(controls.length).toBeGreaterThan(30);
      for (const control of controls) expect(control).toHaveAccessibleName();
      cleanup();
    }
  });

  it('keeps wheel events from reaching the graph under it, open or closed', () => {
    const onWheel = vi.fn();
    const host = document.createElement('div');
    host.addEventListener('wheel', onWheel);
    document.body.appendChild(host);
    const { rerender } = renderPanel({ open: false });
    // Move the rendered panel under the host that listens like the graph.
    const mount = () => {
      const panel = document.querySelector('[data-graph-settings]')!;
      host.appendChild(panel.parentElement!);
      return panel;
    };
    let panel = mount();
    panel
      .querySelector('button')!
      .dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }));
    expect(onWheel).not.toHaveBeenCalled();

    rerender({ open: true });
    panel = document.querySelector('[data-graph-settings="open"]')!;
    panel.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, deltaY: 120 }),
    );
    expect(onWheel).not.toHaveBeenCalled();

    // The host itself still hears the wheel.
    host.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }));
    expect(onWheel).toHaveBeenCalledOnce();
    host.remove();
  });
});
