/* eslint-env node */
/**
 * R29 shell (milestones 2.4, 2.5 and B4a, fast), at 1366×655 (a Chromebook in
 * focus mode), 1440×787 (a laptop) and 1280×720 (the smallest window). The
 * editor's frame, opened fresh at each size:
 *
 * - focusMode: the editor fills the window (no sidebar, no TopRail); the
 *   Studio dashboard still has its TopRail.
 * - topBar: the top bar is 44 px, and none of its three zones clips or runs
 *   into the next (the bar folds instead, useToolbarOverflow).
 * - rails (B4a): the bottom rail is 44 px across the window, its zones
 *   (Master, transport, song) neither clip nor overlap and the transport is
 *   centred in the window (within 2 px); the side rail is 48 px wide at
 *   the right edge, between the bars.
 * - regionBudget: the dock opens at 36% of the body (the window less both
 *   bars: 204 px on a Chromebook, within 2 px), the Inspector starts closed
 *   below 1440 px and open from it, and the timeline is at least 1,100 px
 *   wide on a Chromebook (the plan's 1,120 less part of the side rail's 48,
 *   owner's rails, 2026-10-16).
 * - inspectorOnce: the Inspector keeps its mount across Create → Mix →
 *   Score → Lead sheet → Create.
 * - layoutRestored: a dock made taller with the keyboard comes back that
 *   tall after a reload (the student's prefs).
 * - topBarFloors: no text under the floor and no target under 24×24 in the
 *   top bar, the bottom rail or the side rail (designProbe.mjs).
 * - sidePanels (B4a, on the Chromebook): each of the six side rail icons
 *   shows its panel in the Inspector (pressed, the white tile), a second
 *   click closes it, I opens it again on the same panel, and no panel has
 *   text under the floor or a target under 24×24.
 * - quietWhilePlaying: neither bar makes a React commit in 3 s of playback
 *   (the readout writes itself).
 */
import { designProbe } from '../designProbe.mjs';

export const flags = {
  focusMode: {
    goal: true,
    text: 'the editor filled the window, with no sidebar or TopRail; /studio kept its TopRail',
  },
  topBar: {
    goal: true,
    text: 'the top bar was 44 px and no zone clipped or overlapped another',
  },
  rails: {
    goal: true,
    text: 'the bottom rail was 44 px with its zones clear and the transport centred; the side rail was 48 px at the right edge',
  },
  regionBudget: {
    goal: true,
    text: 'dock at 36% of the body, Inspector closed below 1440 px and open from it, timeline ≥ 1,100 px on a Chromebook',
  },
  inspectorOnce: {
    goal: true,
    text: 'the Inspector kept its mount across the four views',
  },
  layoutRestored: {
    goal: true,
    text: 'a resized dock came back at its height after a reload',
  },
  topBarFloors: {
    goal: true,
    text: 'no text under the floor and no target under 24×24 in the top bar or the rails',
  },
  sidePanels: {
    goal: true,
    text: 'each side rail icon showed its panel, a second click closed it, I reopened it, and the panels kept the floors',
  },
  quietWhilePlaying: {
    goal: true,
    text: 'the top bar and the bottom rail made no React commit in 3 s of playback',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

/** In-page: the frame's boxes and the bar's zones. */
function frame() {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right };
  };
  const zonesOf = (root, names) =>
    names.map((zone) => {
      const el = root?.querySelector(`[data-zone="${zone}"]`);
      const r = el?.getBoundingClientRect();
      return {
        zone,
        left: r?.left ?? 0,
        right: r?.right ?? 0,
        clipped: el ? el.scrollWidth > Math.ceil(r.width) + 1 : true,
      };
    });
  const bar = document.querySelector('[data-testid="top-bar"]');
  const rail = document.querySelector('[data-testid="bottom-rail"]');
  const transport = rail
    ?.querySelector('[data-zone="transport"]')
    ?.getBoundingClientRect();
  return {
    fold: Number(bar?.dataset.fold ?? -1),
    bar: box('[data-testid="top-bar"]'),
    bottom: box('[data-testid="bottom-rail"]'),
    side: box('[data-testid="side-rail"]'),
    bottomZones: zonesOf(rail, ['master', 'transport', 'song']),
    transportCentre: transport ? transport.left + transport.width / 2 : null,
    root: box('.daw-root'),
    zones: zonesOf(bar, ['project', 'views', 'share']),
    main: box('[data-region="main"]'),
    dock: box('[data-region="dock"]'),
    inspector: box('[data-region="inspector"]'),
    libraryOpen: window.__MA_STORE__.getState().libraryOpen,
    toprail: document.querySelector('.dashboard-root header') !== null,
  };
}

const mountId = () =>
  document.querySelector('[data-region="inspector"]')?.dataset.mountId ?? null;

async function shellAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async (session) => {
      const { page } = session;
      await page.setViewportSize(viewport);
      // The Inspector's default depends on the window it opens in.
      await page.evaluate(() =>
        window.__MA_STORE__
          .getState()
          .addTrack('midi', 'piano-sampler', 'Shell Keys'),
      );
      await kit.waitForDraft(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await kit.waitForEditor(page, 180_000);
      await kit.settle(page, 'R29 open');
      await kit.sleep(500);
      const opened = await page.evaluate(frame);
      const floors = [];
      for (const region of ['top', 'bottom', 'rail'])
        floors.push(
          ...(await page.evaluate(designProbe, `[data-region="${region}"]`)),
        );

      // The four views and back.
      const ids = [await page.evaluate(mountId)];
      for (const view of ['studio', 'score', 'leadsheet', 'arrange']) {
        await page.click(`[data-tutorial-id="view-switch-${view}"]`);
        await kit.sleep(400);
        ids.push(await page.evaluate(mountId));
      }

      // Playback: the bars' commits (DevProfiler TopBar, BottomRail and the
      // transport inside it).
      const commits = () =>
        page.evaluate(() => {
          const stats = window.__MA_RENDER_STATS__;
          const ids = ['TopBar', 'BottomRail', 'TransportControls'];
          if (!stats || ids.some((id) => !stats[id])) return null;
          return ids.reduce((sum, id) => sum + stats[id].commits, 0);
        });
      await page.click('[data-testid="transport-play"]');
      await kit.sleep(500);
      const before = await commits();
      await kit.sleep(3000);
      const after = await commits();
      await page.click('[data-testid="transport-play"]');

      // The side rail, once (B4a).
      const panels =
        viewport.width === 1366 ? await sidePanels(page, kit) : null;

      // The dock, 3 steps taller from the keyboard, then a reload.
      await page.focus('[data-testid="dock-resizer"]');
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
      await kit.sleep(500);
      const resized = (await page.evaluate(frame)).dock?.h ?? 0;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await kit.waitForEditor(page, 180_000);
      await kit.settle(page, 'R29 reload');
      const reloaded = (await page.evaluate(frame)).dock?.h ?? 0;

      // The dashboard keeps the app's chrome.
      await kit.spaNavigate(page, '/studio');
      await kit.sleep(1500);
      const dashboardTopRail = await page.evaluate(
        () => document.querySelector('.dashboard-root header') !== null,
      );
      return {
        viewport,
        opened,
        floors,
        ids,
        playingCommits:
          before === null || after === null ? null : after - before,
        resized,
        reloaded,
        dashboardTopRail,
        panels,
      };
    },
    api,
  );
}

const PANELS = ['insight', 'library', 'fx', 'lessons', 'people', 'chat'];

/** Clicks through the side rail; what each icon showed, and the floors. */
async function sidePanels(page, kit) {
  const state = () =>
    page.evaluate(() => {
      const s = window.__MA_STORE__.getState();
      const el = document.querySelector('[data-testid="inspector-panel"]');
      return {
        open: s.libraryOpen,
        panel: el?.dataset.panel ?? null,
        pressed: [
          ...document.querySelectorAll(
            '[data-testid^="rail-"][aria-pressed="true"]',
          ),
        ].map((b) => b.dataset.panel),
      };
    });
  const shown = [];
  const floors = [];
  for (const id of PANELS) {
    await page.click(`[data-testid="rail-${id}"]`);
    await kit.sleep(300);
    const st = await state();
    shown.push(
      st.open && st.panel === id && st.pressed.join() === id
        ? id
        : `${id}≠${st.panel}`,
    );
    floors.push(
      ...(
        await page.evaluate(designProbe, '[data-testid="inspector-panel"]')
      ).map((f) => ({ ...f, panel: id })),
    );
  }
  // The last one again closes it; I opens it on the same panel.
  await page.click('[data-testid="rail-chat"]');
  await kit.sleep(300);
  const closed = await state();
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('i');
  await kit.sleep(300);
  const reopened = await state();
  return {
    shown,
    closed:
      !closed.open && closed.panel === null && closed.pressed.length === 0,
    reopened: reopened.open && reopened.panel === 'chat',
    floors,
  };
}

function judge(v) {
  const { width, height } = v.viewport;
  const o = v.opened;
  const body = height - 44 - 44;
  const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;
  const zonesOk =
    o.zones.every((z) => !z.clipped && z.right <= width) &&
    o.zones[0].right <= o.zones[1].left &&
    o.zones[1].right <= o.zones[2].left;
  const z = o.bottomZones;
  const railsOk =
    !!o.bottom &&
    near(o.bottom.h, 44, 0) &&
    near(o.bottom.w, width, 0) &&
    near(o.bottom.y + o.bottom.h, height, 0) &&
    z.every((zone) => !zone.clipped && zone.right <= width) &&
    z[0].right <= z[1].left &&
    z[1].right <= z[2].left &&
    o.transportCentre !== null &&
    near(o.transportCentre, width / 2) &&
    !!o.side &&
    near(o.side.w, 48, 0) &&
    near(o.side.right, width, 0) &&
    near(o.side.y, 44, 0) &&
    near(o.side.y + o.side.h, height - 44, 0);
  const canvas = (o.main?.w ?? 0) - 200;
  return {
    focusMode:
      !!o.root &&
      near(o.root.w, width, 0) &&
      near(o.root.h, height, 0) &&
      !o.toprail &&
      v.dashboardTopRail,
    topBar: !!o.bar && near(o.bar.h, 44, 0) && zonesOk,
    rails: railsOk,
    regionBudget:
      !!o.dock &&
      near(o.dock.h, Math.round(body * 0.36)) &&
      o.libraryOpen === width >= 1440 &&
      (width !== 1366 || canvas >= 1100),
    inspectorOnce: v.ids.every((id) => id !== null && id === v.ids[0]),
    layoutRestored: v.resized > (o.dock?.h ?? 0) && near(v.reloaded, v.resized),
    topBarFloors: v.floors.length === 0,
    sidePanels:
      v.panels === null ||
      (v.panels.shown.every((x, i) => x === PANELS[i]) &&
        v.panels.closed &&
        v.panels.reopened &&
        v.panels.floors.length === 0),
    quietWhilePlaying: v.playingCommits === 0,
  };
}

async function shell(kit, run) {
  const at = [];
  for (const viewport of VIEWPORTS) at.push(await shellAt(kit, run, viewport));
  const judged = at.map(judge);
  const all = (key) => judged.every((j) => j[key]);
  return {
    diffs: [],
    extraLosses: [],
    flags: Object.fromEntries(Object.keys(flags).map((key) => [key, all(key)])),
    checks: at.map((v, i) => ({
      viewport: `${v.viewport.width}x${v.viewport.height}`,
      fold: v.opened.fold,
      bar: v.opened.bar?.h,
      zones: [...v.opened.zones, ...v.opened.bottomZones].map(
        (z) =>
          `${z.zone} ${Math.round(z.left)}–${Math.round(z.right)}${z.clipped ? ' clipped' : ''}`,
      ),
      transportCentre:
        v.opened.transportCentre === null
          ? null
          : Math.round(v.opened.transportCentre),
      sideRail: v.opened.side && `${v.opened.side.w}×${v.opened.side.h}`,
      main:
        v.opened.main &&
        `${Math.round(v.opened.main.w)}×${Math.round(v.opened.main.h)}`,
      dock: v.opened.dock?.h,
      inspectorOpen: v.opened.libraryOpen,
      inspectorMounts: [...new Set(v.ids)],
      playingCommits: v.playingCommits,
      dockResized: `${v.resized} → ${v.reloaded} after reload`,
      sidePanels: v.panels && {
        shown: v.panels.shown,
        closed: v.panels.closed,
        reopened: v.panels.reopened,
        floors: v.panels.floors.map((f) =>
          f.kind === 'text'
            ? `${f.panel}: text ${f.size}px “${f.text}”`
            : `${f.panel}: target ${f.width}×${f.height} “${f.text}”`,
        ),
      },
      floors: v.floors.map((f) =>
        f.kind === 'text'
          ? `text ${f.size}px “${f.text}”`
          : `target ${f.width}×${f.height} “${f.text}”`,
      ),
      failed: Object.entries(judged[i])
        .filter(([, ok]) => !ok)
        .map(([key]) => key),
    })),
  };
}

export const scenarios = (kit) => [
  {
    group: 'R29',
    key: '',
    id: 'R29-shell',
    title:
      'The shell at 1366×655, 1440×787 and 1280×720: focus mode, the 44 px top bar and its fold, the bottom and side rails, the region budget, one Inspector, the layout after a reload, no commits while playing',
    run: (run) => shell(kit, run),
  },
];
