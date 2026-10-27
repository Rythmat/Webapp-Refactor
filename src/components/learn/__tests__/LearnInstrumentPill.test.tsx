// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { LearnInstrumentPill } from '@/components/learn/LearnInstrumentPill';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <output data-testid="location">{pathname}</output>;
};

const renderPill = () =>
  render(
    <MemoryRouter initialEntries={['/learn/keyboard']}>
      <LearnInstrumentPill />
      <LocationProbe />
    </MemoryRouter>,
  );

const toggle = () => screen.getByRole('button', { name: /^Instrument:/ });
/** The names' group, hidden from assistive tech while the bar is closed. */
const names = () => screen.getByTestId('learn-instrument-names');

describe('LearnInstrumentPill', () => {
  afterEach(() => {
    cleanup();
    useInstrumentStore.setState({ instrument: 'piano', leftHanded: false });
  });

  it('is the instrument’s name until clicked, then shows the others', () => {
    renderPill();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().textContent).toBe('Keyboard');
    expect(names().getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(names().getAttribute('aria-hidden')).toBeNull();
    expect(names().textContent).toBe('GuitarBassUkuleleDrums');
  });

  it('switches instrument, opening its page, and closes', () => {
    renderPill();
    fireEvent.click(toggle());
    fireEvent.click(screen.getByRole('button', { name: 'Guitar' }));
    expect(screen.getByTestId('location').textContent).toBe('/learn/guitar');
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().textContent).toBe('Guitar');
    fireEvent.click(toggle());
    expect(names().textContent).toBe('KeyboardBassUkuleleDrums');
  });

  it('closes on Escape', () => {
    renderPill();
    fireEvent.click(toggle());
    fireEvent.keyDown(toggle(), { key: 'Escape' });
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('can’t choose an instrument without lessons yet', () => {
    renderPill();
    fireEvent.click(toggle());
    for (const name of ['Ukulele', 'Drums']) {
      const item = screen.getByRole('button', {
        name: `${name}, coming soon`,
      }) as HTMLButtonElement;
      expect(item.disabled).toBe(true);
    }
  });
});
