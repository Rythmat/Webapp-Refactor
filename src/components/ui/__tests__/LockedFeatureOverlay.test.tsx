// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileRoutes } from '@/constants/routes';
import { LockedFeatureOverlay } from '../LockedFeatureOverlay';

/**
 * The premium lock (audit prism-ui-23): it used to block only the mouse, so a
 * free user could Tab into the locked controls (Prism's Create among them).
 * The locked content is inert now, and the lock itself is the one keyboard
 * stop, leading to the plans as a click does.
 */

function Where() {
  return <output aria-label="location">{useLocation().pathname}</output>;
}

function renderLock(locked: boolean, label?: string) {
  return render(
    <MemoryRouter initialEntries={['/studio/editor']}>
      <Routes>
        <Route
          path="*"
          element={
            <LockedFeatureOverlay locked={locked} label={label}>
              <button type="button">Create</button>
            </LockedFeatureOverlay>
          }
        />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const create = () => screen.getByText('Create');
const lock = () =>
  screen.getByRole('button', { name: 'Subscribe to unlock content' });

afterEach(cleanup);

describe('LockedFeatureOverlay', () => {
  it('makes the locked content inert', () => {
    renderLock(true);
    const content = create().parentElement;
    expect(content).toHaveAttribute('inert');
    expect(content).toHaveStyle({ pointerEvents: 'none' });
  });

  it('puts the lock in the tab order, opening on focus as on hover', () => {
    renderLock(true);
    expect(lock().tagName).toBe('BUTTON');
    expect(screen.queryByText('Subscribe to unlock content')).toBeNull();
    fireEvent.focus(lock());
    expect(screen.getByText('Subscribe to unlock content')).toBeInTheDocument();
    fireEvent.blur(lock());
    expect(screen.queryByText('Subscribe to unlock content')).toBeNull();
  });

  it('names what it locks, when told, since the content is out of reach', () => {
    renderLock(true, 'Jam Room');
    const named = screen.getByRole('button', {
      name: 'Jam Room: subscribe to unlock',
    });
    // The tooltip keeps its short copy.
    fireEvent.focus(named);
    expect(screen.getByText('Subscribe to unlock content')).toBeInTheDocument();
  });

  it('leads to the plans', () => {
    renderLock(true);
    fireEvent.click(lock());
    expect(screen.getByLabelText('location')).toHaveTextContent(
      ProfileRoutes.plan.definition,
    );
  });

  it('leaves unlocked content alone', () => {
    renderLock(false);
    expect(create().closest('[inert]')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Subscribe to unlock content' }),
    ).toBeNull();
  });
});
