/* eslint-env node */
/**
 * R29 shell (milestones 2.4 and 2.5, fast), at 1366×655 (a Chromebook in
 * focus mode), 1440×787 (a laptop) and 1280×720 (the smallest window). The
 * editor's frame, opened fresh at each size:
 *
 * - focusMode: the editor fills the window (no sidebar, no TopRail); the
 *   Studio dashboard still has its TopRail.
 * - topBar: the top bar is 44 px, and none of its three zones clips or runs
 *   into the next (the bar folds instead, useToolbarOverflow).
 * - regionBudget: the dock opens at 36% of the body (220 px on a
 *   Chromebook, within 2 px), the Inspector starts closed below 1440 px and
 *   open from it, and the timeline is at least 1,120 px wide on a
 *   Chromebook (plan, pixel budget).
 * - inspectorOnce: the Inspector keeps its mount across Create → Mix →
 *   Score → Lead sheet → Create.
 * - layoutRestored: a dock made taller with the keyboard comes back that
 *   tall after a reload (the student's prefs).
 * - topBarFloors: no text under the floor and no target under 24×24 in the
 *   top bar (designProbe.mjs).
 * - quietWhilePlaying: the top bar makes no React commit in 3 s of playback
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
  regionBudget: {
    goal: true,
    text: 'dock at 36% of the body, Inspector closed below 1440 px and open from it, timeline ≥ 1,120 px on a Chromebook',
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
    text: 'no text under the floor and no target under 24×24 in the top bar',
  },
  quietWhilePlaying: {
    goal: true,
    text: 'the top bar made no React commit in 3 s of playback',
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
  const bar = document.querySelector('[data-testid="top-bar"]');
  const zones = ['project', 'transport', 'views'].map((zone) => {
    const el = document.querySelector(`[data-zone="${zone}"]`);
    const r = el?.getBoundingClientRect();
    return {
      zone,
      left: r?.left ?? 0,
      right: r?.right ?? 0,
      clipped: el ? el.scrollWidth > Math.ceil(r.width) + 1 : true,
    };
  });
  return {
    fold: Number(bar?.dataset.fold ?? -1),
    bar: box('[data-testid="top-bar"]'),
    root: box('.daw-root'),
    zones,
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
      const floors = await page.evaluate(designProbe, '[data-region="top"]');

      // The four views and back.
      const ids = [await page.evaluate(mountId)];
      for (const view of ['studio', 'score', 'leadsheet', 'arrange']) {
        await page.click(`[data-tutorial-id="view-switch-${view}"]`);
        await kit.sleep(400);
        ids.push(await page.evaluate(mountId));
      }

      // Playback: the top bar's commits (DevProfiler TopBar).
      const commits = () =>
        page.evaluate(
          () => window.__MA_RENDER_STATS__?.TopBar?.commits ?? null,
        );
      await page.click('[data-testid="transport-play"]');
      await kit.sleep(500);
      const before = await commits();
      await kit.sleep(3000);
      const after = await commits();
      await page.click('[data-testid="transport-play"]');

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
      };
    },
    api,
  );
}

function judge(v) {
  const { width, height } = v.viewport;
  const o = v.opened;
  const body = height - 44;
  const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;
  const zonesOk =
    o.zones.every((z) => !z.clipped && z.right <= width) &&
    o.zones[0].right <= o.zones[1].left &&
    o.zones[1].right <= o.zones[2].left;
  const canvas = (o.main?.w ?? 0) - 200;
  return {
    focusMode:
      !!o.root &&
      near(o.root.w, width, 0) &&
      near(o.root.h, height, 0) &&
      !o.toprail &&
      v.dashboardTopRail,
    topBar: !!o.bar && near(o.bar.h, 44, 0) && zonesOk,
    regionBudget:
      !!o.dock &&
      near(o.dock.h, Math.round(body * 0.36)) &&
      o.libraryOpen === width >= 1440 &&
      (width !== 1366 || canvas >= 1120),
    inspectorOnce: v.ids.every((id) => id !== null && id === v.ids[0]),
    layoutRestored: v.resized > (o.dock?.h ?? 0) && near(v.reloaded, v.resized),
    topBarFloors: v.floors.length === 0,
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
      zones: v.opened.zones.map(
        (z) =>
          `${z.zone} ${Math.round(z.left)}–${Math.round(z.right)}${z.clipped ? ' clipped' : ''}`,
      ),
      main:
        v.opened.main &&
        `${Math.round(v.opened.main.w)}×${Math.round(v.opened.main.h)}`,
      dock: v.opened.dock?.h,
      inspectorOpen: v.opened.libraryOpen,
      inspectorMounts: [...new Set(v.ids)],
      playingCommits: v.playingCommits,
      dockResized: `${v.resized} → ${v.reloaded} after reload`,
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
      'The shell at 1366×655, 1440×787 and 1280×720: focus mode, the 44 px top bar and its fold, the region budget, one Inspector, the layout after a reload, no commits while playing',
    run: (run) => shell(kit, run),
  },
];
