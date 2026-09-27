// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { useStepper } from '../motion/useStepper';

let latest: ReturnType<typeof useStepper>;

const Probe = ({ active }: { active: boolean }) => {
  latest = useStepper(1000, active);
  return null;
};

let host: HTMLDivElement;
let root: Root;
let hidden = false;

const mount = (active = true) =>
  act(() => {
    root.render(<Probe active={active} />);
  });
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const rest = () => act(() => latest.rest());

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  host = document.createElement('div');
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});

describe('useStepper', () => {
  it('waits for each step to rest, then advances after the interval', () => {
    mount();
    wait(5000);
    expect(latest.step).toBe(0);
    rest();
    wait(999);
    expect(latest.step).toBe(0);
    wait(1);
    expect(latest.step).toBe(1);
    // The new step starts unrested.
    wait(5000);
    expect(latest.step).toBe(1);
    rest();
    wait(1000);
    expect(latest.step).toBe(2);
  });

  it('skips ahead at once on a manual advance', () => {
    mount();
    rest();
    wait(600);
    act(() => latest.advance());
    expect(latest.step).toBe(1);
    wait(5000);
    expect(latest.step).toBe(1);
  });

  it('holds while inactive, even at rest', () => {
    mount(false);
    rest();
    wait(5000);
    expect(latest.step).toBe(0);
    mount(true);
    wait(1000);
    expect(latest.step).toBe(1);
  });

  it('holds while the tab is hidden, then advances once it is visible', () => {
    mount();
    rest();
    hidden = true;
    wait(3000);
    expect(latest.step).toBe(0);
    hidden = false;
    wait(1000);
    expect(latest.step).toBe(1);
  });
});
