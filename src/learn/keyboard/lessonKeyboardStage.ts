import { create } from 'zustand';
import type { KeyRange } from './lessonKeyboardRange';

/**
 * The Learn keyboard on screen right now: its element and the keys it shows.
 * LessonKeyboard publishes it; the cascade view reads it so its falling notes
 * land on the keys, wherever each surface puts the keyboard (it sits beside
 * the volume dial, so it is never quite the cascade's own width).
 */
export const useLessonKeyboardStage = create<{
  el: HTMLElement | null;
  range: KeyRange | null;
}>(() => ({ el: null, range: null }));
