// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { SidebarLearnGroup } from '@/layouts/DashboardLayout/SidebarLearnGroup';

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <ul>
        <SidebarLearnGroup />
      </ul>
    </MemoryRouter>,
  );
}

// The sub-tabs sit in an aria-hidden accordion until a Learn tab is open, so
// query them with `hidden: true` and read their state from the attributes.
const tabLink = (name: string) =>
  screen.queryByRole('link', { name, hidden: true });

describe('SidebarLearnGroup', () => {
  afterEach(() => {
    cleanup();
    useInstrumentStore.setState({ instrument: 'piano', leftHanded: false });
  });

  it('lists Technique on piano', () => {
    renderAt('/learn?tab=Theory');
    expect(tabLink('Technique')).toHaveAttribute(
      'href',
      '/learn?tab=Technique',
    );
    expect(tabLink('Theory')).toHaveAttribute('aria-current', 'page');
  });

  it('leaves Technique out on guitar', () => {
    useInstrumentStore.setState({ instrument: 'guitar' });
    renderAt('/learn?tab=Theory');
    expect(tabLink('Technique')).toBeNull();
    for (const name of ['Songs', 'Set Lists', 'Genre', 'Theory']) {
      expect(tabLink(name)).not.toBeNull();
    }
  });
});
