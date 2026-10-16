import { beforeEach, describe, expect, it } from 'vitest';
import { STORE_FIELDS } from '@/daw/persistence/projectDocument/fields';
import { useStore } from '@/daw/store';

// ── The layout keys in the editor store (milestone 2.4) ────────────────────
// The Inspector per view, its width, the dock per tab and the readout are
// the student's prefs, never the project's; a view switch opens the
// Inspector as the student keeps it there (it no longer forces it open in
// Create, ia-flows-21), and a lesson's open or close leaves that choice
// alone.
//
// Run: npx vitest run src/daw/shell/layout/__tests__/layoutPrefs.test.ts

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('the registry', () => {
  it('classifies the layout keys as per-user prefs, outside undo and collab', () => {
    for (const key of [
      'inspectorOpenByView',
      'inspectorWidth',
      'dockHeights',
      'readoutMode',
    ] as const) {
      const spec = STORE_FIELDS[key];
      expect(spec.scope).toBe('pref');
      expect(spec.perUser).toBe(true);
      expect(spec.undo).toBe(false);
      expect(spec.collab).toBe(false);
      expect(spec.cloud).toBe(false);
      expect(spec.resetOnNew).toBe(false);
    }
  });
});

describe('the Inspector', () => {
  it('opens per view as the student left it, not by the view', () => {
    s().setCurrentView('arrange');
    s().setInspectorOpenFor('arrange', false);
    s().setInspectorOpenFor('score', true);
    s().setCurrentView('score');
    expect(s().libraryOpen).toBe(true);
    s().setCurrentView('studio');
    // No choice for Mix yet: closed, its default.
    expect(s().libraryOpen).toBe(false);
    s().setCurrentView('arrange');
    expect(s().libraryOpen).toBe(false);
  });

  it('keeps the student’s toggle for the view showing', () => {
    s().setCurrentView('leadsheet');
    s().toggleLibrary();
    expect(s().libraryOpen).toBe(true);
    expect(s().inspectorOpenByView).toEqual({ leadsheet: true });
  });

  it('opens for the moment without changing the choice (a lesson step)', () => {
    s().setInspectorOpenFor('arrange', true);
    s().setCurrentView('arrange');
    s().setLibraryOpen(false);
    expect(s().libraryOpen).toBe(false);
    expect(s().inspectorOpenByView.arrange).toBe(true);
  });

  it('is left alone when a step re-asserts the view it is on', () => {
    s().setCurrentView('arrange');
    s().setLibraryOpen(false);
    s().setCurrentView('arrange');
    expect(s().libraryOpen).toBe(false);
  });

  it('keeps its width within the column’s limits', () => {
    s().setInspectorWidth(999);
    expect(s().inspectorWidth).toBe(420);
    s().setInspectorWidth(10);
    expect(s().inspectorWidth).toBe(200);
  });
});

describe('the dock and the readout', () => {
  it('keeps a height per tab, never above 85%', () => {
    s().setDockHeight('fx', 0.5);
    s().setDockHeight('prism', 0.99);
    expect(s().dockHeights).toEqual({ fx: 0.5, prism: 0.85 });
  });

  it('switches the readout', () => {
    s().setReadoutMode('time');
    expect(s().readoutMode).toBe('time');
  });
});
