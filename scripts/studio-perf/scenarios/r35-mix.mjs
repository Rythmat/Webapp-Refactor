/* eslint-env node */
/**
 * R35 the Mix view (milestone 2.10, fast and full), at 1366×655 (a
 * Chromebook in focus mode), 1440×787 (a laptop, the Inspector pinned) and
 * 1280×720. Each size opens a fresh project of keys tracks up to the
 * project's cap (ten), each with a clip of notes from bar 1, and goes to
 * Mix. There is no baseline, so every
 * flag must hold.
 *
 * - stripsFillHeight: with the rack shut the strips row is the body less
 *   the RackDock's 32 px bar (±2) and a strip's fader travels at least
 *   160 px; with the rack open at its default, at least 100 px (strips are
 *   96 px wide and fill the height, owner's decision 2026-10-18).
 * - stripCount: at 1440×787 with the Inspector open, at least 8 whole track
 *   strips show beside the 240 px master column; at 1366×655 with it
 *   closed, at least 9.
 * - masterColumn: the column is 240 px wide and holds the master fader, the
 *   Peak meter, the chain summary (an insert list) and the spectrum, whose
 *   canvas paints more while playing than idle.
 * - rackShare: the RackDock opens at round(body × 0.36) (±2); dragged
 *   taller by its edge, it keeps that share of the body after the window
 *   is made 90 px shorter.
 * - rackTargets: a strip's insert list opens that track's rack; Return A's
 *   name opens its rack (return-fx-A); the master's chain summary opens the
 *   master rack; and the side rail's Effects panel adds to the rack that is
 *   open (a Compressor lands on the master chain).
 * - oneMaster: Create's dock Master shows the chain the Mix view added to,
 *   and an EQ added there (the Effects panel, the dock's Master open) shows
 *   in the Mix view's chain summary.
 * - mixFloors: the design probe in subtree mode on the Mix view and the
 *   RackDock (rack shut and open): no text under the floor, no target under
 *   24×24; and nothing runs out sideways (the page, the master column, each
 *   strip).
 * - quietWhilePlaying: the Mix view (DevProfiler StudioView) makes no React
 *   commit in 3 s of playback, while a strip's meter moves.
 * - muteAll: with one track muted, Mute All mutes every track (pressed);
 *   pressed again, only that track stays muted.
 *
 * A step that throws is recorded with its error and the next goes on.
 */
import { designProbe } from '../designProbe.mjs';

export const flags = {
  stripsFillHeight: {
    goal: true,
    text: 'the strips filled the body less the rack bar, the fader ≥ 160 px with the rack shut and ≥ 100 px open',
  },
  stripCount: {
    goal: true,
    text: '≥ 8 whole strips at 1440×787 with the Inspector open, ≥ 9 at 1366×655 with it closed, beside the master column',
  },
  masterColumn: {
    goal: true,
    text: 'the master column was 240 px with its fader, Peak meter, chain summary and a spectrum that painted while playing',
  },
  rackShare: {
    goal: true,
    text: 'the rack opened at 36 % of the body and a dragged height kept its share through a resize',
  },
  rackTargets: {
    goal: true,
    text: 'an insert list, Return A and the master chain each opened their rack, and the Effects panel added to the open one',
  },
  oneMaster: {
    goal: true,
    text: 'Create’s dock Master and the Mix view showed the same master chain after an add in either',
  },
  mixFloors: {
    goal: true,
    text: 'no text under the floor, no target under 24×24 and nothing running out sideways in the Mix view or the rack',
  },
  quietWhilePlaying: {
    goal: true,
    text: 'the Mix view made no React commit in 3 s of playback while its meters moved',
  },
  muteAll: {
    goal: true,
    text: 'Mute All muted every track, and off gave back exactly the earlier mutes',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

const BAR_PX = 32;
const MIX = '[data-testid="mix-view"]';
const RACK = '[data-testid="rack-dock"]';
const STRIP = '[data-testid="mix-strip"]';

// ── In-page helpers (self-contained) ────────────────────────────────────────

/** In-page: the Mix view's boxes. */
function mixNow() {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right };
  };
  const row = document.querySelector('[data-testid="mix-strips"]');
  const rowBox = row?.getBoundingClientRect();
  const strips = [...document.querySelectorAll('[data-testid="mix-strip"]')];
  const whole = rowBox
    ? strips.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= rowBox.left - 0.5 && r.right <= rowBox.right + 0.5;
      }).length
    : 0;
  const fader = strips[0]?.querySelector(
    '[role="slider"][aria-label^="Volume"]',
  );
  const column = document.querySelector('[data-testid="master-column"]');
  const s = window.__MA_STORE__.getState();
  return {
    view: s.currentView,
    libraryOpen: s.libraryOpen,
    mixRack: s.mixRack,
    row: box(row),
    strips: strips.length,
    whole,
    fader: fader ? Math.round(fader.getBoundingClientRect().height) : null,
    column: box(column),
    masterFader: !!column?.querySelector(
      '[data-tutorial-id="master-strip"] [role="slider"]',
    ),
    peak: /Peak/i.test(
      column?.querySelector('[data-tutorial-id="master-strip"]')?.textContent ??
        '',
    ),
    chainSummary: !!column?.querySelector(
      '[data-tutorial-id="mastering-section"] [data-testid="insert-list"]',
    ),
    spectrum: !!column?.querySelector('[data-testid="master-spectrum"] canvas'),
    dock: box(document.querySelector('[data-region="dock"]')),
    rack: box(document.querySelector('[data-testid="rack-dock"]')),
    rackKind:
      document.querySelector('[data-testid="rack-dock"]')?.dataset.rack ?? null,
    returnFxA: !!document.querySelector('[data-tutorial-id="return-fx-A"]'),
  };
}

/** In-page: what runs out sideways (the page, the master column, strips). */
function overflowNow() {
  const out = [];
  const doc = document.scrollingElement;
  if (doc && doc.scrollWidth > window.innerWidth + 1)
    out.push(`page ${doc.scrollWidth} > ${window.innerWidth}`);
  const column = document.querySelector('[data-testid="master-column"]');
  if (column && column.scrollWidth > column.clientWidth + 1)
    out.push(`master column ${column.scrollWidth} > ${column.clientWidth}`);
  for (const el of document.querySelectorAll(
    '[data-testid="mix-strip"], [data-testid="return-strip"]',
  )) {
    if (el.scrollWidth > el.clientWidth + 1)
      out.push(
        `${el.dataset.trackId ?? el.dataset.returnId} ${el.scrollWidth} > ${el.clientWidth}`,
      );
  }
  return out.slice(0, 10);
}

/** In-page: painted pixels of a canvas (alpha > 0), or null. */
function paintedPixels(selector) {
  const canvas = document.querySelector(selector);
  if (!canvas || !canvas.width || !canvas.height) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n += 1;
  return n;
}

/** In-page: a digest of a canvas's pixels (a change shows a meter moving). */
function canvasDigest(selector) {
  const canvas = document.querySelector(selector);
  const ctx = canvas?.getContext('2d');
  if (!ctx || !canvas.width || !canvas.height) return null;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0;
  let lit = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum = (sum * 31 + data[i] + data[i + 1] * 3 + data[i + 3] * 7) >>> 0;
    if (data[i + 3] > 0) lit += 1;
  }
  return `${lit}:${sum}`;
}

// ── Node-side helpers ───────────────────────────────────────────────────────

const store = (page, fn, arg) => page.evaluate(fn, arg);
const mix = (page) => page.evaluate(mixNow);

/**
 * Keys tracks up to the project's cap (ten; addTrack refuses past it), a
 * clip of notes each from bar 1; Keys 1 selected.
 */
async function seedTracks(kit, page) {
  await page.evaluate(() => {
    const s = window.__MA_STORE__.getState();
    const note = (n, t) => ({
      note: n,
      velocity: 110,
      startTick: t,
      durationTicks: 900,
      channel: 0,
    });
    const ids = [];
    for (let i = 0; i < 12; i++) {
      const id = s.addTrack('midi', 'piano-sampler', `Keys ${i + 1}`);
      if (
        !id ||
        !window.__MA_STORE__.getState().tracks.some((t) => t.id === id)
      )
        break;
      ids.push(id);
      s.addMidiClip(id, {
        id: `r35-clip-${i}`,
        name: `Part ${i + 1}`,
        startTick: 0,
        durationTicks: 7680,
        events: [0, 960, 1920, 2880, 3840, 4800, 5760, 6720].map((t, k) =>
          note(48 + ((i * 5 + k * 7) % 24), t),
        ),
      });
    }
    s.setSelectedTrackId(ids[0]);
    s.setSelectedClip(null, null);
  });
  await kit.sleep(800);
}

/** Mix, the Inspector as asked, the rack shut. */
async function showMix(kit, page, { inspector = false } = {}) {
  if (
    (await store(page, () => window.__MA_STORE__.getState().currentView)) !==
    'studio'
  ) {
    await page.click('[data-tutorial-id="view-switch-studio"]');
  }
  await page.waitForSelector(MIX, { timeout: 30_000 });
  await store(
    page,
    (open) => {
      const s = window.__MA_STORE__.getState();
      s.setInspectorOpenFor('studio', open);
      s.setMixRack(null);
    },
    inspector,
  );
  await kit.sleep(700);
}

/** The subtree probe on the Mix view and the RackDock. */
async function mixProbe(page) {
  const findings = [];
  for (const root of [MIX, RACK]) {
    if (await page.locator(root).count())
      findings.push(
        ...(await page.evaluate(designProbe, { root, subtree: true })).map(
          (f) =>
            f.kind === 'text'
              ? `${root}: text ${f.size}px “${f.text}”`
              : `${root}: target ${f.width}×${f.height} “${f.text}”`,
        ),
      );
  }
  return findings;
}

/**
 * The side rail's Effects panel in the Inspector: a click on its icon,
 * unless it already shows (a second click would close it).
 */
async function showEffectsPanel(page) {
  const shown = await page
    .locator('[data-testid="inspector-panel"][data-panel="fx"]')
    .isVisible()
    .catch(() => false);
  if (!shown) await page.click('[data-testid="rail-fx"]');
}

/** A real drag of the rack's top edge, `dy` px (up is taller). */
async function dragRackEdge(kit, page, dy) {
  const box = await page
    .locator('[data-testid="rack-resizer"]')
    .boundingBox({ timeout: 5000 });
  if (!box) throw new Error('no rack edge to drag');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x, y + (dy * i) / 6);
  await page.mouse.up();
  await kit.sleep(500);
}

// ── One size ────────────────────────────────────────────────────────────────

async function mixAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await kit.settle(page, 'R35 open');
      const body = viewport.height - 88;
      const out = { viewport: `${viewport.width}x${viewport.height}`, body };
      out.errors = [];
      const step = async (name, fn) => {
        try {
          out[name] = await fn();
        } catch (err) {
          out.errors.push(`${name}: ${String(err).slice(0, 200)}`);
          out[name] = null;
        }
      };
      await step('seed', () => seedTracks(kit, page));

      // Shut: the height, the count (the laptop with the Inspector open),
      // the master column, the floors.
      await step('shut', async () => {
        await showMix(kit, page, { inspector: viewport.width >= 1440 });
        return {
          ...(await mix(page)),
          floors: await mixProbe(page),
          overflow: await page.evaluate(overflowNow),
        };
      });

      // A strip's insert list opens its track's rack, at its share.
      await step('trackRack', async () => {
        await store(page, () =>
          window.__MA_STORE__.getState().setInspectorOpenFor('studio', false),
        );
        await kit.sleep(400);
        await page
          .locator(`${STRIP} [data-testid="insert-list"] button`)
          .first()
          .click({ timeout: 5000 });
        await kit.sleep(700);
        const now = await mix(page);
        const first = await store(
          page,
          () => window.__MA_STORE__.getState().tracks[0].id,
        );
        return {
          ...now,
          first,
          floors: await mixProbe(page),
          overflow: await page.evaluate(overflowNow),
        };
      });

      // Return A's name opens its rack.
      await step('returnRack', async () => {
        await page
          .locator(
            '[data-tutorial-id="return-strip-A"] [data-testid="return-strip-name"]',
          )
          .click({ timeout: 5000 });
        await kit.sleep(600);
        return mix(page);
      });

      // The master's chain summary opens the master rack; the Effects panel
      // adds a Compressor to it.
      await step('masterRack', async () => {
        await page
          .locator(
            '[data-tutorial-id="mastering-section"] [data-testid="insert-list"] button',
          )
          .first()
          .click({ timeout: 5000 });
        await kit.sleep(600);
        const opened = await mix(page);
        await showEffectsPanel(page);
        await kit.sleep(700);
        await page.click(
          '[data-tutorial-id="fx-add-compressor"][data-tutorial-target="master"]',
          { timeout: 5000 },
        );
        await kit.sleep(600);
        const chain = await store(page, () => [
          ...window.__MA_STORE__.getState().masteringFxChain,
        ]);
        await store(page, () =>
          window.__MA_STORE__.getState().setInspectorOpenFor('studio', false),
        );
        await kit.sleep(300);
        return { opened, chain };
      });

      // The rack's share, dragged and through a resize.
      await step('share', async () => {
        await store(page, () =>
          window.__MA_STORE__.getState().setMixRack({ kind: 'master' }),
        );
        await kit.sleep(500);
        const atDefault = (await mix(page)).dock?.h ?? null;
        await dragRackEdge(kit, page, -60);
        const dragged = await mix(page);
        const frac = await store(
          page,
          () => window.__MA_STORE__.getState().dockHeights.rack ?? null,
        );
        const shorter = viewport.height - 90;
        await page.setViewportSize({ width: viewport.width, height: shorter });
        await kit.sleep(800);
        const resized = (await mix(page)).dock?.h ?? null;
        await page.setViewportSize(viewport);
        await kit.sleep(800);
        // Back to the default share for the steps after.
        await store(page, () => {
          const s = window.__MA_STORE__.getState();
          s.setDockHeight('rack', 0.36);
          s.setMixRack(null);
        });
        await kit.sleep(400);
        const wantResized =
          frac === null
            ? null
            : Math.max(120, Math.round((shorter - 88) * frac));
        return {
          atDefault,
          want: Math.round(body * 0.36),
          dragged: dragged.dock?.h ?? null,
          frac,
          resized,
          wantResized,
        };
      });

      // One master: Create's dock Master, and an add there.
      await step('oneMaster', async () => {
        await page.click('[data-tutorial-id="view-switch-arrange"]');
        await kit.sleep(800);
        await page.click('[data-testid="master-open"]');
        await kit.sleep(700);
        const slotsOf = () =>
          page.evaluate(() =>
            [
              ...document.querySelectorAll(
                '[data-region="dock"] [data-testid="fx-rack"][data-rack="master"] [data-tutorial-id^="fx-slot-"]',
              ),
            ].map((el) => el.dataset.tutorialId.replace('fx-slot-', '')),
          );
        const dockSeen = await slotsOf();
        await showEffectsPanel(page);
        await kit.sleep(700);
        await page.click(
          '[data-tutorial-id="fx-add-eq"][data-tutorial-target="master"]',
          { timeout: 5000 },
        );
        await kit.sleep(600);
        const chain = await store(page, () => [
          ...window.__MA_STORE__.getState().masteringFxChain,
        ]);
        const dockAfter = await slotsOf();
        await store(page, () => {
          const s = window.__MA_STORE__.getState();
          s.setInspectorOpenFor('arrange', false);
          s.setDockMaster(false);
        });
        await showMix(kit, page);
        const mixRows = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '[data-tutorial-id="mastering-section"] [data-testid="insert-power"]',
            ),
          ].map((el) => el.closest('button')?.getAttribute('aria-label') ?? ''),
        );
        return { dockSeen, dockAfter, chain, mixRows };
      });

      // Playback: no commits from the Mix view, the meters move, the
      // spectrum paints.
      await step('playing', async () => {
        await showMix(kit, page);
        const meter = `${STRIP} canvas`;
        const spectrum = '[data-testid="master-spectrum"] canvas';
        const idle = await page.evaluate(paintedPixels, spectrum);
        const commits = () =>
          page.evaluate(
            () => window.__MA_RENDER_STATS__?.StudioView?.commits ?? null,
          );
        await page.click('[data-testid="transport-play"]');
        await kit.sleep(600);
        const before = await commits();
        const digests = [];
        let painted = 0;
        for (let i = 0; i < 6; i++) {
          await kit.sleep(500);
          digests.push(await page.evaluate(canvasDigest, meter));
          painted = Math.max(
            painted,
            (await page.evaluate(paintedPixels, spectrum)) ?? 0,
          );
        }
        const after = await commits();
        await page.click('[data-testid="transport-play"]');
        await kit.sleep(400);
        return {
          commits: before === null || after === null ? null : after - before,
          meterStates: new Set(digests.filter(Boolean)).size,
          spectrumIdle: idle,
          spectrumPlaying: painted,
        };
      });

      // Mute All, with Keys 2 muted already.
      await step('muteAll', async () => {
        await store(page, () => {
          const s = window.__MA_STORE__.getState();
          for (const t of s.tracks) if (t.mute) s.toggleMute(t.id);
          s.toggleMute(s.tracks[1].id);
        });
        await kit.sleep(300);
        const muted = () =>
          store(page, () =>
            window.__MA_STORE__
              .getState()
              .tracks.filter((t) => t.mute)
              .map((t) => t.name),
          );
        const pressed = () =>
          page.locator('[data-testid="mute-all"]').getAttribute('aria-pressed');
        await page.click('[data-testid="mute-all"]');
        await kit.sleep(400);
        const count = await store(
          page,
          () => window.__MA_STORE__.getState().tracks.length,
        );
        const on = {
          muted: await muted(),
          pressed: await pressed(),
          count,
        };
        await page.click('[data-testid="mute-all"]');
        await kit.sleep(400);
        const off = { muted: await muted(), pressed: await pressed() };
        return { on, off };
      });
      return out;
    },
    api,
  );
}

// ── The verdicts ────────────────────────────────────────────────────────────

function judge(v) {
  const near = (a, b, tol = 2) =>
    typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
  const { shut, trackRack: track, returnRack: ret, masterRack: master } = v;
  const width = Number(v.viewport.split('x')[0]);
  const playing = v.playing;
  return {
    stripsFillHeight:
      !!shut &&
      near(shut.row?.h, v.body - BAR_PX) &&
      shut.fader >= 160 &&
      !!track &&
      track.fader >= 100,
    stripCount:
      !!shut &&
      (width === 1440
        ? shut.libraryOpen && shut.whole >= 8
        : width === 1366
          ? !shut.libraryOpen && shut.whole >= 9
          : shut.whole >= 1),
    masterColumn:
      !!shut &&
      near(shut.column?.w, 240, 1) &&
      shut.masterFader &&
      shut.peak &&
      shut.chainSummary &&
      shut.spectrum &&
      !!playing &&
      playing.spectrumPlaying > (playing.spectrumIdle ?? 0),
    rackShare:
      !!v.share &&
      near(v.share.atDefault, v.share.want) &&
      v.share.frac !== null &&
      v.share.dragged > v.share.atDefault &&
      near(v.share.resized, v.share.wantResized),
    rackTargets:
      !!track &&
      track.mixRack?.kind === 'track' &&
      track.mixRack.id === track.first &&
      track.rackKind === 'track' &&
      !!ret &&
      ret.mixRack?.kind === 'return' &&
      ret.mixRack.id === 'A' &&
      ret.returnFxA &&
      !!master &&
      master.opened.mixRack?.kind === 'master' &&
      master.opened.rackKind === 'master' &&
      master.chain.includes('compressor'),
    oneMaster:
      !!v.oneMaster &&
      v.oneMaster.dockSeen.includes('compressor') &&
      v.oneMaster.chain.includes('eq') &&
      v.oneMaster.dockAfter.join() === v.oneMaster.chain.join() &&
      v.oneMaster.mixRows.length === Math.min(3, v.oneMaster.chain.length),
    mixFloors:
      !!shut &&
      !!track &&
      shut.floors.length === 0 &&
      track.floors.length === 0 &&
      shut.overflow.length === 0 &&
      track.overflow.length === 0,
    quietWhilePlaying:
      !!playing && playing.commits === 0 && playing.meterStates > 1,
    muteAll:
      !!v.muteAll &&
      v.muteAll.on.muted.length === v.muteAll.on.count &&
      v.muteAll.on.pressed === 'true' &&
      v.muteAll.off.muted.join() === 'Keys 2' &&
      v.muteAll.off.pressed !== 'true',
  };
}

async function mixScenario(kit, run) {
  const at = [];
  for (const viewport of VIEWPORTS) at.push(await mixAt(kit, run, viewport));
  const judged = at.map(judge);
  return {
    diffs: [],
    extraLosses: [],
    flags: Object.fromEntries(
      Object.keys(flags).map((key) => [key, judged.every((j) => j[key])]),
    ),
    checks: at.map((v, i) => ({
      viewport: v.viewport,
      failed: Object.entries(judged[i])
        .filter(([, ok]) => !ok)
        .map(([key]) => key),
      errors: v.errors,
      body: v.body,
      shut: v.shut && {
        row: v.shut.row && Math.round(v.shut.row.h),
        fader: v.shut.fader,
        strips: `${v.shut.whole} whole of ${v.shut.strips}`,
        inspector: v.shut.libraryOpen,
        column: v.shut.column && Math.round(v.shut.column.w),
        parts: {
          fader: v.shut.masterFader,
          peak: v.shut.peak,
          chain: v.shut.chainSummary,
          spectrum: v.shut.spectrum,
        },
        floors: v.shut.floors,
        overflow: v.shut.overflow,
      },
      trackRack: v.trackRack && {
        mixRack: v.trackRack.mixRack,
        rack: v.trackRack.rackKind,
        dock: v.trackRack.dock && Math.round(v.trackRack.dock.h),
        fader: v.trackRack.fader,
        floors: v.trackRack.floors,
        overflow: v.trackRack.overflow,
      },
      returnRack: v.returnRack && {
        mixRack: v.returnRack.mixRack,
        returnFxA: v.returnRack.returnFxA,
      },
      masterRack: v.masterRack && {
        mixRack: v.masterRack.opened.mixRack,
        chain: v.masterRack.chain,
      },
      share: v.share,
      oneMaster: v.oneMaster,
      playing: v.playing,
      muteAll: v.muteAll,
    })),
  };
}

export const scenarios = (kit) => [
  {
    group: 'R35',
    key: '',
    id: 'R35-mix',
    title:
      'The Mix view at 1366×655, 1440×787 and 1280×720: strips that fill the height, how many show, the master column, the rack’s share and targets, one master chain, the floors, no commits while playing, Mute All',
    run: (run) => mixScenario(kit, run),
  },
];
