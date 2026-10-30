// @vitest-environment jsdom
/**
 * The side rail, as the Studio's: each icon opens its panel in the Inspector
 * (the URL's `panel`), the open one is pressed, and a click on it closes the
 * Inspector. Panels that do not apply are disabled or absent.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { InspectorProvider } from '@/components/atlas/layout/useInspector';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { AtlasStoreProvider } from '@/components/atlas/state/atlasStore';
import { SideRail } from './SideRail';

afterEach(cleanup);

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
          <InspectorProvider>
            <SideRail />
          </InspectorProvider>
          <Where />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return where;
}

const button = (name: string) => screen.getByRole('button', { name });

describe('the side rail', () => {
  it('opens a panel in the Inspector, and closes it on its own icon', () => {
    const where = setup();
    const layers = button('Layers');
    expect(layers).toHaveAttribute('aria-pressed', 'false');
    expect(layers).toHaveAttribute('aria-controls', 'atlas-inspector');

    fireEvent.click(layers);
    expect(where.search).toBe('?panel=layers');
    expect(button('Layers')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button('Layers'));
    expect(where.search).toBe('?panel=none');
    expect(button('Layers')).toHaveAttribute('aria-pressed', 'false');
  });

  it('has no details to show until there is a stop', () => {
    setup();
    expect(button('Details')).toBeDisabled();
  });

  it('keeps the map’s own panels to the map', () => {
    setup('/globe?view=timeline');
    expect(button('Layers')).toBeDisabled();
  });

  it('leaves the legend to its card over the map', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Legend' })).toBeNull();
  });

  it('shows the mind map only while a lesson has it open', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Mind map' })).toBeNull();
    cleanup();
    setup('/globe?mindmap=1');
    expect(button('Mind map')).toHaveAttribute('aria-pressed', 'true');
  });
});
