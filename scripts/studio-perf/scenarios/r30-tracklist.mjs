/* eslint-env node */
/**
 * R30 track list and Create canvas (milestones 2.6 and 2.7, fast), at
 * 1366×655, 1440×787 and 1280×720, on a project of six tracks opened fresh:
 *
 * - canvasBars: the toolbar is 32 px, the ruler 32 and the chord lane 24
 *   (88 px over the lanes), and track rows are 64 px.
 * - rowsAligned: each row's top is its lane's top (±1 px) with the list
 *   scrolled to the top, the middle and the bottom (timeline-12).
 * - rowBudget: a Chromebook shows at least 4 whole rows with the dock open
 *   at its default height, and at least 7 with the dock closed.
 * - trackKeys: with focus on a row's name, ↓ selects the next track, and
 *   Enter puts focus in the dock (A11Y#3).
 * - addSheet: + Add track opens the sheet, its grid has no sideways
 *   overflow, and Escape closes it.
 * - canvasFloors: no text under the floor and no target under 24×24 in the
 *   toolbar, the track list, the footer and the sheet (designProbe.mjs).
 * - listQuiet: the track list makes no React commit in 3 s of playback.
 *
 * And once, at 1366×655:
 * - emptyTiles: a new project's lanes show the four first steps.
 * - followPages: playing a long song at zoom 3 turns the timeline by pages
 *   (a few scroll writes, not one a frame), and a sideways scroll stops it.
 * - markerAdded: + Marker adds a marker at the playhead, named in its dialog.
 * - bannerKept: a project with notes but no chords offers the analysis in
 *   the chord lane; Not now hides it, and it stays hidden after a reload.
 */
import { designProbe } from '../designProbe.mjs';

export const flags = {
  canvasBars: {
    goal: true,
    text: 'toolbar 32, ruler 32, chord lane 24 and 64 px rows',
  },
  rowsAligned: {
    goal: true,
    text: 'every row lined up with its lane at the top, middle and bottom of the list',
  },
  rowBudget: {
    goal: true,
    text: 'on a Chromebook, ≥ 4 whole rows with the dock open and ≥ 7 with it closed',
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
    text: 'no text under the floor and no target under 24×24 in the toolbar, track list, footer or sheet',
  },
  listQuiet: {
    goal: true,
    text: 'the track list made no React commit in 3 s of playback',
  },
  emptyTiles: {
    goal: true,
    text: 'a new project showed the four first steps in its lanes',
  },
  followPages: {
    goal: true,
    text: 'the timeline turned by pages while playing and stopped following after a sideways scroll',
  },
  markerAdded: {
    goal: true,
    text: '+ Marker added a named marker at the playhead',
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

const LANE_HEADER = 56;
const ROW = 64;

/** In-page: the canvas's bars, the rows and their lanes. */
function geometry() {
  const box = (el) => {
    const r = el?.getBoundingClientRect();
    return r ? { top: r.top, height: r.height, width: r.width } : null;
  };
  const scroller = document.querySelector('[data-testid="track-scroller"]');
  const canvas = scroller?.querySelector(':scope > div:nth-child(2) canvas');
  const canvasTop = canvas?.getBoundingClientRect().top ?? 0;
  const rows = [...document.querySelectorAll('[data-testid="track-row"]')];
  return {
    toolbar: box(document.querySelector('[data-testid="create-toolbar"]'))
      ?.height,
    chordLane: box(document.querySelector('[data-testid="chord-lane-header"]'))
      ?.height,
    rowHeights: rows.map((r) => Math.round(r.getBoundingClientRect().height)),
    // Row top less its lane's top on the canvas (rows are 64 px apart).
    offsets: rows.map((r, i) =>
      Math.round(r.getBoundingClientRect().top - (canvasTop + 56 + i * 64)),
    ),
    scrollerHeight: scroller?.clientHeight ?? 0,
    scrollMax: scroller ? scroller.scrollHeight - scroller.clientHeight : 0,
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

      const floors = await page.evaluate(
        designProbe,
        '[data-testid="track-area"] [data-ds="v2"]',
      );

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

function judge(v) {
  const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
  const chromebook = v.viewport.width === 1366;
  return {
    canvasBars:
      near(v.open.toolbar, 32) &&
      near(v.open.chordLane, 24) &&
      v.open.rowHeights.every((h) => near(h, 64)),
    rowsAligned: v.aligned.every((offsets) =>
      offsets.every((o) => Math.abs(o) <= 1),
    ),
    rowBudget:
      !chromebook || (fullRows(v.open) >= 4 && fullRows(v.closed) >= 7),
    trackKeys: v.selected === 1 && v.focusInDock,
    addSheet:
      v.sheet.open && !v.sheet.overflow && v.sheet.dialogFits && v.sheet.closed,
    canvasFloors: v.floors.length === 0,
    listQuiet: v.playingCommits === 0,
  };
}

/** Once, at 1366×655: tiles, Follow, + Marker, the banner. */
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
      const tileFloors = await page.evaluate(
        designProbe,
        '[data-testid="empty-project"]',
      );

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

      // + Marker at the playhead, named in its dialog.
      const markersBefore = await page.evaluate(
        () => window.__MA_STORE__.getState().markers.length,
      );
      await page.click('[data-testid="add-marker"]');
      await kit.sleep(400);
      // The name opens selected: typing replaces it.
      await page.keyboard.type('Verse');
      await page.keyboard.press('Enter');
      await kit.sleep(400);
      const marker = await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        return { count: s.markers.length, last: s.markers.at(-1)?.name };
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
        markersBefore,
        marker,
        offered,
        afterReload,
      };
    },
    api,
  );
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
    markerAdded:
      once.marker.count === once.markersBefore + 1 &&
      once.marker.last === 'Verse',
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
        bars: `toolbar ${v.open.toolbar}, chord lane ${v.open.chordLane}, rows ${[...new Set(v.open.rowHeights)].join('/')}`,
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
        marker: once.marker,
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
      'The track list and Create canvas at 1366×655, 1440×787 and 1280×720: 64 px rows lined up with their lanes, the row budget, the list’s keys, the Add-track sheet, floors, no commits while playing; and once, the empty project, Follow, + Marker and the chord lane’s offer',
    run: (run) => tracklist(kit, run),
  },
];
