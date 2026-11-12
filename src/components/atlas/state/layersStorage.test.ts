// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_LAYERS } from './appReducer';
import { LAYERS_STORAGE_KEY, loadLayers } from './layersStorage';

beforeEach(() => window.localStorage.clear());

const store = (value: unknown) =>
  window.localStorage.setItem(LAYERS_STORAGE_KEY, JSON.stringify(value));

describe('the viewer’s layers', () => {
  it('start with the land in its continents’ colours', () => {
    expect(loadLayers()).toEqual(DEFAULT_LAYERS);
    expect(DEFAULT_LAYERS.landColor).toBe('continent');
  });

  it('keep the land’s colour the viewer chose', () => {
    store({ landColor: 'music', arcs: false });
    expect(loadLayers()).toMatchObject({ landColor: 'music', arcs: false });
  });

  it('keep plain land for whoever had turned country colours off', () => {
    store({ countryColors: false, states: true });
    expect(loadLayers().landColor).toBe('plain');
    store({ countryColors: true });
    expect(loadLayers().landColor).toBe('continent');
  });

  it('ignore a colour they don’t know', () => {
    store({ landColor: 'neon' });
    expect(loadLayers().landColor).toBe('continent');
  });
});
