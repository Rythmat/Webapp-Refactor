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

  it('hides Technique on guitar, and keeps Start Here first', () => {
    renderAt('/learn?tab=Theory', 'guitar');
    expect(tabNames()).toEqual([
      'Start Here',
      'Songs',
      'Genre',
      'Theory',
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

  it('opens Theory when switching to guitar', () => {
    renderAt('/learn?tab=Technique', 'piano');
    pick('Guitar');
    expect(location()).toBe('/learn?tab=Theory');
    expect(
      screen.queryByRole('link', { name: 'Open Technique' }),
    ).not.toBeInTheDocument();
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
