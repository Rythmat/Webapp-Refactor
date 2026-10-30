// @vitest-environment jsdom
/**
 * The Inspector (the Globe in the Studio's frame): opening a panel moves
 * focus to its heading, Escape closes the topmost thing open, closing gives
 * focus back to the opener, and its right edge resizes it from the keyboard.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SidePanel } from '@/components/atlas/components/UI/SidePanel';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { AtlasStoreProvider } from '@/components/atlas/state/atlasStore';
import { InspectorView } from './InspectorRegion';
import { INSPECTOR_PX } from './frameGeometry';
import { INSPECTOR_WIDTH_KEY } from './inspectorWidth';
import type { InspectorSlot } from './useInspector';
import { useAtlasZone } from './zoneContext';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

/** A popover over the panel, as the timeline's cluster list is. */
function Popover() {
  const [open, setOpen] = useState(false);
  useEscapeLayer(open, () => setOpen(false));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open popover
      </button>
      {open && <p>Popover</p>}
    </>
  );
}

/** Enlarge, as an event card asks the Inspector for it. */
function EnlargeButton() {
  const zone = useAtlasZone();
  if (zone.kind !== 'inspector') return null;
  return (
    <button type="button" onClick={() => zone.setEnlarged(true)}>
      Enlarge
    </button>
  );
}

function Harness() {
  const [panel, setPanel] = useState<'a' | 'b' | null>(null);
  const close = () => setPanel(null);
  const slot: InspectorSlot | null = panel && {
    panel: 'details',
    title: 'Details',
    key: panel,
    onClose: close,
    node: (
      <SidePanel title={`Panel ${panel.toUpperCase()}`} onClose={close}>
        {panel === 'a' ? (
          // Like an artist link in an event card: it opens other content
          // and unmounts itself.
          <button type="button" onClick={() => setPanel('b')}>
            Go to B
          </button>
        ) : (
          <Popover />
        )}
        <EnlargeButton />
      </SidePanel>
    ),
  };
  return (
    <AtlasStoreProvider>
      <div data-atlas-keep-focus>
        <button type="button" onClick={() => setPanel('a')}>
          Back
        </button>
      </div>
      <button type="button" onClick={() => setPanel('a')}>
        Open
      </button>
      <div style={{ position: 'relative' }}>
        <InspectorView slot={slot} />
      </div>
    </AtlasStoreProvider>
  );
}

/** A click as a keyboard user makes it: focus, then activate. */
const press = (el: HTMLElement) => {
  el.focus();
  fireEvent.click(el);
};

const escape = () => fireEvent.keyDown(window, { key: 'Escape' });

const inspector = () =>
  screen.getByRole('complementary', { name: 'Details', hidden: true });

describe('the Inspector', () => {
  it('moves focus to the heading on open, and Escape returns it to the opener', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    press(opener);
    expect(inspector().id).toBe('atlas-inspector');
    const heading = screen.getByRole('heading', { name: 'Panel A' });
    expect(document.activeElement).toBe(heading);

    escape();
    expect(screen.queryByRole('heading', { name: 'Panel A' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('returns focus to the opener from the Close button', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    press(opener);
    press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('heading', { name: 'Panel A' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('leaves focus on Back and Forward while the path is walked', () => {
    render(<Harness />);
    const back = screen.getByRole('button', { name: 'Back' });
    press(back);
    expect(screen.getByRole('heading', { name: 'Panel A' })).toBeTruthy();
    expect(document.activeElement).toBe(back);
  });

  it('takes no focus when nothing had it (a deep link, a click on the globe)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('heading', { name: 'Panel A' })).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
  });

  it('catches focus on the new heading when the old content took it down', () => {
    render(<Harness />);
    press(screen.getByRole('button', { name: 'Open' }));
    press(screen.getByRole('button', { name: 'Go to B' }));
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Panel B' }),
    );
  });

  it('closes the topmost thing first: a popover, then the panel', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    press(opener);
    press(screen.getByRole('button', { name: 'Go to B' }));
    press(screen.getByRole('button', { name: 'Open popover' }));
    expect(screen.getByText('Popover')).toBeTruthy();

    escape();
    expect(screen.queryByText('Popover')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Panel B' })).toBeTruthy();

    escape();
    expect(screen.queryByRole('heading', { name: 'Panel B' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('resizes from the keyboard through its right edge, and keeps the width', () => {
    render(<Harness />);
    press(screen.getByRole('button', { name: 'Open' }));
    const handle = screen.getByRole('separator', {
      name: 'Resize the side panel',
    });
    // Its first child, so it leads the panel's own content.
    expect(handle.parentElement).toBe(inspector());
    expect(inspector().firstElementChild).toBe(handle);
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuemin')).toBe(String(INSPECTOR_PX.min));

    const start = Number(handle.getAttribute('aria-valuenow'));
    // The handle is on the right edge: Right widens.
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(Number(handle.getAttribute('aria-valuenow'))).toBe(start + 16);
    expect(inspector().style.width).toBe(`${start + 16}px`);
    expect(window.localStorage.getItem(INSPECTOR_WIDTH_KEY)).toBe(
      String(start + 16),
    );

    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle.getAttribute('aria-valuenow')).toBe(String(INSPECTOR_PX.min));
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle.getAttribute('aria-valuenow')).toBe(String(INSPECTOR_PX.min));
  });

  it('grows for Enlarge, and Escape-free content changes go back to its width', () => {
    render(<Harness />);
    press(screen.getByRole('button', { name: 'Open' }));
    press(screen.getByRole('button', { name: 'Enlarge' }));
    expect(inspector().style.width).toBe('min(66vw, 900px)');
    expect(
      screen.queryByRole('separator', { name: 'Resize the side panel' }),
    ).toBeNull();
    press(screen.getByRole('button', { name: 'Go to B' }));
    expect(inspector().style.width).toMatch(/px$/);
  });
});
