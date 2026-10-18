/* eslint-env browser */
/**
 * The design probe (overhaul plan 2.1): what the rendered page breaks of the
 * design system's two floors, inside the parts built on it.
 *
 * - Text under 12 px, except uppercase micro labels at 11 px (owner
 *   decision 2).
 * - Targets under 24×24 px: buttons, links, fields and anything focusable.
 *   A native checkbox or radio inside a <label> is measured by its label,
 *   the area that takes the click. A panel's resize edge (role=separator,
 *   the Resizer primitive) is left out: it is 8 px across but the whole
 *   edge long, and the keyboard moves it as well.
 *
 * It looks only inside [data-ds="v2"] (the primitives' dialogs, the shell)
 * and skips any [data-ds="legacy"] inside them: legacy content a v2 frame
 * holds until its own milestone restyles it. The source-side ratchet is
 * src/daw/ui/__tests__/designGuard.test.ts.
 *
 * By default an element is skipped when any ancestor is legacy, so a v2
 * part inside the legacy main region (section[data-region="main"]: the
 * track area's tools, sections row and footer, the Edit pill) is never
 * probed. `{ root, subtree: true }` probes `root`'s matches as v2 parts
 * whatever lies above them: inside each, the nearest [data-ds] decides
 * (R30 and R32 use it for the track area; R28, R29 and R31 pass a selector and
 * see what they always did).
 *
 * designProbe, overlayLook and overlayOpaque run in the page
 * (page.evaluate(designProbe)), so they use nothing from this module's
 * scope. regionBudget runs in Node: it takes the Playwright page, measures
 * there (regionBoxes, in the page) and judges the boxes against the Stage B
 * pixel budget (reference/plan.md "Pixel budget"; R29 and R36 share it).
 */

/**
 * In-page: every floor broken inside the root selector's matches (all of
 * the v2 parts by default). Takes the selector, or `{ root, subtree }` (see
 * the header). Each finding names its kind, size and text.
 */
export function designProbe(arg = '[data-ds="v2"]') {
  const { root: rootSelector = '[data-ds="v2"]', subtree = false } =
    typeof arg === 'string' ? { root: arg } : (arg ?? {});
  const roots = [...document.querySelectorAll(rootSelector)];
  const legacy = (el, root) => {
    if (!subtree) return el.closest('[data-ds="legacy"]') !== null;
    // The nearest mark at or above el, counted only inside the root.
    const mark = el.closest('[data-ds]');
    return (
      mark !== null &&
      root.contains(mark) &&
      mark.getAttribute('data-ds') === 'legacy'
    );
  };
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
      if (legacy(el, root) || !visible(el)) continue;

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
      if (el.matches(INTERACTIVE) && !el.matches('[role="separator"]')) {
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

/**
 * In-page: whether an overlay panel paints opaque (overlay rule,
 * design-system-01; the Stage B exit's "every overlay renders opaque"): its
 * background at least 95 % opaque, and no backdrop blur on it, inside it,
 * above it or on any open layer (a scrim). A selector that matches an
 * element inside a Radix popper (a popover's or menu's body) is measured
 * on the popper's content, the element that paints the surface. Null when
 * nothing matches. R28 and R36 judge `opaque`.
 */
export function overlayOpaque(panelSelector) {
  const found = document.querySelector(panelSelector);
  if (!found) return null;
  const panel =
    found.closest('[data-radix-popper-content-wrapper] > *') ?? found;
  const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(panel).backgroundColor);
  const alpha = m
    ? Number(
        m[1]
          .split(/[ ,/]+/)
          .filter(Boolean)
          .map(Number)[3] ?? 1,
      )
    : 0;
  const blurOf = (el) => {
    const style = getComputedStyle(el);
    const filter = style.backdropFilter || style.webkitBackdropFilter || '';
    return /blur\((?!0(px)?\))/.test(filter) ? filter : null;
  };
  const scan = new Set([panel, ...panel.querySelectorAll('*')]);
  for (let up = panel.parentElement; up; up = up.parentElement) scan.add(up);
  for (const layer of document.querySelectorAll('[data-state="open"]'))
    scan.add(layer);
  const blurs = [];
  for (const el of scan) {
    const blur = blurOf(el);
    if (blur) {
      const id = el.getAttribute('data-testid');
      blurs.push(`${el.tagName.toLowerCase()}${id ? `#${id}` : ''} ${blur}`);
    }
  }
  return {
    alpha,
    blurs: blurs.slice(0, 5),
    opaque: alpha >= 0.95 && blurs.length === 0,
  };
}

/**
 * In-page: the shell's regions as the pixel budget names them. Null for a
 * region that is not on the page (the track list outside Create, the
 * Inspector while it is shut).
 */
export function regionBoxes() {
  const box = (selector) => {
    const el = [...document.querySelectorAll(selector)].find((e) => {
      const r = e.getBoundingClientRect();
      return !e.hidden && r.width > 0 && r.height > 0;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  const s = window.__MA_STORE__.getState();
  const rows = document.querySelector('[data-testid="track-row"]');
  const sections = document.querySelector('[data-testid="sections-row"]');
  return {
    view: s.currentView,
    libraryOpen: s.libraryOpen,
    top: box('[data-testid="top-bar"]'),
    bottom: box('[data-testid="bottom-rail"]'),
    side: box('[data-testid="side-rail"]'),
    main: box('[data-region="main"]'),
    dock: box('[data-region="dock"]'),
    inspector: s.libraryOpen ? box('[data-region="inspector"]') : null,
    trackList: box('[data-testid="track-list"]'),
    footer: box('[data-testid="timeline-footer"]'),
    // From the sections row's top to the first track row's: the lane header.
    laneHeader:
      rows && sections
        ? rows.getBoundingClientRect().top -
          sections.getBoundingClientRect().top
        : null,
  };
}

/** The Stage B pixel budget (reference/plan.md), in px. */
export const BUDGET = {
  top: 44,
  bottom: 44,
  side: 48,
  trackList: 200,
  laneHeaderMax: 80,
  footer: 24,
  inspectorMin: 240,
  inspectorMax: 420,
  /** The timeline may fall this far short of window − list − rail − Inspector. */
  timelineSlack: 18,
};

/**
 * Node: the shell's regions measured in `page` and judged against the
 * pixel budget. `checks` holds one yes/no per rule, null where the rule
 * does not apply to what shows (the track list, lane header, footer and
 * timeline only in Create; the Inspector only while open):
 *
 * - top, bottom: the bars 44 px; side: the rail 48 px wide;
 * - trackList: 200 px; laneHeader: 80 px or less; footer: 24 px;
 * - inspector: 240–420 px wide;
 * - timeline: the canvas (main less the 200 px list) at least the window
 *   less the list, the rail and the open Inspector, within 18 px (≥ 1,100
 *   px on a Chromebook with the Inspector shut, the plan's 1,118 less part
 *   of the side rail);
 * - dock: with `dockFrac`, the dock is round(body × dockFrac) (±2), body =
 *   the window less both bars;
 * - inspectorDefault: with `inspectorDefault`, the Inspector is open exactly
 *   when the window is 1440 px wide or more (a fresh open, 2.4).
 */
export async function regionBudget(
  page,
  { dockFrac = null, inspectorDefault = false } = {},
) {
  const boxes = await page.evaluate(regionBoxes);
  const { width, height } = page.viewportSize();
  const body = height - BUDGET.top - BUDGET.bottom;
  const near = (a, b, tol = 1) =>
    typeof a === 'number' && Math.abs(a - b) <= tol;
  const create = boxes.view === 'arrange';
  const inspectorW = boxes.inspector?.w ?? 0;
  const canvas = (boxes.main?.w ?? 0) - BUDGET.trackList;
  const timelineMin =
    width - BUDGET.trackList - BUDGET.side - inspectorW - BUDGET.timelineSlack;
  const checks = {
    top: near(boxes.top?.h, BUDGET.top, 0),
    bottom: near(boxes.bottom?.h, BUDGET.bottom, 0),
    side: near(boxes.side?.w, BUDGET.side, 0),
    trackList: create ? near(boxes.trackList?.w, BUDGET.trackList) : null,
    laneHeader: create
      ? typeof boxes.laneHeader === 'number' &&
        boxes.laneHeader <= BUDGET.laneHeaderMax + 1
      : null,
    footer: create ? near(boxes.footer?.h, BUDGET.footer) : null,
    inspector: boxes.libraryOpen
      ? !!boxes.inspector &&
        boxes.inspector.w >= BUDGET.inspectorMin - 1 &&
        boxes.inspector.w <= BUDGET.inspectorMax + 1
      : null,
    timeline: create ? canvas >= timelineMin : null,
    dock:
      dockFrac === null
        ? null
        : !!boxes.dock && near(boxes.dock.h, Math.round(body * dockFrac), 2),
    inspectorDefault: inspectorDefault
      ? boxes.libraryOpen === width >= 1440
      : null,
  };
  return {
    boxes,
    body,
    canvas,
    timelineMin,
    checks,
    ok: Object.values(checks).every((c) => c !== false),
    failed: Object.entries(checks)
      .filter(([, c]) => c === false)
      .map(([key]) => key),
  };
}
