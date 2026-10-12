// @vitest-environment jsdom
/**
 * A video costs nothing until someone presses play: no IFrame API script, no
 * iframe, no connection to youtube.com — just the poster. Pressing play loads
 * the API once and builds exactly one player, which then plays.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AtlasVideo } from './AtlasVideo';

const API = 'script[src="https://www.youtube.com/iframe_api"]';

type FakeOptions = {
  videoId: string;
  playerVars: Record<string, unknown>;
  events: {
    onReady: () => void;
    onStateChange: (e: { data: number }) => void;
  };
};

type TestWindow = Window & {
  YT?: unknown;
  onYouTubeIframeAPIReady?: () => void;
};

afterEach(() => {
  cleanup();
  document.head.querySelectorAll(API).forEach((n) => n.remove());
  const w = window as TestWindow;
  delete w.YT;
  delete w.onYouTubeIframeAPIReady;
});

/** Stands in for YT.Player: swaps its element for an iframe, as the API does. */
function installFakeApi() {
  const players: { options: FakeOptions; playVideo: () => void }[] = [];
  class Player {
    iframe = document.createElement('iframe');
    playVideo = vi.fn();
    destroy = () => this.iframe.remove();
    getIframe = () => this.iframe;
    constructor(el: HTMLElement, options: FakeOptions) {
      el.replaceWith(this.iframe);
      players.push({ options, playVideo: this.playVideo });
    }
  }
  (window as TestWindow).YT = { Player };
  return players;
}

describe('AtlasVideo', () => {
  it('shows a poster and loads nothing from YouTube before play', () => {
    const { container } = render(
      <AtlasVideo title="West End Blues" videoId="abc123" />,
    );

    expect(document.querySelector(API)).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(document.querySelector('link[rel="preconnect"]')).toBeNull();

    const poster = container.querySelector('img')!;
    expect(poster.getAttribute('src')).toBe(
      'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    );
    expect(poster.getAttribute('width')).toBe('480');
    expect(poster.getAttribute('height')).toBe('360');
    expect(poster.getAttribute('decoding')).toBe('async');
    expect(
      screen.getByRole('button', { name: 'Play West End Blues' }),
    ).toBeTruthy();
  });

  it('preconnects to YouTube once, on intent to play', () => {
    render(<AtlasVideo title="West End Blues" videoId="abc123" />);
    const play = screen.getByRole('button', { name: 'Play West End Blues' });
    fireEvent.pointerEnter(play);
    fireEvent.focus(play);
    const links = document.querySelectorAll(
      'link[rel="preconnect"][href="https://www.youtube.com"]',
    );
    expect(links).toHaveLength(1);
  });

  it('builds one player on click, plays it, and reports the first play', async () => {
    const onPlay = vi.fn();
    const onCardClick = vi.fn();
    const { container } = render(
      // The card around a video toggles on click; play must not reach it.
      <div onClick={onCardClick}>
        <AtlasVideo title="West End Blues" videoId="abc123" onPlay={onPlay} />
      </div>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Play West End Blues' }),
    );
    expect(onCardClick).not.toHaveBeenCalled();
    expect(document.querySelectorAll(API)).toHaveLength(1);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Play/ })).toBeNull();

    // The API script arrives.
    const players = installFakeApi();
    await act(async () => {
      (window as TestWindow).onYouTubeIframeAPIReady?.();
    });

    expect(players).toHaveLength(1);
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    const [{ options, playVideo }] = players;
    expect(options.videoId).toBe('abc123');
    expect(options.playerVars.autoplay).toBe(1);

    options.events.onReady();
    expect(container.querySelector('iframe')!.title).toBe('West End Blues');
    expect(playVideo).toHaveBeenCalled();

    options.events.onStateChange({ data: 1 });
    options.events.onStateChange({ data: 2 });
    options.events.onStateChange({ data: 1 });
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('goes back to a poster when the video changes', async () => {
    const { container, rerender } = render(
      <AtlasVideo title="West End Blues" videoId="abc123" />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Play West End Blues' }),
    );
    installFakeApi();
    await act(async () => {
      (window as TestWindow).onYouTubeIframeAPIReady?.();
    });
    expect(container.querySelectorAll('iframe')).toHaveLength(1);

    rerender(<AtlasVideo title="Potato Head Blues" videoId="def456" />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Play Potato Head Blues' }),
    ).toBeTruthy();
  });
});
