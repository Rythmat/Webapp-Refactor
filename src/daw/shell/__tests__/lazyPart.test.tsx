// @vitest-environment jsdom
/**
 * The editor's lazily loaded parts and their boundaries (milestone 1.12a):
 * a placeholder while a part loads, no placeholder once it is here, one fetch
 * however often it is preloaded, a part that fails costs only its own area,
 * and a crash of the whole editor writes the draft before it offers a reload.
 *
 * Run: npx vitest run src/daw/shell/__tests__/lazyPart.test.tsx
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const flush = vi.hoisted(() => ({
  live: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  pending: false,
}));

vi.mock('@/lib/chunkReload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chunkReload')>();
  return { ...actual, chunkReloadPending: () => flush.pending };
});

vi.mock('@/daw/persistence/drafts/autosave', () => ({
  flushLiveDraft: flush.live,
}));
vi.mock('@/lib/beforeReload', () => ({
  reloadAfterSaving: flush.reload,
}));

import { DawErrorBoundary, PartBoundary } from '../errors/DawErrorBoundary';
import { lazyPart, useOpenedOnce } from '../lazyPart';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const Greeting = ({ name }: { name: string }) => <p>Hello {name}</p>;

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // React logs every caught render error; the boundaries are under test.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  flush.live.mockClear();
  flush.reload.mockClear();
  flush.pending = false;
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

describe('a lazily loaded part', () => {
  it('shows its placeholder while it loads, then the part', async () => {
    const load = deferred<typeof Greeting>();
    const Part = lazyPart(() => load.promise, {
      name: 'greeting',
      fallback: <p>Loading…</p>,
    });
    render(<Part name="Ada" />);
    expect(screen.getByText('Loading…')).toBeTruthy();
    await act(async () => {
      load.resolve(Greeting);
      await load.promise;
    });
    expect(await screen.findByText('Hello Ada')).toBeTruthy();
  });

  it('renders at once, with no placeholder, when it was preloaded', async () => {
    const Part = lazyPart(async () => Greeting, {
      name: 'greeting',
      fallback: <p>Loading…</p>,
    });
    await Part.preload();
    render(<Part name="Grace" />);
    expect(screen.queryByText('Loading…')).toBeNull();
    expect(screen.getByText('Hello Grace')).toBeTruthy();
  });

  it('fetches once however often it is preloaded or shown', async () => {
    const load = vi.fn(async () => Greeting);
    const Part = lazyPart(load, { name: 'greeting' });
    await Promise.all([Part.preload(), Part.preload()]);
    render(<Part name="Alan" />);
    render(<Part name="Edsger" />);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps its state when it mounted while loading', async () => {
    const load = deferred<() => JSX.Element>();
    const Counter = () => {
      const [count, setCount] = useState(0);
      return (
        <button type="button" onClick={() => setCount((n) => n + 1)}>
          {count}
        </button>
      );
    };
    const Part = lazyPart(() => load.promise, { name: 'counter' });
    const Parent = () => {
      const [, rerender] = useState(0);
      return (
        <>
          <Part />
          <button type="button" onClick={() => rerender((n) => n + 1)}>
            again
          </button>
        </>
      );
    };
    render(<Parent />);
    await act(async () => {
      load.resolve(Counter);
      await load.promise;
    });
    const counter = await screen.findByText('0');
    act(() => counter.click());
    expect(screen.getByText('1')).toBeTruthy();
    // A parent render after the load must not swap it for another element.
    act(() => screen.getByText('again').click());
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('that fails to load costs only its area and offers a reload', async () => {
    const Part = lazyPart(
      () =>
        Promise.reject(
          new TypeError('Failed to fetch dynamically imported module: /a.js'),
        ),
      { name: 'Score' },
    );
    render(
      <>
        <p>The timeline</p>
        <Part />
      </>,
    );
    expect(await screen.findByText('The Score couldn’t load')).toBeTruthy();
    expect(screen.getByText('The timeline')).toBeTruthy();
    expect(screen.queryByText('Try again')).toBeNull();
    act(() => screen.getByText('Reload editor').click());
    expect(flush.reload).toHaveBeenCalledTimes(1);
  });
});

describe('a part whose chunk fails while a reload is under way', () => {
  it('keeps its placeholder until the reload, with no error', async () => {
    const Part = lazyPart(
      () => {
        // The cancelled import resolved to nothing (chunkReload).
        flush.pending = true;
        return Promise.reject(new TypeError("Cannot read 'ScoreView'"));
      },
      { name: 'Score', fallback: <p>Loading…</p> },
    );
    render(<Part />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(screen.queryByText('The Score couldn’t load')).toBeNull();
  });
});

describe('a part whose import a pending reload cancelled', () => {
  it('keeps its placeholder too, though the import came back empty', async () => {
    const Part = lazyPart(
      () => {
        flush.pending = true;
        return Promise.resolve(undefined as unknown as typeof Greeting);
      },
      { name: 'Score', fallback: <p>Loading…</p> },
    );
    render(<Part name="x" />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByText('Loading…')).toBeTruthy();
  });
});

describe('a part that throws while it renders', () => {
  it('offers Try again, which mounts it afresh', async () => {
    let broken = true;
    const Flaky = () => {
      if (broken) throw new Error('bad state');
      return <p>Fixed</p>;
    };
    render(
      <PartBoundary name="Mix view">
        <Flaky />
      </PartBoundary>,
    );
    expect(screen.getByText('The Mix view couldn’t open')).toBeTruthy();
    broken = false;
    act(() => screen.getByText('Try again').click());
    expect(screen.getByText('Fixed')).toBeTruthy();
  });
});

describe('the editor crashing', () => {
  it('writes the draft, then offers Reload editor and Back to Studio', async () => {
    const Crash = () => {
      throw new Error('boom');
    };
    render(
      <MemoryRouter>
        <DawErrorBoundary>
          <Crash />
        </DawErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('Something went wrong in the editor')).toBeTruthy();
    expect(flush.live).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        'Your work is kept on this device. Reload the editor to carry on.',
      ),
    ).toBeTruthy();
    act(() => screen.getByText('Reload editor').click());
    expect(flush.reload).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Back to Studio')).toBeTruthy();
  });

  it('says so when the draft could not be written', async () => {
    flush.live.mockRejectedValueOnce(new Error('quota'));
    const Crash = () => {
      throw new Error('boom');
    };
    render(
      <MemoryRouter>
        <DawErrorBoundary>
          <Crash />
        </DawErrorBoundary>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(
        'The last changes may not be kept. Reload the editor to carry on.',
      ),
    ).toBeTruthy();
  });
});

describe('useOpenedOnce', () => {
  it('stays true once opened, so a dialog closes with its animation', () => {
    const seen: boolean[] = [];
    const Probe = ({ open }: { open: boolean }) => {
      seen.push(useOpenedOnce(open));
      return null;
    };
    const { rerender } = render(<Probe open={false} />);
    rerender(<Probe open />);
    rerender(<Probe open={false} />);
    expect(seen.at(0)).toBe(false);
    expect(seen.at(-1)).toBe(true);
  });
});
