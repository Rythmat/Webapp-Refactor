/**
 * The framed Studio's side of the Group Practice slide (`slideStudio.ts`):
 * the slide's step messages move the tutorial, every step it reaches is told
 * back, and the keys that move the lesson go to it. A step asked for before the
 * lesson has booted is kept until it has.
 *
 * Plain, over the store's small surface, so it tests without the editor.
 */
import {
  ARROW_KEYS,
  CLICKER_KEYS,
  SLIDE_STUDIO_KEY,
  SLIDE_STUDIO_STATE,
  isSlideStudioStep,
} from './slideStudio';

export interface TutorialState {
  activeTutorialId: string | null;
  tutorialStepIndex: number;
  goToTutorialStep: (index: number) => void;
}

export interface TutorialStore {
  getState: () => TutorialState;
  subscribe: (
    selector: (s: TutorialState) => string,
    listener: () => void,
  ) => () => void;
}

export interface SlideStudioBridge {
  /** The frame's own window: its messages and keys. */
  host: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  /** The slide's window. */
  parent: Pick<Window, 'postMessage'>;
  origin: string;
  store: TutorialStore;
  /** A lesson's step count, 0 when unknown. */
  totalOf: (tutorialId: string | null) => number;
}

const isTyping = (target: EventTarget | null): boolean => {
  if (!target || typeof (target as HTMLElement).tagName !== 'string')
    return false;
  const el = target as HTMLElement;
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  );
};

/** Wire the frame to its slide; returns the disconnect. */
export const connectSlideStudio = ({
  host,
  parent,
  origin,
  store,
  totalOf,
}: SlideStudioBridge): (() => void) => {
  let pending: number | null = null;

  const go = (at: number) => {
    const s = store.getState();
    const total = totalOf(s.activeTutorialId);
    if (!s.activeTutorialId || total === 0) {
      pending = at;
      return;
    }
    pending = null;
    const to = Math.min(at, total - 1);
    if (to !== s.tutorialStepIndex) s.goToTutorialStep(to);
  };

  let told = '';
  const tell = () => {
    const s = store.getState();
    const total = totalOf(s.activeTutorialId);
    if (!s.activeTutorialId || total === 0) return;
    if (pending !== null) {
      go(pending);
      if (store.getState().tutorialStepIndex !== s.tutorialStepIndex) return;
    }
    const key = `${s.activeTutorialId}:${s.tutorialStepIndex}`;
    if (key === told) return;
    told = key;
    parent.postMessage(
      { type: SLIDE_STUDIO_STATE, step: s.tutorialStepIndex, total },
      origin,
    );
  };

  const onMessage = (e: MessageEvent) => {
    if (e.origin !== origin || e.source !== parent) return;
    if (isSlideStudioStep(e.data)) go(e.data.at);
  };
  const send = (key: string) =>
    parent.postMessage({ type: SLIDE_STUDIO_KEY, key }, origin);
  const onKey = (e: KeyboardEvent) => {
    // A clicker's Page Up / Page Down move the lesson, not the Studio.
    if (e.key in CLICKER_KEYS) {
      e.preventDefault();
      send(e.key);
      return;
    }
    // A plain arrow moves the lesson unless the Studio used it (its one key
    // listener marks every key it takes) or it is moving a caret.
    if (!ARROW_KEYS.has(e.key) || e.repeat) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (isTyping(e.target)) return;
    setTimeout(() => {
      if (!e.defaultPrevented) send(e.key);
    }, 0);
  };

  host.addEventListener('message', onMessage);
  host.addEventListener('keydown', onKey, true);
  const stop = store.subscribe(
    (s) => `${s.activeTutorialId}:${s.tutorialStepIndex}`,
    tell,
  );
  tell();
  return () => {
    host.removeEventListener('message', onMessage);
    host.removeEventListener('keydown', onKey, true);
    stop();
  };
};
