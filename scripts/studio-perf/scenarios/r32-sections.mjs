/* eslint-env node */
/**
 * R32 song sections (milestone 2.13, fast), at 1366×655, 1440×787 and
 * 1280×720. Each size opens a fresh project with one MIDI track holding a
 * clip in bars 3–4 and one in bars 11–12, its chart 40 bars long (the Lead
 * Sheet shows only its chart's bars), zoomed so 34 bars fit the timeline,
 * and runs the whole story with the pointer and the keys:
 *
 * - laneHeader80: the sections row 24 + the tools 32 + the chord lane's
 *   header 24 make 80 px (±2) from the row's top to the first track row,
 *   and the sections lane starts at the row's top.
 * - addSection: + Section's menu lists the 14 types in order, then Custom
 *   name, inside the window; Verse lands on bars 1–8 and Chorus on 9–16,
 *   each a block named "<label>, bars a to b".
 * - clickSeeks: a click in the middle of the Chorus seeks to its start.
 * - edgeResize: dragging the Verse's end edge a bar right moves the edge it
 *   shares with the Chorus: Verse 1–9, Chorus 10–16, on bar lines; one Undo
 *   gives both back.
 * - menuItems: a right-click on a block opens the section menu with its
 *   seven actions, inside the window.
 * - loopSection: Loop this section loops exactly the Chorus.
 * - duplicateWithClips: Duplicate puts a second Verse right after the first,
 *   copies the clip inside it (its notes a Verse later in the song), moves
 *   the later clip by a Verse; one Undo gives back the clips and the
 *   sections exactly.
 * - insertAfter: Insert after ▸ Bridge adds 8 bars of Bridge after the
 *   Verse and moves the later sections and clips by 8 bars.
 * - keys: with focus on the Verse's block, → moves it to the next block,
 *   Enter seeks there, Alt+Enter opens its menu and Escape closes it.
 * - customName: Custom name… asks in the app's dialog; "Hook A" lands as a
 *   custom section.
 * - deleteKeepsClips: Delete section, on the section the later clip sits
 *   in, takes that section away and nothing else: every clip stays.
 * - leadSheetSame: Score ▸ Lead sheet marks the same labels at the same bars
 *   (each SectionMarker's label and its data-measure; the store's
 *   leadSheetSectionsOf is reported beside them).
 * - reloadKeeps: after a reload the store holds the same sections, ids
 *   included.
 * - floors: no text under the floor and no target under 24×24 in the
 *   sections row, + Section's menu and the section menu (designProbe.mjs in
 *   subtree mode: the row sits in the legacy main region, which hides every
 *   v2 part inside it from the default probe).
 *
 * A step that throws is recorded with its error and the next one goes on;
 * the steps share one project, so a step that leaves it wrong can fail the
 * ones after it, and each step's facts are in the report.
 */
import { designProbe } from '../designProbe.mjs';
import { MOD } from './_shared.mjs';

export const flags = {
  laneHeader80: {
    goal: true,
    text: 'the sections row, the tools and the chord lane’s header made 80 px over the lanes, the sections lane at the row’s top',
  },
  addSection: {
    goal: true,
    text: '+ Section listed every type and Custom name inside the window, and Verse and Chorus landed on bars 1–8 and 9–16',
  },
  customName: {
    goal: true,
    text: 'Custom name asked in the app’s dialog and added a custom section named Hook A',
  },
  clickSeeks: {
    goal: true,
    text: 'a click on a section block sought to the section’s start',
  },
  edgeResize: {
    goal: true,
    text: 'dragging a shared edge a bar moved both sections on a bar line, and one Undo gave both back',
  },
  menuItems: {
    goal: true,
    text: 'a right-click on a section opened its menu with the seven actions, inside the window',
  },
  loopSection: {
    goal: true,
    text: 'Loop this section looped exactly the section',
  },
  duplicateWithClips: {
    goal: true,
    text: 'Duplicate added the section again after itself with a copy of its clip, moved the later clip, and one Undo gave everything back',
  },
  insertAfter: {
    goal: true,
    text: 'Insert after added 8 bars of Bridge after the section and moved the later sections and clips by 8 bars',
  },
  deleteKeepsClips: {
    goal: true,
    text: 'Delete section took away only the section, every clip stayed',
  },
  keys: {
    goal: true,
    text: 'on a section block, → moved focus to the next block, Enter sought there, Alt+Enter opened its menu and Escape closed it',
  },
  leadSheetSame: {
    goal: true,
    text: 'the Lead sheet marked the same section labels at the same bars',
  },
  reloadKeeps: {
    goal: true,
    text: 'a reload kept the same sections',
  },
  floors: {
    goal: true,
    text: 'no text under the floor and no target under 24×24 in the sections row, + Section’s menu or the section menu',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

/** + Section's types in SECTION_TYPES order, then Custom name (contract §4). */
const ADD_ITEMS = [
  'add:intro',
  'add:verse',
  'add:pre-chorus',
  'add:chorus',
  'add:bridge',
  'add:outro',
  'add:solo',
  'add:interlude',
  'add:breakdown',
  'add:build-up',
  'add:drop',
  'add:hook',
  'add:tag',
  'add:coda',
  'add:custom',
];

/** The section menu's actions (contract §4; Learn about song form aside). */
const SECTION_ITEMS = [
  'renameSection',
  'sectionType',
  'duplicateSection',
  'loopSection',
  'insertBefore',
  'insertAfter',
  'deleteSection',
];

const ROW = '[data-testid="sections-row"]';
const ADD = '[data-testid="add-section"]';
const ADD_MENU = '[data-testid="add-section-menu"]';
const MENU = '[data-tutorial-id="clip-menu"]';
const SECTION_MENU = `${MENU}[data-menu-target="section"]`;
const DIALOG_FIELD = '[role="dialog"][data-state="open"] input';
const block = (id) => `[data-testid="section-block"][data-section-id="${id}"]`;

/** The seeded clips: one inside the Verse to come, one after it. */
const INSIDE_CLIP = 'r32-clip-inside';
const LATER_CLIP = 'r32-clip-later';

/** The bars the scenario's sections reach (Hook A ends on 32), and room. */
const FIT_BARS = 34;

// ── In-page helpers (sent as source: nothing from this module's scope) ──

/**
 * The song as the steps judge it: the sections in start order, every MIDI
 * clip in start order with its notes (ids included), the playhead, the
 * loop, the undo steps pushed so far, the zoom and the view.
 */
function songNow() {
  const s = window.__MA_STORE__.getState();
  const history = window.__MA_HISTORY__;
  return {
    bar: s.timeSignatureNumerator * (1920 / s.timeSignatureDenominator),
    sections: [...s.sections]
      .sort((a, b) => a.startTick - b.startTick)
      .map(({ id, type, label, startTick, endTick }) => ({
        id,
        type,
        label,
        startTick,
        endTick,
      })),
    clips: s.tracks
      .flatMap((t) =>
        t.midiClips.map((c) => ({
          trackId: t.id,
          id: c.id,
          startTick: c.startTick,
          durationTicks: c.durationTicks ?? null,
          notes: [...c.events]
            .sort((a, b) => a.startTick - b.startTick || a.note - b.note)
            .map((e) => ({
              id: e.id ?? null,
              note: e.note,
              startTick: e.startTick,
              durationTicks: e.durationTicks,
              velocity: e.velocity,
            })),
        })),
      )
      .sort((a, b) => a.startTick - b.startTick || (a.id < b.id ? -1 : 1)),
    position: s.position,
    playhead: window.__MA_PLAYHEAD__?.tick?.() ?? null,
    loop: { enabled: s.loopEnabled, start: s.loopStart, end: s.loopEnd },
    pushed: typeof history?.pushed === 'function' ? history.pushed() : null,
    zoom: s.timelineZoom,
    view: s.currentView,
  };
}

/**
 * Zooms so `bars` bars fit the timeline's width (the canvas's, or the
 * sections lane's), from bar 1, with the playhead at 0. Resolves to the
 * width, the zoom and a bar in ticks and px (timelineScale.ts: 40 px a beat
 * at zoom 1, 480 ticks a beat).
 */
function fitBars(bars) {
  const store = window.__MA_STORE__;
  const s = store.getState();
  const bar = s.timeSignatureNumerator * (1920 / s.timeSignatureDenominator);
  const lane =
    document.querySelector(
      '[data-testid="track-scroller"] > div:nth-child(2) canvas',
    ) ?? document.querySelector('[data-testid="sections-lane"]');
  const width = lane?.getBoundingClientRect().width || 800;
  s.setTimelineZoom(Math.min(1, width / (((bars * bar) / 480) * 40)));
  s.setTimelineScrollLeft(0);
  s.setPosition(0);
  const zoom = store.getState().timelineZoom;
  return {
    width: Math.round(width),
    zoom: Math.round(zoom * 1000) / 1000,
    bar,
    barPx: Math.round((bar / 480) * 40 * zoom * 10) / 10,
  };
}

/** The lane header's parts and the first track row (laneHeader80). */
function headerNow() {
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, height: r.height };
  };
  return {
    row: box('[data-testid="sections-row"]'),
    lane: box('[data-testid="sections-lane"]'),
    tools: box('[data-testid="timeline-tools"]'),
    chord: box('[data-testid="chord-lane-header"]'),
    firstRow: box('[data-testid="track-row"]'),
  };
}

/**
 * The open match of `selector` (else a visible one): its target, its items
 * (data-item) in order, whether it sits inside the window, and the item
 * focus is on.
 */
function menuNow(selector) {
  const all = [...document.querySelectorAll(selector)];
  const menu =
    all.find((el) => el.getAttribute('data-state') === 'open') ??
    all.find((el) => el.getBoundingClientRect().height > 1);
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

/** Whether a menu or a dialog is open (what a step may leave behind). */
function overlayOpen() {
  return !!document.querySelector(
    '[data-tutorial-id="clip-menu"][data-state="open"], [data-testid="add-section-menu"][data-state="open"], [role="menu"][data-state="open"], [role="dialog"][data-state="open"]',
  );
}

/** A section block's accessible name and box. */
function blockNow(id) {
  const el = document.querySelector(
    `[data-testid="section-block"][data-section-id="${id}"]`,
  );
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    label: el.getAttribute('aria-label'),
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
}

/** Where + Section sits: its box, the lane's left and the last block's right. */
function addButtonNow() {
  const el = document.querySelector('[data-testid="add-section"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const lane = document.querySelector('[data-testid="sections-lane"]');
  const rights = [
    ...document.querySelectorAll('[data-testid="section-block"]'),
  ].map((b) => b.getBoundingClientRect().right);
  return {
    left: Math.round(r.left),
    size: `${Math.round(r.width)}×${Math.round(r.height)}`,
    laneLeft: lane ? Math.round(lane.getBoundingClientRect().left) : null,
    lastBlockRight: rights.length ? Math.round(Math.max(...rights)) : null,
  };
}

/** The section block that has focus, by its section id. */
function focusedBlock() {
  return (
    document.activeElement
      ?.closest('[data-testid="section-block"]')
      ?.getAttribute('data-section-id') ?? null
  );
}

/**
 * The Lead Sheet's section marks as drawn: each SectionMarker carries
 * data-testid="section-marker" and the real bar it marks (data-measure).
 * Null while there are none.
 */
function leadSheetMarks() {
  const marks = [...document.querySelectorAll('[data-testid="section-marker"]')]
    .map((el) => ({
      measureIdx: el.hasAttribute('data-measure')
        ? Number(el.getAttribute('data-measure'))
        : null,
      label: el.querySelector('text')?.textContent ?? '',
    }))
    .sort((a, b) => (a.measureIdx ?? -1) - (b.measureIdx ?? -1));
  return marks.length > 0 ? marks : null;
}

// ── Node-side helpers ───────────────────────────────────────────────────────

/** One MIDI track with a clip in bars 3–4 and one in bars 11–12. */
async function seedSong(kit, page) {
  await page.evaluate(
    ({ inside, later }) => {
      const store = window.__MA_STORE__;
      const s = store.getState();
      const bar =
        s.timeSignatureNumerator * (1920 / s.timeSignatureDenominator);
      const note = (n, t) => ({
        note: n,
        velocity: 96,
        startTick: t,
        durationTicks: 240,
        channel: 0,
      });
      const id = s.addTrack('midi', 'piano-sampler', 'Keys');
      s.addMidiClip(id, {
        id: inside,
        name: 'Inside',
        startTick: 2 * bar,
        durationTicks: 2 * bar,
        events: [note(60, 0), note(64, 480), note(67, 960), note(72, 1920)],
      });
      s.addMidiClip(id, {
        id: later,
        name: 'Later',
        startTick: 10 * bar,
        durationTicks: 2 * bar,
        events: [note(62, 0), note(65, 480), note(69, 960)],
      });
      s.setSelectedTrackId(null);
      s.setSelectedClip(null, null);
      // No chords and no bars added past them: the Lead Sheet's chart runs
      // as far as the sections do (milestone 2.13), which leadSheetSame
      // checks.
    },
    { inside: INSIDE_CLIP, later: LATER_CLIP },
  );
  await kit.waitForDraft(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await kit.waitForEditor(page, 180_000);
}

const song = (page) => page.evaluate(songNow);

/** Escape until no menu or dialog is open (at most three times). */
async function closeOverlays(kit, page) {
  for (let i = 0; i < 3; i++) {
    if (!(await page.evaluate(overlayOpen))) return;
    await page.keyboard.press('Escape');
    await kit.sleep(250);
  }
}

/** The design floors in `selector`'s subtree, and whether it was there. */
async function floorsOf(page, selector) {
  const found = (await page.locator(selector).count()) > 0;
  const findings = found
    ? await page.evaluate(designProbe, { root: selector, subtree: true })
    : [];
  return { selector, found, findings };
}

/** The middle of a section's block, in page px. */
async function blockMiddle(page, id) {
  const box = await page.locator(block(id)).boundingBox({ timeout: 5000 });
  if (!box) throw new Error(`no block for section ${id}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A right-click in the middle of a block; resolves to the menu it opened. */
async function openSectionMenu(kit, page, id) {
  const { x, y } = await blockMiddle(page, id);
  await page.mouse.click(x, y, { button: 'right' });
  await page
    .waitForSelector(SECTION_MENU, { state: 'visible', timeout: 5000 })
    .catch(() => {});
  await kit.sleep(150);
  return page.evaluate(menuNow, MENU);
}

/** Chooses an item of the open section menu. */
const chooseItem = (page, item) =>
  page.click(`${MENU} [data-item="${item}"]`, { timeout: 5000 });

/** One Undo, with focus on the page (the editor takes Ctrl or ⌘ as Mod). */
async function undoOnce(kit, page) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press(`${MOD}+KeyZ`);
  await kit.sleep(400);
}

/** + Section, then `item` of its menu; the menu as it was, and its floors. */
async function pickFromAdd(kit, page, item) {
  await page.click(ADD, { timeout: 5000 });
  await page.waitForSelector(ADD_MENU, { state: 'visible', timeout: 5000 });
  await kit.sleep(250);
  const menu = await page.evaluate(menuNow, ADD_MENU);
  const floors = await floorsOf(page, ADD_MENU);
  await page.click(`${ADD_MENU} [data-item="${item}"]`, { timeout: 5000 });
  await kit.sleep(400);
  return { menu, floors };
}

/** A clip's notes in song time, ids left out: what a copy shares. */
const songNotes = (clip, shift = 0) =>
  clip.notes.map((n) => ({
    note: n.note,
    at: clip.startTick + n.startTick + shift,
    durationTicks: n.durationTicks,
    velocity: n.velocity,
  }));

/** The Lead Sheet's marks of `sections` (start order): one a bar. */
function marksOf(sections, bar) {
  const marks = [];
  for (const s of sections) {
    const measureIdx = Math.floor(s.startTick / bar);
    if (!marks.some((m) => m.measureIdx === measureIdx)) {
      marks.push({ measureIdx, label: s.label });
    }
  }
  return marks;
}

/** `Verse 1–8, Chorus 9–16`: sections in 1-based bars, for the report. */
const spans = (sections, bar) =>
  (sections ?? [])
    .map(
      (s) =>
        `${s.label || `(${s.type})`} ${s.startTick / bar + 1}–${s.endTick / bar}`,
    )
    .join(', ');

// ── The steps ───────────────────────────────────────────────────────────────

/** + Section → Verse, then + Section → Chorus. */
async function addSections(kit, page) {
  const buttonEmpty = await page.evaluate(addButtonNow);
  const first = await pickFromAdd(kit, page, 'add:verse');
  const one = await song(page);
  const verseId = one.sections[0]?.id ?? null;
  const verseBlock = verseId ? await page.evaluate(blockNow, verseId) : null;
  await pickFromAdd(kit, page, 'add:chorus');
  const two = await song(page);
  const chorusId = two.sections.find((s) => s.id !== verseId)?.id ?? null;
  const chorusBlock = chorusId ? await page.evaluate(blockNow, chorusId) : null;
  return {
    bar: two.bar,
    menu: first.menu,
    menuFloors: first.floors,
    verse: one.sections,
    verseBlock,
    sections: two.sections,
    chorusBlock,
    rowFloors: await floorsOf(page, ROW),
    buttonEmpty,
    buttonAfter: await page.evaluate(addButtonNow),
  };
}

/** A click in the middle of a block, from a playhead elsewhere. */
async function clickSeeks(kit, page, id) {
  await page.evaluate(() => window.__MA_STORE__.getState().setPosition(77));
  await kit.sleep(150);
  const { x, y } = await blockMiddle(page, id);
  await page.mouse.click(x, y);
  await kit.sleep(300);
  const now = await song(page);
  return {
    section: now.sections.find((s) => s.id === id) ?? null,
    position: now.position,
    playhead: now.playhead,
  };
}

/** The Verse's end edge dragged one bar right, then one Undo. */
async function edgeResize(kit, page, id) {
  const before = await song(page);
  // Over the block's end first: its grips show on hover.
  const box = await page.locator(block(id)).boundingBox({ timeout: 5000 });
  if (!box) throw new Error(`no block for section ${id}`);
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
  await kit.sleep(150);
  const edge = await page
    .locator(`${block(id)} [data-edge="end"]`)
    .boundingBox({ timeout: 5000 });
  if (!edge) throw new Error('the block has no end edge');
  const barPx = (before.bar / 480) * 40 * before.zoom;
  const x = edge.x + edge.width / 2;
  const y = edge.y + edge.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + barPx / 2, y, { steps: 4 });
  await page.mouse.move(x + barPx, y, { steps: 4 });
  await page.mouse.up();
  await kit.sleep(400);
  const dragged = await song(page);
  // Undo only what the drag did: with nothing changed it would take back
  // the step before it.
  let undone = null;
  if (!kit.sameValue(dragged.sections, before.sections)) {
    await undoOnce(kit, page);
    undone = (await song(page)).sections;
  }
  return {
    bar: before.bar,
    barPx: Math.round(barPx * 10) / 10,
    before: before.sections,
    dragged: dragged.sections,
    steps:
      before.pushed === null || dragged.pushed === null
        ? null
        : dragged.pushed - before.pushed,
    undone,
  };
}

/** A right-click on a block: the menu, its floors, then Escape. */
async function menuItems(kit, page, id) {
  const menu = await openSectionMenu(kit, page, id);
  const floors = await floorsOf(page, SECTION_MENU);
  await page.keyboard.press('Escape');
  await kit.sleep(300);
  return { menu, floors };
}

/** The menu's Loop this section. */
async function loopSection(kit, page, id) {
  await openSectionMenu(kit, page, id);
  await chooseItem(page, 'loopSection');
  await kit.sleep(400);
  const now = await song(page);
  return {
    section: now.sections.find((s) => s.id === id) ?? null,
    loop: now.loop,
  };
}

/** The menu's Duplicate, then one Undo. */
async function duplicate(kit, page, id) {
  const before = await song(page);
  await openSectionMenu(kit, page, id);
  await chooseItem(page, 'duplicateSection');
  await kit.sleep(500);
  const after = await song(page);
  let undone = null;
  if (
    !kit.sameValue(after.sections, before.sections) ||
    !kit.sameValue(after.clips, before.clips)
  ) {
    await undoOnce(kit, page);
    const now = await song(page);
    undone = { sections: now.sections, clips: now.clips };
  }
  return {
    id,
    before: { sections: before.sections, clips: before.clips },
    after: { sections: after.sections, clips: after.clips },
    steps:
      before.pushed === null || after.pushed === null
        ? null
        : after.pushed - before.pushed,
    undone,
  };
}

/** The menu's Insert after ▸ Bridge. */
async function insertAfter(kit, page, id) {
  const before = await song(page);
  await openSectionMenu(kit, page, id);
  await chooseItem(page, 'insertAfter');
  await page.waitForSelector('[data-item="insertAfter:bridge"]', {
    state: 'visible',
    timeout: 5000,
  });
  await page.click('[data-item="insertAfter:bridge"]', { timeout: 5000 });
  await kit.sleep(500);
  const after = await song(page);
  return {
    id,
    bar: before.bar,
    before: { sections: before.sections, clips: before.clips },
    after: { sections: after.sections, clips: after.clips },
  };
}

/** Focus on a block: →, Enter, Alt+Enter, Escape. */
async function blockKeys(kit, page, id) {
  const now = await song(page);
  const at = now.sections.findIndex((s) => s.id === id);
  const next = at >= 0 ? (now.sections[at + 1] ?? null) : null;
  await page.evaluate(() => window.__MA_STORE__.getState().setPosition(77));
  await page.locator(block(id)).focus({ timeout: 5000 });
  await page.keyboard.press('ArrowRight');
  await kit.sleep(200);
  const focused = await page.evaluate(focusedBlock);
  await page.keyboard.press('Enter');
  await kit.sleep(300);
  const position = (await song(page)).position;
  await page.keyboard.press('Alt+Enter');
  await page
    .waitForSelector(SECTION_MENU, { state: 'visible', timeout: 3000 })
    .catch(() => {});
  await kit.sleep(150);
  const menu = await page.evaluate(menuNow, MENU);
  await page.keyboard.press('Escape');
  await kit.sleep(300);
  const closed = await page.evaluate(
    (selector) => !document.querySelector(`${selector}[data-state="open"]`),
    MENU,
  );
  return {
    next: next && { id: next.id, startTick: next.startTick },
    focused,
    position,
    menu: menu && { target: menu.target, focused: menu.focused },
    closed,
  };
}

/** + Section → Custom name…, "Hook A" in the app's dialog. */
async function customName(kit, page) {
  const before = await song(page);
  await page.click(ADD, { timeout: 5000 });
  await page.waitForSelector(ADD_MENU, { state: 'visible', timeout: 5000 });
  await kit.sleep(250);
  await page.click(`${ADD_MENU} [data-item="add:custom"]`, { timeout: 5000 });
  const field = page.locator(DIALOG_FIELD).first();
  const dialog = await field.waitFor({ state: 'visible', timeout: 5000 }).then(
    () => true,
    () => false,
  );
  if (dialog) {
    await field.fill('Hook A');
    await field.press('Enter');
  }
  await kit.sleep(400);
  const after = await song(page);
  return {
    dialog,
    added: after.sections.filter(
      (s) => !before.sections.some((b) => b.id === s.id),
    ),
  };
}

/** The menu's Delete section, on the section the later clip sits in. */
async function deleteSection(kit, page) {
  const before = await song(page);
  const later = before.clips.find((c) => c.id === LATER_CLIP) ?? null;
  const holds = (s) =>
    !!later && s.startTick <= later.startTick && later.startTick < s.endTick;
  const target = before.sections.find(holds) ?? before.sections.at(-1);
  if (!target) throw new Error('no section to delete');
  await openSectionMenu(kit, page, target.id);
  await chooseItem(page, 'deleteSection');
  await kit.sleep(400);
  const after = await song(page);
  return {
    target: target.id,
    holdsClip: holds(target),
    before: { sections: before.sections, clips: before.clips },
    after: { sections: after.sections, clips: after.clips },
  };
}

/** Score ▸ Lead sheet: the marks drawn there, then back to Create. */
async function leadSheet(kit, page) {
  const now = await song(page);
  const viewNow = () =>
    page.evaluate(() => window.__MA_STORE__.getState().currentView);
  try {
    await page.click('[data-tutorial-id="view-switch-score"]', {
      timeout: 5000,
    });
    await kit.sleep(400);
    if ((await viewNow()) !== 'leadsheet') {
      // The layout switch is the Score page's (its chunk loads first).
      await page.click('[data-tutorial-id="view-switch-leadsheet"]', {
        timeout: 20_000,
      });
    }
    const dom = await page
      .waitForFunction(leadSheetMarks, null, { timeout: 20_000, polling: 250 })
      .then(
        (handle) => handle.jsonValue(),
        () => null,
      );
    const store = await page
      .evaluate(async () => {
        const slice = await window.__RT_DEV_MODULE__(
          '/src/daw/store/sectionsSlice.ts',
        );
        return slice.leadSheetSectionsOf(window.__MA_STORE__.getState());
      })
      .catch((error) => `unreadable: ${String(error).slice(0, 120)}`);
    return {
      view: await viewNow(),
      expected: marksOf(now.sections, now.bar),
      dom,
      store,
    };
  } finally {
    await page
      .click('[data-tutorial-id="view-switch-arrange"]', { timeout: 5000 })
      .catch(() => {});
    await kit.sleep(400);
  }
}

/** A reload, once the draft holds everything. */
async function reloadKeeps(kit, page) {
  const before = await song(page);
  await kit.waitForDraft(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const state = await kit.waitForEditor(page, 180_000);
  await kit.settle(page, 'R32 reload');
  const after = await song(page);
  const blocks = await page.locator('[data-testid="section-block"]').count();
  return {
    state,
    bar: before.bar,
    before: before.sections,
    after: after.sections,
    blocks,
  };
}

// ── One size ────────────────────────────────────────────────────────────────

async function sectionsAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedSong(kit, page);
      await kit.settle(page, 'R32 open');
      await kit.sleep(500);
      const out = { viewport, fit: await page.evaluate(fitBars, FIT_BARS) };
      await kit.sleep(300);
      const step = async (name, fn) => {
        try {
          out[name] = await fn();
        } catch (error) {
          out[name] = { error: String(error?.message ?? error).slice(0, 300) };
        }
        await closeOverlays(kit, page).catch(() => {});
      };
      await step('header', () => page.evaluate(headerNow));
      await step('add', () => addSections(kit, page));
      const verseId = out.add?.verse?.[0]?.id ?? null;
      const chorusId =
        out.add?.sections?.find((s) => s.id !== verseId)?.id ?? null;
      const need = (id, what) => {
        if (!id) throw new Error(`no ${what} to work on (addSection failed)`);
        return id;
      };
      await step('seek', () => clickSeeks(kit, page, need(chorusId, 'Chorus')));
      await step('edge', () => edgeResize(kit, page, need(verseId, 'Verse')));
      await step('menu', () => menuItems(kit, page, need(verseId, 'Verse')));
      await step('loop', () =>
        loopSection(kit, page, need(chorusId, 'Chorus')),
      );
      await step('duplicate', () =>
        duplicate(kit, page, need(verseId, 'Verse')),
      );
      await step('insert', () =>
        insertAfter(kit, page, need(verseId, 'Verse')),
      );
      await step('keys', () => blockKeys(kit, page, need(verseId, 'Verse')));
      await step('custom', () => customName(kit, page));
      await step('delete', () => deleteSection(kit, page));
      await step('leadSheet', () => leadSheet(kit, page));
      await step('reload', () => reloadKeeps(kit, page));
      return out;
    },
    api,
  );
}

// ── Judging ─────────────────────────────────────────────────────────────────

const ok = (facts) => !!facts && !facts.error;

function judgeAdd(a, same) {
  if (!ok(a) || !a.menu) return false;
  const [verse] = a.verse;
  const chorus = a.sections.find((s) => s.id !== verse?.id);
  return (
    same(
      a.menu.items.filter((item) => item.startsWith('add:')),
      ADD_ITEMS,
    ) &&
    a.menu.inside &&
    a.verse.length === 1 &&
    verse.type === 'verse' &&
    verse.label === 'Verse' &&
    verse.startTick === 0 &&
    verse.endTick === 8 * a.bar &&
    a.verseBlock?.label === 'Verse, bars 1 to 8' &&
    a.sections.length === 2 &&
    !!chorus &&
    chorus.type === 'chorus' &&
    chorus.label === 'Chorus' &&
    chorus.startTick === 8 * a.bar &&
    chorus.endTick === 16 * a.bar &&
    a.chorusBlock?.label === 'Chorus, bars 9 to 16'
  );
}

function judgeEdge(e, same) {
  if (!ok(e) || e.before.length !== 2) return false;
  const [verse, chorus] = e.before;
  const v = e.dragged.find((s) => s.id === verse.id);
  const c = e.dragged.find((s) => s.id === chorus.id);
  return (
    !!v &&
    !!c &&
    v.startTick === verse.startTick &&
    v.endTick === verse.endTick + e.bar &&
    c.startTick === v.endTick &&
    c.endTick === chorus.endTick &&
    v.endTick % e.bar === 0 &&
    c.startTick % e.bar === 0 &&
    !!e.undone &&
    same(e.undone, e.before)
  );
}

function judgeDuplicate(d, same) {
  if (!ok(d)) return false;
  const verse = d.before.sections.find((s) => s.id === d.id);
  if (!verse) return false;
  const length = verse.endTick - verse.startTick;
  // The sections there were: those from the Verse's end on move by its
  // length; the copy is the one new section, right after the Verse.
  const moved = d.before.sections.every((s) => {
    const now = d.after.sections.find((x) => x.id === s.id);
    const shift = s.startTick >= verse.endTick ? length : 0;
    return (
      !!now &&
      now.type === s.type &&
      now.label === s.label &&
      now.startTick === s.startTick + shift &&
      now.endTick === s.endTick + shift
    );
  });
  const fresh = d.after.sections.filter(
    (x) => !d.before.sections.some((s) => s.id === x.id),
  );
  const copied =
    fresh.length === 1 &&
    fresh[0].type === verse.type &&
    fresh[0].label === verse.label &&
    fresh[0].startTick === verse.endTick &&
    fresh[0].endTick === verse.endTick + length;
  // The clips: the inside one stays and has a copy a Verse later (its
  // notes, in song time, with ids of their own); the later one moves.
  const inside = d.before.clips.find((c) => c.id === INSIDE_CLIP);
  const later = d.before.clips.find((c) => c.id === LATER_CLIP);
  const insideNow = d.after.clips.find((c) => c.id === INSIDE_CLIP);
  const laterNow = d.after.clips.find((c) => c.id === LATER_CLIP);
  const newClips = d.after.clips.filter(
    (c) => !d.before.clips.some((b) => b.id === c.id),
  );
  const copy = newClips.length === 1 ? newClips[0] : null;
  const clips =
    !!inside &&
    !!later &&
    !!insideNow &&
    !!laterNow &&
    !!copy &&
    same(insideNow, inside) &&
    laterNow.startTick === later.startTick + length &&
    same(laterNow.notes, later.notes) &&
    copy.trackId === inside.trackId &&
    same(songNotes(copy), songNotes(inside, length)) &&
    copy.notes.every((n) => !!n.id && !inside.notes.some((m) => m.id === n.id));
  const undone =
    !!d.undone &&
    same(d.undone.sections, d.before.sections) &&
    same(d.undone.clips, d.before.clips);
  return moved && copied && clips && undone;
}

function judgeInsert(i, same) {
  if (!ok(i)) return false;
  const section = i.before.sections.find((s) => s.id === i.id);
  if (!section) return false;
  const at = section.endTick;
  const span = 8 * i.bar;
  const moved = i.before.sections.every((s) => {
    const now = i.after.sections.find((x) => x.id === s.id);
    const shift = s.startTick >= at ? span : 0;
    return (
      !!now &&
      now.startTick === s.startTick + shift &&
      now.endTick === s.endTick + shift
    );
  });
  const fresh = i.after.sections.filter(
    (x) => !i.before.sections.some((s) => s.id === x.id),
  );
  const bridge =
    fresh.length === 1 &&
    fresh[0].type === 'bridge' &&
    fresh[0].label === 'Bridge' &&
    fresh[0].startTick === at &&
    fresh[0].endTick === at + span;
  const clips =
    i.after.clips.length === i.before.clips.length &&
    i.before.clips.every((c) => {
      const now = i.after.clips.find((x) => x.id === c.id);
      return (
        !!now &&
        now.startTick === c.startTick + (c.startTick >= at ? span : 0) &&
        same(now.notes, c.notes)
      );
    }) &&
    // The seeded song has a clip on each side of the insert.
    i.before.clips.some((c) => c.startTick >= at) &&
    i.before.clips.some((c) => c.startTick < at);
  return moved && bridge && clips;
}

function judgeDelete(d, same) {
  return (
    ok(d) &&
    d.holdsClip &&
    same(
      d.after.sections,
      d.before.sections.filter((s) => s.id !== d.target),
    ) &&
    same(d.after.clips, d.before.clips)
  );
}

function judge(v, same) {
  const h = v.header;
  const header =
    ok(h) &&
    !!h.row &&
    !!h.lane &&
    !!h.tools &&
    !!h.chord &&
    !!h.firstRow &&
    Math.abs(h.row.height + h.tools.height + h.chord.height - 80) <= 2 &&
    Math.abs(h.firstRow.top - h.row.top - 80) <= 2 &&
    Math.abs(h.lane.top - h.row.top) <= 1;
  const seek = v.seek;
  const keys = v.keys;
  const loop = v.loop;
  const lead = v.leadSheet;
  const reload = v.reload;
  const probes = [v.add?.menuFloors, v.add?.rowFloors, v.menu?.floors];
  return {
    laneHeader80: header,
    addSection: judgeAdd(v.add, same),
    customName:
      ok(v.custom) &&
      v.custom.dialog &&
      v.custom.added.length === 1 &&
      v.custom.added[0].type === 'custom' &&
      v.custom.added[0].label === 'Hook A',
    clickSeeks:
      ok(seek) &&
      !!seek.section &&
      seek.section.startTick !== 77 &&
      seek.position === seek.section.startTick &&
      (seek.playhead === null ||
        Math.round(seek.playhead) === seek.section.startTick),
    edgeResize: judgeEdge(v.edge, same),
    menuItems:
      ok(v.menu) &&
      v.menu.menu?.target === 'section' &&
      SECTION_ITEMS.every((item) => v.menu.menu.items.includes(item)) &&
      v.menu.menu.inside,
    loopSection:
      ok(loop) &&
      !!loop.section &&
      loop.loop.enabled === true &&
      loop.loop.start === loop.section.startTick &&
      loop.loop.end === loop.section.endTick,
    duplicateWithClips: judgeDuplicate(v.duplicate, same),
    insertAfter: judgeInsert(v.insert, same),
    deleteKeepsClips: judgeDelete(v.delete, same),
    keys:
      ok(keys) &&
      !!keys.next &&
      keys.focused === keys.next.id &&
      keys.position === keys.next.startTick &&
      keys.menu?.target === 'section' &&
      keys.closed,
    leadSheetSame:
      ok(lead) &&
      lead.expected.length > 0 &&
      !!lead.dom &&
      same(lead.dom, lead.expected),
    reloadKeeps:
      ok(reload) &&
      reload.state === 'ready' &&
      reload.before.length > 0 &&
      same(reload.after, reload.before),
    floors: probes.every((p) => !!p && p.found && p.findings.length === 0),
  };
}

/** What each size saw, for the report. */
function report(v, judged) {
  const bar = v.fit?.bar ?? 1920;
  const err = (facts) => (facts?.error ? { error: facts.error } : null);
  const floorText = (p) =>
    !p
      ? []
      : !p.found
        ? [`${p.selector} not found`]
        : p.findings.map((f) =>
            f.kind === 'text'
              ? `text ${f.size}px “${f.text}”`
              : `target ${f.width}×${f.height} “${f.text}”`,
          );
  const px = (box) => (box ? Math.round(box.height) : 'none');
  return {
    viewport: `${v.viewport.width}x${v.viewport.height}`,
    fit: v.fit,
    header: err(v.header) ?? {
      heights: `sections ${px(v.header.row)}, tools ${px(v.header.tools)}, chord ${px(v.header.chord)}`,
      firstRowBelowRow:
        v.header.row && v.header.firstRow
          ? Math.round(v.header.firstRow.top - v.header.row.top)
          : null,
      laneTopOffset:
        v.header.row && v.header.lane
          ? Math.round(v.header.lane.top - v.header.row.top)
          : null,
    },
    add: err(v.add) ?? {
      menu: v.add.menu && {
        items: v.add.menu.items.length,
        inside: v.add.menu.inside,
        box: v.add.menu.box,
      },
      sections: spans(v.add.sections, bar),
      blocks: [v.add.verseBlock, v.add.chorusBlock].map(
        (b) => b && `${b.label} (${b.width}×${b.height})`,
      ),
      button: { empty: v.add.buttonEmpty, after: v.add.buttonAfter },
    },
    seek: err(v.seek) ?? {
      start: v.seek.section?.startTick ?? null,
      position: v.seek.position,
      playhead: v.seek.playhead,
    },
    edge: err(v.edge) ?? {
      dragged: spans(v.edge.dragged, bar),
      undone: spans(v.edge.undone, bar),
      steps: v.edge.steps,
      barPx: v.edge.barPx,
    },
    menu: err(v.menu) ?? {
      target: v.menu.menu?.target ?? null,
      items: v.menu.menu?.items ?? null,
      inside: v.menu.menu?.inside ?? null,
      box: v.menu.menu?.box ?? null,
    },
    loop: err(v.loop) ?? { section: v.loop.section, loop: v.loop.loop },
    duplicate: err(v.duplicate) ?? {
      sections: spans(v.duplicate.after.sections, bar),
      clips: v.duplicate.after.clips.map((c) => `${c.id}@${c.startTick}`),
      undone: v.duplicate.undone
        ? spans(v.duplicate.undone.sections, bar)
        : null,
      steps: v.duplicate.steps,
    },
    insert: err(v.insert) ?? {
      sections: spans(v.insert.after.sections, bar),
      clips: v.insert.after.clips.map((c) => `${c.id}@${c.startTick}`),
    },
    keys: err(v.keys) ?? v.keys,
    custom: err(v.custom) ?? {
      dialog: v.custom.dialog,
      added: spans(v.custom.added, bar),
    },
    delete: err(v.delete) ?? {
      target: v.delete.target,
      holdsClip: v.delete.holdsClip,
      sections: spans(v.delete.after.sections, bar),
      clipsKept: v.delete.after.clips.length === v.delete.before.clips.length,
    },
    leadSheet: err(v.leadSheet) ?? v.leadSheet,
    reload: err(v.reload) ?? {
      state: v.reload.state,
      sections: spans(v.reload.after, bar),
      blocks: v.reload.blocks,
    },
    floors: [v.add?.menuFloors, v.add?.rowFloors, v.menu?.floors].flatMap(
      floorText,
    ),
    failed: Object.entries(judged)
      .filter(([, good]) => !good)
      .map(([key]) => key),
  };
}

async function sections(kit, run) {
  const at = [];
  for (const viewport of VIEWPORTS) {
    at.push(await sectionsAt(kit, run, viewport));
  }
  const judged = at.map((v) => judge(v, kit.sameValue));
  return {
    diffs: [],
    extraLosses: [],
    flags: Object.fromEntries(
      Object.keys(flags).map((key) => [key, judged.every((j) => j[key])]),
    ),
    checks: at.map((v, i) => report(v, judged[i])),
  };
}

export const scenarios = (kit) => [
  {
    group: 'R32',
    key: '',
    id: 'R32-sections',
    title:
      'Song sections at 1366×655, 1440×787 and 1280×720: the 80 px lane header, + Section with every type and a custom name, a click seeks, a shared edge drags on bar lines, the section menu (loop, duplicate with its clips, insert after, delete keeps the clips), the keys, the Lead sheet shows the same sections, a reload keeps them, and the floors',
    run: (run) => sections(kit, run),
  },
];
