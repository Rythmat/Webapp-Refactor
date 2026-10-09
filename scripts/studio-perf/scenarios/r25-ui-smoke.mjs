/* eslint-env node */
/**
 * R25 UI smoke for the save chip and Undo/Redo (milestone 1.4, E13; fast),
 * at 1366×655 (a Chromebook) and 1280×720 (the smallest window kept), in
 * Create and in Practice:
 *
 * - chipFits: the chip is on screen in the TopRail's leading slot, 150 px
 *   (±2) wide in every state it reaches here (Saved on this device,
 *   Unsaved, Saving…, Saved, Couldn't save – Retry, and Audio not saved
 *   yet, the longest label, shown by setting the draft status's missing
 *   media count: R16 media drives that state for real), its text never
 *   clipped (scrollWidth ≤ clientWidth, the label's too).
 * - targetsAtLeast24: Undo, Redo and the chip's Retry are at least 24×24
 *   px (the target floor) at both window sizes.
 * - chipType: every text in it is Glacial at 12 px or more.
 * - neutralColours: no teal and no brand yellow in the chip or in
 *   Undo/Redo (the amber warning icon of the error state aside).
 * - undoRedoWork: Undo and Redo start disabled, an edit enables Undo,
 *   Undo takes it back and enables Redo, Redo puts it back and disables
 *   itself.
 * - ctrlZInTextField: Ctrl/⌘Z in the project-name field undoes the typing
 *   there, not the project's last edit.
 * - practiceHeaderChip: on the Practice screen the chip is in its header
 *   (150 px, unclipped), with no Undo/Redo there, and the TopRail slot is
 *   empty.
 */
import { MOD } from './_shared.mjs';

export const flags = {
  chipFits: {
    goal: true,
    text: 'the chip was 150 px (±2) and unclipped in every state, at both window sizes',
  },
  chipType: { goal: true, text: 'the chip’s text was Glacial, 12 px or more' },
  targetsAtLeast24: {
    goal: true,
    text: 'Undo, Redo and the chip’s Retry were at least 24×24 px',
  },
  neutralColours: {
    goal: true,
    text: 'no teal or brand yellow in the chip or Undo/Redo',
  },
  undoRedoWork: {
    goal: true,
    text: 'Undo and Redo enabled, disabled and worked as they should',
  },
  ctrlZInTextField: {
    goal: true,
    text: 'Ctrl/⌘Z in a text field edited the text, not the project',
  },
  practiceHeaderChip: {
    goal: true,
    text: 'in Practice the chip sat in the header (no Undo/Redo) and the TopRail slot was empty',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1280, height: 720 },
];

/** In-page: the chip (or `root`'s) measured: size, clipping, type, colours. */
function measureChip(rootSelector) {
  const root = rootSelector ? document.querySelector(rootSelector) : document;
  const chip = root?.querySelector('[data-testid="save-chip"]');
  if (!chip) return null;
  const rect = chip.getBoundingClientRect();
  const state = chip.getAttribute('data-state');
  const hsl = (css) => {
    const m = /rgba?\(([^)]+)\)/.exec(css ?? '');
    if (!m) return null;
    const [r, g, b, a = 1] = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    if (a === 0) return null;
    const [R, G, B] = [r / 255, g / 255, b / 255];
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    return { h: (h * 60 + 360) % 360, s, l };
  };
  const offColour = (css) => {
    const c = hsl(css);
    if (!c) return null;
    if (c.h >= 160 && c.h <= 200 && c.s > 0.3 && c.l > 0.15 && c.l < 0.9)
      return `teal ${css}`;
    if (c.h >= 45 && c.h <= 65 && c.s > 0.6 && c.l > 0.35 && c.l < 0.85)
      return `yellow ${css}`;
    return null;
  };
  const nodes = [chip, ...chip.querySelectorAll('*')];
  const fonts = [];
  const colours = [];
  for (const el of nodes) {
    const cs = getComputedStyle(el);
    const warningIcon =
      (state === 'error' || state === 'audio-pending') &&
      el.closest('svg') &&
      el.closest('svg').classList.contains('text-daw-warning');
    if (!warningIcon) {
      for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
        const bad = offColour(cs[prop]);
        if (bad) colours.push(`${el.tagName.toLowerCase()} ${prop} ${bad}`);
      }
    }
    const text = [...el.childNodes].some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
    );
    // A visually hidden live text (sr-only, 1 px) is never on screen.
    const hidden = el.getBoundingClientRect().width <= 1;
    if (text && !hidden) {
      fonts.push({
        size: parseFloat(cs.fontSize),
        glacial: /Glacial/i.test(cs.fontFamily),
        clipped: el.scrollWidth > el.clientWidth + 1,
        text: el.textContent.trim().slice(0, 30),
      });
    }
  }
  const style = getComputedStyle(chip);
  const retryEl = chip.querySelector('button[aria-label="Retry save"]');
  const retryRect = retryEl?.getBoundingClientRect() ?? null;
  return {
    state,
    retry: retryRect
      ? {
          width: Math.round(retryRect.width * 10) / 10,
          height: Math.round(retryRect.height * 10) / 10,
        }
      : null,
    width: Math.round(rect.width * 10) / 10,
    onScreen:
      rect.width > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.left < innerWidth &&
      rect.top < innerHeight &&
      style.visibility !== 'hidden',
    clipped: chip.scrollWidth > chip.clientWidth,
    fonts,
    colours,
  };
}

/** In-page: the colours of Undo and Redo that are teal or brand yellow. */
function undoRedoColours() {
  const out = [];
  for (const id of ['undo-button', 'redo-button']) {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) continue;
    for (const node of [el, ...el.querySelectorAll('*')]) {
      const cs = getComputedStyle(node);
      for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
        const m = /rgba?\(([^)]+)\)/.exec(cs[prop] ?? '');
        if (!m) continue;
        const [r, g, b, a = 1] = m[1]
          .split(/[ ,/]+/)
          .filter(Boolean)
          .map(Number);
        if (a === 0) continue;
        // Teal: green and blue well above red; yellow: red and green well above blue.
        if (g > r + 60 && b > r + 40) out.push(`${id} ${prop} ${cs[prop]}`);
        if (r > b + 100 && g > b + 80 && Math.abs(r - g) < 60)
          out.push(`${id} ${prop} ${cs[prop]}`);
      }
    }
  }
  return out;
}

const SLOT = '[data-slot="toprail-leading"]';

/** In-page: Undo's and Redo's sizes (the 24×24 target floor). */
const undoRedoSizes = () =>
  ['undo-button', 'redo-button'].map((id) => {
    const rect = document
      .querySelector(`[data-testid="${id}"]`)
      ?.getBoundingClientRect();
    return rect
      ? {
          id,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        }
      : { id, width: 0, height: 0 };
  });

const DRAFT_STATUS_MODULE = '/src/daw/persistence/drafts/draftStatusStore.ts';
const undoState = (page) =>
  page.evaluate(() => ({
    undo:
      document.querySelector('[data-testid="undo-button"]')?.disabled ?? null,
    redo:
      document.querySelector('[data-testid="redo-button"]')?.disabled ?? null,
    tracks: window.__MA_STORE__.getState().tracks.length,
  }));

/** Waits for the chip to read `state`, then measures it (null on timeout). */
async function chipIn(page, state, timeout = 15_000) {
  const ok = await page
    .waitForSelector(
      `${SLOT} [data-testid="save-chip"][data-state="${state}"]`,
      {
        timeout,
        polling: 50,
      },
    )
    .then(
      () => true,
      () => false,
    );
  return ok ? page.evaluate(measureChip, SLOT) : null;
}

async function pressSave(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.keyboard.press(`${MOD}+KeyS`);
}

async function smokeAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async (session) => {
      const { page } = session;
      await page.setViewportSize(viewport);
      await kit.sleep(300);
      // Undo and Redo.
      const start = await undoState(page);
      await page.evaluate(() =>
        window.__MA_STORE__
          .getState()
          .addTrack('midi', 'piano-sampler', 'Smoke Keys'),
      );
      await kit.sleep(300);
      const edited = await undoState(page);
      await page.click('[data-testid="undo-button"]');
      await kit.sleep(300);
      const undone = await undoState(page);
      await page.click('[data-testid="redo-button"]');
      await kit.sleep(300);
      const redone = await undoState(page);
      const undoRedoWork =
        start.undo === true &&
        start.redo === true &&
        edited.undo === false &&
        undone.tracks === edited.tracks - 1 &&
        undone.redo === false &&
        redone.tracks === edited.tracks &&
        redone.redo === true;

      // Ctrl/⌘Z in the project-name field.
      const name = page.locator('.daw-root input[type="text"]').first();
      await name.click();
      await page.keyboard.press(`${MOD}+KeyA`);
      await page.keyboard.type('Typed Name');
      const typed = await name.inputValue();
      await page.keyboard.press(`${MOD}+KeyZ`);
      await kit.sleep(300);
      const afterZ = {
        value: await name.inputValue(),
        ...(await undoState(page)),
      };
      await page.keyboard.press('Escape');
      await page.evaluate(() => document.activeElement?.blur?.());
      const ctrlZInTextField =
        typed === 'Typed Name' &&
        afterZ.value !== 'Typed Name' &&
        afterZ.tracks === redone.tracks;

      // The chip through its states.
      await kit.waitForDraft(page);
      const states = [];
      states.push(await chipIn(page, 'local'));
      await page.evaluate(() =>
        window.__MA_STORE__
          .getState()
          .setBpm(window.__MA_STORE__.getState().bpm + 1),
      );
      states.push(await chipIn(page, 'unsaved', 3000));
      await kit.waitForDraft(page);
      const slow = api.fault({
        method: 'POST',
        path: /^\/api\/studio\/projects$/,
        delayMs: 2000,
        times: 1,
      });
      await pressSave(page);
      states.push(await chipIn(page, 'saving', 5000));
      states.push(await chipIn(page, 'saved', 20_000));
      slow();
      await page.evaluate(() =>
        window.__MA_STORE__
          .getState()
          .setBpm(window.__MA_STORE__.getState().bpm + 1),
      );
      await kit.waitForDraft(page);
      await kit.setOffline(session, api, true);
      try {
        await pressSave(page);
        states.push(await chipIn(page, 'error', 20_000));
      } finally {
        await kit.setOffline(session, api, false);
      }
      // The longest label, 'Audio not saved yet': the draft status's
      // missing media count, set for the measurement and put back.
      await page.evaluate(async (path) => {
        const { useDraftStatusStore } = await window.__RT_DEV_MODULE__(path);
        const media = useDraftStatusStore.getState().media;
        window.__rtMediaBefore = media;
        useDraftStatusStore.setState({ media: { ...media, missing: 1 } });
      }, DRAFT_STATUS_MODULE);
      states.push(await chipIn(page, 'audio-pending', 5000));
      await page.evaluate(async (path) => {
        const { useDraftStatusStore } = await window.__RT_DEV_MODULE__(path);
        useDraftStatusStore.setState({ media: window.__rtMediaBefore });
      }, DRAFT_STATUS_MODULE);
      const reached = states.filter(Boolean);
      const undoColours = await page.evaluate(undoRedoColours);
      const targets = [
        ...(await page.evaluate(undoRedoSizes)),
        ...reached
          .filter((m) => m.retry)
          .map((m) => ({ id: `retry (${m.state})`, ...m.retry })),
      ];
      return {
        viewport,
        undoRedoWork,
        ctrlZInTextField,
        reached,
        missing: [
          'local',
          'unsaved',
          'saving',
          'saved',
          'error',
          'audio-pending',
        ].filter((s, i) => !states[i]),
        undoColours,
        targets,
        undo: { start, edited, undone, redone, afterZ, typed },
      };
    },
    api,
  );
}

async function practiceAt(kit, run, viewport) {
  return kit.withSession(
    run,
    '?practiceMode=dorian&practiceRoot=d',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await kit.sleep(500);
      const header = await page.evaluate(
        measureChip,
        '[data-testid="practice-header"]',
      );
      const extra = await page.evaluate(
        (slot) => ({
          undoInHeader: Boolean(
            document.querySelector(
              '[data-testid="practice-header"] [data-testid="undo-button"]',
            ),
          ),
          slotChip: Boolean(
            document.querySelector(`${slot} [data-testid="save-chip"]`),
          ),
          slotUndo: Boolean(
            document.querySelector(`${slot} [data-testid="undo-button"]`),
          ),
        }),
        SLOT,
      );
      return { viewport, header, ...extra };
    },
  );
}

async function uiSmoke(kit, run) {
  const create = [];
  const practice = [];
  for (const viewport of VIEWPORTS) {
    create.push(await smokeAt(kit, run, viewport));
    practice.push(await practiceAt(kit, run, viewport));
  }
  const allChips = [
    ...create.flatMap((c) => c.reached),
    ...practice.map((p) => p.header).filter(Boolean),
  ];
  const fits = (m) =>
    m &&
    m.onScreen &&
    Math.abs(m.width - 150) <= 2 &&
    !m.clipped &&
    m.fonts.every((f) => !f.clipped);
  return {
    diffs: [],
    extraLosses: [],
    flags: {
      chipFits:
        create.every((c) => c.missing.length === 0) && allChips.every(fits),
      chipType: allChips.every((m) =>
        m.fonts.every((f) => f.size >= 12 && f.glacial),
      ),
      neutralColours:
        allChips.every((m) => m.colours.length === 0) &&
        create.every((c) => c.undoColours.length === 0),
      targetsAtLeast24: create.every(
        (c) =>
          c.targets.some((t) => t.id.startsWith('retry')) &&
          c.targets.every((t) => t.width >= 24 && t.height >= 24),
      ),
      undoRedoWork: create.every((c) => c.undoRedoWork),
      ctrlZInTextField: create.every((c) => c.ctrlZInTextField),
      practiceHeaderChip: practice.every(
        (p) => fits(p.header) && !p.undoInHeader && !p.slotChip && !p.slotUndo,
      ),
    },
    checks: {
      create: create.map((c) => ({
        viewport: `${c.viewport.width}x${c.viewport.height}`,
        states: c.reached.map(
          (m) => `${m.state} ${m.width}px${m.clipped ? ' clipped' : ''}`,
        ),
        missing: c.missing,
        colours: [...c.reached.flatMap((m) => m.colours), ...c.undoColours],
        fonts: [
          ...new Set(
            c.reached.flatMap((m) =>
              m.fonts.map(
                (f) => `${f.size}px ${f.glacial ? 'Glacial' : 'other'}`,
              ),
            ),
          ),
        ],
        targets: c.targets.map((t) => `${t.id} ${t.width}×${t.height}`),
        undo: c.undo,
      })),
      practice: practice.map((p) => ({
        viewport: `${p.viewport.width}x${p.viewport.height}`,
        chip: p.header
          ? `${p.header.state} ${p.header.width}px${p.header.clipped ? ' clipped' : ''}`
          : null,
        undoInHeader: p.undoInHeader,
        slotChip: p.slotChip,
        slotUndo: p.slotUndo,
      })),
    },
  };
}

export const scenarios = (kit) => [
  {
    group: 'R25',
    key: '',
    id: 'R25-ui-smoke',
    title:
      'The save chip and Undo/Redo at 1366×655 and 1280×720, in Create and Practice',
    run: (run) => uiSmoke(kit, run),
  },
];
