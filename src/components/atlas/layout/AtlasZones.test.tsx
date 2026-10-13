// @vitest-environment jsdom
/**
 * The Globe's zones: opening a panel moves focus to its heading, Escape closes
 * the topmost thing open, closing gives focus back to the opener, and on a
 * phone the panel is a bottom sheet with buttons for its heights.
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
import { DesktopZones, PhoneZones, type LeftPanelSlot } from './AtlasZones';

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

function Harness({
  phone = false,
  credit = null,
}: {
  phone?: boolean;
  credit?: ReactNode;
}) {
  const [panel, setPanel] = useState<'a' | 'b' | null>(null);
  const close = () => setPanel(null);
  const left: LeftPanelSlot | null = panel && {
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
      </SidePanel>
    ),
  };
  const Zones = phone ? PhoneZones : DesktopZones;
  return (
    <>
      <div data-atlas-keep-focus>
        <button type="button" onClick={() => setPanel('a')}>
          Back
        </button>
      </div>
      <button type="button" onClick={() => setPanel('a')}>
        Open
      </button>
      <Zones
        bottom={{ label: 'timeline', maxWidth: 800, node: <p>Timeline</p> }}
        controls={null}
        credit={credit}
        left={left}
        right={null}
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

describe('the left panel zone', () => {
  it('moves focus to the heading on open, and Escape returns it to the opener', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    press(opener);
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

  it('leaves focus on Back and Forward while the trail is walked', () => {
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

  it('gives the map credit its own place, apart from the bottom bar', () => {
    render(<Harness credit={<p>Map credit</p>} />);
    const zone = screen
      .getByText('Map credit')
      .closest('[data-atlas-zone-item="map-credit"]');
    expect(zone).toBeTruthy();
    expect(zone!.parentElement!.textContent).not.toContain('Timeline');
  });

  it('shows no credit when the map has nothing to credit', () => {
    render(<Harness />);
    expect(
      document.querySelector('[data-atlas-zone-item="map-credit"]'),
    ).toBeNull();
  });

  it('collapses the bottom bar to a handle and back', () => {
    render(<Harness />);
    press(screen.getByRole('button', { name: 'Hide the timeline' }));
    expect(screen.queryByText('Timeline')).toBeNull();
    press(screen.getByRole('button', { name: 'Show timeline' }));
    expect(screen.getByText('Timeline')).toBeTruthy();
  });
});

describe('the phone bottom sheet', () => {
  it('opens at half, steps with its buttons, and moves the bar aside above peek', () => {
    render(<Harness phone />);
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
    render(<Harness phone credit={<p>Map credit</p>} />);
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
    render(<Harness phone />);
    const opener = screen.getByRole('button', { name: 'Open' });
    press(opener);
    const sheet = screen.getByRole('region', { name: 'Details' });
    expect(sheet.getAttribute('aria-modal')).toBeNull();
    act(() => escape());
    expect(screen.queryByRole('region', { name: 'Details' })).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
