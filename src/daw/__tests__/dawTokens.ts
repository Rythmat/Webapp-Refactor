import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Test helpers: the DAW tokens as a portaled overlay sees them ─────────────
// jsdom applies stylesheets to the elements their rules name, but it neither
// inherits custom properties nor substitutes var(). These helpers load the
// real daw.css and resolve a computed value the way a browser would, so a
// test can tell whether a card portaled to <body> paints opaque or comes out
// transparent.

/**
 * daw.css, as the editor ships it. Read from disk: under jsdom vitest stubs
 * CSS imports (even ?raw) and points a URL built on import.meta.url at the
 * page, so the path is derived from the module's own file.
 */
export const DAW_CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../daw.css'),
  'utf8',
);

/** Adds daw.css to the document. Returns a function that removes it again. */
export function installDawCss(): () => void {
  const style = document.createElement('style');
  style.textContent = DAW_CSS;
  document.head.appendChild(style);
  return () => style.remove();
}

/** A custom property as `el` inherits it: from itself or its nearest ancestor. */
export function inheritedToken(el: Element, name: string): string {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const value = getComputedStyle(node).getPropertyValue(name).trim();
    if (value) return value;
  }
  return '';
}

/**
 * `value` with every var(--name[, fallback]) replaced by what `el` inherits.
 * An unset token with no fallback resolves to '', which is what the property
 * computes to in a browser: invalid at computed-value time, so a background
 * is transparent.
 */
export function resolveVars(el: Element, value: string): string {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const start = value.indexOf('var(', i);
    if (start === -1) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, start);
    // The matching ')' — a fallback may hold rgba(…) of its own.
    let depth = 0;
    let end = start + 3;
    for (; end < value.length; end++) {
      if (value[end] === '(') depth++;
      else if (value[end] === ')' && --depth === 0) break;
    }
    const inner = value.slice(start + 4, end);
    const comma = inner.indexOf(',');
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const token = inheritedToken(el, name);
    if (token) out += resolveVars(el, token);
    else if (comma !== -1)
      out += resolveVars(el, inner.slice(comma + 1).trim());
    i = end + 1;
  }
  return out.trim();
}

/** The alpha of a CSS colour: 1 is opaque, 0 is transparent or unset. */
export function alphaOf(color: string): number {
  const c = color.trim().toLowerCase();
  if (!c || c === 'transparent') return 0;
  const hex = /^#([0-9a-f]{3,8})$/.exec(c);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 4) return parseInt(digits[3].repeat(2), 16) / 255;
    if (digits.length === 8) return parseInt(digits.slice(6), 16) / 255;
    return 1;
  }
  const fn = /^rgba?\(([^)]*)\)$/.exec(c);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 4) return 1;
    const a = parts[3];
    return a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
  }
  // Anything else (a gradient, a keyword) is not a colour this helper reads.
  return Number.NaN;
}

/** The background colour `el` paints, with its tokens resolved. */
export function resolvedBackground(el: Element): string {
  const style = getComputedStyle(el);
  // jsdom leaves a var() in the `background` shorthand on the shorthand and
  // its longhands at their initial values, where a browser would substitute
  // first: `background: var(--color-surface)` paints that colour.
  const shorthand = style.getPropertyValue('background');
  return resolveVars(
    el,
    shorthand.includes('var(') ? shorthand : style.backgroundColor,
  );
}
