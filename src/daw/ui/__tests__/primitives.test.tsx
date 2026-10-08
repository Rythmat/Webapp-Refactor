// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Undo2 } from 'lucide-react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { Chip } from '../Chip';
import { EmptyState } from '../EmptyState';
import { IconButton } from '../IconButton';
import { Kbd } from '../Kbd';
import { PremiumBadge } from '../PremiumBadge';
import { Readout } from '../Readout';
import { Toggle } from '../Toggle';
import { Tooltip } from '../Tooltip';
import { installDomShims } from './dom';

// ── Actions, chrome and helpers: names, roles, keyboard ─────────────────────

beforeAll(installDomShims);
afterEach(cleanup);

describe('Button', () => {
  it('is a button that never submits a form by accident', () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent)}>
        <Button>Cancel</Button>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('makes the primary action the white pill', () => {
    render(<Button variant="primary">Export</Button>);
    const button = screen.getByRole('button', { name: 'Export' });
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).toHaveClass(
      'rounded-full',
      'bg-daw-primary',
      'text-daw-on-primary',
    );
  });

  it('is 28 px by default, 24 and 32 px in its other sizes', () => {
    render(
      <>
        <Button>md</Button>
        <Button size="sm">sm</Button>
        <Button size="lg">lg</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'md' })).toHaveClass('h-7');
    expect(screen.getByRole('button', { name: 'sm' })).toHaveClass('h-6');
    expect(screen.getByRole('button', { name: 'lg' })).toHaveClass('h-8');
  });

  it('marks danger red and keeps the other variants neutral', () => {
    render(
      <>
        <Button variant="danger">Delete</Button>
        <Button variant="secondary">Keep</Button>
        <Button variant="ghost">Skip</Button>
        <Button variant="quiet">Later</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
      'bg-daw-danger',
    );
    for (const name of ['Keep', 'Skip', 'Later']) {
      const classes = screen.getByRole('button', { name }).className;
      expect(classes, name).not.toMatch(/daw-(danger|record|warning)/);
    }
  });

  it('can render a link with its look', () => {
    render(
      <Button asChild variant="primary">
        <a href="/studio">Back to Studio</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Back to Studio' });
    expect(link).toHaveClass('bg-daw-primary');
    expect(link).not.toHaveAttribute('type');
  });

  it('can be disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('is named by its label, whatever the icon', () => {
    render(<IconButton label="Undo" icon={<Undo2 />} />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('demands that label in its type', () => {
    // @ts-expect-error: an icon button without a label does not compile.
    const unnamed = <IconButton icon={<Undo2 />} />;
    expect(unnamed).toBeTruthy();
  });

  it('keeps the label as its name over a stray aria-label', () => {
    // TypeScript lets hyphenated attributes through, so this compiles.
    render(<IconButton label="Undo" aria-label="Wrong" icon={<Undo2 />} />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('shows the label and shortcut as a tooltip on keyboard focus', () => {
    render(<IconButton label="Undo" shortcut="⌘Z" icon={<Undo2 />} />);
    act(() => screen.getByRole('button', { name: 'Undo' }).focus());
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Undo');
    expect(tip).toHaveTextContent('⌘Z');
  });

  it('is 28 px square by default and 24 px when small', () => {
    render(
      <>
        <IconButton label="Big" icon={<Undo2 />} />
        <IconButton label="Small" size="sm" icon={<Undo2 />} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Big' })).toHaveClass('size-7');
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('size-6');
  });

  it('can leave the tooltip off', () => {
    render(<IconButton label="Close" icon={<Undo2 />} noTooltip />);
    act(() => screen.getByRole('button', { name: 'Close' }).focus());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('Toggle', () => {
  function Loop() {
    const [on, setOn] = useState(false);
    return (
      <Toggle label="Loop" pressed={on} onPressedChange={setOn}>
        Loop
      </Toggle>
    );
  }

  it('reports its state with aria-pressed and flips on activation', () => {
    render(<Loop />);
    const toggle = screen.getByRole('button', { name: 'Loop' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('data-state', 'on');
  });

  it('marks on with white/10, and Mute and Solo are never coloured', () => {
    render(
      <Toggle label="Mute" defaultPressed>
        M
      </Toggle>,
    );
    const mute = screen.getByRole('button', { name: 'Mute' });
    expect(mute).toHaveClass('data-[state=on]:bg-daw-selected');
    expect(mute.className).not.toMatch(/yellow|amber|accent/);
  });

  it('names a toggle by its label even when its face is a letter', () => {
    render(
      <Toggle label="Solo" defaultPressed>
        S
      </Toggle>,
    );
    expect(screen.getByRole('button', { name: 'Solo' })).toHaveTextContent('S');
  });

  it('fills red for record arming', () => {
    render(
      <Toggle label="Arm" tone="record" icon={<Undo2 />} defaultPressed />,
    );
    const arm = screen.getByRole('button', { name: 'Arm' });
    expect(arm).toHaveAttribute('data-tone', 'record');
    expect(arm).toHaveClass('data-[state=on]:bg-daw-danger');
  });

  it('gives an icon-only toggle its label as a tooltip', () => {
    render(<Toggle label="Metronome" icon={<Undo2 />} shortcut="K" />);
    act(() => screen.getByRole('button', { name: 'Metronome' }).focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent('Metronome');
  });
});

describe('Tooltip', () => {
  it('opens on focus with its shortcut and closes on Escape', () => {
    render(
      <Tooltip content="Metronome" shortcut="K">
        <button type="button">Click</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Click' });
    act(() => trigger.focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent('MetronomeK');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('Chip', () => {
  it('is a neutral label by default, with a tone for meaning', () => {
    render(
      <>
        <Chip>4 tracks</Chip>
        <Chip tone="record">Rec</Chip>
      </>,
    );
    expect(screen.getByText('4 tracks')).toHaveAttribute(
      'data-tone',
      'neutral',
    );
    expect(screen.getByText('Rec')).toHaveClass('text-daw-danger-text');
  });

  it('puts a colour in a dot, or fills with it and picks readable ink', () => {
    render(
      <>
        <Chip color="#D2404A">C major</Chip>
        <Chip color="#FFCB30" fill>
          A major
        </Chip>
      </>,
    );
    const dot = screen.getByText('C major').querySelector('[aria-hidden]');
    expect(dot).toHaveStyle({ backgroundColor: '#D2404A' });
    const filled = screen.getByText('A major');
    expect(filled).toHaveStyle({
      backgroundColor: '#FFCB30',
      color: '#101012',
    });
  });

  it('can wrap a button and keep its dot', () => {
    render(
      <Chip asChild color="#D2404A">
        <button type="button">Song</button>
      </Chip>,
    );
    const button = screen.getByRole('button', { name: 'Song' });
    expect(button).toHaveClass('rounded-full');
    expect(button.querySelector('[aria-hidden]')).not.toBeNull();
    // As a control it shows the kit's focus ring, not the browser's outline.
    expect(button).toHaveClass(
      'outline-none',
      'focus-visible:outline-2',
      'focus-visible:outline-daw-focus',
    );
  });

  it('has no focus ring when it is only a label', () => {
    render(<Chip>4 tracks</Chip>);
    expect(screen.getByText('4 tracks')).not.toHaveClass(
      'focus-visible:outline-daw-focus',
    );
  });
});

describe('PremiumBadge (restyled onto Chip, same API)', () => {
  it('reads Premium, with a hidden lock when locked', () => {
    render(
      <>
        <PremiumBadge className="ml-auto" />
        <PremiumBadge locked />
      </>,
    );
    const [open, locked] = screen.getAllByText('Premium');
    expect(open).toHaveClass('ml-auto');
    expect(open.querySelector('svg')).toBeNull();
    const lock = locked.querySelector('svg');
    expect(lock).not.toBeNull();
    expect(lock).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('EmptyState, Readout and Kbd', () => {
  it('gives an empty region a heading, the next step and its actions', () => {
    render(
      <EmptyState
        title="No clips yet"
        description="Record or draw to start."
        actions={<Button variant="primary">Add track</Button>}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'No clips yet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Record or draw to start.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add track' }),
    ).toBeInTheDocument();
  });

  it('renders a readout as its text, in fixed digit cells', () => {
    render(<Readout value="−6.0 dB" data-testid="readout" />);
    const readout = screen.getByTestId('readout');
    expect(readout).toHaveTextContent('−6.0 dB');
    // Digits and separators sit in cells of their own width.
    expect(readout.querySelectorAll('span').length).toBeGreaterThanOrEqual(5);
  });

  it('shows a shortcut as a kbd element', () => {
    render(<Kbd>⌘Z</Kbd>);
    expect(screen.getByText('⌘Z').tagName).toBe('KBD');
  });
});
