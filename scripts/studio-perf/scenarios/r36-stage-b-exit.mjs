/* eslint-env node */
/**
 * R36 the Stage B exit (milestone 2.11 and plan 16 §6, full tier only), at
 * 1366×655 (a Chromebook in focus mode), 1440×787 (a laptop) and 1280×720
 * (the smallest window). Each size opens a fresh project and walks the
 * exit criteria of reference/plan.md ("Stage B exit criteria", decision 16's
 * guards a–e and the Soundtrap review's ST15):
 *
 * - noTilesUnderTracks (guard d): the new project's lanes show the four
 *   first steps; with a track there is no tile in the DOM; after the last
 *   track is deleted they come back.
 *
 * Then a song of eight tracks (seven keys, one drum machine), a clip on the
 * first two lanes and a Verse section, shown in eight states: Create with
 * the dock shut and open, each with the Inspector shut and open; Mix with
 * its rack shut and open (the master rack); the Score; the Lead sheet. In
 * each state:
 *
 * - screens: a screenshot to <out>/shots/<size>/<state>.png (the count
 *   must be states × sizes).
 * - regionBudget: the shared regionBudget (designProbe.mjs): bars 44, side
 *   rail 48, track list 200, lane header ≤ 80, footer 24, Inspector
 *   240–420, the timeline per the budget table, and the dock (Create, open)
 *   and the rack (Mix, open) at 36 % of the body.
 * - pageFloors: no text under the floor and no target under 24×24 on the
 *   page, by the default probe and by the subtree probe on every v2 root
 *   (so the v2 parts inside the legacy main region count too: R28, R29 and
 *   R31's regions with the rest).
 * - noFixedDrawer (ST15): the dock's region and its drawer carry no fixed
 *   px height (no h-[NNpx] class, no inline px height), and every slot
 *   keeps its share after a window resize (dockShare's second pass).
 * - noWideColumn (ST15): the track list is 200 px in every Create state.
 *
 * And per size:
 *
 * - dockShare (guard a): every dock slot the layout model lists
 *   (DOCK_DEFAULT_FRAC: controls, grooves, prism, piano-roll, fx, master
 *   and the Mix rack, which must be among them) is round(body × its share)
 *   (±2), and again after the window is made 90 px shorter: a share, not
 *   the old px.
 * - laneHeader (guard c): the sections row, ruler and chord lane take 80 px
 *   or less over the first row (the regionBudget rule, in Create).
 * - fourRows (guard b, at 1366×655): at least 4 whole track rows with the
 *   dock open at its default, 6 with it shut (Inspector shut).
 * - neutralFxCategories (ST15): the side rail's Effects panel's category
 *   headers, purposes and icon tiles carry no hue.
 * - overlaysOpaque: every menu, popover and dialog the editor opens (the
 *   OVERLAYS list below, and a lesson's coach card) paints at least 95 %
 *   opaque with no backdrop blur (the shared overlayOpaque).
 * - overlayFloors: the design probe (subtree mode) on each overlay's panel.
 * - noSwallowedClick (guard e): each overlay that Escape closes is opened,
 *   closed with Escape and, 30 ms later, ONE real mouse click lands on the
 *   bottom rail's Loop at the point measured before: the loop must have
 *   changed. At 1366×655 the same again with one click on a clip of the
 *   second lane: it must be selected. (B5 saw one click swallowed after
 *   the Invite dialog closed with Escape.)
 *
 * There is no baseline, so every flag must hold. A step that throws is
 * recorded with its error and the next goes on.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { designProbe, overlayOpaque, regionBudget } from '../designProbe.mjs';
import { ROOT } from '../harness.mjs';
import { fullTierOnly, MOD } from './_shared.mjs';

export const flags = {
  regionBudget: {
    goal: true,
    text: 'every state kept the pixel budget: bars 44, rail 48, list 200, lane header ≤ 80, footer 24, Inspector 240–420, the timeline, dock and rack shares',
  },
  dockShare: {
    goal: true,
    text: 'every dock slot (the Mix rack among them) was its share of the body, and still a share after a resize',
  },
  fourRows: {
    goal: true,
    text: 'at 1366×655, ≥ 4 whole track rows with the dock open and ≥ 6 with it shut',
  },
  laneHeader: {
    goal: true,
    text: 'sections, ruler and chord lane took 80 px or less at every size',
  },
  noTilesUnderTracks: {
    goal: true,
    text: 'the four tiles showed with no tracks, none with a track, and came back after the last was deleted',
  },
  noSwallowedClick: {
    goal: true,
    text: 'after Escape closed each overlay, one click on Loop (and on a clip) acted the first time',
  },
  overlaysOpaque: {
    goal: true,
    text: 'every menu, popover, dialog and the coach card painted ≥ 95 % opaque with no backdrop blur',
  },
  overlayFloors: {
    goal: true,
    text: 'no text under the floor and no target under 24×24 in any overlay',
  },
  pageFloors: {
    goal: true,
    text: 'no text under the floor and no target under 24×24 on the page in any state (default and subtree probes)',
  },
  noFixedDrawer: {
    goal: true,
    text: 'the dock had no fixed px height, and kept its share through a resize',
  },
  noWideColumn: {
    goal: true,
    text: 'the track list was 200 px in every Create state',
  },
  neutralFxCategories: {
    goal: true,
    text: 'the Effects panel’s category headers carried no hue',
  },
  screens: {
    goal: true,
    text: 'a screenshot was written for every state at every size',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

/** The shell states, each screenshotted and probed at every size. */
const STATES = [
  { name: 'create-dock-shut-inspector-shut', view: 'arrange' },
  { name: 'create-dock-open-inspector-shut', view: 'arrange', dock: true },
  {
    name: 'create-dock-shut-inspector-open',
    view: 'arrange',
    inspector: true,
  },
  {
    name: 'create-dock-open-inspector-open',
    view: 'arrange',
    dock: true,
    inspector: true,
  },
  { name: 'mix-rack-shut', view: 'studio' },
  { name: 'mix-rack-open', view: 'studio', rack: true },
  { name: 'score', view: 'score' },
  { name: 'leadsheet', view: 'leadsheet' },
];

/** A lesson whose first step shows the coach card. */
const COACH_LESSON = 'make-first-track';
const COACH_CARD = '[data-testid="tutorial-coach-card"]';
const LOOP = '[data-testid="transport-loop"]';
const MARK = '[data-r36-panel]';
const OPEN_MENU = '[role="menu"][data-state="open"]';
const OPEN_DIALOG =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';
const CLIP_A = 'r36-clip-a';
const CLIP_B = 'r36-clip-b';

// ── In-page helpers (self-contained) ────────────────────────────────────────

/**
 * In-page: marks the open overlay panel (the last visible match of
 * `selector`, narrowed to one holding or being `has`, or whose text has
 * `text`) with data-r36-panel, on the popper content when it sits in one.
 * Whether one was found.
 */
function markPanel({ selector, has = null, text = null }) {
  for (const el of document.querySelectorAll('[data-r36-panel]'))
    el.removeAttribute('data-r36-panel');
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const found = [...document.querySelectorAll(selector)]
    .filter(visible)
    .filter((el) => !has || el.matches(has) || el.querySelector(has))
    .filter((el) => !text || (el.textContent ?? '').includes(text))
    .at(-1);
  if (!found) return false;
  const panel =
    found.closest('[data-radix-popper-content-wrapper] > *') ?? found;
  panel.setAttribute('data-r36-panel', '');
  return true;
}

/** In-page: whether any overlay is open. */
function overlayOpen() {
  return !!document.querySelector(
    '[role="menu"][data-state="open"], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper] [data-state="open"]',
  );
}

/** In-page: the dock's region and drawer, scanned for a fixed px height. */
function drawerScan() {
  const region = document.querySelector('[data-region="dock"]');
  if (!region) return { found: false, fixed: [] };
  const fixed = [];
  for (const el of [region, ...region.children]) {
    const cls = typeof el.className === 'string' ? el.className : '';
    const m = /(?:^|\s)((?:min-|max-)?h-\[\d+(?:\.\d+)?px\])/.exec(cls);
    if (m) fixed.push(`class ${m[1]}`);
    const style = el.getAttribute('style') ?? '';
    const s = /(?:^|;)\s*((?:min-|max-)?height\s*:\s*\d+(?:\.\d+)?px)/.exec(
      style,
    );
    if (s) fixed.push(`style ${s[1]}`);
  }
  return { found: true, fixed };
}

/** In-page: whole track rows inside the scroller's box. */
function wholeRows() {
  const scroller = document.querySelector('[data-testid="track-scroller"]');
  if (!scroller) return null;
  const box = scroller.getBoundingClientRect();
  return [...document.querySelectorAll('[data-testid="track-row"]')].filter(
    (row) => {
      const r = row.getBoundingClientRect();
      return r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
    },
  ).length;
}

/** In-page: the empty project's tiles (the container and the tiles). */
function tilesNow() {
  return {
    container: !!document.querySelector('[data-testid="empty-project"]'),
    tiles: document.querySelectorAll('[data-testid^="empty-tile-"]').length,
  };
}

/**
 * In-page: colours with a hue in the Effects panel's category blocks (the
 * section, its header and purpose, and each effect's icon tile): any
 * colour, background or border more than 25 % saturated.
 */
function fxCategoryHues() {
  const sections = [
    ...document.querySelectorAll(
      '[data-testid="effects-library"] section[aria-labelledby^="fx-cat-"]',
    ),
  ];
  const parse = (css) => {
    const m = /rgba?\(([^)]+)\)/.exec(css ?? '');
    if (!m) return null;
    const [r, g, b, a = 1] = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return { r, g, b, a };
  };
  const hue = (c) => {
    if (!c || c.a === 0) return false;
    const [R, G, B] = [c.r / 255, c.g / 255, c.b / 255];
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return false;
    const s = d / (1 - Math.abs(2 * l - 1));
    return s > 0.25 && l > 0.1 && l < 0.92;
  };
  const found = [];
  for (const section of sections) {
    const els = [
      section,
      ...section.querySelectorAll(
        'h3, p, li button > span:first-child, li button > span:first-child *',
      ),
    ];
    for (const el of els) {
      const style = getComputedStyle(el);
      for (const prop of [
        'color',
        'backgroundColor',
        'borderTopColor',
        'fill',
        'stroke',
      ]) {
        const value = style[prop];
        // An SVG's fill and stroke are currentColor or none outside one.
        if (hue(parse(value)))
          found.push(
            `${section.getAttribute('aria-labelledby')} ${el.tagName.toLowerCase()} ${prop} ${value}`,
          );
      }
    }
  }
  return { sections: sections.length, hues: [...new Set(found)].slice(0, 10) };
}

// ── Node-side helpers ───────────────────────────────────────────────────────

const store = (page, fn, arg) => page.evaluate(fn, arg);

/** Escape until no overlay is open (at most three times). */
async function closeOverlays(kit, page) {
  for (let i = 0; i < 3; i++) {
    if (!(await page.evaluate(overlayOpen))) return;
    await page.keyboard.press('Escape');
    await kit.sleep(250);
  }
}

/** Default and subtree probes over the whole page, findings merged. */
async function pageProbe(page) {
  const plain = await page.evaluate(designProbe);
  const subtree = await page.evaluate(designProbe, {
    root: '[data-ds="v2"]',
    subtree: true,
  });
  const seen = new Set();
  return [...plain, ...subtree].filter((f) => {
    const key = JSON.stringify(f);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const describe = (f) =>
  f.kind === 'text'
    ? `text ${f.size}px “${f.text}”`
    : `target ${f.width}×${f.height} “${f.text}”`;

/** Clicks `selector` until `panel` shows (a Radix trigger can miss one). */
async function clickUntil(kit, page, selector, panel) {
  for (let i = 0; i < 3; i++) {
    await page.click(selector, { timeout: 5000 });
    await kit.sleep(300);
    if (await page.evaluate(markPanel, panel)) return;
  }
}

/** A right-click in the middle of `selector`'s first box. */
async function rightClick(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`nothing to right-click at ${selector}`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  });
}

/** The middle of a seeded clip on the canvas (lane `row`, bars 2–3). */
async function clipPoint(page, row) {
  const canvas = await page
    .locator('[data-testid="track-scroller"] > div:nth-child(2) canvas')
    .boundingBox();
  if (!canvas) throw new Error('no canvas');
  return page.evaluate(
    ({ x, y, row: r }) => {
      const s = window.__MA_STORE__.getState();
      const ppb = 40 * s.timelineZoom;
      const scroller = document.querySelector('[data-testid="track-scroller"]');
      return {
        x: Math.round(x + 8 * ppb - s.timelineScrollLeft),
        y: Math.round(y + 56 + r * 64 + 40 - (scroller?.scrollTop ?? 0)),
      };
    },
    { x: canvas.x, y: canvas.y, row },
  );
}

/** Shows Create with the dock and Inspector as asked, Keys selected. */
async function showCreate(kit, page, { dock = false, inspector = false } = {}) {
  await store(
    page,
    ({ dock: d, inspector: i }) => {
      const s = window.__MA_STORE__.getState();
      s.setCurrentView('arrange');
      s.setMixRack?.(null);
      s.setDockMaster(false);
      s.setDockMaximized(false);
      s.setSelectedTrackId(s.tracks[0]?.id ?? null);
      s.setChannelStripTab(d ? 'controls' : null);
      s.setInspectorOpenFor('arrange', i);
    },
    { dock, inspector },
  );
  await kit.sleep(500);
}

/** Puts the shell in `state`. */
async function showState(kit, page, state) {
  if (state.view === 'arrange') return showCreate(kit, page, state);
  await store(
    page,
    ({ view, rack }) => {
      const s = window.__MA_STORE__.getState();
      s.setCurrentView(view);
      s.setInspectorOpenFor(view, false);
      if (view === 'studio') s.setMixRack?.(rack ? { kind: 'master' } : null);
    },
    { view: state.view, rack: !!state.rack },
  );
  await kit.sleep(800);
}

// ── The overlays ────────────────────────────────────────────────────────────

/**
 * Every menu, popover and dialog the editor opens today, each with how it
 * opens and how its panel is found. `escape: false` for one Escape is not
 * meant to close (none yet). `view` opens it from another view.
 */
function overlays(kit) {
  const menu = { selector: OPEN_MENU };
  const dialog = (extra) => ({ selector: OPEN_DIALOG, ...extra });
  const click = (selector, panel) => ({
    panel,
    open: (page) => clickUntil(kit, page, selector, panel),
  });
  const viaStore = (fn, panel, after = null) => ({
    panel,
    open: (page) => page.evaluate(fn),
    after,
  });
  return [
    { name: 'Project menu', ...click('[data-tutorial-id="file-menu"]', menu) },
    { name: '⋯ menu', ...click('[data-testid="top-bar-overflow"]', menu) },
    { name: 'Account menu', ...click('[data-testid="avatar-menu"]', menu) },
    {
      name: 'Key popover',
      ...click('[data-testid="key-button"]', {
        selector: '[data-testid="key-popover"]',
      }),
    },
    {
      name: 'Metre popover',
      ...click('[data-testid="metre-button"]', {
        selector: '[data-testid="metre-popover"]',
      }),
    },
    {
      // The metronome is one button since 2026-10-21: a right-click opens
      // its settings.
      name: 'Click menu',
      panel: { selector: '[data-testid="click-menu"]' },
      open: (page) => rightClick(page, '[data-testid="count-in-menu"]'),
    },
    {
      name: 'Chord lane key',
      ...click('[data-testid="chord-lane-key"]', {
        selector: '[data-testid="chord-lane-key-popover"]',
      }),
    },
    {
      name: 'Track menu',
      ...click('[data-testid="track-row"] [data-testid="track-menu-button"]', {
        selector: '[data-testid="track-menu"]',
      }),
    },
    {
      name: 'Track menu (right-click)',
      panel: { selector: '[data-testid="track-menu"]' },
      open: (page) =>
        rightClick(page, '[data-testid="track-row"]:nth-child(2)').catch(() =>
          rightClick(page, '[data-testid="track-row"]'),
        ),
    },
    {
      name: 'Clip menu (right-click)',
      panel: { selector: '[data-tutorial-id="clip-menu"]' },
      open: async (page) => {
        const p = await clipPoint(page, 0);
        await page.mouse.click(p.x, p.y, { button: 'right' });
      },
    },
    {
      name: 'Edit pill menu',
      panel: { selector: '[data-tutorial-id="clip-menu"]' },
      open: async (page) => {
        await page.evaluate((clip) => {
          const s = window.__MA_STORE__.getState();
          s.setSelectedClip(clip, s.tracks[0].id);
        }, CLIP_A);
        await kit.sleep(400);
        await clickUntil(kit, page, '[data-tutorial-id="clip-edit-pill"]', {
          selector: '[data-tutorial-id="clip-menu"]',
        });
      },
    },
    {
      name: 'Section menu',
      panel: {
        selector: '[data-tutorial-id="clip-menu"][data-menu-target="section"]',
      },
      open: (page) => rightClick(page, '[data-testid="section-block"]'),
    },
    {
      name: '+ Section',
      ...click('[data-testid="add-section"]', {
        selector: '[data-testid="add-section-menu"]',
      }),
    },
    {
      name: 'Library Type menu',
      panel: menu,
      open: async (page) => {
        await page.evaluate(() =>
          window.__MA_STORE__.getState().setInspectorOpenFor('arrange', false),
        );
        await page.click('[data-testid="rail-library"]');
        await kit.sleep(600);
        await clickUntil(
          kit,
          page,
          '[data-testid="inspector-panel"] [data-testid="library-filter-type"]',
          menu,
        );
      },
      after: (page) =>
        page.evaluate(() =>
          window.__MA_STORE__.getState().setInspectorOpenFor('arrange', false),
        ),
    },
    {
      name: 'Add-track picker',
      ...click(
        '[data-tutorial-id="add-track-button"]',
        dialog({ has: '[data-testid="add-track-sheet"]' }),
      ),
    },
    {
      name: 'Audio & MIDI settings',
      panel: dialog({ text: 'Audio' }),
      open: async (page) => {
        if (await page.locator('[data-testid="settings-button"]').count()) {
          await page.click('[data-testid="settings-button"]');
          return;
        }
        await page.click('[data-testid="top-bar-overflow"]');
        await page
          .locator(`${OPEN_MENU} [role=menuitem]`, {
            hasText: 'Audio & MIDI settings',
          })
          .first()
          .click();
      },
    },
    {
      name: 'Projects',
      panel: dialog({ has: '[data-testid="projects-dialog"]' }),
      open: (page) => kit.clickFileItem(page, 'Open'),
    },
    {
      name: 'Save a copy',
      panel: dialog({}),
      open: (page) => kit.clickFileItem(page, 'Save as'),
    },
    {
      name: 'Export',
      ...click(
        '[data-tutorial-id="export-pill"]',
        dialog({ has: '[data-tutorial-id="export-audio-dialog"]' }),
      ),
    },
    {
      name: 'Command palette',
      panel: { selector: '[data-testid="command-palette"][data-state="open"]' },
      open: (page) => page.keyboard.press(`${MOD}+KeyK`),
    },
    {
      name: 'Command palette (Mix)',
      view: 'studio',
      panel: { selector: '[data-testid="command-palette"][data-state="open"]' },
      open: (page) => page.keyboard.press(`${MOD}+KeyK`),
    },
    {
      name: '’?’ sheet',
      panel: dialog({ text: 'Keyboard shortcuts' }),
      open: async (page) => {
        await page.evaluate(() => document.activeElement?.blur());
        await page.keyboard.press('Shift+Slash');
      },
    },
    {
      name: 'Report a problem',
      panel: dialog({ text: 'Report a problem' }),
      open: async (page) => {
        await clickUntil(kit, page, '[data-testid="top-bar-overflow"]', menu);
        await page
          .locator(`${OPEN_MENU} [role=menuitem]`, {
            hasText: 'Report a problem',
          })
          .first()
          .click({ timeout: 5000 });
      },
    },
    {
      name: 'Invite',
      ...viaStore(
        () => window.__MA_STORE__.getState()._setInviteRequested(true),
        dialog({ text: 'Invite collaborators' }),
      ),
    },
    {
      name: 'Recording limit',
      ...viaStore(
        () => window.__MA_STORE__.getState().setRecordingLimitModalOpen(true),
        dialog({}),
      ),
    },
    {
      name: 'Removed from session',
      ...viaStore(
        () => window.__MA_STORE__.getState()._setKickedNotice(true),
        dialog({}),
      ),
    },
    {
      name: 'Leave session',
      ...viaStore(
        () => {
          const s = window.__MA_STORE__.getState();
          s._setConnectionStatus('connected');
          s._setLeavePrompt(true);
        },
        dialog({}),
        (page) =>
          page.evaluate(() => {
            const s = window.__MA_STORE__.getState();
            s._setLeavePrompt(false);
            s._setConnectionStatus('disconnected');
          }),
      ),
    },
    {
      name: 'Chord analysis',
      ...viaStore(
        () => window.__MA_STORE__.setState({ chordAnalysisPromptOpen: true }),
        dialog({}),
      ),
    },
    {
      name: 'Confirm dialog',
      panel: dialog({}),
      open: (page) =>
        page.evaluate(async () => {
          const { confirmDialog } = await window.__RT_DEV_MODULE__(
            '/src/daw/ui/DialogHost.tsx',
          );
          confirmDialog({
            title: 'Delete this marker?',
            description: 'R36 asks through the editor’s own dialog.',
            danger: true,
          });
        }),
    },
  ];
}

/**
 * One overlay: opened, measured, closed with Escape and one real click 30
 * ms later at `target` (the Loop's middle, or a clip's). `acted` reads the
 * state the click should change.
 */
async function overlayOnce(kit, page, overlay, target, acted) {
  const out = { name: overlay.name };
  try {
    await closeOverlays(kit, page);
    if (overlay.view) {
      await store(
        page,
        (v) => {
          window.__MA_STORE__.getState().setCurrentView(v);
        },
        overlay.view,
      );
      await kit.sleep(700);
    }
    await store(page, () =>
      window.__MA_STORE__.getState().setSelectedClip(null, null),
    );
    const before = await page.evaluate(acted.read);
    await overlay.open(page);
    let found = false;
    for (let i = 0; i < 25 && !found; i++) {
      found = await page.evaluate(markPanel, overlay.panel);
      if (!found) await kit.sleep(200);
    }
    if (!found) throw new Error('its panel did not show');
    await kit.sleep(300);
    out.look = await page.evaluate(overlayOpaque, MARK);
    out.floors = (
      await page.evaluate(designProbe, { root: MARK, subtree: true })
    ).map(describe);
    if (target) {
      await page.keyboard.press('Escape');
      await kit.sleep(30);
      await page.mouse.click(target.x, target.y);
      await kit.sleep(500);
      out.closed = !(await page.evaluate(markPanel, overlay.panel));
      const after = await page.evaluate(acted.read);
      out.acted = acted.changed(before, after);
    }
  } catch (err) {
    out.error = String(err).slice(0, 200);
  } finally {
    if (overlay.after) await overlay.after(page).catch(() => {});
    await closeOverlays(kit, page).catch(() => {});
    if (overlay.view) {
      await store(page, () =>
        window.__MA_STORE__.getState().setCurrentView('arrange'),
      ).catch(() => {});
      await kit.sleep(500);
    }
  }
  return out;
}

const LOOP_ACTED = {
  read: () => window.__MA_STORE__.getState().loopEnabled,
  changed: (before, after) => before !== after,
};
const CLIP_ACTED = {
  read: () => window.__MA_STORE__.getState().selectedClipId,
  changed: (_before, after) => after === 'r36-clip-b',
};

// ── One size ────────────────────────────────────────────────────────────────

/** Eight tracks (seven keys, a drum machine), two clips, a Verse. */
async function seedSong(kit, page) {
  await page.evaluate(
    ({ a, b }) => {
      const s = window.__MA_STORE__.getState();
      const note = (n, t) => ({
        note: n,
        velocity: 96,
        startTick: t,
        durationTicks: 240,
        channel: 0,
      });
      const ids = [];
      for (let i = 0; i < 7; i++)
        ids.push(s.addTrack('midi', 'piano-sampler', `Keys ${i + 1}`));
      s.addTrack('midi', 'drum-machine', 'Drums');
      [a, b].forEach((clip, i) =>
        s.addMidiClip(ids[i], {
          id: clip,
          name: `Part ${i + 1}`,
          startTick: 1920,
          durationTicks: 3840,
          events: [note(60, 0), note(64, 480), note(67, 960)],
        }),
      );
      s.addSection({ type: 'verse', label: 'Verse' });
      s.setTimelineZoom(1);
      s.setTimelineScrollLeft(0);
      s.setSelectedTrackId(ids[0]);
      s.setSelectedClip(null, null);
    },
    { a: CLIP_A, b: CLIP_B },
  );
  await kit.sleep(800);
}

/** Guard d: tiles with no track, none with one, back after the last goes. */
async function tilesCheck(kit, page) {
  const empty = await page.evaluate(tilesNow);
  const id = await store(page, () =>
    window.__MA_STORE__.getState().addTrack('midi', 'piano-sampler', 'Tile'),
  );
  await kit.sleep(600);
  const withTrack = await page.evaluate(tilesNow);
  await store(page, (t) => window.__MA_STORE__.getState().removeTrack(t), id);
  await kit.sleep(600);
  const deleted = await page.evaluate(tilesNow);
  return {
    empty,
    withTrack,
    deleted,
    ok:
      empty.tiles === 4 &&
      !withTrack.container &&
      withTrack.tiles === 0 &&
      deleted.tiles === 4,
  };
}

/** Guard a: each slot's share, then again after a 90 px shorter window. */
async function dockShares(kit, page, viewport) {
  const slots = await page.evaluate(async () => {
    const layout = await window.__RT_DEV_MODULE__(
      '/src/daw/shell/layout/layoutModel.ts',
    );
    return Object.keys(layout.DOCK_DEFAULT_FRAC);
  });
  const measure = async (slot, height) => {
    const set = await store(
      page,
      (sl) => {
        const s = window.__MA_STORE__.getState();
        const drums = s.tracks.find((t) => t.instrument === 'drum-machine');
        if (sl === 'rack') {
          s.setCurrentView('studio');
          if (!s.setMixRack) return false;
          s.setMixRack({ kind: 'master' });
          return true;
        }
        s.setCurrentView('arrange');
        s.setInspectorOpenFor('arrange', false);
        s.setDockMaximized(false);
        s.setSelectedTrackId(
          sl === 'grooves' && drums ? drums.id : s.tracks[0].id,
        );
        s.setChannelStripTab(
          sl === 'master' ? 'controls' : sl === 'grooves' && !drums ? null : sl,
        );
        s.setDockMaster(sl === 'master');
        return true;
      },
      slot,
    );
    await kit.sleep(700);
    const got = await page.evaluate(async (sl) => {
      const layout = await window.__RT_DEV_MODULE__(
        '/src/daw/shell/layout/layoutModel.ts',
      );
      const s = window.__MA_STORE__.getState();
      const r = document
        .querySelector('[data-region="dock"]')
        ?.getBoundingClientRect();
      return {
        h: r ? Math.round(r.height) : null,
        frac: layout.dockFracFor(sl, s.dockHeights),
        rackDock: !!document.querySelector('[data-testid="rack-dock"]'),
      };
    }, slot);
    const body = height - 88;
    const want = Math.max(120, Math.round(body * got.frac));
    const ok =
      set &&
      got.h !== null &&
      Math.abs(got.h - want) <= 2 &&
      (slot !== 'rack' || got.rackDock);
    return { slot, height, h: got.h, want, ok };
  };
  const results = [];
  for (const slot of slots) results.push(await measure(slot, viewport.height));
  const shorter = viewport.height - 90;
  await page.setViewportSize({ width: viewport.width, height: shorter });
  await kit.sleep(800);
  for (const slot of slots) results.push(await measure(slot, shorter));
  await page.setViewportSize(viewport);
  await kit.sleep(800);
  return {
    slots,
    rackListed: slots.includes('rack'),
    results,
    ok: slots.includes('rack') && results.every((r) => r.ok),
    resizedOk: results.filter((r) => r.height === shorter).every((r) => r.ok),
  };
}

/** Guard b, on the Chromebook: whole rows with the dock open and shut. */
async function rowsCheck(kit, page) {
  await showCreate(kit, page, { dock: true });
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="track-scroller"]');
    if (el) el.scrollTop = 0;
  });
  await kit.sleep(300);
  const open = await page.evaluate(wholeRows);
  await showCreate(kit, page, { dock: false });
  const shut = await page.evaluate(wholeRows);
  return { open, shut, ok: open >= 4 && shut >= 6 };
}

/** ST15: the Effects panel's category blocks carry no hue. */
async function fxCategories(kit, page) {
  await showCreate(kit, page);
  // The Inspector is shut here, so the icon's click shows the panel.
  await page.click('[data-testid="rail-fx"]');
  await kit.sleep(700);
  const found = await page.evaluate(fxCategoryHues);
  await store(page, () =>
    window.__MA_STORE__.getState().setInspectorOpenFor('arrange', false),
  );
  await kit.sleep(300);
  return { ...found, ok: found.sections > 0 && found.hues.length === 0 };
}

async function exitAt(kit, run, viewport, shotsDir) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  const size = `${viewport.width}x${viewport.height}`;
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await kit.settle(page, 'R36 open');
      await kit.sleep(500);
      const out = { viewport: size, errors: [] };
      const step = async (name, fn) => {
        try {
          out[name] = await fn();
        } catch (err) {
          out.errors.push(`${name}: ${String(err).slice(0, 200)}`);
          out[name] = null;
        }
      };

      await step('tiles', () => tilesCheck(kit, page));
      await step('seed', () => seedSong(kit, page));

      // The states: a screenshot, the budget, the floors, the drawer.
      const dir = join(shotsDir, size);
      mkdirSync(dir, { recursive: true });
      out.states = [];
      for (const state of STATES) {
        const s = { name: state.name };
        try {
          await showState(kit, page, state);
          s.shot = join(dir, `${state.name}.png`);
          await page.screenshot({ path: s.shot });
          const budget = await regionBudget(page, {
            dockFrac: state.dock || state.rack ? 0.36 : null,
          });
          s.budget = {
            ok: budget.ok,
            failed: budget.failed,
            checks: budget.checks,
            canvas: Math.round(budget.canvas),
            timelineMin: Math.round(budget.timelineMin),
            laneHeader: budget.boxes.laneHeader,
            trackList: budget.boxes.trackList?.w ?? null,
            inspector: budget.boxes.inspector?.w ?? null,
            dock: budget.boxes.dock?.h ?? null,
          };
          s.floors = (await pageProbe(page)).map(describe);
          s.drawer = await page.evaluate(drawerScan);
          if (state.view === 'studio') {
            s.mixView = await page.evaluate(
              () => !!document.querySelector('[data-testid="mix-view"]'),
            );
          }
        } catch (err) {
          s.error = String(err).slice(0, 200);
        }
        out.states.push(s);
      }

      await step('dock', () => dockShares(kit, page, viewport));
      if (viewport.width === 1366) {
        await step('rows', () => rowsCheck(kit, page));
      }
      await step('fx', () => fxCategories(kit, page));

      // The overlays, from Create with the dock and Inspector shut.
      await showCreate(kit, page);
      const loopBox = await page.locator(LOOP).boundingBox();
      const loop = loopBox && {
        x: Math.round(loopBox.x + loopBox.width / 2),
        y: Math.round(loopBox.y + loopBox.height / 2),
      };
      out.overlays = [];
      for (const overlay of overlays(kit)) {
        out.overlays.push(
          await overlayOnce(kit, page, overlay, loop, LOOP_ACTED),
        );
      }
      // Guard e's clip click, once (the Chromebook): each overlay opened
      // in Create again, then one click on the second lane's clip.
      if (viewport.width === 1366) {
        out.clipClicks = [];
        for (const overlay of overlays(kit).filter((o) => !o.view)) {
          await showCreate(kit, page);
          const point = await clipPoint(page, 1);
          const r = await overlayOnce(kit, page, overlay, point, CLIP_ACTED);
          out.clipClicks.push({
            name: r.name,
            ...(r.error ? { error: r.error } : {}),
            closed: r.closed,
            acted: r.acted,
          });
        }
      }
      return out;
    },
    api,
  );
}

/** The coach card at `viewport`, from a lesson link. */
async function coachAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    `?tutorial=${COACH_LESSON}`,
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await kit.settle(page, 'R36 lesson');
      const shown = await page
        .waitForSelector(COACH_CARD, { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      await kit.sleep(500);
      return {
        name: 'Coach card',
        ...(shown ? {} : { error: 'the coach card did not show' }),
        look: shown ? await page.evaluate(overlayOpaque, COACH_CARD) : null,
        floors: shown
          ? (
              await page.evaluate(designProbe, {
                root: COACH_CARD,
                subtree: true,
              })
            ).map(describe)
          : [],
      };
    },
    api,
  );
}

// ── The verdicts ────────────────────────────────────────────────────────────

function judge(v, coach) {
  const states = v.states ?? [];
  const create = states.filter((s) => s.name.startsWith('create'));
  const overlaysAll = [...(v.overlays ?? []), coach];
  const clickable = v.overlays ?? [];
  return {
    regionBudget:
      states.length === STATES.length &&
      states.every((s) => !s.error && s.budget?.ok),
    dockShare: !!v.dock?.ok,
    fourRows: v.viewport !== '1366x655' || !!v.rows?.ok,
    laneHeader:
      create.length > 0 && create.every((s) => s.budget?.checks.laneHeader),
    noTilesUnderTracks: !!v.tiles?.ok,
    noSwallowedClick:
      clickable.length > 0 &&
      clickable.every((o) => !o.error && o.acted) &&
      (v.clipClicks ?? []).every((o) => !o.error && o.acted),
    overlaysOpaque: overlaysAll.every((o) => !o.error && o.look?.opaque),
    overlayFloors: overlaysAll.every((o) => !o.error && !o.floors?.length),
    pageFloors: states.every((s) => !s.error && s.floors?.length === 0),
    noFixedDrawer:
      states.every((s) => !s.error && s.drawer?.fixed.length === 0) &&
      !!v.dock?.resizedOk,
    noWideColumn:
      create.length > 0 && create.every((s) => s.budget?.checks.trackList),
    neutralFxCategories: !!v.fx?.ok,
    screens: states.every((s) => s.shot && existsSync(s.shot)),
  };
}

async function stageBExit(kit, run) {
  fullTierOnly(run);
  const outDir = resolve(
    run.args?.out ?? join(ROOT, 'docs/studio-perf/runs/roundtrip'),
  );
  const shotsDir = join(outDir, 'shots');
  const at = [];
  for (const viewport of VIEWPORTS) {
    const v = await exitAt(kit, run, viewport, shotsDir);
    let coach;
    try {
      coach = await coachAt(kit, run, viewport);
    } catch (err) {
      coach = { name: 'Coach card', error: String(err).slice(0, 200) };
    }
    at.push({ v, coach });
  }
  const judged = at.map(({ v, coach }) => judge(v, coach));
  const shots = at.flatMap(({ v }) => v.states ?? []).filter((s) => s.shot);
  const flagsNow = Object.fromEntries(
    Object.keys(flags).map((key) => [key, judged.every((j) => j[key])]),
  );
  flagsNow.screens =
    flagsNow.screens && shots.length === STATES.length * VIEWPORTS.length;
  return {
    diffs: [],
    extraLosses: [],
    flags: flagsNow,
    checks: at.map(({ v, coach }, i) => ({
      viewport: v.viewport,
      failed: Object.entries(judged[i])
        .filter(([, ok]) => !ok)
        .map(([key]) => key),
      errors: v.errors,
      tiles: v.tiles,
      states: (v.states ?? []).map((s) => ({
        name: s.name,
        ...(s.error ? { error: s.error } : {}),
        shot: s.shot,
        budget: s.budget,
        ...(s.mixView === undefined ? {} : { mixView: s.mixView }),
        floors: s.floors,
        drawer: s.drawer?.fixed,
      })),
      dock: v.dock && {
        slots: v.dock.slots,
        rackListed: v.dock.rackListed,
        results: v.dock.results.map(
          (r) =>
            `${r.slot}@${r.height}: ${r.h} px (want ${r.want})${r.ok ? '' : ' ✗'}`,
        ),
      },
      rows: v.rows,
      fx: v.fx,
      overlays: [...(v.overlays ?? []), coach].map((o) => ({
        name: o.name,
        ...(o.error ? { error: o.error } : {}),
        alpha: o.look?.alpha,
        ...(o.look?.blurs?.length ? { blurs: o.look.blurs } : {}),
        ...(o.floors?.length ? { floors: o.floors } : {}),
        ...(o.closed === undefined
          ? {}
          : { closedOnEscape: o.closed, loopActed: o.acted }),
      })),
      ...(v.clipClicks ? { clipClicks: v.clipClicks } : {}),
    })),
  };
}

export const scenarios = (kit) => [
  {
    group: 'R36',
    key: '',
    id: 'R36-stage-b-exit',
    title:
      'The Stage B exit at 1366×655, 1440×787 and 1280×720 (full tier): eight shell states screenshotted against the pixel budget and the design floors, every dock slot a share through a resize, four rows, the 80 px lane header, no tiles under tracks, every overlay opaque and on the floors, and no click swallowed after Escape',
    run: (run) => stageBExit(kit, run),
  },
];
