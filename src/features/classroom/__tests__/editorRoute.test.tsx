// @vitest-environment jsdom
/**
 * The /studio route (milestone 1.12a, bundle-load-06/-16): no content
 * gate, so the editor renders while the song library is still on its way;
 * the editor's own shape (DawSkeleton) while its chunk loads; and an editor
 * chunk that never arrives leaves the app's frame with a Reload, not the
 * whole-page error.
 *
 * Run: npx vitest run src/features/classroom/__tests__/editorRoute.test.tsx
 */
import { cleanup, render, screen } from '@testing-library/react';
import { Suspense, type ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DawSkeleton } from '@/daw/shell/DawSkeleton';

const editor = { arrive: null as null | (() => void) };

/** The editor's chunk: arriving when the test says, or failing. */
function mockEditor(outcome: 'arrives' | 'fails'): void {
  vi.doMock('@/daw/DawApp', async () => {
    if (outcome === 'fails') {
      throw new TypeError('Failed to fetch dynamically imported module');
    }
    await new Promise<void>((resolve) => {
      editor.arrive = resolve;
    });
    return { DawApp: () => <p>The editor</p> };
  });
}

// The song library never arrives in these tests.
vi.mock('@/content/songStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/content/songStore')>();
  return {
    ...actual,
    ensureSongContent: () => new Promise(() => {}),
    isSongContentReady: () => false,
  };
});

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  editor.arrive = null;
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

/** The editor route's element, rendered as ClassroomDashboard renders it. */
async function renderEditorRoute(): Promise<void> {
  const { studioPages } = await import('../ClassroomPages');
  // `/studio` itself, its index route, since 2026-10-24.
  const route = studioPages().children.find((r) => 'index' in r && r.index);
  if (!route?.element) throw new Error('no editor route');
  render(
    <MemoryRouter initialEntries={['/studio?song=africa']}>
      <Routes>
        <Route
          path="/studio"
          element={
            <Suspense fallback={<DawSkeleton />}>
              {route.element as ReactElement}
            </Suspense>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('the editor route', () => {
  it('shows the editor’s shape while its chunk loads, then the editor, without the songs', async () => {
    mockEditor('arrives');
    await renderEditorRoute();
    expect(await screen.findByTestId('daw-skeleton')).toBeTruthy();
    await vi.waitFor(() => expect(editor.arrive).not.toBeNull());
    editor.arrive?.();
    expect(await screen.findByText('The editor')).toBeTruthy();
    expect(screen.queryByTestId('daw-skeleton')).toBeNull();
  });

  it('keeps the app’s frame and offers a reload when the editor’s chunk fails', async () => {
    mockEditor('fails');
    await renderEditorRoute();
    expect(await screen.findByText('The Studio couldn’t load')).toBeTruthy();
    expect(screen.getByText('Reload')).toBeTruthy();
  });
});
