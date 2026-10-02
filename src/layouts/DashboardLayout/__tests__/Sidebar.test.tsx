// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../Sidebar';

/**
 * The console's sidebar: the app's own, pointed at the console, plus Cortex
 * (the graph and the tables; the item was "Table" until 1 Oct 2026) for
 * every console role and Users and Telemetry for admins only.
 */

const auth = vi.hoisted(() => ({ role: 'admin' as string }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: auth.role }),
}));
// The account menu fetches the user; a marker is enough to find it.
vi.mock('../UserWidget', () => ({
  UserWidget: () => <div data-testid="user-widget" />,
}));

afterEach(cleanup);

const renderAt = (path: string, role: string) => {
  auth.role = role;
  const { container } = render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  );
  const hrefs = [...container.querySelectorAll('a')].map(
    (a) => a.getAttribute('href') ?? '',
  );
  const current = [...container.querySelectorAll('a[aria-current="page"]')].map(
    (a) => a.getAttribute('href'),
  );
  return { container, hrefs, current };
};

describe('the console sidebar', () => {
  it('gives admins the app sections plus Users and Telemetry', () => {
    const { hrefs } = renderAt('/console/users', 'admin');
    expect(hrefs).toContain('/console/content/learn');
    expect(hrefs).toContain('/console/content/office');
    expect(hrefs).toContain('/console/users');
    expect(hrefs).toContain('/console/telemetry');
  });

  it('keeps log out for every console role', () => {
    for (const role of ['admin', 'editor']) {
      const { container } = renderAt('/console/content/home', role);
      expect(
        container.querySelector('[data-testid="user-widget"]'),
        role,
      ).not.toBeNull();
      cleanup();
    }
  });

  it('gives editors the app sections only', () => {
    const { hrefs } = renderAt('/console/content/home', 'editor');
    expect(hrefs).toContain('/console/content/learn');
    expect(hrefs).toContain('/console/content/office');
    expect(hrefs).not.toContain('/console/users');
    expect(hrefs).not.toContain('/console/telemetry');
  });

  it('gives Cortex to admins and editors alike, opening the graph', () => {
    for (const role of ['admin', 'editor']) {
      const { hrefs } = renderAt('/console/content/home', role);
      expect(hrefs, role).toContain('/console/cortex');
      // The old Table item is Cortex now: nothing links the bare Table.
      expect(hrefs, role).not.toContain('/console/table');
      cleanup();
    }
  });

  it('labels it Cortex, with its own network icon', async () => {
    const { container } = renderAt('/console/content/home', 'admin');
    const item = container.querySelector<HTMLElement>(
      'a[href="/console/cortex"]',
    )!;
    // Collapsed, the label is the item's tooltip, shown on focus or hover.
    fireEvent.focus(item);
    expect((await screen.findByRole('tooltip')).textContent).toBe('Cortex');
    // The icon is drawn like the lucide icons beside it.
    const icon = item.querySelector('svg')!;
    expect(icon.getAttribute('class')).toContain('lucide-cortex');
    expect(icon.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(icon.getAttribute('fill')).toBe('none');
    expect(icon.getAttribute('stroke')).toBe('currentColor');
    expect(icon.getAttribute('stroke-width')).toBe('2');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    // At the same size as Users and Telemetry below it.
    const users = container.querySelector('a[href="/console/users"] svg')!;
    expect(icon.getAttribute('class')).toContain('h-5 w-5');
    expect(users.getAttribute('class')).toContain('h-5 w-5');
  });

  it('keeps Users and Telemetry for admins beside Cortex', () => {
    const admin = renderAt('/console/table/songs', 'admin').hrefs;
    expect(admin).toEqual(
      expect.arrayContaining([
        '/console/cortex',
        '/console/users',
        '/console/telemetry',
      ]),
    );
    cleanup();
    const editor = renderAt('/console/table/songs', 'editor').hrefs;
    expect(editor).not.toContain('/console/users');
    expect(editor).not.toContain('/console/telemetry');
  });

  it('highlights the app section a table belongs to', () => {
    expect(renderAt('/console/content/records/song', 'admin').current).toEqual([
      '/console/content/learn',
    ]);
  });

  it('highlights Users on the Users page and nothing in the app', () => {
    expect(renderAt('/console/users', 'admin').current).toEqual([
      '/console/users',
    ]);
  });

  it('highlights Cortex on the graph and on any table, and no app section', () => {
    // Neither is an app page, so nothing in the app half lights up.
    for (const role of ['admin', 'editor']) {
      for (const path of [
        '/console/cortex',
        '/console/cortex?focus=artist:toto&depth=2',
        '/console/cortex/artists/toto',
        '/console/cortex/integrity',
        '/console/cortex/links',
        '/console/table',
        '/console/table/songs',
        '/console/table/records/abbey-road',
      ]) {
        expect(renderAt(path, role).current, `${role} ${path}`).toEqual([
          '/console/cortex',
        ]);
        cleanup();
      }
    }
  });

  it('does not highlight Cortex on a page that only starts like it', () => {
    expect(renderAt('/console/cortexes', 'admin').current).toEqual([]);
    cleanup();
    expect(renderAt('/console/tables', 'admin').current).toEqual([]);
  });

  it('highlights nothing on a console-only page', () => {
    expect(renderAt('/console/content/publishing', 'admin').current).toEqual(
      [],
    );
  });
});
