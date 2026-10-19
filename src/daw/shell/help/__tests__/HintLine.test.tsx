// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── The hover hint line (milestone 2.11) ───────────────────────────────────

const h = vi.hoisted(() => ({
  commits: {} as Record<string, number>,
  observers: [] as {
    callback: ResizeObserverCallback;
    target: Element | null;
  }[],
}));

vi.mock('@/daw/dev/DevProfiler', () => ({
  useDevCommitCount: (id: string) => {
    // As the real hook: once per commit of the calling component.
    useEffect(() => {
      h.commits[id] = (h.commits[id] ?? 0) + 1;
    });
  },
}));

import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { Toggle } from '@/daw/ui/Toggle';
import { Tooltip, TooltipGroup } from '@/daw/ui/Tooltip';
import { HintLine, MIN_HINT_PX } from '../HintLine';
import { getHint, setHint } from '../hintSource';

class FakeResizeObserver {
  private entry: { callback: ResizeObserverCallback; target: Element | null };
  constructor(callback: ResizeObserverCallback) {
    this.entry = { callback, target: null };
    h.observers.push(this.entry);
  }
  observe(target: Element) {
    this.entry.target = target;
  }
  disconnect() {
    h.observers.splice(h.observers.indexOf(this.entry), 1);
  }
  unobserve() {}
}

/** Tells every observer its element is now `width` px wide. */
function resize(width: number) {
  act(() => {
    for (const { callback, target } of [...h.observers]) {
      if (!target) continue;
      callback(
        [{ target, contentRect: { width } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    }
  });
}

beforeEach(() => {
  h.commits = {};
  h.observers.length = 0;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  useStore.setState({ hoverHints: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setHint('');
});

function renderRail() {
  return render(
    <TooltipGroup>
      <IconButton label="Play" shortcut="Space" icon={<svg />} />
      <IconButton label="Loop" shortcut="L" icon={<svg />} />
      <button type="button" aria-label="Master volume" />
      <HintLine />
    </TooltipGroup>,
  );
}

describe('HintLine', () => {
  it('says what the control under the pointer does', () => {
    renderRail();
    resize(MIN_HINT_PX + 40);
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Loop' }));
    expect(screen.getByTestId('hint-line-text').textContent).toBe('Loop · L');
    fireEvent.pointerOver(
      screen.getByRole('button', { name: 'Master volume' }),
    );
    expect(screen.getByTestId('hint-line-text').textContent).toBe(
      'Master volume',
    );
    expect(screen.getByTestId('hint-line').getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('commits only when the words change', () => {
    renderRail();
    resize(MIN_HINT_PX + 40);
    const play = screen.getByRole('button', { name: 'Play' });
    const before = h.commits.HintLine ?? 0;
    fireEvent.pointerOver(play);
    expect(h.commits.HintLine).toBe(before + 1);
    // Over the same control again, its icon, a resize that stays roomy.
    fireEvent.pointerOver(play);
    fireEvent.pointerOver(play.querySelector('svg')!);
    resize(MIN_HINT_PX + 80);
    expect(h.commits.HintLine).toBe(before + 1);
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Loop' }));
    expect(h.commits.HintLine).toBe(before + 2);
  });

  it(`shows nothing, and doesn't listen, with less than ${MIN_HINT_PX} px`, () => {
    renderRail();
    resize(MIN_HINT_PX - 1);
    expect(screen.getByTestId('hint-line')).toBeTruthy();
    expect(screen.queryByTestId('hint-line-text')).toBeNull();
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Loop' }));
    expect(getHint()).toBe('');
    resize(MIN_HINT_PX);
    expect(screen.getByTestId('hint-line-text')).toBeTruthy();
  });

  it('is gone, with no listener, when Hover hints is off', () => {
    const add = vi.spyOn(document, 'addEventListener');
    useStore.setState({ hoverHints: false });
    renderRail();
    resize(MIN_HINT_PX + 40);
    expect(screen.queryByTestId('hint-line')).toBeNull();
    expect(add.mock.calls.map(([type]) => type)).not.toContain('pointerover');
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Loop' }));
    expect(getHint()).toBe('');

    // Turned on, it listens; turned off again, it stops and clears.
    act(() => useStore.setState({ hoverHints: true }));
    resize(MIN_HINT_PX + 40);
    expect(add.mock.calls.map(([type]) => type)).toContain('pointerover');
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Loop' }));
    expect(getHint()).toBe('Loop · L');
    act(() => useStore.setState({ hoverHints: false }));
    expect(getHint()).toBe('');
    add.mockRestore();
  });

  it('never writes to the editor store', () => {
    const writes = vi.fn();
    const unsubscribe = useStore.subscribe(writes);
    renderRail();
    resize(MIN_HINT_PX + 40);
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Play' }));
    fireEvent.focusIn(screen.getByRole('button', { name: 'Loop' }));
    expect(writes).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('Tooltip triggers carry data-hint', () => {
  it('puts the tip, and its shortcut after a dot, on the trigger', () => {
    render(
      <TooltipGroup>
        <IconButton label="Undo" shortcut="⌘Z" icon={<svg />} />
        <IconButton label="Delete" icon={<svg />} />
        <Toggle label="Metronome" icon={<svg />} shortcut="K" />
        <Tooltip content="Drag to set the tempo">
          <button type="button">120</button>
        </Tooltip>
      </TooltipGroup>,
    );
    const hintOf = (name: string) =>
      screen.getByRole('button', { name }).getAttribute('data-hint');
    expect(hintOf('Undo')).toBe('Undo · ⌘Z');
    expect(hintOf('Delete')).toBe('Delete');
    expect(hintOf('Metronome')).toBe('Metronome · K');
    expect(hintOf('120')).toBe('Drag to set the tempo');
  });

  it("leaves a rich tip off, and lets the child's own data-hint win", () => {
    render(
      <TooltipGroup>
        <Tooltip content={<b>Bold</b>}>
          <button type="button">A</button>
        </Tooltip>
        <Tooltip content="Short">
          <button type="button" data-hint="Longer words · S">
            B
          </button>
        </Tooltip>
        <Tooltip content="Off" disabled>
          <button type="button">C</button>
        </Tooltip>
      </TooltipGroup>,
    );
    const hintOf = (name: string) =>
      screen.getByRole('button', { name }).getAttribute('data-hint');
    expect(hintOf('A')).toBeNull();
    expect(hintOf('B')).toBe('Longer words · S');
    expect(hintOf('C')).toBeNull();
  });
});
