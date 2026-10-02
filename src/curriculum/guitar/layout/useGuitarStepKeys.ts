import { useEffect, useRef } from 'react';

// ── Arrow keys between steps ───────────────────────────────────────────────
// ← and → open the previous and next step, but only from the preview: never
// mid-take, mid-practice or over a result, and never while a sheet is open.
// A key another control already handled, a key with a modifier, and a key
// pressed inside something that uses arrows itself (a text field, a radio
// group, a slider, a switch, a menu, a dialog…) all stay where they are.

/** Focus inside any of these keeps the arrow keys for itself. */
export const STEP_KEYS_IGNORE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="radio"]',
  '[role="radiogroup"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tablist"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
].join(', ');

export interface GuitarStepKeysOptions {
  /** The preview is showing and no sheet is open. */
  enabled: boolean;
  index: number;
  count: number;
  /** Stops anything sounding and opens that step at its preview. */
  goToStep: (index: number) => void;
}

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return target.closest(STEP_KEYS_IGNORE_SELECTOR) !== null;
}

export function useGuitarStepKeys(options: GuitarStepKeysOptions): void {
  // The listener reads the latest values without re-subscribing per render.
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const { enabled, index, count, goToStep } = latest.current;
      if (!enabled || event.defaultPrevented || event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (isIgnoredTarget(event.target)) return;

      const next = event.key === 'ArrowLeft' ? index - 1 : index + 1;
      if (next < 0 || next >= count) return;
      event.preventDefault();
      goToStep(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
