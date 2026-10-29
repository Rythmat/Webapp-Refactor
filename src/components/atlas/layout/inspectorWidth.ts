import { INSPECTOR_PX } from './frameGeometry';

/** Where the viewer's Inspector width is kept, in their browser. */
export const INSPECTOR_WIDTH_KEY = 'ma:atlas:inspector-width:v1';

/** The width the viewer last left the Inspector at, else the default. */
export function readInspectorWidth(): number {
  try {
    const raw = window.localStorage.getItem(INSPECTOR_WIDTH_KEY);
    const px = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(px) ? px : INSPECTOR_PX.default;
  } catch {
    return INSPECTOR_PX.default;
  }
}

/** Keep the width the viewer chose; null goes back to the default. */
export function writeInspectorWidth(px: number | null): void {
  try {
    if (px === null) window.localStorage.removeItem(INSPECTOR_WIDTH_KEY);
    else window.localStorage.setItem(INSPECTOR_WIDTH_KEY, String(px));
  } catch {
    // Storage can be off (private mode, blocked site data): the width then
    // lasts the visit.
  }
}
