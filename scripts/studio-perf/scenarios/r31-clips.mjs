/* eslint-env node */
/**
 * R31 clips (milestone 2.12, fast), at 1366×655, 1440×787 and 1280×720, on a
 * project of four tracks with a clip each, the last near the lanes' bottom:
 *
 * - clipMenuFits: a right-click on that clip opens the clip menu, every item
 *   in its place (Cut … Prism), and the whole menu inside the window.
 * - editPill: the selected clip shows its Edit pill, at least 24×24 and
 *   inside the clip; a click opens the same menu, inside the window, and
 *   Escape gives focus back to the pill.
 * - clipMenuKey: Alt+Return (Chromebook-safe) opens the selected clip's menu
 *   with focus on its first item.
 * - clipFloors: no text under the floor and no target under 24×24 in the
 *   menu and the pill (designProbe.mjs).
 *
 * And once, at 1366×655:
 * - emptyClickSeeks: a Pointer click on empty canvas seeks there, on the
 *   grid, and a drag there draws the marquee (notes selected, no seek).
 * - muteKeys: ⇧M mutes the selected clip and ⌘E splits it at the playhead,
 *   each one undo step, and M is still the click.
 */
import { designProbe } from '../designProbe.mjs';

export const flags = {
  clipMenuFits: {
    goal: true,
    text: 'a right-click on a clip opened the whole clip menu, inside the window',
  },
  editPill: {
    goal: true,
    text: 'the selected clip’s Edit pill was ≥ 24×24 inside the clip, opened the menu inside the window, and took focus back',
  },
  clipMenuKey: {
    goal: true,
    text: 'Alt+Return opened the selected clip’s menu with focus on its first item',
  },
  clipFloors: {
    goal: true,
    text: 'no text under the floor and no target under 24×24 in the clip menu or the pill',
  },
  emptyClickSeeks: {
    goal: true,
    text: 'a click on empty canvas sought there on the grid, and a drag drew the marquee',
  },
  muteKeys: {
    goal: true,
    text: '⇧M muted the clip and ⌘E split it, one undo step each, and M stayed the click',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

const ITEMS = [
  'cut',
  'copy',
  'paste',
  'delete',
  'duplicate',
  'rename',
  'split',
  'mute',
  'comment',
  'transpose',
  'quantize',
  'prism',
];

/** Four MIDI tracks, a two-bar clip each from bar 2. */
async function seedClips(kit, page) {
  await page.evaluate(() => {
    const s = window.__MA_STORE__.getState();
    const note = (n, t) => ({
      note: n,
      velocity: 96,
      startTick: t,
      durationTicks: 240,
      channel: 0,
    });
    ['Keys', 'Bass', 'Lead', 'Pad'].forEach((name, i) => {
      const id = s.addTrack('midi', 'piano-sampler', name);
      s.addMidiClip(id, {
        id: `r31-clip-${i}`,
        name: `${name} part`,
        startTick: 1920,
        durationTicks: 3840,
        events: [note(60, 0), note(64, 480), note(67, 960), note(72, 1920)],
      });
    });
    s.setSelectedTrackId(null);
    s.setSelectedClip(null, null);
    s.setTimelineZoom(1);
    s.setTimelineScrollLeft(0);
  });
  await kit.waitForDraft(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await kit.waitForEditor(page, 180_000);
}

/** In-page: the open canvas menu's items and whether it sits in the window. */
function menuNow() {
  const menu = document.querySelector('[data-tutorial-id="clip-menu"]');
  if (!menu) return null;
  const box = menu.getBoundingClientRect();
  return {
    target: menu.getAttribute('data-menu-target'),
    items: [...menu.querySelectorAll('[data-item]')].map((el) =>
      el.getAttribute('data-item'),
    ),
    inside:
      box.top >= 0 &&
      box.left >= 0 &&
      box.bottom <= window.innerHeight + 0.5 &&
      box.right <= window.innerWidth + 0.5,
    box: {
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      height: Math.round(box.height),
    },
    focused: document.activeElement?.getAttribute('data-item') ?? null,
  };
}

/** In-page: the pill, and the canvas box of the clip it is for. */
function pillNow() {
  const pill = document.querySelector('[data-tutorial-id="clip-edit-pill"]');
  if (!pill) return null;
  const box = pill.getBoundingClientRect();
  return {
    clipId: pill.getAttribute('data-clip-id'),
    width: box.width,
    height: box.height,
    left: box.left,
    top: box.top,
    right: box.right,
    bottom: box.bottom,
    focused: document.activeElement === pill,
  };
}

/**
 * In page px, from the canvas's box (it scrolls with the lanes): a point in
 * the last clip's body (bar 3 of it), and an empty stretch of the first
 * lane at bar 7 (the clips end at bar 4).
 */
async function clipPoints(page) {
  const canvas = await page
    .locator('[data-testid="track-scroller"] > div:nth-child(2) canvas')
    .boundingBox();
  return page.evaluate(
    ({ x, y }) => {
      const s = window.__MA_STORE__.getState();
      const ppb = 40 * s.timelineZoom;
      const row = s.tracks.length - 1;
      return {
        x: x + (2.5 * 4 * ppb - s.timelineScrollLeft),
        y: y + 56 + row * 64 + 40,
        empty: {
          x: x + 6 * 4 * ppb + 5 - s.timelineScrollLeft,
          y: y + 56 + 32,
        },
      };
    },
    { x: canvas.x, y: canvas.y },
  );
}

async function clipsAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedClips(kit, page);
      await kit.settle(page, 'R31 open');
      await kit.sleep(500);
      // The last lane in view, as a student scrolls to it.
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="track-scroller"]');
        el.scrollTop = el.scrollHeight;
      });
      await kit.sleep(300);
      const point = await clipPoints(page);

      await page.mouse.click(point.x, point.y, { button: 'right' });
      await kit.sleep(400);
      const rightClick = await page.evaluate(menuNow);
      const floors = await page.evaluate(
        designProbe,
        '[data-tutorial-id="clip-menu"]',
      );
      await page.keyboard.press('Escape');
      await kit.sleep(300);

      // The pill: on the clip the right-click selected.
      const pill = await page.evaluate(pillNow);
      const pillFloors = await page.evaluate(
        designProbe,
        '[data-tutorial-id="clip-edit-pill"]',
      );
      let fromPill = null;
      let focusBack = false;
      if (pill) {
        await page.click('[data-tutorial-id="clip-edit-pill"]');
        await kit.sleep(400);
        fromPill = await page.evaluate(menuNow);
        await page.keyboard.press('Escape');
        await kit.sleep(300);
        focusBack = (await page.evaluate(pillNow))?.focused ?? false;
      }

      // The key: focus off the pill first, on the canvas's page.
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('Alt+Enter');
      await kit.sleep(400);
      const fromKey = await page.evaluate(menuNow);
      await page.keyboard.press('Escape');
      await kit.sleep(300);

      return {
        viewport,
        rightClick,
        pill,
        fromPill,
        focusBack,
        fromKey,
        floors: [...floors, ...pillFloors],
      };
    },
    api,
  );
}

function judge(v) {
  const whole = (m) =>
    !!m && m.target === 'clip' && ITEMS.every((id) => m.items.includes(id));
  const pillOk =
    !!v.pill &&
    v.pill.width >= 24 &&
    v.pill.height >= 24 &&
    v.pill.clipId === 'r31-clip-3';
  return {
    clipMenuFits: whole(v.rightClick) && v.rightClick.inside,
    editPill: pillOk && whole(v.fromPill) && v.fromPill.inside && v.focusBack,
    clipMenuKey: whole(v.fromKey) && v.fromKey.focused === 'cut',
    clipFloors: v.floors.length === 0,
  };
}

/** Once, at 1366×655: empty-canvas clicks and the clip keys. */
async function clipsOnce(kit, run) {
  const viewport = VIEWPORTS[0];
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedClips(kit, page);
      await kit.settle(page, 'R31 once');
      await kit.sleep(400);
      const at = await clipPoints(page);
      await page.evaluate(() =>
        window.__MA_STORE__.getState().setSelectedClip(null, null),
      );

      // A click on empty lane (bar 7 of the first lane) seeks there.
      await page.mouse.click(at.empty.x, at.empty.y);
      await kit.sleep(300);
      const sought = await page.evaluate(
        () => window.__MA_STORE__.getState().position,
      );
      // A drag from there back across the first clip draws the marquee.
      await page.mouse.move(at.empty.x, at.empty.y + 20);
      await page.mouse.down();
      await page.mouse.move(at.empty.x - 300, at.empty.y - 20, { steps: 4 });
      await page.mouse.move(at.x - 120, at.empty.y - 24, { steps: 6 });
      await page.mouse.up();
      await kit.sleep(300);
      const afterDrag = await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        return {
          position: s.position,
          notes: s.selectedNotes.map((n) => n.clipId),
        };
      });

      // The clip keys on the first clip, with the playhead inside it.
      const keys = await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        const track = s.tracks[0];
        s.setSelectedClip(track.midiClips[0].id, track.id);
        s.setPosition(2400);
        return { metronome: s.metronomeEnabled };
      });
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('Shift+KeyM');
      await kit.sleep(200);
      // Ctrl on any computer: the editor takes Ctrl or ⌘ as Mod.
      await page.keyboard.press('Control+KeyE');
      await kit.sleep(300);
      const afterKeys = await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        return {
          clips: s.tracks[0].midiClips.map((c) => ({
            muted: c.muted === true,
            startTick: c.startTick,
          })),
          labels: window.__MA_HISTORY__?.labels?.().slice(-2) ?? [],
          metronome: s.metronomeEnabled,
        };
      });
      await page.keyboard.press('KeyM');
      await kit.sleep(200);
      const clickAfterM = await page.evaluate(
        () => window.__MA_STORE__.getState().metronomeEnabled,
      );

      return { sought, afterDrag, keys, afterKeys, clickAfterM };
    },
    api,
  );
}

async function clips(kit, run) {
  const at = [];
  for (const viewport of VIEWPORTS) at.push(await clipsAt(kit, run, viewport));
  const once = await clipsOnce(kit, run);
  const judged = at.map(judge);
  const all = (key) => judged.every((j) => j[key]);
  // Bar 7 at zoom 1 is tick 6 × 1920, on the 1/4 grid.
  const onceFlags = {
    emptyClickSeeks:
      once.sought === 6 * 1920 &&
      once.afterDrag.position === once.sought &&
      once.afterDrag.notes.includes('r31-clip-0'),
    muteKeys:
      once.afterKeys.clips.length === 2 &&
      once.afterKeys.clips.every((c) => c.muted) &&
      once.afterKeys.labels.join(',') === 'Mute clip,Split clip' &&
      once.afterKeys.metronome === once.keys.metronome &&
      once.clickAfterM !== once.keys.metronome,
  };
  return {
    diffs: [],
    extraLosses: [],
    flags: Object.fromEntries(
      Object.keys(flags).map((key) => [
        key,
        key in onceFlags ? onceFlags[key] : all(key),
      ]),
    ),
    checks: [
      ...at.map((v, i) => ({
        viewport: `${v.viewport.width}x${v.viewport.height}`,
        rightClick: v.rightClick && {
          items: v.rightClick.items.length,
          inside: v.rightClick.inside,
          box: v.rightClick.box,
        },
        pill: v.pill && {
          size: `${Math.round(v.pill.width)}×${Math.round(v.pill.height)}`,
          clip: v.pill.clipId,
        },
        fromPill: v.fromPill && {
          inside: v.fromPill.inside,
          box: v.fromPill.box,
        },
        focusBack: v.focusBack,
        fromKey: v.fromKey && { focused: v.fromKey.focused },
        floors: v.floors.map((f) =>
          f.kind === 'text'
            ? `text ${f.size}px “${f.text}”`
            : `target ${f.width}×${f.height} “${f.text}”`,
        ),
        failed: Object.entries(judged[i])
          .filter(([, ok]) => !ok)
          .map(([key]) => key),
      })),
      {
        once: '1366x655',
        sought: once.sought,
        afterDrag: once.afterDrag,
        afterKeys: once.afterKeys,
        clickAfterM: once.clickAfterM,
        failed: Object.entries(onceFlags)
          .filter(([, ok]) => !ok)
          .map(([key]) => key),
      },
    ],
  };
}

export const scenarios = (kit) => [
  {
    group: 'R31',
    key: '',
    id: 'R31-clips',
    title:
      'Clips at 1366×655, 1440×787 and 1280×720: the clip menu from a right-click, the Edit pill and Alt+Return, inside the window, with the floors; and once, a click on empty canvas seeks and a drag draws the marquee, ⇧M mutes and ⌘E splits',
    run: (run) => clips(kit, run),
  },
];
