// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordingPill } from '../RecordingPill';

const player = vi.hoisted(() => ({
  calls: [] as { videoId: string | null | undefined }[],
  isReady: false,
  isPlaying: false,
  play: vi.fn(),
  pause: vi.fn(),
}));

vi.mock('@/hooks/media/useYouTubeIframePlayer', () => ({
  useYouTubeIframePlayer: (opts: { videoId: string | null | undefined }) => {
    player.calls.push(opts);
    return {
      containerRef: { current: null },
      isReady: player.isReady,
      isPlaying: player.isPlaying,
      play: player.play,
      pause: player.pause,
      seekTo: vi.fn(),
    };
  },
}));

const lastVideo = () => player.calls.at(-1)?.videoId;
const panel = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('.aspect-video')!.parentElement!;

beforeEach(() => {
  player.calls = [];
  player.isReady = false;
  player.isPlaying = false;
  player.play.mockClear();
  player.pause.mockClear();
});
afterEach(cleanup);

describe('the collapsed recording', () => {
  it('loads nothing until asked, then stays shut while it plays', () => {
    const { container, rerender } = render(
      <RecordingPill videoId="rlpZmqGS8rc" quickPlay />,
    );
    expect(lastVideo()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play the recording' }));
    // Armed, not opened: the player loads hidden, and plays once ready.
    expect(lastVideo()).toBe('rlpZmqGS8rc');
    expect(panel(container).style.display).toBe('none');
    expect(player.play).not.toHaveBeenCalled();
    // No word on the slide's pill: ▶ and ▾ only.
    expect(container.textContent).toBe('');
    player.isReady = true;
    rerender(<RecordingPill videoId="rlpZmqGS8rc" quickPlay />);
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Show the video' }),
    ).toHaveProperty('ariaExpanded', 'false');
  });

  it('pauses from the pill', () => {
    player.isReady = true;
    player.isPlaying = true;
    render(<RecordingPill videoId="rlpZmqGS8rc" quickPlay />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Pause the recording' }),
    );
    expect(player.pause).toHaveBeenCalledTimes(1);
  });

  it('opens on the video, and Esc shuts only that', () => {
    const { container } = render(<RecordingPill videoId="rlpZmqGS8rc" />);
    // The Set list's pill: no play button of its own.
    expect(
      screen.queryByRole('button', { name: 'Play the recording' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Recording/ }));
    expect(panel(container).style.display).toBe('block');
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    document.removeEventListener('keydown', outside);
    expect(panel(container).style.display).toBe('none');
    expect(outside).not.toHaveBeenCalled();
  });

  it('pauses a solo pill when another solo pill starts, and leaves the rest', () => {
    player.isReady = true;
    render(
      <>
        <RecordingPill videoId="aaaaaaaaaaa" quickPlay solo />
        <RecordingPill videoId="bbbbbbbbbbb" quickPlay />
      </>,
    );
    window.dispatchEvent(
      new CustomEvent('recording-pill:solo', { detail: 'another' }),
    );
    // The solo pill pauses; the one outside the list doesn't hear it.
    expect(player.pause).toHaveBeenCalledTimes(1);
  });

  it('shuts a solo pill’s open video when another solo pill opens or plays', () => {
    render(
      <>
        <RecordingPill videoId="aaaaaaaaaaa" quickPlay solo />
        <RecordingPill videoId="bbbbbbbbbbb" quickPlay solo />
      </>,
    );
    const [first, second] = screen.getAllByRole('button', {
      name: 'Show the video',
    });
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    // Opening the second shuts the first.
    fireEvent.click(second);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(second).toHaveAttribute('aria-expanded', 'true');
    // Playing the first shuts the second.
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Play the recording' })[0],
    );
    expect(second).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the video in the element it is given, in the page’s flow', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    render(<RecordingPill videoId="aaaaaaaaaaa" quickPlay openIn={slot} />);
    const video = slot.querySelector<HTMLElement>('.aspect-video')!;
    expect(video).not.toBeNull();
    // At the slot's width, not floating under the pill.
    expect(video.parentElement!.className).not.toContain('absolute');
    expect(video.parentElement!.style.display).toBe('none');
    fireEvent.click(screen.getByRole('button', { name: 'Show the video' }));
    expect(video.parentElement!.style.display).toBe('block');
    slot.remove();
  });

  it('with videoWithPlay, has no ▾: play opens the video, pause shuts it', () => {
    const { container, rerender } = render(
      <RecordingPill videoId="aaaaaaaaaaa" videoWithPlay />,
    );
    expect(screen.queryByRole('button', { name: 'Show the video' })).toBeNull();
    const play = screen.getByRole('button', { name: 'Play the recording' });
    fireEvent.click(play);
    expect(play).toHaveAttribute('aria-expanded', 'true');
    expect(panel(container).style.display).toBe('block');
    player.isPlaying = true;
    rerender(<RecordingPill videoId="aaaaaaaaaaa" videoWithPlay />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Pause the recording' }),
    );
    expect(player.pause).toHaveBeenCalled();
    expect(panel(container).style.display).toBe('none');
  });
});
