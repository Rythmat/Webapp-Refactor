// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GuitarInputStatus } from '@/learn/audio/guitar/types';
import {
  GuitarInputIndicator,
  guitarInputAttention,
} from '../GuitarInputIndicator';
import { fakeHandle } from './fixtures';

afterEach(cleanup);

describe('guitarInputAttention', () => {
  it.each<[GuitarInputStatus, 'audio' | 'midi', string | null]>([
    ['needs-setup', 'audio', 'setup'],
    ['needs-setup', 'midi', 'setup'],
    ['denied', 'audio', 'micTrouble'],
    ['no-device', 'audio', 'micTrouble'],
    ['error', 'audio', 'micTrouble'],
    // A MIDI guitar never asks for the microphone.
    ['denied', 'midi', null],
    ['error', 'midi', null],
    ['idle', 'audio', null],
    ['listening', 'audio', null],
    ['requesting-permission', 'audio', null],
  ])('%s over %s → %s', (status, source, expected) => {
    expect(guitarInputAttention(fakeHandle(status, { source }))).toBe(expected);
  });

  it('no handle, nothing to say', () => {
    expect(guitarInputAttention(null)).toBeNull();
  });
});

describe('GuitarInputIndicator', () => {
  it('renders nothing while the input is fine', () => {
    for (const status of [
      'idle',
      'listening',
      'requesting-permission',
    ] as const) {
      const { container } = render(
        <GuitarInputIndicator
          handle={fakeHandle(status)}
          onOpenSetup={vi.fn()}
        />,
      );
      expect(container).toBeEmptyDOMElement();
      cleanup();
    }
    const { container } = render(
      <GuitarInputIndicator handle={null} onOpenSetup={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('"Set up guitar" opens the setup', () => {
    const onOpenSetup = vi.fn();
    render(
      <GuitarInputIndicator
        handle={fakeHandle('needs-setup')}
        onOpenSetup={onOpenSetup}
        onOpenInputSettings={vi.fn()}
      />,
    );
    // The container's first-run test finds it by this pattern.
    const button = screen.getByRole('button', { name: /set up|guitar input/i });
    expect(button).toHaveAccessibleName('Set up guitar');
    fireEvent.click(button);
    expect(onOpenSetup).toHaveBeenCalledTimes(1);
    expect(onOpenSetup).toHaveBeenCalledWith();
  });

  it('"Mic blocked · Fix" opens Settings at Input, with the one error colour on its icon', () => {
    const onOpenSetup = vi.fn();
    const onOpenInputSettings = vi.fn();
    render(
      <GuitarInputIndicator
        handle={fakeHandle('denied', { error: 'Permission denied' })}
        onOpenSetup={onOpenSetup}
        onOpenInputSettings={onOpenInputSettings}
      />,
    );
    const button = screen.getByRole('button', { name: 'Mic blocked · Fix' });
    expect(button).toHaveAttribute('title', 'Permission denied');
    expect(button.querySelector('svg')!.getAttribute('class')).toMatch(
      /text-red-400/,
    );
    // Colour only on the icon: the words carry it too.
    expect(button.className).not.toMatch(/red/);
    fireEvent.click(button);
    expect(onOpenInputSettings).toHaveBeenCalledTimes(1);
    expect(onOpenSetup).not.toHaveBeenCalled();
  });

  it('without Settings, "Fix" opens the setup at the mic page', () => {
    const onOpenSetup = vi.fn();
    render(
      <GuitarInputIndicator
        handle={fakeHandle('no-device')}
        onOpenSetup={onOpenSetup}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mic blocked · Fix' }));
    expect(onOpenSetup).toHaveBeenCalledWith('mic');
  });
});
