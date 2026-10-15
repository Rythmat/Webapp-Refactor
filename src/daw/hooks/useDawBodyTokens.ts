import { useLayoutEffect } from 'react';

// ── useDawBodyTokens ────────────────────────────────────────────────────────
// The DAW's --color-* tokens live on .daw-root, but dialogs, popovers and the
// lesson overlay portal to <body>, outside it, where every var(--color-*)
// resolves to nothing: see-through cards and invisible primary buttons.
// While any caller is mounted, <body> carries `daw-active`, and daw.css
// declares the same palette there.
//
// Callers are counted, so the editor (for its lifetime) and each portaled
// overlay (for its own) can hold the class without knowing about each other:
// an overlay never depends on someone else having set it, and the last one
// out removes it.
//
// Interim: milestone 2.1 moves the tokens to :root and deletes this hook.

/** The <body> class daw.css declares the DAW palette on. */
export const DAW_BODY_CLASS = 'daw-active';

let holders = 0;

export function useDawBodyTokens(): void {
  // A layout effect runs before the browser paints, so an overlay mounted in
  // the same commit never shows a frame without its tokens. It also runs its
  // cleanup when Suspense hides the caller, which keeps the count right.
  useLayoutEffect(() => {
    holders += 1;
    document.body.classList.add(DAW_BODY_CLASS);
    return () => {
      holders -= 1;
      if (holders === 0) document.body.classList.remove(DAW_BODY_CLASS);
    };
  }, []);
}
