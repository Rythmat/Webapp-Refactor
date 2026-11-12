// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRail } from '../AppRail';
import { RailToggle } from '../RailToggle';
import { useAppRail } from '../appRailStore';

// ── The app rail (owner, 2026-11-10: Samply's sidebar) ─────────────────────
// Run: npx vitest run src/layouts/DashboardLayout/__tests__/AppRail.test.tsx

const env = vi.hoisted(() => ({ desk: true, role: 'student' }));

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => env.desk }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: env.role }),
}));
vi.mock('@/components/ClassroomLayout/useTopRailStats', () => ({
  useTopRailStats: () => ({ userName: 'Aaron', avatarConfig: undefined }),
}));
vi.mock('@/components/ui/UserAvatarPattern', () => ({
  UserAvatarPattern: () => null,
}));
const signOut = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuthActions: () => ({ signOut }),
}));

function renderRail(path = '/learn') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <RailToggle />
      <AppRail />
    </MemoryRouter>,
  );
}

const rail = () => document.querySelector('[data-app-rail]')!;

beforeEach(() => {
  env.desk = true;
  env.role = 'student';
  window.localStorage.clear();
  useAppRail.setState({ open: true, sheetOpen: false });
});
afterEach(cleanup);

describe('the app rail on a desk', () => {
  it('holds the student, search and the app’s places, the page showing lit', () => {
    renderRail('/learn/keyboard/theory/diatonic');
    expect(
      screen.getByRole('link', { name: 'Aaron: your account' }),
    ).toHaveAttribute('href', '/settings');
    expect(rail().querySelector('[data-rail-mode]')).toHaveAttribute(
      'data-rail-mode',
      'main',
    );
    expect(screen.getByRole('link', { name: 'Search' })).toBeInTheDocument();
    for (const name of [
      'Home',
      'Learn',
      'Songs',
      'Studio',
      'Library',
      'Globe',
      'Arcade',
    ]) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('link', { name: 'Office' })).toBeNull();
  });

  it('shows the Office to teachers', () => {
    env.role = 'teacher';
    renderRail();
    expect(screen.getByRole('link', { name: 'Office' })).toBeInTheDocument();
  });

  it('shuts from its own button, remembers it, and the top bar’s button opens it', () => {
    // The Studio editor's: the one page where shut means gone.
    renderRail('/studio');
    expect(rail()).toHaveAttribute('data-app-rail', 'open');
    fireEvent.click(screen.getByRole('button', { name: 'Close sidebar' }));
    expect(rail()).toHaveAttribute('data-app-rail', 'shut');
    expect(rail()).toHaveAttribute('inert');
    expect(window.localStorage.getItem('ma.appRail.open')).toBe('0');
    act(() => useAppRail.getState().setOpen(true));
    expect(rail()).toHaveAttribute('data-app-rail', 'open');
    expect(window.localStorage.getItem('ma.appRail.open')).toBe('1');
  });
});

describe('the app rail on a phone', () => {
  beforeEach(() => {
    env.desk = false;
    // jsdom has no matchMedia: the toggle takes it for a phone.
  });

  it('starts shut, slides open from the toggle, and shuts on Escape', () => {
    renderRail();
    expect(rail()).toHaveAttribute('data-app-rail', 'shut');
    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar' }));
    expect(rail()).toHaveAttribute('data-app-rail', 'open');
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(rail()).toHaveAttribute('data-app-rail', 'shut');
  });

  it('shuts once a place is picked', () => {
    renderRail();
    act(() => useAppRail.getState().setSheetOpen(true));
    fireEvent.click(screen.getByRole('link', { name: 'Studio' }));
    expect(useAppRail.getState().sheetOpen).toBe(false);
  });
});

describe('the Account area, in the same rail', () => {
  it('holds the Account menu instead of the app’s, the page showing lit', () => {
    renderRail('/settings/preferences');
    expect(document.querySelectorAll('nav[data-rail-mode]')).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Account' })).toHaveAttribute(
      'data-rail-mode',
      'account',
    );
    for (const name of [
      'Profile',
      'Subscription',
      'Preferences',
      'Progress',
      'Awards',
      'Help',
      'About',
      'Talk to Support',
    ]) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Preferences' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('link', { name: 'Studio' })).toBeNull();
  });

  it('counts Progress, Awards and the old Plan page as the Account area', () => {
    for (const path of ['/user', '/home/user/awards', '/home/user/plan']) {
      renderRail(path);
      expect(
        screen.getByRole('navigation', { name: 'Account' }),
      ).toBeInTheDocument();
      cleanup();
    }
  });

  it('goes back to the last page outside it', () => {
    useAppRail.setState({ lastOutside: '/learn?i=guitar' });
    renderRail('/settings/profile');
    fireEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(
      screen.getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
  });

  it('logs out from its tray', () => {
    renderRail('/settings/profile');
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(signOut).toHaveBeenCalled();
  });
});

describe('the icon rail (owner: Home 2026-11-10, every page but the Studio 2026-11-11)', () => {
  const iconRail = () => document.querySelector('[data-icon-rail]');

  it('floats in the shut rail’s place on Home: the avatar and every place, the page lit', () => {
    useAppRail.setState({ open: false });
    renderRail('/home');
    expect(iconRail()).toHaveAttribute('data-icon-rail', 'shown');
    const links = [...iconRail()!.querySelectorAll('a')].map((a) =>
      a.getAttribute('aria-label'),
    );
    expect(links).toEqual([
      'Aaron: your account',
      'Home',
      'Learn',
      'Songs',
      'Studio',
      'Library',
      'Globe',
      'Arcade',
      'Classroom',
      'Help & support',
    ]);
    expect(iconRail()!.querySelector('a[aria-label="Home"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('stands in the page’s row as the rail does, its column narrowed, the full panel inert', () => {
    useAppRail.setState({ open: false });
    renderRail('/home');
    expect(rail()).toHaveAttribute('data-app-rail', 'shut');
    expect(rail()).not.toHaveAttribute('inert');
    expect(rail()).not.toHaveAttribute('aria-hidden');
    expect((rail() as HTMLElement).style.width).toBe('5.114rem');
    expect(iconRail()!.parentElement).toBe(rail());
    expect(
      rail().querySelector('nav[data-rail-mode]')!.parentElement,
    ).toHaveAttribute('inert');
  });

  it('opens the rail from its logo, then steps aside', () => {
    useAppRail.setState({ open: false });
    renderRail('/home');
    fireEvent.click(
      iconRail()!.querySelector('button[aria-label="Open sidebar"]')!,
    );
    expect(useAppRail.getState().open).toBe(true);
    expect(iconRail()).toHaveAttribute('data-icon-rail', 'hidden');
    expect(iconRail()).toHaveAttribute('aria-hidden', 'true');
    expect(iconRail()).toHaveAttribute('inert');
  });

  it('opens on arriving at the Account’s Profile, on a desk alone', () => {
    useAppRail.setState({ open: false });
    renderRail('/settings/profile');
    expect(rail()).toHaveAttribute('data-app-rail', 'open');
    cleanup();
    useAppRail.setState({ open: false });
    renderRail('/settings/preferences');
    expect(rail()).toHaveAttribute('data-app-rail', 'shut');
    cleanup();
    env.desk = false;
    useAppRail.setState({ open: false });
    renderRail('/settings/profile');
    expect(useAppRail.getState().open).toBe(false);
  });

  it('is every page’s but the Studio editor’s, and a desk’s alone', () => {
    useAppRail.setState({ open: false });
    for (const path of ['/learn', '/songs', '/globe', '/office']) {
      renderRail(path);
      expect(iconRail()).toHaveAttribute('data-icon-rail', 'shown');
      cleanup();
    }
    renderRail('/studio');
    expect(iconRail()).toBeNull();
    cleanup();
    env.desk = false;
    renderRail('/home');
    expect(iconRail()).toBeNull();
  });

  it('hides the top bars’ open button on a desk while it stands in', () => {
    useAppRail.setState({ open: false });
    renderRail('/learn');
    expect(
      document.querySelector(
        'button[data-rail-toggle]:not([data-icon-rail] *)',
      ),
    ).toHaveClass('min-[960px]:hidden');
    cleanup();
    renderRail('/studio');
    expect(
      document.querySelector(
        'button[data-rail-toggle]:not([data-icon-rail] *)',
      ),
    ).not.toHaveClass('min-[960px]:hidden');
  });
});
