// @vitest-environment jsdom
/**
 * The phone's zones: the Inspector's panel is a bottom sheet with buttons for
 * its heights, and the bar under the map and the map's credit rest on it.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { SidePanel } from '@/components/atlas/components/UI/SidePanel';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { PhoneZones } from './AtlasZones';
import type { InspectorSlot } from './useInspector';

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

function Harness({ credit = null }: { credit?: ReactNode }) {
  const [panel, setPanel] = useState<'a' | 'b' | null>(null);
  const close = () => setPanel(null);
  const inspector: InspectorSlot | null = panel && {
    panel: 'details',
    title: 'Details',
    key: panel,
    onClose: close,
    node: (
      <SidePanel title={`Panel ${panel.toUpperCase()}`} onClose={close}>
        {panel === 'a' ? (
          <button type="button" onClick={() => setPanel('b')}>
            Go to B
          </button>
        ) : (
          <Popover />
        )}
      </SidePanel>
    ),
  };
  return (
    <>
      <button type="button" onClick={() => setPanel('a')}>
        Open
      </button>
      <PhoneZones
        bottom={{ label: 'timeline', maxWidth: 800, node: <p>Timeline</p> }}
        credit={credit}
        inspector={inspector}
      />
    </>
  );
}

/** A click as a keyboard user makes it: focus, then activate. */
const press = (el: HTMLElement) => {
  el.focus();
  fireEvent.click(el);
};

const escape = () => fireEvent.keyDown(window, { key: 'Escape' });

describe('the phone bottom sheet', () => {
  it('opens at half, steps with its buttons, and moves the bar aside above peek', () => {
    render(<Harness />);
    expect(screen.getByText('Timeline')).toBeTruthy();
    press(screen.getByRole('button', { name: 'Open' }));

    const sheet = screen.getByRole('region', { name: 'Details' });
    expect(sheet.dataset.snap).toBe('half');
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Panel A' }),
    );
    // Above peek the timeline steps aside.
    expect(screen.queryByText('Timeline')).toBeNull();

    const expand = screen.getByRole('button', { name: 'Expand sheet' });
    const collapse = screen.getByRole('button', { name: 'Collapse sheet' });
    press(expand);
    expect(sheet.dataset.snap).toBe('full');
    expect((expand as HTMLButtonElement).disabled).toBe(true);

    press(collapse);
    press(collapse);
    expect(sheet.dataset.snap).toBe('peek');
    expect((collapse as HTMLButtonElement).disabled).toBe(true);
    // At peek it rests on the sheet again.
    expect(screen.getByText('Timeline')).toBeTruthy();
  });

  it('keeps the map credit in view until a full sheet covers the map', () => {
    render(<Harness credit={<p>Map credit</p>} />);
    const credit = () => screen.queryByText('Map credit');
    // Above the timeline, in the same stack, so the bar never covers it.
    const stack = credit()!.closest(
      '[data-atlas-zone-item="map-credit"]',
    )!.parentElement!;
    expect(stack.textContent).toContain('Timeline');
    expect(stack.style.bottom).toBe('8px');

    press(screen.getByRole('button', { name: 'Open' }));
    // At half the bar steps aside; the credit stays, on the sheet.
    expect(screen.queryByText('Timeline')).toBeNull();
    expect(credit()).toBeTruthy();
    press(screen.getByRole('button', { name: 'Expand sheet' }));
    expect(credit()).toBeNull();
    press(screen.getByRole('button', { name: 'Collapse sheet' }));
    expect(credit()).toBeTruthy();
  });

  it('is non-modal and closes on Escape', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    press(opener);
    const sheet = screen.getByRole('region', { name: 'Details' });
    expect(sheet.getAttribute('aria-modal')).toBeNull();
    act(() => escape());
    expect(screen.queryByRole('region', { name: 'Details' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
