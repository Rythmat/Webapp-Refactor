import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModRoute } from '../audio/types';
import type * as SynthStoreModule from '../store';
import type { PresetData } from '../store/presets/PresetData';
import type * as SynthTrackStateModule from '../synthTrackState';

// ── Mod route ids after a reload (synth-store-06, synth-ui-11) ─────────────
// Route ids come from a counter that starts again at 0 on every page load,
// while a restored patch keeps its route ids. The first route added after a
// reload repeated `route-1`, and editing or removing either route changed
// both. A new route's id now always clears every id already in the patch.

interface Page {
  synth: typeof SynthStoreModule.useSynthStore;
  patches: typeof SynthTrackStateModule;
}

/** A fresh page: the synth store and its route counter from scratch. */
async function loadPage(): Promise<Page> {
  vi.resetModules();
  const { useSynthStore } = await import('../store');
  const patches = await import('../synthTrackState');
  return { synth: useSynthStore, patches };
}

function route(id: string): ModRoute {
  return {
    id,
    source: { type: 'lfo', index: 0 },
    target: { source: 'flt1', param: 'cutoff' },
    amount: 0.5,
    polarity: 'unipolar',
    curve: 'linear',
    enabled: true,
  };
}

/** A saved track patch whose routes have these ids. */
function savedPatch(page: Page, ids: string[]) {
  return {
    ...page.patches.defaultSynthTrackState(),
    modRoutes: ids.map(route),
  };
}

const ids = (page: Page) => page.synth.getState().modRoutes.map((r) => r.id);

let page: Page;
beforeEach(async () => {
  page = await loadPage();
});

describe('a mod route added after a reload', () => {
  it("doesn't repeat an id of the restored patch", () => {
    page.patches.setTrackSynthState(
      'lead',
      savedPatch(page, ['route-1', 'route-2']),
    );
    page.patches.showTrackSynthState('lead');

    page.synth.getState().addModRoute();
    expect(ids(page)).toEqual(['route-1', 'route-2', 'route-3']);
  });

  it('clears the highest id in use, wherever the patch came from', () => {
    page.patches.restoreSynthState(savedPatch(page, ['route-7', 'route-2']));
    page.synth.getState().addModRoute();
    expect(ids(page).at(-1)).toBe('route-8');
  });

  it('is unique next to the routes of a preset', () => {
    page.synth.getState().loadPreset('WOBBLE');
    page.synth.getState().addModRoute();
    page.synth.getState().addModRoute();
    expect(new Set(ids(page)).size).toBe(ids(page).length);
  });

  it('never goes back to an id used earlier on the page', () => {
    page.patches.setTrackSynthState('lead', savedPatch(page, ['route-5']));
    page.patches.setTrackSynthState('pad', savedPatch(page, ['route-1']));
    page.patches.showTrackSynthState('lead');
    page.synth.getState().addModRoute();
    expect(ids(page)).toEqual(['route-5', 'route-6']);

    page.patches.showTrackSynthState('pad');
    page.synth.getState().addModRoute();
    expect(ids(page)).toEqual(['route-1', 'route-7']);
  });

  it('edits and removes only itself', () => {
    page.patches.restoreSynthState(savedPatch(page, ['route-1']));
    page.synth.getState().addModRoute();
    const [restored, added] = page.synth.getState().modRoutes;

    page.synth.getState().updateModRoute(added.id, { amount: 0.9 });
    expect(page.synth.getState().modRoutes[0]).toEqual(restored);

    page.synth.getState().removeModRoute(added.id);
    expect(ids(page)).toEqual(['route-1']);
  });
});

// Patches saved before the fix can already hold two routes with one id.
// Restoring one (the synth panel, an engine apply) repairs it: the first
// route keeps its id, a later one gets the next id past the patch's highest.
describe('a restored patch with an id used twice', () => {
  it('gets unique ids, the first route unchanged', () => {
    const saved = savedPatch(page, ['route-1', 'route-1']);
    saved.modRoutes[1] = { ...saved.modRoutes[1], amount: 0.9 };
    page.patches.restoreSynthState(saved);

    const [first, second] = page.synth.getState().modRoutes;
    expect(first).toEqual(saved.modRoutes[0]);
    expect(second).toEqual({ ...saved.modRoutes[1], id: 'route-2' });

    page.synth.getState().addModRoute();
    expect(ids(page)).toEqual(['route-1', 'route-2', 'route-3']);
  });

  it('is repaired the same way on every load', () => {
    const saved = savedPatch(page, ['route-4', 'lfo-a', 'route-4', 'lfo-a']);
    const once = page.patches.normalizeSynthTrackState(saved).modRoutes;
    const again = page.patches.normalizeSynthTrackState(saved).modRoutes;
    expect(once.map((r) => r.id)).toEqual([
      'route-4',
      'lfo-a',
      'route-5',
      'route-6',
    ]);
    expect(again).toEqual(once);
  });

  it('keeps the routes as they are when every id is unique', () => {
    const saved = savedPatch(page, ['route-2', 'route-9']);
    expect(page.patches.normalizeSynthTrackState(saved).modRoutes).toEqual(
      saved.modRoutes,
    );
  });

  it('edits only the route it names once repaired', () => {
    page.patches.restoreSynthState(savedPatch(page, ['route-1', 'route-1']));
    page.synth.getState().updateModRoute('route-2', { amount: 0.1 });
    expect(page.synth.getState().modRoutes.map((r) => r.amount)).toEqual([
      0.5, 0.1,
    ]);
  });
});

// A user preset saved while ids could repeat holds them still. Picking it in
// the preset menu repairs it the way a restored patch is repaired.
describe('a user preset with an id used twice', () => {
  it('loads with unique ids, the first route unchanged', () => {
    const data = JSON.parse(page.synth.getState().exportPreset()) as PresetData;
    data.modRoutes = [route('route-1'), { ...route('route-1'), amount: 0.9 }];
    page.synth.setState({
      userPresets: [{ name: 'Mine', data, isFactory: false }],
    });

    page.synth.getState().loadPreset('Mine');
    expect(page.synth.getState().modRoutes).toEqual([
      route('route-1'),
      { ...route('route-1'), id: 'route-2', amount: 0.9 },
    ]);
  });
});
