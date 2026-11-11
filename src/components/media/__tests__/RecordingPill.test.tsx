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
    player.isReady = true;
    rerender(<RecordingPill videoId="rlpZmqGS8rc" quickPlay />);
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /^Recording/ })).toHaveProperty(
      'ariaExpanded',
      'false',
    );
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
});
