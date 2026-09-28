// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstrumentSelector } from '@/components/ClassroomLayout/dashboard/InstrumentSelector';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';

// Render the Radix menu inline so its items can be clicked in jsdom.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    ...rest
  }: {
    children: ReactNode;
    'aria-label'?: string;
  }) => <button aria-label={rest['aria-label']}>{children}</button>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    disabled,
    onSelect,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
  }) => (
    <div
      role="menuitem"
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onSelect?.()}
    >
      {children}
    </div>
  ),
}));

describe('InstrumentSelector', () => {
  afterEach(() => {
    cleanup();
    useInstrumentStore.setState({ instrument: 'piano', leftHanded: false });
  });

  it('shows the stored instrument', () => {
    render(<InstrumentSelector />);
    expect(
      screen.getByRole('button', { name: 'Instrument: Piano' }),
    ).toBeInTheDocument();
  });

  it('stores Guitar when picked and reports the change', () => {
    const onChange = vi.fn();
    render(<InstrumentSelector onChange={onChange} />);
    fireEvent.click(screen.getByRole('menuitem', { name: /Guitar/ }));
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
    expect(onChange).toHaveBeenCalledWith('guitar');
  });

  it('lists Bass and Ukulele as coming soon', () => {
    render(<InstrumentSelector />);
    for (const name of ['Bass', 'Ukulele']) {
      const item = screen.getByRole('menuitem', { name: new RegExp(name) });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toHaveTextContent('Coming soon');
      fireEvent.click(item);
    }
    expect(useInstrumentStore.getState().instrument).toBe('piano');
  });
});
