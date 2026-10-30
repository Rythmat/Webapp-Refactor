// @vitest-environment jsdom
/**
 * The Legend card: folded until opened, the viewer's choice remembered, and
 * an old link to the legend panel opening it instead.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useLegacyLegendLink } from '@/components/atlas/layout/useLegacyLegendLink';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { AtlasStoreProvider } from '@/components/atlas/state/atlasStore';
import { CARDS_STORAGE_KEY } from '@/components/atlas/state/cardsStorage';
import { LegendCard } from './LegendCard';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

function Legacy() {
  useLegacyLegendLink();
  return null;
}

function setup(path = '/globe') {
  const where = { search: '' };
  const Where = () => {
    where.search = useLocation().search;
    return null;
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <AtlasStoreProvider>
        <AtlasNavigationProvider>
          <LegendCard order={0} />
          <Legacy />
          <Where />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { where };
}

const fold = () => screen.getByRole('button', { name: 'Legend' });

describe('the Legend card', () => {
  it('starts folded to its title, and opens on it', () => {
    setup();
    expect(fold()).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('[data-legend-entry]')).toBeNull();
    act(() => fold().click());
    expect(fold()).toHaveAttribute('aria-expanded', 'true');
    // The world: its places and the links between regions.
    for (const id of ['countries', 'cities', 'links-world', 'link-count']) {
      expect(
        document.querySelector(`[data-legend-entry="${id}"]`),
      ).not.toBeNull();
    }
  });

  it('stays as the viewer left it', () => {
    setup();
    act(() => fold().click());
    expect(
      JSON.parse(window.localStorage.getItem(CARDS_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({ legendOpen: true });
    cleanup();
    setup();
    expect(fold()).toHaveAttribute('aria-expanded', 'true');
  });

  it('explains a place’s links where it came from and went', () => {
    setup('/globe?place=city:london');
    act(() => fold().click());
    expect(screen.getByText('Came from')).toBeTruthy();
    expect(screen.getByText('Went to')).toBeTruthy();
    expect(screen.getByText('One influence')).toBeTruthy();
  });

  it('opens from an old link to the legend panel, and drops the word', () => {
    const { where } = setup('/globe?panel=legend&place=city:london');
    expect(fold()).toHaveAttribute('aria-expanded', 'true');
    expect(where.search).toBe('?place=city%3Alondon');
  });
});
