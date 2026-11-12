import { create } from 'zustand';
import { getLocalStoreUserKey } from '@/lib/local-store/userScope';
import { markPlayed } from '../libraryLocalMeta';
import { sourceKey, type PlayItem } from '../libraryTypes';

// ── The app's player (owner, 2026-11-11) ───────────────────────────────────
// Samply's bottom player, in the one bar at the foot of the page (the
// Recent activity bar, ActivityPlayBar). A queue of Library items, played
// by one <audio> element that lives outside React, so the music carries on
// from page to page; each item's audio is rendered on this device the first
// time (preview/renderPreview, loaded on demand: the Studio's audio code
// stays out of the app's first bundle) and kept there.

export type RepeatMode = 'off' | 'all' | 'one';
export type PlayerStatus =
  | 'idle'
  | 'preparing'
  | 'paused'
  | 'playing'
  | 'error';

export interface PlayerState {
  queue: PlayItem[];
  /** The item playing or ready, -1 for none. */
  index: number;
  status: PlayerStatus;
  /** How far the current item's render is (0..1), while preparing. */
  progress: number | null;
  error: string | null;
  position: number;
  duration: number;
  peaks: number[] | null;
  repeat: RepeatMode;
  volume: number;
  muted: boolean;
  queueOpen: boolean;
  /** The signed-in user's token, kept here by PlayerBridge. */
  token: string | null;
}

const initial: PlayerState = {
  queue: [],
  index: -1,
  status: 'idle',
  progress: null,
  error: null,
  position: 0,
  duration: 0,
  peaks: null,
  repeat: 'off',
  volume: 1,
  muted: false,
  queueOpen: false,
  token: null,
};

export const usePlayer = create<PlayerState>(() => initial);

const set = (patch: Partial<PlayerState>) => usePlayer.setState(patch);
const get = () => usePlayer.getState();

export function currentItem(state: PlayerState = get()): PlayItem | null {
  return state.queue[state.index] ?? null;
}

/** Whether the bar shows the player: something is in it. */
export function playerActive(state: PlayerState = get()): boolean {
  return state.index >= 0 && state.queue.length > 0;
}

// ── The element ─────────────────────────────────────────────────────────────

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let preparing: AbortController | null = null;
let prefetching: AbortController | null = null;
/** Bumped by every load: a render that ends after another began is dropped. */
let loadSeq = 0;

function element(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('timeupdate', () => {
    set({ position: audio!.currentTime });
  });
  audio.addEventListener('durationchange', () => {
    if (Number.isFinite(audio!.duration)) set({ duration: audio!.duration });
  });
  audio.addEventListener('play', () => set({ status: 'playing' }));
  audio.addEventListener('pause', () => {
    if (get().status === 'playing') set({ status: 'paused' });
  });
  audio.addEventListener('ended', onEnded);
  return audio;
}

function userKey(): string {
  return getLocalStoreUserKey() ?? 'anon';
}

function releaseUrl(): void {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
}

function describe(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'This project couldn’t be played.';
}

async function load(index: number, autoplay: boolean): Promise<void> {
  const item = get().queue[index];
  if (!item) return;
  const seq = ++loadSeq;
  preparing?.abort();
  prefetching?.abort();
  const controller = new AbortController();
  preparing = controller;
  const el = element();
  el.pause();
  releaseUrl();
  el.removeAttribute('src');
  set({
    index,
    status: 'preparing',
    progress: null,
    error: null,
    position: 0,
    duration: 0,
    peaks: null,
  });
  updateMediaSession(item);
  try {
    const { preparePreview } = await import('../preview/renderPreview');
    const prepared = await preparePreview(item, {
      token: get().token,
      userKey: userKey(),
      signal: controller.signal,
      onProgress: (fraction) => {
        if (seq === loadSeq) set({ progress: fraction });
      },
    });
    if (seq !== loadSeq) return;
    objectUrl = URL.createObjectURL(prepared.blob);
    el.src = objectUrl;
    el.volume = get().volume;
    el.muted = get().muted;
    // The version it turned out to be, for the queue's next look-up.
    const queue = get().queue.map((q, i) =>
      i === index ? { ...q, version: prepared.version } : q,
    );
    set({
      queue,
      status: 'paused',
      progress: null,
      duration: prepared.duration,
      peaks: prepared.peaks,
    });
    markPlayed(sourceKey(item.source));
    if (autoplay) await playElement();
    prefetchNext();
  } catch (err) {
    if (seq !== loadSeq) return;
    if (err instanceof DOMException && err.name === 'AbortError') return;
    console.warn('[player] Could not prepare', item.title, err);
    set({ status: 'error', progress: null, error: describe(err) });
  } finally {
    if (preparing === controller) preparing = null;
  }
}

async function playElement(): Promise<void> {
  try {
    await element().play();
  } catch {
    // The browser wants a tap first (a long render outlived the click):
    // the bar's Play is there.
    set({ status: 'paused' });
  }
}

/** Render the next item in the background, so it starts at once. */
function prefetchNext(): void {
  const { queue, index, repeat } = get();
  const next = queue[index + 1] ?? (repeat === 'all' ? queue[0] : undefined);
  if (!next || next.key === queue[index]?.key) return;
  const controller = new AbortController();
  prefetching = controller;
  void import('../preview/renderPreview')
    .then(({ preparePreview }) =>
      preparePreview(next, {
        token: get().token,
        userKey: userKey(),
        signal: controller.signal,
      }),
    )
    .catch(() => {});
}

function onEnded(): void {
  const { repeat, index, queue } = get();
  if (repeat === 'one') {
    element().currentTime = 0;
    void playElement();
    return;
  }
  if (index + 1 < queue.length) {
    void load(index + 1, true);
  } else if (repeat === 'all' && queue.length > 0) {
    void load(0, true);
  } else {
    element().currentTime = 0;
    set({ status: 'paused', position: 0 });
  }
}

// ── Media Session: the lock screen's and the keyboard's media keys ──────────

function updateMediaSession(item: PlayItem): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.context === item.title ? 'Music Atlas' : item.context,
      album: item.context,
    });
    navigator.mediaSession.setActionHandler('play', () => playerActions.play());
    navigator.mediaSession.setActionHandler('pause', () =>
      playerActions.pause(),
    );
    navigator.mediaSession.setActionHandler('previoustrack', () =>
      playerActions.previous(),
    );
    navigator.mediaSession.setActionHandler('nexttrack', () =>
      playerActions.next(),
    );
  } catch {
    // Media Session is a nicety.
  }
}

// ── What the pages and the bar do ───────────────────────────────────────────

export const playerActions = {
  /** Play `items` from `start`, replacing the queue. */
  playItems(items: readonly PlayItem[], start = 0): void {
    if (items.length === 0) return;
    set({ queue: [...items] });
    void load(Math.min(Math.max(0, start), items.length - 1), true);
  },

  /** Play one item now. The one already playing toggles. */
  playItem(item: PlayItem): void {
    const current = currentItem();
    if (current?.key === item.key && get().status !== 'error') {
      playerActions.toggle();
      return;
    }
    playerActions.playItems([item]);
  },

  /** Put it at the end of the queue (playing it when nothing is). */
  addToQueue(item: PlayItem): void {
    const { queue } = get();
    if (queue.some((q) => q.key === item.key)) return;
    if (!playerActive()) {
      playerActions.playItems([item]);
      return;
    }
    set({ queue: [...queue, item] });
  },

  playAt(index: number): void {
    if (get().queue[index]) void load(index, true);
  },

  play(): void {
    const { status, index } = get();
    if (status === 'error' && index >= 0) {
      void load(index, true);
      return;
    }
    if (status === 'paused') void playElement();
  },

  /** Pause; a render under way stops too (it holds Tone's context, which
   *  the Studio is about to want), the next item's included. */
  pause(): void {
    prefetching?.abort();
    if (get().status === 'preparing') {
      preparing?.abort();
      ++loadSeq;
      set({ status: 'paused', progress: null });
      return;
    }
    audio?.pause();
  },

  toggle(): void {
    const { status, index } = get();
    if (status === 'playing') playerActions.pause();
    else if (status === 'preparing') playerActions.pause();
    else if (!objectUrl && index >= 0) void load(index, true);
    else playerActions.play();
  },

  next(): void {
    const { index, queue, repeat } = get();
    if (index + 1 < queue.length) void load(index + 1, true);
    else if (repeat === 'all' && queue.length > 0) void load(0, true);
  },

  /** Back to the start, or to the one before within its first 3 seconds. */
  previous(): void {
    const { index, position } = get();
    if (position > 3 || index <= 0) {
      playerActions.seek(0);
      return;
    }
    void load(index - 1, true);
  },

  seek(seconds: number): void {
    if (!audio || !objectUrl) return;
    const end = Number.isFinite(audio.duration)
      ? audio.duration
      : get().duration;
    audio.currentTime = Math.max(0, Math.min(seconds, end || 0));
    set({ position: audio.currentTime });
  },

  restart(): void {
    playerActions.seek(0);
    playerActions.play();
  },

  cycleRepeat(): void {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const { repeat } = get();
    set({ repeat: order[(order.indexOf(repeat) + 1) % order.length] });
  },

  setVolume(volume: number): void {
    const v = Math.max(0, Math.min(1, volume));
    if (audio) audio.volume = v;
    set({ volume: v, muted: v === 0 ? get().muted : false });
    if (audio && v > 0) audio.muted = false;
  },

  toggleMute(): void {
    const muted = !get().muted;
    if (audio) audio.muted = muted;
    set({ muted });
  },

  /** Take one out of the queue; taking the playing one plays the next. */
  removeAt(i: number): void {
    const { queue, index, status } = get();
    if (!queue[i]) return;
    const rest = queue.filter((_, n) => n !== i);
    if (i === index) {
      if (rest.length === 0) {
        playerActions.stop();
        return;
      }
      set({ queue: rest });
      void load(Math.min(i, rest.length - 1), status === 'playing');
      return;
    }
    set({ queue: rest, index: i < index ? index - 1 : index });
  },

  /** Clear what's coming up; the one playing stays. */
  clearUpNext(): void {
    const { queue, index } = get();
    const current = queue[index];
    set(current ? { queue: [current], index: 0 } : { queue: [], index: -1 });
  },

  /** Stop and empty the player: the bar goes back to Recent activity. */
  stop(): void {
    ++loadSeq;
    preparing?.abort();
    prefetching?.abort();
    audio?.pause();
    audio?.removeAttribute('src');
    releaseUrl();
    set({
      ...initial,
      repeat: get().repeat,
      volume: get().volume,
      muted: get().muted,
      token: get().token,
    });
  },

  setQueueOpen(open: boolean): void {
    set({ queueOpen: open });
  },

  setToken(token: string | null): void {
    if (token !== get().token) set({ token });
  },

  /** Forget an item everywhere (its project was deleted). */
  forget(sourceKeyToDrop: string): void {
    const { queue } = get();
    for (let i = queue.length - 1; i >= 0; i--) {
      if (sourceKey(queue[i].source) === sourceKeyToDrop) {
        playerActions.removeAt(i);
      }
    }
  },
};

/** Tests: back to an empty player. */
export function resetPlayerForTests(): void {
  ++loadSeq;
  preparing?.abort();
  prefetching?.abort();
  audio = null;
  objectUrl = null;
  usePlayer.setState(initial);
}
