// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CoverTile,
  DisplayHeading,
  HeroArt,
  microLabel,
  RainbowWriteIn,
  SectionCard,
  UnderlineTabs,
} from '../index';

afterEach(cleanup);

describe('microLabel', () => {
  it('joins the parts it is given, dropping empty ones', () => {
    expect(microLabel('Featured', 'Multiplayer')).toBe(
      'Featured — Multiplayer',
    );
    expect(microLabel('Skill', false, null, 'Free')).toBe('Skill — Free');
  });
});

describe('DisplayHeading', () => {
  it('keeps its grey line even while empty', () => {
    render(<DisplayHeading title="Arcade" sub="" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Arcade' }),
    ).toBeInTheDocument();
    expect(document.querySelector('header p')).not.toBeNull();
  });

  it('is a second-level heading for a section', () => {
    render(<DisplayHeading size="section" title="Rhythm" />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Rhythm' }),
    ).toBeInTheDocument();
  });
});

describe('CoverTile', () => {
  it('is one button, named, with its words under the cover', () => {
    const select = vi.fn();
    render(
      <CoverTile
        title="Chroma"
        eyebrow="Ear Training — Free"
        sub="Color-match the pitch."
        ariaLabel="Play Chroma"
        art={<span data-testid="art" />}
        onSelect={select}
      />,
    );
    const button = screen.getByRole('button', { name: 'Play Chroma' });
    expect(button).toHaveAttribute('data-cover-tile', 'portrait');
    // The reference's card: the words inside it, at its foot, and its rim
    // lit on hover (no play disc).
    const words = button.querySelector('[data-cover-words]');
    expect(words).toHaveTextContent('Ear Training — Free');
    expect(words).toHaveTextContent('Chroma');
    expect(button.querySelector('[data-spectrum-rim="hover"]')).not.toBeNull();
    expect(button.querySelector('svg.lucide-play')).toBeNull();
    fireEvent.click(button);
    expect(select).toHaveBeenCalled();
  });

  it('lays a tray card out as a row', () => {
    render(
      <CoverTile
        layout="tray"
        title="Echo"
        ariaLabel="Play Echo"
        art={<span />}
      />,
    );
    expect(screen.getByRole('button', { name: 'Play Echo' })).toHaveAttribute(
      'data-cover-tile',
      'tray',
    );
  });
});

describe('HeroArt', () => {
  it('has one button, its visible words its name', () => {
    const play = vi.fn();
    render(
      <HeroArt
        ariaLabel="Featured: Jam Room"
        eyebrow="Featured — Multiplayer"
        title="Jam Room"
        blurb="Trade fours."
        art={<span />}
        cta={{ label: 'Play Jam Room', onClick: play }}
      />,
    );
    const region = screen.getByRole('region', { name: 'Featured: Jam Room' });
    expect(region.querySelectorAll('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Play Jam Room' }));
    expect(play).toHaveBeenCalledTimes(1);
    // A click anywhere on the card plays it too, once.
    fireEvent.click(region);
    expect(play).toHaveBeenCalledTimes(2);
    // Lit from under its bottom edge.
    expect(
      region.querySelector('[data-spectrum-rim="on"][data-edge="bottom"]'),
    ).not.toBeNull();
  });
});

describe('RainbowWriteIn', () => {
  it('writes its words in, and they are its words', () => {
    render(<RainbowWriteIn text="Arcade" />);
    expect(document.querySelector('[data-write-in]')).toHaveTextContent(
      'Arcade',
    );
  });
});

describe('DisplayHeading', () => {
  it("writes a page's title in, still named by its words", () => {
    render(<DisplayHeading title="Rhythm" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Rhythm' });
    expect(heading.querySelector('[data-write-in]')).not.toBeNull();
  });
});

describe('SectionCard', () => {
  it('opens from its chevron, named by its title', () => {
    const open = vi.fn();
    render(
      <SectionCard title="Timer" sub="40 min" onOpen={open}>
        <span>chips</span>
      </SectionCard>,
    );
    expect(screen.getByRole('region', { name: 'Timer' })).toHaveTextContent(
      '40 min',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Timer' }));
    expect(open).toHaveBeenCalled();
  });
});

describe('UnderlineTabs', () => {
  it('marks the current tab the way the Studio does', () => {
    render(
      <MemoryRouter>
        <UnderlineTabs
          label="Arcade categories"
          activeKey="skill"
          items={[
            { key: '', label: 'All', to: '/arcade' },
            { key: 'skill', label: 'Skill', to: '?tab=Skill' },
          ]}
        />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Arcade categories' });
    expect(nav).toBeInTheDocument();
    const skill = screen.getByRole('link', { name: 'Skill' });
    expect(skill).toHaveAttribute('aria-current', 'page');
    // White/10 selected, plus the 2px underline (studio-audit decision).
    expect(skill.className).toMatch(/bg-daw-selected/);
    expect(skill.className).toMatch(/after:bg-daw-text/);
    expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
