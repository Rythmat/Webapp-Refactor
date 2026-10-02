// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClassroomSidebar } from '../ClassroomSidebar';

/**
 * The app's sidebar, pinned before the console started reusing it. The
 * console passes props the app never does; these snapshots are the proof that
 * students and teachers still get exactly the sidebar they had.
 */

const auth = vi.hoisted(() => ({ role: 'student' as string }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: auth.role }),
}));

afterEach(cleanup);

const renderAt = (path: string, role: string) => {
  auth.role = role;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ClassroomSidebar className="hidden flex-shrink-0 md:flex" />
    </MemoryRouter>,
  ).container.innerHTML;
};

describe('the app sidebar', () => {
  it('is unchanged for a student', () => {
    expect(renderAt('/learn', 'student')).toMatchSnapshot();
  });

  it('is unchanged for a teacher, Office included', () => {
    expect(renderAt('/office', 'teacher')).toMatchSnapshot();
  });
});

describe('the collapsed sidebar for assistive technology', () => {
  it('names every link, though only icons show', () => {
    auth.role = 'teacher';
    const { container } = render(
      <MemoryRouter initialEntries={['/office']}>
        <ClassroomSidebar />
      </MemoryRouter>,
    );
    const links = [...container.querySelectorAll('li a')];
    expect(links.length).toBeGreaterThan(8);
    for (const link of links) {
      expect(
        link.getAttribute('aria-label')?.trim(),
        link.outerHTML,
      ).toBeTruthy();
    }
    expect(
      container.querySelector('a[href="/learn"]')?.getAttribute('aria-label'),
    ).toBe('Learn');
  });
});

describe('the app sidebar, through the console', () => {
  const renderConsole = (activeAppPath: string | null, role: string) => {
    auth.role = role;
    return render(
      <MemoryRouter initialEntries={['/console/content/learn']}>
        <ClassroomSidebar
          lens={{
            hrefFor: (appPath) => `/console/content${appPath}`,
            activeAppPath,
          }}
          showAllSections
          extraSection={<li data-testid="extra">Users</li>}
          footer={<div data-testid="footer" />}
        />
      </MemoryRouter>,
    ).container;
  };

  it('keeps every internal link inside the console', () => {
    const container = renderConsole('/learn', 'admin');
    const hrefs = [...container.querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    const internal = hrefs.filter((h) => h && !h.startsWith('mailto:'));
    expect(internal.length).toBeGreaterThan(8);
    expect(internal.every((h) => h!.startsWith('/console/'))).toBe(true);
  });

  it('shows Office to a console role', () => {
    const container = renderConsole(null, 'editor');
    expect(
      container.querySelector('a[href="/console/content/office"]'),
    ).not.toBeNull();
  });

  it('highlights the section showing, not the console path', () => {
    const current = (container: HTMLElement) =>
      [...container.querySelectorAll('a[aria-current="page"]')].map((a) =>
        a.getAttribute('href'),
      );
    // The router sits on /console/content/learn in every render here; only
    // the lens decides what is highlighted.
    expect(current(renderConsole('/learn', 'admin'))).toEqual([
      '/console/content/learn',
    ]);
    expect(current(renderConsole('/atlas/globe', 'admin'))).toEqual([
      '/console/content/atlas',
    ]);
    expect(current(renderConsole(null, 'admin'))).toEqual([]);
  });

  it('renders the console sections it is given', () => {
    const container = renderConsole('/learn', 'admin');
    expect(container.querySelector('[data-testid="extra"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="footer"]')).not.toBeNull();
  });
});
