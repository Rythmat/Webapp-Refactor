import { createContext, useContext } from 'react';

/**
 * Where a lesson's keyboard goes (owner, 2026-10-26): docked on the lesson's
 * bar, full width, the same place in every lesson. LessonFrame provides it,
 * the bar (GuitarActionBar) draws the slot, and LessonKeyboard renders into
 * it. Outside a lesson there is none, and the keyboard stays where it is.
 */
export interface LessonKeyboardSlot {
  el: HTMLElement | null;
  setEl: (el: HTMLElement | null) => void;
}

export const LessonKeyboardSlotContext =
  createContext<LessonKeyboardSlot | null>(null);

export const useLessonKeyboardSlot = () =>
  useContext(LessonKeyboardSlotContext);
