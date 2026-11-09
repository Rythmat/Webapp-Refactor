// @vitest-environment jsdom
/**
 * Golden DOM for the Arcade's Harmonic Strings. Its maths, tone engine and
 * standing wave now live in shared modules (lib/music/harmonicSeries,
 * audio/harmonics/HarmonicTone, components/harmonics/StandingWave) that the
 * guitar Harmonics activity also uses; these files pin that the game itself
 * did not change when they moved. Never `-u` them for guitar work.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HarmonicStrings from '../HarmonicStrings';

const audio = vi.hoisted(() => {
  const param = () => ({
    value: 0,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    setTargetAtTime: () => {},
    cancelScheduledValues: () => {},
  });
  const node = () => ({
    connect: () => {},
    disconnect: () => {},
    start: () => {},
    stop: () => {},
    gain: param(),
    frequency: param(),
    type: 'sine',
  });
  const ctx = {
    currentTime: 0,
    createOscillator: node,
    createGain: node,
  };
  return { ctx, node };
});

vi.mock('@/audio/engine/AudioBus', () => ({
  getAudioContext: () => audio.ctx,
  createBus: () => ({ ...audio.node(), context: audio.ctx }),
  resumeAudio: () => {},
}));

beforeEach(() => {
  // Freeze the standing wave's animation so the DOM is deterministic.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

function svgOf(container: HTMLElement): string {
  return container.querySelector('svg.block')!.outerHTML;
}

describe('HarmonicStrings golden DOM', () => {
  it.each([1, 3, 7])('harmonic %i', async (n) => {
    const { container } = render(
      <MemoryRouter>
        <HarmonicStrings />
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole('button', { name: String(n) });
    act(() => {
      fireEvent.click(buttons[buttons.length - 1]);
    });
    await expect(svgOf(container)).toMatchFileSnapshot(
      `./__snapshots__/harmonic-${n}.svg.html`,
    );
    await expect(container.innerHTML).toMatchFileSnapshot(
      `./__snapshots__/harmonic-${n}.page.html`,
    );
  });
});
