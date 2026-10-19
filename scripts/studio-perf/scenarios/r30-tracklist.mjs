/* eslint-env node */
/**
 * R30 track list and Create canvas (milestones 2.6, 2.7 and 2.13, fast), at
 * 1366×655, 1440×787 and 1280×720, on a project of six tracks opened fresh:
 *
 * - canvasBars: sections 24, ruler 32, chord 24 = 80 px over the lanes (the
 *   sections row above the list, then the editing tools beside the ruler
 *   and the chord lane's header), measured each and from the sections
 *   row's top to the first row's; footer 24; track rows 64 px; and Create's
 *   toolbar row is gone, + Marker with it (2.13 folded it away).
 * - rowsAligned: each row's top is its lane's top (±1 px) with the list
 *   scrolled to the top, the middle and the bottom (timeline-12). The
 *   canvas's own header (ruler and chord lane) is still 56 px.
 * - rowBudget: a Chromebook shows at least 4 whole rows with the dock open
 *   at its default height, and at least 6 with the dock closed (7 until the
 *   bottom rail took 44 px of the body, B4a; the owner's rails).
 * - trackKeys: with focus on a row's name, ↓ selects the next track, and
 *   Enter puts focus in the dock (A11Y#3).
 * - addSheet: + Add track opens the sheet, its grid has no sideways
 *   overflow, and Escape closes it.
 * - canvasFloors: no text under the floor and no target under 24×24 in the
 *   track area's v2 parts (the sections row, the track list's column with
 *   the tools, Snap and Grid, the chord lane's banner, the footer) and the
 *   sheet (designProbe.mjs; the track area sits in the legacy main region,
 *   so its v2 parts are probed in subtree mode). The canvas itself is
 *   drawn, not probed.
 * - listQuiet: the track list makes no React commit in 3 s of playback.
 * - rulerEnd: Snap and the Grid menu sit at the ruler's right end over the
 *   canvas (inside ruler-end, in the canvas's right half and its 32 px
 *   ruler band), visible and at least 24×24.
 * - footerZoom: −, the zoom level, +, Fit and Follow sit in the footer in
 *   that order, left to right, the buttons among them at least 24×24.
 *
 * And once, at 1366×655:
 * - emptyTiles: a new project's lanes show the four first steps, with no
 *   text or target under the floor (subtree mode, as canvasFloors).
 * - followPages: playing a long song at zoom 3 turns the timeline by pages
 *   (a few scroll writes, not one a frame), and a sideways scroll stops it.
 * - markerAdded: a right-click on the ruler's bar numbers just after a bar
 *   line, then "Add marker here", adds a marker named in the app's dialog,
 *   on that bar line (the grid, with snap on).
 * - bannerKept: a project with notes but no chords offers the analysis in
 *   the chord lane; Not now hides it, and it stays hidden after a reload.
 */
import { designProbe } from '../designProbe.mjs';

export const flags = {
  canvasBars: {
    goal: true,
    text: 'sections 24, tools 32, chord lane 24 (80 px over the lanes), footer 24 and 64 px rows, with no toolbar row and no + Marker',
  },
  rowsAligned: {
    goal: true,
    text: 'every row lined up with its lane at the top, middle and bottom of the list',
  },
  rowBudget: {
    goal: true,
    text: 'on a Chromebook, ≥ 4 whole rows with the dock open and ≥ 6 with it closed',
  },
  trackKeys: {
    goal: true,
    text: '↓ on a row selected the next track and Enter moved focus into the dock',
  },
  addSheet: {
    goal: true,
    text: 'the Add-track sheet opened with no sideways overflow and closed on Escape',
  },
  canvasFloors: {
    goal: true,
    text: 'no text under the floor and no target under 24×24 in the track area’s v2 parts (probed inside the legacy main region) or the sheet',
  },
  listQuiet: {
    goal: true,
    text: 'the track list made no React commit in 3 s of playback',
  },
  rulerEnd: {
    goal: true,
    text: 'Snap and the Grid menu sat at the ruler’s right end, visible and at least 24×24',
  },
  footerZoom: {
    goal: true,
    text: 'zoom out, the zoom level, zoom in, Fit and Follow sat in the footer in that order, the buttons at least 24×24',
  },
  emptyTiles: {
    goal: true,
    text: 'a new project showed the four first steps in its lanes, none under the floors',
  },
  followPages: {
    goal: true,
    text: 'the timeline turned by pages while playing and stopped following after a sideways scroll',
  },
  markerAdded: {
    goal: true,
    text: 'a right-click on the ruler’s bar numbers, then Add marker here, added a marker named in its dialog on the bar line clicked',
  },
  bannerKept: {
    goal: true,
    text: 'the chord lane offered the analysis, and Not now kept it hidden after a reload',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

/**
 * The canvas's own header, the ruler 32 and the chord lane 24: unchanged by
 * 2.13, whose sections row sits above the scroller instead.
 */
const LANE_HEADER = 56;
const ROW = 64;

/** The footer's zoom and Follow controls, left to right (contract §4). */
const FOOTER_CONTROLS = [
  'zoom-out',
  'zoom-level',
  'zoom-in',
  'zoom-fit',
  'follow-toggle',
];

/** In-page: the bars around the lanes, the rows and their lanes. */
function geometry() {
  const height = (testid) => {
    const el = document.querySelector(`[data-testid="${testid}"]`);
    return el ? el.getBoundingClientRect().height : null;
  };
  const scroller = document.querySelector('[data-testid="track-scroller"]');
  const canvas = scroller?.querySelector(':scope > div:nth-child(2) canvas');
  const canvasTop = canvas?.getBoundingClientRect().top ?? 0;
  const rows = [...document.querySelectorAll('[data-testid="track-row"]')];
  const sectionsTop = document
    .querySelector('[data-testid="sections-row"]')
    ?.getBoundingClientRect().top;
  return {
    sectionsRow: height('sections-row'),
    // From the sections row's top to the first row's, the list at its top.
    overLanes:
      rows.length && typeof sectionsTop === 'number'
        ? rows[0].getBoundingClientRect().top - sectionsTop
        : null,
    tools: height('timeline-tools'),
    chordLane: height('chord-lane-header'),
    footer: height('timeline-footer'),
    toolbarGone:
      !document.querySelector('[data-testid="create-toolbar"]') &&
      !document.querySelector('[data-testid="add-marker"]'),
    rowHeights: rows.map((r) => Math.round(r.getBoundingClientRect().height)),
    // Row top less its lane's top on the canvas (rows are 64 px apart).
    offsets: rows.map((r, i) =>
      Math.round(r.getBoundingClientRect().top - (canvasTop + 56 + i * 64)),
    ),
    scrollerHeight: scroller?.clientHeight ?? 0,
    scrollMax: scroller ? scroller.scrollHeight - scroller.clientHeight : 0,
  };
}

/**
 * In-page: Snap and the Grid menu at the ruler's right end, and the zoom
 * and Follow controls in the footer, each with its box, whether it is
 * inside its frame, visible, and a button (the 24×24 floor's subject); and
 * the canvas's box with the ruler band's top (the canvas draws the ruler
 * at the lanes' scroll offset).
 */
function headerControls(footerIds) {
  const scroller = document.querySelector('[data-testid="track-scroller"]');
  const canvas = scroller?.querySelector(':scope > div:nth-child(2) canvas');
  const end = document.querySelector('[data-testid="ruler-end"]');
  const footer = document.querySelector('[data-testid="timeline-footer"]');
  const BUTTON =
    'button, a[href], input, select, [role="button"], [role="switch"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
    };
  };
  const control = (testid, frame) => {
    const el = document.querySelector(`[data-testid="${testid}"]`);
    if (!el) return null;
    const box = boxOf(el);
    const style = getComputedStyle(el);
    return {
      ...box,
      inFrame: !!frame && frame.contains(el),
      visible:
        box.width > 1 &&
        box.height > 1 &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0,
      button: el.matches(BUTTON),
    };
  };
  const c = canvas ? boxOf(canvas) : null;
  return {
    canvas: c,
    rulerTop: c ? c.top + (scroller?.scrollTop ?? 0) : null,
    rulerEnd: {
      found: !!end,
      snap: control('snap-toggle', end),
      grid: control('grid-menu', end),
    },
    footer: {
      box: footer ? boxOf(footer) : null,
      controls: Object.fromEntries(
        footerIds.map((id) => [id, control(id, footer)]),
      ),
    },
  };
}

const scrollList = (page, where) =>
  page.evaluate((to) => {
    const el = document.querySelector('[data-testid="track-scroller"]');
    el.scrollTop =
      to === 'max'
        ? el.scrollHeight
        : to === 'mid'
          ? (el.scrollHeight - el.clientHeight) / 2
          : 0;
  }, where);

const fullRows = (g) => Math.floor((g.scrollerHeight - LANE_HEADER) / ROW);

async function seedTracks(kit, page, count) {
  await page.evaluate((n) => {
    const s = window.__MA_STORE__.getState();
    for (let i = 0; i < n; i++) {
      s.addTrack('midi', 'piano-sampler', `Row ${i + 1}`);
    }
    s.setSelectedTrackId(null);
  }, count);
  await kit.waitForDraft(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await kit.waitForEditor(page, 180_000);
}

async function listAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedTracks(kit, page, 6);
      await kit.settle(page, 'R30 open');
      await kit.sleep(500);

      const aligned = [];
      for (const where of ['top', 'mid', 'max']) {
        await scrollList(page, where);
        await kit.sleep(150);
        aligned.push((await page.evaluate(geometry)).offsets);
      }
      await scrollList(page, 'top');
      const open = await page.evaluate(geometry);
      // Snap and Grid at the ruler's end, zoom and Follow in the footer
      // (2.13), with the list at its top.
      const controls = await page.evaluate(headerControls, FOOTER_CONTROLS);

      // The dock closed (Enter on its edge), then open again.
      await page.focus('[data-testid="dock-resizer"]');
      await page.keyboard.press('Enter');
      await kit.sleep(400);
      const closed = await page.evaluate(geometry);
      await page.keyboard.press('Enter');
      await kit.sleep(400);

      // The list's keys.
      const first = page.locator('[data-track-selector]').first();
      await first.focus();
      await page.keyboard.press('ArrowDown');
      await kit.sleep(150);
      const selected = await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        return s.tracks.findIndex((t) => t.id === s.selectedTrackId);
      });
      await page.keyboard.press('Enter');
      await kit.sleep(400);
      const focusInDock = await page.evaluate(
        () => document.activeElement?.closest('[data-dock-content]') !== null,
      );

      // The track area sits in the legacy main region, so its v2 parts are
      // probed as roots whatever lies above them (designProbe's subtree
      // mode): the default skips everything under data-ds="legacy".
      const floors = await page.evaluate(designProbe, {
        root: '[data-testid="track-area"] [data-ds="v2"]',
        subtree: true,
      });

      // The sheet.
      await page.click('[data-tutorial-id="add-track-button"]');
      await kit.sleep(400);
      const sheet = await page.evaluate(() => {
        const dialog = document.querySelector(
          '[data-testid="add-track-sheet"]',
        );
        const grid = dialog?.querySelector('.grid');
        return {
          open: !!dialog,
          overflow: grid ? grid.scrollWidth > grid.clientWidth + 1 : true,
          dialogFits: dialog
            ? dialog.getBoundingClientRect().right <= window.innerWidth &&
              dialog.getBoundingClientRect().bottom <= window.innerHeight
            : false,
        };
      });
      const sheetFloors = await page.evaluate(
        designProbe,
        '[data-testid="add-track-sheet"]',
      );
      await page.keyboard.press('Escape');
      await kit.sleep(300);
      const sheetClosed = await page.evaluate(
        () => !document.querySelector('[data-testid="add-track-sheet"]'),
      );

      // Playback: the list's commits (DevProfiler TrackList).
      const commits = () =>
        page.evaluate(
          () => window.__MA_RENDER_STATS__?.TrackList?.commits ?? null,
        );
      await page.click('[data-testid="transport-play"]');
      await kit.sleep(500);
      const before = await commits();
      await kit.sleep(3000);
      const after = await commits();
      await page.click('[data-testid="transport-play"]');

      return {
        viewport,
        open,
        controls,
        closed,
        aligned,
        selected,
        focusInDock,
        floors: [...floors, ...sheetFloors],
        sheet: { ...sheet, closed: sheetClosed },
        playingCommits:
          before === null || after === null ? null : after - before,
      };
    },
    api,
  );
}

/** Snap or Grid: in ruler-end, in the canvas's right half and ruler band. */
function atRulerEnd(control, { canvas, rulerTop }) {
  return (
    !!control &&
    !!canvas &&
    control.inFrame &&
    control.visible &&
    control.width >= 24 &&
    control.height >= 24 &&
    control.left >= canvas.left + canvas.width / 2 &&
    control.right <= canvas.right + 0.5 &&
    control.top >= rulerTop - 0.5 &&
    control.bottom <= rulerTop + 32 + 0.5
  );
}

/** A zoom or Follow control: in the footer's box; a button is 24×24. */
function inFooter(control, footerBox) {
  return (
    !!control &&
    !!footerBox &&
    control.inFrame &&
    control.visible &&
    control.left >= footerBox.left - 0.5 &&
    control.right <= footerBox.right + 0.5 &&
    control.top >= footerBox.top - 0.5 &&
    control.bottom <= footerBox.bottom + 0.5 &&
    (!control.button || (control.width >= 24 && control.height >= 24))
  );
}

function judge(v) {
  const near = (a, b, tol = 1) =>
    typeof a === 'number' && Math.abs(a - b) <= tol;
  const chromebook = v.viewport.width === 1366;
  const { rulerEnd, footer } = v.controls;
  return {
    canvasBars:
      near(v.open.sectionsRow, 24) &&
      near(v.open.tools, 32) &&
      near(v.open.chordLane, 24) &&
      near(v.open.footer, 24) &&
      near(v.open.overLanes, 80) &&
      v.open.toolbarGone &&
      v.open.rowHeights.length > 0 &&
      v.open.rowHeights.every((h) => near(h, 64)),
    rowsAligned: v.aligned.every((offsets) =>
      offsets.every((o) => Math.abs(o) <= 1),
    ),
    rowBudget:
      !chromebook || (fullRows(v.open) >= 4 && fullRows(v.closed) >= 6),
    trackKeys: v.selected === 1 && v.focusInDock,
    addSheet:
      v.sheet.open && !v.sheet.overflow && v.sheet.dialogFits && v.sheet.closed,
    canvasFloors: v.floors.length === 0,
    listQuiet: v.playingCommits === 0,
    rulerEnd:
      rulerEnd.found &&
      atRulerEnd(rulerEnd.snap, v.controls) &&
      atRulerEnd(rulerEnd.grid, v.controls),
    footerZoom:
      FOOTER_CONTROLS.every((id) =>
        inFooter(footer.controls[id], footer.box),
      ) &&
      // Left to right, as FOOTER_CONTROLS lists them.
      FOOTER_CONTROLS.every(
        (id, i) =>
          i === 0 ||
          footer.controls[id].left >=
            footer.controls[FOOTER_CONTROLS[i - 1]].right - 0.5,
      ),
  };
}

/**
 * In-page: a point on the ruler's bar numbers, 23 px down the ruler (under
 * its 14 px loop strip; the canvas draws the ruler at the lanes' scroll
 * offset), just after a bar line, in the canvas's left half (Snap and Grid
 * hold its right end), clear of every marker's flag and name (a marker is
 * found over its flag and its name as drawn, with 3 px of slack:
 * markerHit.ts; names are measured here at 7 px a character, wider than
 * the ruler's font draws them) and of the playhead's handle; the bar
 * line's tick, whether snap is on, and how many markers there are. x is
 * null when the canvas or a clear spot is missing.
 */
function rulerSpot() {
  const s = window.__MA_STORE__.getState();
  const scroller = document.querySelector('[data-testid="track-scroller"]');
  const canvas = scroller?.querySelector(':scope > div:nth-child(2) canvas');
  const none = { x: null, y: null, tick: null, markers: s.markers.length };
  if (!canvas) return none;
  const box = canvas.getBoundingClientRect();
  // timelineScale.ts: 40 px a beat at zoom 1, 480 ticks a beat.
  const pxOf = (tick) =>
    box.left + (tick / 480) * 40 * s.timelineZoom - s.timelineScrollLeft;
  const playhead = pxOf(window.__MA_PLAYHEAD__?.tick?.() ?? s.position);
  const clear = (x) =>
    Math.abs(x - playhead) > 16 &&
    s.markers.every(
      (m) => x < pxOf(m.tick) - 4 || x > pxOf(m.tick) + 14 + m.name.length * 7,
    );
  const bar = s.timeSignatureNumerator * (1920 / s.timeSignatureDenominator);
  for (let k = 1; k < 2000; k++) {
    // 2 px after the bar line: its tick snaps back onto it.
    const x = pxOf(k * bar) + 2;
    if (x < box.left + 40) continue;
    if (x >= box.left + box.width / 2) break;
    if (clear(x)) {
      return {
        x,
        y: box.top + scroller.scrollTop + 23,
        tick: k * bar,
        snap: s.timelineSnapEnabled,
        markers: s.markers.length,
      };
    }
  }
  return none;
}

/** Once, at 1366×655: tiles, Follow, a marker from the ruler, the banner. */
async function canvasOnce(kit, run) {
  const viewport = VIEWPORTS[0];
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await kit.settle(page, 'R30 empty');
      await kit.sleep(400);
      const tiles = await page.evaluate(
        () =>
          document.querySelectorAll(
            '[data-testid="empty-project"] [data-testid^="empty-tile-"]',
          ).length,
      );
      const tileFloors = await page.evaluate(designProbe, {
        root: '[data-testid="empty-project"]',
        subtree: true,
      });

      // A long song, played at zoom 3 from the start.
      await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        const id = s.addTrack('midi', 'piano-sampler', 'Long');
        s.addMidiClip(id, {
          id: 'clip-long',
          name: 'Long',
          startTick: 0,
          durationTicks: 1920 * 64,
          events: [
            { note: 60, velocity: 90, startTick: 0, durationTicks: 480 },
          ],
        });
        s.setFollowPlayhead(true);
        s.setTimelineZoom(3);
        s.setTimelineScrollLeft(0);
        window.__R30_SCROLLS__ = [];
        window.__MA_STORE__.subscribe((next, prev) => {
          if (next.timelineScrollLeft !== prev.timelineScrollLeft) {
            window.__R30_SCROLLS__.push(next.timelineScrollLeft);
          }
        });
      });
      await kit.sleep(400);
      await page.click('[data-testid="transport-play"]');
      await kit.sleep(9000);
      const whilePlaying = await page.evaluate(() => [
        ...window.__R30_SCROLLS__,
      ]);
      // A sideways scroll over the lanes takes the view.
      const lanes = await page
        .locator('[data-testid="track-scroller"] > div:nth-child(2) canvas')
        .boundingBox();
      await page.mouse.move(lanes.x + 300, lanes.y + 100);
      await page.mouse.wheel(-200, 0);
      await kit.sleep(300);
      const afterWheel = await page.evaluate(
        () => window.__MA_STORE__.getState().timelineScrollLeft,
      );
      await kit.sleep(6000);
      const later = await page.evaluate(
        () => window.__MA_STORE__.getState().timelineScrollLeft,
      );
      await page.click('[data-testid="transport-play"]');
      await kit.sleep(300);

      // A marker from the ruler's menu (2.13: + Marker went with the
      // toolbar): a right-click on the bar numbers, Add marker here, and
      // its name in the app's dialog.
      const spot = await page.evaluate(rulerSpot);
      const markersBefore = spot.markers;
      let menuTarget = null;
      let dialogShown = false;
      if (spot.x !== null) {
        await page.mouse.click(spot.x, spot.y, { button: 'right' });
        await kit.sleep(400);
        menuTarget = await page.evaluate(
          () =>
            document
              .querySelector('[data-tutorial-id="clip-menu"]')
              ?.getAttribute('data-menu-target') ?? null,
        );
        const item = page.locator(
          '[data-tutorial-id="clip-menu"] [data-item="addMarker"]',
        );
        if (await item.count()) {
          await item.first().click({ timeout: 5000 });
          const field = page
            .locator('[role="dialog"][data-state="open"] input')
            .first();
          dialogShown = await field
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(
              () => true,
              () => false,
            );
          if (dialogShown) {
            await field.fill('Verse');
            await field.press('Enter');
          }
        }
        await kit.sleep(400);
        // Nothing left open for the banner below.
        const stillOpen = page.locator(
          '[data-tutorial-id="clip-menu"][data-state="open"]',
        );
        if (await stillOpen.count()) {
          await page.keyboard.press('Escape');
          await kit.sleep(200);
        }
      }
      const marker = await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        const verse = s.markers.find((m) => m.name === 'Verse');
        return {
          count: s.markers.length,
          named: !!verse,
          tick: verse?.tick ?? null,
        };
      });

      // The banner: notes, no chords, offered; Not now; a reload.
      await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        s.setChordRegions([]);
        s.offerChordAnalysis();
      });
      await kit.sleep(300);
      const offered = await page.evaluate(
        () => !!document.querySelector('[data-testid="chord-analysis-banner"]'),
      );
      await page.click(
        '[data-testid="chord-analysis-banner"] button:has-text("Not now")',
      );
      await kit.sleep(300);
      await kit.waitForDraft(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await kit.waitForEditor(page, 180_000);
      await kit.settle(page, 'R30 reload');
      await page.evaluate(() =>
        window.__MA_STORE__.getState().offerChordAnalysis(),
      );
      await kit.sleep(300);
      const afterReload = await page.evaluate(() => ({
        banner: !!document.querySelector(
          '[data-testid="chord-analysis-banner"]',
        ),
        dismissed: window.__MA_STORE__.getState().chordAnalysisDismissed,
      }));

      return {
        tiles,
        tileFloors,
        whilePlaying,
        afterWheel,
        later,
        spot,
        markersBefore,
        menuTarget,
        dialogShown,
        marker,
        offered,
        afterReload,
      };
    },
    api,
  );
}

/** A measured height for the report: rounded, or 'none' when missing. */
const px = (value) =>
  typeof value === 'number' ? `${Math.round(value)}` : 'none';

/** headerControls' controls for the report: `name w×h`, and what is off. */
function controlsText(group, names) {
  return names
    .map((name) => {
      const c = group?.[name];
      if (!c) return `${name} missing`;
      const off = [
        c.inFrame ? null : 'outside its frame',
        c.visible ? null : 'hidden',
      ].filter(Boolean);
      return `${name} ${c.width}×${c.height}${off.length ? ` (${off.join(', ')})` : ''}`;
    })
    .join(', ');
}

async function tracklist(kit, run) {
  const at = [];
  for (const viewport of VIEWPORTS) at.push(await listAt(kit, run, viewport));
  const once = await canvasOnce(kit, run);
  const judged = at.map(judge);
  const all = (key) => judged.every((j) => j[key]);
  const pages = once.whilePlaying.filter((x) => x > 0);
  const onceFlags = {
    emptyTiles: once.tiles === 4 && once.tileFloors.length === 0,
    // A page turn writes the scroll once: a handful in 9 s, not hundreds.
    followPages:
      pages.length >= 1 && pages.length <= 6 && once.later === once.afterWheel,
    // On the bar line clicked just after: snapped onto it, or within a few
    // ticks of it with snap off.
    markerAdded:
      once.marker.count === once.markersBefore + 1 &&
      once.marker.named &&
      once.spot.tick !== null &&
      once.marker.tick !== null &&
      Math.abs(once.marker.tick - once.spot.tick) <= (once.spot.snap ? 0 : 60),
    bannerKept:
      once.offered && !once.afterReload.banner && once.afterReload.dismissed,
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
        bars: `sections ${px(v.open.sectionsRow)}, tools ${px(v.open.tools)}, chord lane ${px(v.open.chordLane)} (${px(v.open.overLanes)} over the lanes), footer ${px(v.open.footer)}, rows ${[...new Set(v.open.rowHeights)].join('/')}${v.open.toolbarGone ? '' : ', toolbar or + Marker still there'}`,
        rulerEnd: controlsText(v.controls.rulerEnd, ['snap', 'grid']),
        footer: controlsText(v.controls.footer.controls, FOOTER_CONTROLS),
        offsets: v.aligned.map((o) => o.join(',')).join(' | '),
        rows: `${fullRows(v.open)} whole rows (dock open), ${fullRows(v.closed)} (dock closed)`,
        keys: `selected row ${v.selected}, focus in dock ${v.focusInDock}`,
        sheet: v.sheet,
        playingCommits: v.playingCommits,
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
        tiles: once.tiles,
        scrollWritesWhilePlaying: once.whilePlaying.map(Math.round),
        afterWheel: Math.round(once.afterWheel),
        sixSecondsLater: Math.round(once.later),
        marker: {
          ...once.marker,
          before: once.markersBefore,
          menu: once.menuTarget,
          dialog: once.dialogShown,
          at:
            once.spot.x === null
              ? 'no clear spot on the ruler'
              : `${Math.round(once.spot.x)},${Math.round(once.spot.y)} (bar line tick ${once.spot.tick}, snap ${once.spot.snap ? 'on' : 'off'})`,
        },
        banner: { offered: once.offered, ...once.afterReload },
        failed: Object.entries(onceFlags)
          .filter(([, ok]) => !ok)
          .map(([key]) => key),
      },
    ],
  };
}

export const scenarios = (kit) => [
  {
    group: 'R30',
    key: '',
    id: 'R30-tracklist',
    title:
      'The track list and Create canvas at 1366×655, 1440×787 and 1280×720: the 80 px lane header and 24 px footer, 64 px rows lined up with their lanes, the row budget, the list’s keys, the Add-track sheet, floors, no commits while playing, Snap and Grid at the ruler’s end, zoom and Follow in the footer; and once, the empty project, Follow, a marker from the ruler’s menu and the chord lane’s offer',
    run: (run) => tracklist(kit, run),
  },
];
