// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ATLAS_FOCUS,
  AtlasChip,
  AtlasEyebrow,
  AtlasIconButton,
  AtlasPanel,
  AtlasPanelBody,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { FOCUS_RING } from '@/daw/ui/styles';

afterEach(cleanup);

describe('AtlasPanel', () => {
  it('is named by its title, with its actions, header and body', () => {
    render(
      <AtlasPanel
        actions={
          <AtlasIconButton aria-label="Close" onClick={() => {}}>
            x
          </AtlasIconButton>
        }
        eyebrow="Place"
        header={<p>Birthplace of jazz</p>}
        subtitle="US"
        title="New Orleans"
      >
        <AtlasPanelBody>21 events</AtlasPanelBody>
      </AtlasPanel>,
    );
    const panel = screen.getByRole('region', { name: 'New Orleans' });
    expect(panel.tagName).toBe('SECTION');
    expect(
      screen.getByRole('heading', { level: 3, name: 'New Orleans' }),
    ).toBeTruthy();
    expect(screen.getByText('US')).toBeTruthy();
    expect(screen.getByText('Place')).toBeTruthy();
    expect(screen.getByText('Birthplace of jazz')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.getByText('21 events')).toBeTruthy();
  });

  it('prefers an explicit label and draws no header without one', () => {
    const { container } = render(
      <AtlasPanel aria-label="Mind map" as="aside">
        body
      </AtlasPanel>,
    );
    expect(
      screen.getByRole('complementary', { name: 'Mind map' }),
    ).toBeTruthy();
    expect(container.querySelector('header')).toBeNull();
  });
});

describe('AtlasIconButton', () => {
  it('uses its accessible name as its tooltip unless given one', () => {
    render(
      <>
        <AtlasIconButton aria-label="Back">‹</AtlasIconButton>
        <AtlasIconButton aria-label="Enlarge" title="Make it bigger">
          +
        </AtlasIconButton>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Back' }).title).toBe('Back');
    expect(screen.getByRole('button', { name: 'Enlarge' }).title).toBe(
      'Make it bigger',
    );
  });

  it('is a plain button, so it never submits a form', () => {
    render(<AtlasIconButton aria-label="Close">x</AtlasIconButton>);
    expect(
      screen.getByRole('button', { name: 'Close' }).getAttribute('type'),
    ).toBe('button');
  });
});

describe('AtlasPillButton', () => {
  it('clicks, and not while disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <AtlasPillButton onClick={onClick}>Copy link</AtlasPillButton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    rerender(
      <AtlasPillButton disabled onClick={onClick}>
        Copy link
      </AtlasPillButton>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('lets a caller override its surface', () => {
    render(<AtlasPillButton className="bg-atlas-panel">Spin</AtlasPillButton>);
    const button = screen.getByRole('button', { name: 'Spin' });
    expect(button.className).toContain('bg-atlas-panel');
    expect(button.className).not.toContain('bg-atlas-pill');
  });

  it('wears the Studio’s focus outline', () => {
    render(<AtlasPillButton>Share</AtlasPillButton>);
    expect(screen.getByRole('button', { name: 'Share' }).className).toContain(
      FOCUS_RING,
    );
    expect(ATLAS_FOCUS).toBe(FOCUS_RING);
  });
});

describe('AtlasChip', () => {
  it('is a button only when it does something', () => {
    const onClick = vi.fn();
    render(
      <>
        <AtlasChip>Funk</AtlasChip>
        <AtlasChip onClick={onClick}>Jazz</AtlasChip>
      </>,
    );
    expect(screen.queryByRole('button', { name: 'Funk' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Jazz' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('AtlasEyebrow', () => {
  it('can be a heading, with a decorative dot', () => {
    const { container } = render(
      <AtlasEyebrow as="h4" dot="red">
        Artists · 12
      </AtlasEyebrow>,
    );
    expect(
      screen.getByRole('heading', { level: 4, name: 'Artists · 12' }),
    ).toBeTruthy();
    expect(container.querySelector('[aria-hidden]')).not.toBeNull();
  });
});
