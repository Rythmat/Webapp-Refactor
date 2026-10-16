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
 * - dockTabs (2.9): the dock's tabs follow the selected track, Effects last:
 *   Instrument · Prism · Notes · Effects on a melodic track, Instrument ·
 *   Grooves · Notes · Effects on drums, none on an audio track; and the
 *   dock's frame, and the drums' kit, have no text under the floor or
 *   target under 24×24.
 * - dockMaster (2.9): the bottom rail's Master shows Master in the dock's
 *   slot, at the dock's height, and a second click gives it back.
 * - dockMaximize (2.9): Maximize grows the dock to the whole body (the
 *   canvas inert under it) and Escape gives the canvas back at the height
 *   it had.
 * - effectsArming (2.8, on the Chromebook): Add effect arms the slot and
 *   opens the Effects library; a pick fills it and arms the next; the
 *   armed slot's × stops and shuts the Inspector.
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
  dockTabs: {
    goal: true,
    text: 'the dock showed Instrument · Prism · Notes · Effects on keys, Instrument · Grooves · Notes · Effects on drums and no tabs on audio, with the floors kept',
  },
  dockMaster: {
    goal: true,
    text: 'Master opened in the dock’s slot at the dock’s height, and a second click gave it back',
  },
  dockMaximize: {
    goal: true,
    text: 'Maximize filled the body with the canvas inert, and Escape restored the dock’s height',
  },
  effectsArming: {
    goal: true,
    text: 'Add effect armed the slot and opened the library, a pick filled it and armed the next, × stopped and shut the Inspector',
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

      // The dock v2 (2.9) and the effects library's armed slot (2.8).
      const dockV2 = await dockChecks(page, kit, viewport);

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
        dockV2,
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

/** The dock's tabs, Master, Maximize and the effects library's arming. */
async function dockChecks(page, kit, viewport) {
  const store = (fn, arg) => page.evaluate(fn, arg);
  // Start from a shut Inspector and the keys track, on its Instrument tab.
  await store(() => {
    const s = window.__MA_STORE__.getState();
    s.setInspectorOpenFor('arrange', false);
    s.setSelectedTrackId(s.tracks[0].id);
    s.setChannelStripTab('controls');
  });
  await kit.sleep(400);
  const dockState = () =>
    store(() => {
      const dock = document.querySelector('[data-testid="dock"]');
      const region = document.querySelector('[data-region="dock"]');
      const main = document.querySelector('[data-region="main"]');
      const s = window.__MA_STORE__.getState();
      return {
        kind: dock?.dataset.kind ?? null,
        tabs: [...(dock?.querySelectorAll('[role="tab"]') ?? [])].map(
          (t) => t.textContent,
        ),
        h: Math.round(region?.getBoundingClientRect().height ?? 0),
        inert: main?.hasAttribute('inert') ?? false,
        maximized: s.dockMaximized,
        master: s.dockMaster,
        open: s.libraryOpen,
        panel: s.inspectorPanel,
        slot:
          document.querySelector('[data-testid="fx-add-slot"]')?.dataset
            .state ?? null,
      };
    });
  const keys = await dockState();
  const floors = [
    ...(await page.evaluate(designProbe, '[data-region="dock"]')),
  ];

  await store(() => {
    const s = window.__MA_STORE__.getState();
    s.setSelectedTrackId(s.addTrack('midi', 'drum-machine', 'Shell Drums'));
  });
  await kit.sleep(800);
  const drums = await dockState();
  // The drums' Instrument tab is the kit, on the design system.
  floors.push(
    ...(await page.evaluate(designProbe, '[data-region="dock"]')).map((f) => ({
      ...f,
      text: `kit: ${f.text}`,
    })),
  );
  await store(() => {
    const s = window.__MA_STORE__.getState();
    s.setSelectedTrackId(s.addTrack('audio', 'none', 'Shell Take'));
  });
  await kit.sleep(400);
  const audio = await dockState();
  await store(() => {
    const s = window.__MA_STORE__.getState();
    s.setSelectedTrackId(s.tracks[0].id);
  });
  await kit.sleep(300);
  const before = await dockState();

  // Master in the dock's slot, and back.
  await page.click('[data-testid="master-open"]');
  await kit.sleep(400);
  const master = await dockState();
  await page.click('[data-testid="master-open"]');
  await kit.sleep(300);
  const back = await dockState();

  // Maximize, then Escape.
  await page.click('[data-testid="dock-maximize"]');
  await kit.sleep(400);
  const maximized = await dockState();
  await page.keyboard.press('Escape');
  await kit.sleep(400);
  const restored = await dockState();

  // The effects library's armed slot, once.
  let arming = null;
  if (viewport.width === 1366) {
    await page.click('[data-tutorial-id="chanstrip-tab-fx"]');
    await kit.sleep(500);
    await page.click('[data-testid="fx-add-slot"]');
    await kit.sleep(400);
    const armed = await dockState();
    await page.click('[data-testid="inspector-fx-reverb"]');
    await kit.sleep(400);
    const picked = await dockState();
    const chain = await store(() => {
      const s = window.__MA_STORE__.getState();
      return s.tracks[0].activeEffects;
    });
    await page.click('[data-testid="fx-add-cancel"]');
    await kit.sleep(400);
    const cancelled = await dockState();
    arming = {
      armed: armed.open && armed.panel === 'fx' && armed.slot === 'armed',
      picked:
        chain.includes('reverb') && picked.open && picked.slot === 'armed',
      cancelled: !cancelled.open && cancelled.slot === 'idle',
    };
  }

  const body = viewport.height - 44 - 44;
  return {
    keys,
    drums,
    audio,
    floors,
    master,
    back,
    before,
    maximized,
    restored,
    body,
    arming,
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
    dockTabs:
      v.dockV2.keys.tabs.join(' · ') ===
        'Instrument · Prism · Notes · Effects' &&
      v.dockV2.drums.tabs.join(' · ') ===
        'Instrument · Grooves · Notes · Effects' &&
      v.dockV2.audio.tabs.length === 0 &&
      v.dockV2.audio.kind === 'audio' &&
      v.dockV2.floors.length === 0,
    dockMaster:
      v.dockV2.master.master &&
      v.dockV2.master.kind === 'master' &&
      near(v.dockV2.master.h, Math.round(v.dockV2.body * 0.36)) &&
      !v.dockV2.back.master &&
      v.dockV2.back.kind === 'melodic',
    dockMaximize:
      v.dockV2.maximized.maximized &&
      v.dockV2.maximized.inert &&
      near(v.dockV2.maximized.h, v.dockV2.body) &&
      !v.dockV2.restored.maximized &&
      !v.dockV2.restored.inert &&
      near(v.dockV2.restored.h, v.dockV2.before.h),
    effectsArming:
      v.dockV2.arming === null ||
      (v.dockV2.arming.armed &&
        v.dockV2.arming.picked &&
        v.dockV2.arming.cancelled),
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
      dockV2: {
        tabs: {
          keys: v.dockV2.keys.tabs.join(' · '),
          drums: v.dockV2.drums.tabs.join(' · '),
          audio: v.dockV2.audio.tabs.join(' · ') || '(none)',
        },
        floors: v.dockV2.floors.map((f) =>
          f.kind === 'text'
            ? `text ${f.size}px “${f.text}”`
            : `target ${f.width}×${f.height} “${f.text}”`,
        ),
        master: `${v.dockV2.master.kind} ${v.dockV2.master.h} px → ${v.dockV2.back.kind}`,
        maximize: `${v.dockV2.before.h} → ${v.dockV2.maximized.h} px (body ${v.dockV2.body}, inert ${v.dockV2.maximized.inert}) → ${v.dockV2.restored.h} px`,
        arming: v.dockV2.arming,
      },
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
      'The shell at 1366×655, 1440×787 and 1280×720: focus mode, the 44 px top bar and its fold, the bottom and side rails, the region budget, one Inspector, the layout after a reload, no commits while playing, the dock’s tabs, Master, Maximize and the effects library’s armed slot',
    run: (run) => shell(kit, run),
  },
];
