/* eslint-env browser */
/**
 * The design probe (overhaul plan 2.1): what the rendered page breaks of the
 * design system's two floors, inside the parts built on it.
 *
 * - Text under 12 px, except uppercase micro labels at 11 px (owner
 *   decision 2).
 * - Targets under 24×24 px: buttons, links, fields and anything focusable.
 *   A native checkbox or radio inside a <label> is measured by its label,
 *   the area that takes the click.
 *
 * It looks only inside [data-ds="v2"] (the primitives' dialogs, the shell)
 * and skips any [data-ds="legacy"] inside them: legacy content a v2 frame
 * holds until its own milestone restyles it. The source-side ratchet is
 * src/daw/ui/__tests__/designGuard.test.ts.
 *
 * Both functions run in the page (page.evaluate(designProbe)), so they use
 * nothing from this module's scope.
 */

/**
 * In-page: every floor broken inside `rootSelector`'s matches (all of the
 * v2 parts by default). Each finding names its kind, size and text.
 */
export function designProbe(rootSelector = '[data-ds="v2"]') {
  const roots = [...document.querySelectorAll(rootSelector)];
  const legacy = (el) => el.closest('[data-ds="legacy"]') !== null;
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && Number(style.opacity) > 0;
  };
  const describe = (el) =>
    (el.getAttribute('aria-label') || el.textContent || el.tagName)
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 40);
  const findings = [];
  const seen = new Set();
  const INTERACTIVE =
    'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="slider"], [role="combobox"], [tabindex]:not([tabindex="-1"])';

  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (legacy(el) || !visible(el)) continue;

      // Text: an element with text of its own.
      const ownText = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join('');
      if (ownText) {
        const style = getComputedStyle(el);
        const size = parseFloat(style.fontSize);
        const capitals =
          style.textTransform === 'uppercase' ||
          ownText === ownText.toUpperCase();
        if (size < 12 && !(size >= 11 && capitals)) {
          findings.push({
            kind: 'text',
            size,
            text: ownText.slice(0, 40),
          });
        }
      }

      // Targets.
      if (el.matches(INTERACTIVE)) {
        const box =
          el.matches('input[type="checkbox"], input[type="radio"]') &&
          el.closest('label')
            ? el.closest('label')
            : el;
        const rect = box.getBoundingClientRect();
        const width = Math.round(rect.width * 10) / 10;
        const height = Math.round(rect.height * 10) / 10;
        if (width < 24 || height < 24) {
          findings.push({ kind: 'target', width, height, text: describe(el) });
        }
      }
    }
  }
  return findings;
}

/**
 * In-page: how an overlay panel paints. Its background's alpha, the teal it
 * still has (any computed colour in the old accent's hue, outside a colour
 * that means something: [data-meaning], such as a track-colour swatch), and
 * the contrast of each white-pill primary (data-variant="primary") in it.
 */
export function overlayLook(panelSelector) {
  const panel = document.querySelector(panelSelector);
  if (!panel) return null;
  const parse = (css) => {
    const m = /rgba?\(([^)]+)\)/.exec(css ?? '');
    if (!m) return null;
    const [r, g, b, a = 1] = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return { r, g, b, a };
  };
  const teal = (c) => {
    if (!c || c.a === 0) return false;
    const [R, G, B] = [c.r / 255, c.g / 255, c.b / 255];
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return false;
    const s = d / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
    return h >= 160 && h <= 200 && s > 0.3 && l > 0.15 && l < 0.9;
  };
  const luminance = ({ r, g, b }) => {
    const ch = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  };
  const contrast = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
  };

  const background = parse(getComputedStyle(panel).backgroundColor);
  const teals = [];
  for (const el of [panel, ...panel.querySelectorAll('*')]) {
    if (el.closest('[data-meaning]')) continue;
    const style = getComputedStyle(el);
    for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
      if (teal(parse(style[prop]))) {
        teals.push(`${el.tagName.toLowerCase()} ${prop} ${style[prop]}`);
      }
    }
  }
  const primaries = [...panel.querySelectorAll('[data-variant="primary"]')].map(
    (button) => {
      const style = getComputedStyle(button);
      const fg = parse(style.color);
      const bg = parse(style.backgroundColor);
      return {
        text: button.textContent.trim().slice(0, 30),
        contrast: fg && bg ? contrast(fg, bg) : 0,
        pill: parseFloat(style.borderTopLeftRadius) >= 12,
      };
    },
  );
  return {
    alpha: background ? background.a : 0,
    teals: teals.slice(0, 10),
    primaries,
  };
}
