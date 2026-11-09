// @vitest-environment jsdom
/**
 * The phone's zones: the Inspector's panel is a bottom sheet with buttons for
 * its heights, and the bar under the map (or the cards' strip) rests on it.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
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

function Harness({ journey = true }: { journey?: boolean }) {
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
        bottom={
          journey
            ? { label: 'timeline', maxWidth: 800, node: <p>Timeline</p> }
            : null
        }
        inspector={inspector}
        strip={<p>Cards</p>}
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

  it('shows the cards’ strip when no bar is up, under the sheet’s rule', () => {
    render(<Harness />);
    // A journey's bar has the place.
    expect(screen.queryByText('Cards')).toBeNull();
    cleanup();
    render(<Harness journey={false} />);
    expect(screen.getByText('Cards')).toBeTruthy();
    press(screen.getByRole('button', { name: 'Open' }));
    expect(screen.queryByText('Cards')).toBeNull();
    const collapse = screen.getByRole('button', { name: 'Collapse sheet' });
    press(collapse);
    expect(screen.getByText('Cards')).toBeTruthy();
  });
});
