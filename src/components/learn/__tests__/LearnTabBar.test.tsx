// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LearnTabBar } from '@/components/learn/LearnTabBar';
import {
  useInstrumentStore,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';

// Render the Radix menu inline so its items can be clicked in jsdom.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <button>{children}</button>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    disabled,
    onSelect,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
  }) => (
    <div
      role="menuitem"
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onSelect?.()}
    >
      {children}
    </div>
  ),
}));

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{`${pathname}${search}`}</output>;
};

function renderAt(url: string, instrument: LearnInstrument) {
  useInstrumentStore.setState({ instrument });
  render(
    <MemoryRouter initialEntries={[url]}>
      <LearnTabBar />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;
/** The sub-tabs' names, in order. */
const tabNames = () =>
  screen
    .getAllByRole('link', { name: /^Open / })
    .map((link) => link.getAttribute('aria-label')!.replace(/^Open /, ''));
const pick = (name: 'Piano' | 'Guitar') =>
  fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(name) }));

describe('LearnTabBar', () => {
  afterEach(() => {
    cleanup();
    useInstrumentStore.setState({ instrument: 'piano', leftHanded: false });
  });

  it('shows all six tabs on piano, Start Here first', () => {
    renderAt('/learn?tab=Theory', 'piano');
    expect(tabNames()).toEqual([
      'Start Here',
      'Songs',
      'Genre',
      'Theory',
      'Technique',
      'World Harmony',
    ]);
    expect(
      screen
        .getByRole('link', { name: 'Open Start Here' })
        .getAttribute('href'),
    ).toBe('/learn?tab=StartHere');
  });

  it('shows Technique on guitar too (Harmonics), Start Here first', () => {
    renderAt('/learn?tab=Theory', 'guitar');
    expect(tabNames()).toEqual([
      'Start Here',
      'Songs',
      'Genre',
      'Theory',
      'Technique',
      'World Harmony',
    ]);
  });

  it('marks Start Here current on its tab', () => {
    renderAt('/learn?tab=StartHere', 'piano');
    expect(
      screen
        .getByRole('link', { name: 'Open Start Here' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });

  it('stays on Start Here when switching instrument either way', () => {
    renderAt('/learn?tab=StartHere', 'piano');
    pick('Guitar');
    expect(location()).toBe('/learn?tab=StartHere');
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
    pick('Piano');
    expect(location()).toBe('/learn?tab=StartHere');
  });

  it('stays on Technique when switching instrument either way', () => {
    renderAt('/learn?tab=Technique', 'piano');
    pick('Guitar');
    expect(location()).toBe('/learn?tab=Technique');
    expect(
      screen.getByRole('link', { name: 'Open Technique' }),
    ).toBeInTheDocument();
    pick('Piano');
    expect(location()).toBe('/learn?tab=Technique');
  });

  it('opens Theory when switching to guitar from another tab', () => {
    renderAt('/learn?tab=Genre', 'piano');
    pick('Guitar');
    expect(location()).toBe('/learn?tab=Theory');
  });

  it('stays on Theory when switching back to piano', () => {
    renderAt('/learn?tab=Theory', 'guitar');
    pick('Piano');
    expect(location()).toBe('/learn?tab=Theory');
    expect(
      screen.getByRole('link', { name: 'Open Technique' }),
    ).toBeInTheDocument();
  });

  it('opens Technique when switching to piano from any other tab', () => {
    renderAt('/learn?tab=Genre', 'guitar');
    pick('Piano');
    expect(location()).toBe('/learn?tab=Technique');
  });

  it('stays on Songs when switching instrument either way', () => {
    renderAt('/learn?tab=Songs', 'piano');
    pick('Guitar');
    expect(location()).toBe('/learn?tab=Songs');
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
    pick('Piano');
    expect(location()).toBe('/learn?tab=Songs');
    expect(useInstrumentStore.getState().instrument).toBe('piano');
  });
});

describe('LearnTabBar on the Learn page', () => {
  afterEach(() => {
    cleanup();
    useInstrumentStore.setState({ instrument: 'piano', leftHanded: false });
  });

  const renderLearnPageBar = (instrument: LearnInstrument) => {
    useInstrumentStore.setState({ instrument });
    render(
      <MemoryRouter initialEntries={['/learn']}>
        <LearnTabBar
          only={['Songs', 'Genre', 'Theory', 'Technique']}
          extras={false}
          instrumentHeading
        />
      </MemoryRouter>,
    );
  };
  const heading = () => screen.getByRole('heading', { level: 2 }).textContent;

  it('names the keyboard in its heading for screen readers only, and keeps only its four tabs', () => {
    renderLearnPageBar('piano');
    expect(heading()).toBe('Keyboard');
    expect(screen.getByRole('heading', { level: 2 }).className).toContain(
      'sr-only',
    );
    expect(tabNames()).toEqual(['Songs', 'Genre', 'Theory', 'Technique']);
    expect(screen.queryByText('Instrument:')).toBeNull();
  });

  it('links each tab to its page on the instrument', () => {
    renderLearnPageBar('guitar');
    const hrefs = screen
      .getAllByRole('link', { name: /^Open / })
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '/learn/guitar/songs',
      '/learn/guitar/genre',
      '/learn/guitar/theory',
      '/learn/guitar/technique',
    ]);
  });

  it('names the guitar in its heading, Technique kept', () => {
    renderLearnPageBar('guitar');
    expect(heading()).toBe('Guitar');
    expect(tabNames()).toEqual(['Songs', 'Genre', 'Theory', 'Technique']);
  });

  it('still says Learn without the option', () => {
    renderAt('/learn', 'guitar');
    expect(heading()).toBe('Learn');
  });
});
