import { useEffect } from 'react';

// ── Printing the lead sheet and the score ──────────────────────────────────
// leadsheet-print.css stays loaded for the rest of the session once a view
// has imported it, so every print rule in it waits for a class on <body>. The
// views that print through it hold that class only while the page prints: it
// goes on at beforeprint (or when print media is emulated) and comes off at
// afterprint, and the last of them to unmount takes it off too, in case that
// happens mid-print. A set list printed after a visit to the Studio then
// prints as itself instead of as blank pages.

/** The body class leadsheet-print.css scopes its print rules to. */
export const LEADSHEET_PRINT_CLASS = 'ma-print-leadsheet';

/** Views mounted that print through the stylesheet. */
let holders = 0;
let printMedia: MediaQueryList | null = null;

const addClass = () => document.body.classList.add(LEADSHEET_PRINT_CLASS);
const removeClass = () => document.body.classList.remove(LEADSHEET_PRINT_CLASS);
const onPrintMedia = (event: MediaQueryListEvent) =>
  event.matches ? addClass() : removeClass();

/** Lets this view's page print with the lead-sheet print rules. */
export function useLeadSheetPrint(): void {
  useEffect(() => {
    if (holders++ === 0) {
      window.addEventListener('beforeprint', addClass);
      window.addEventListener('afterprint', removeClass);
      printMedia = window.matchMedia?.('print') ?? null;
      // Optional: a MediaQueryList without addEventListener (Safari before
      // 14) would throw here and take the whole editor down with it. The
      // print events above still work without it.
      printMedia?.addEventListener?.('change', onPrintMedia);
      if (printMedia?.matches) addClass();
    }
    return () => {
      if (--holders > 0) return;
      window.removeEventListener('beforeprint', addClass);
      window.removeEventListener('afterprint', removeClass);
      printMedia?.removeEventListener?.('change', onPrintMedia);
      printMedia = null;
      removeClass();
    };
  }, []);
}
