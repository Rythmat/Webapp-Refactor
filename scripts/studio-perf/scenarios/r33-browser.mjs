/* eslint-env node */
/**
 * R33 the browser and the two-step add-track picker (milestone 2.14, fast).
 * There is no baseline, so every flag must hold.
 *
 * At 1366×655, 1440×787 and 1280×720, each on a fresh new project:
 *
 * - panelFloors: the Library panel (the side rail's Library) at 300 and at
 *   240 px Inspector width: no text under the floor and no target under
 *   24×24 in the panel or its open Type menu (designProbe.mjs in subtree
 *   mode), and nothing in the panel runs out sideways (no element past the
 *   panel's edges, no sideways scroller).
 * - pickerSteps: + Add track shows the 8 category tiles, each with its About
 *   line, and the Import and Browse chips at least 24 px tall; Drums opens
 *   step 2 (Drum grid, Grooves; focus on the first), back returns to the
 *   tiles with focus on Drums; Drum grid adds a drum machine and opens Notes;
 *   Keys shows its 3 choices, Escape closes and the next open is step 1;
 *   Bass adds a finger bass at once; Browse the library shows the Library
 *   panel with focus in its search; Import fires a file chooser and adds nothing. Both steps sit
 *   inside the window with no sideways overflow on their .grid and pass the
 *   floors (subtree mode on the dialog).
 *
 * And once, at 1366×655, in two sessions whose song is put back to empty
 * before each check (tracks removed out of the history, 120 BPM, the
 * session's key, the panel's query cleared), so a check that fails leaves
 * the next one alone:
 *
 * A keyless song:
 * - rowMeta: a part row reads "<key> · <tempo> BPM · <bars> bars ·
 *   <numerals>" (the part's own key, tempo, length and chordFunction), and
 *   a groove row "<tempo> BPM · <bars> bars …".
 * - keyFill: + on a part gives the song the part's key, with a Sonner toast
 *   "… now in <key>"; one Undo puts back no key and no track.
 * - facetCounts: the Type menu's counts sum to the list; Grooves leaves only
 *   grooves, as many as its count; the Instrument menu then counts them all
 *   as drums; the Genre menu's biggest count is what that genre shows; Clear
 *   gives the whole list back.
 * - searchAndChips: "bass" narrows the list (and hides Fits your song), a
 *   tag chip narrows it further, Clear gives the whole list back.
 * - favourite: ♡ on a groove marks it (the store and aria-pressed), the ♡
 *   filter shows only marked rows and it, and after a reload it is still
 *   marked.
 *
 * A C major song (setRootNote / setMode, as a student's key pick):
 * - fitsYourSong: with nothing in the song the reason says no drums and
 *   grooves (or a kit) lead; after a groove is added, bass parts lead; a
 *   search hides the block.
 * - plusPart: + on a finger bass part whose own key is off C major's notes
 *   (so it must move) gives one track (bass-electric, finger, role bass)
 *   with one clip at bar 1: the part's pitches moved by one non-zero step
 *   (octaves aside), under 90 % on C major's scale before and at least 90 %
 *   after, the key still C ionian; one Undo removes it. Without such a part
 *   (reported) a part that lands on C major's notes is judged as before.
 * - grooveTempo: + on a groove at another tempo asks; Cancel adds nothing;
 *   Change sets the tempo and adds, and one Undo takes back both; Add anyway
 *   adds and keeps the tempo.
 * - kitAndPreset: + on a kit sets the new drum track's kit; on a Studio
 *   sound, its instrument and GM program; on an Oracle preset, the preset
 *   name.
 * - preview: ▶ goes to playing (■, aria-pressed), ■ stops it, a second ▶
 *   moves the preview to its row, and Play stops it; each stop reaches idle
 *   under 400 ms from the press (timed in the page).
 * - dragDrop: a part row dragged (Playwright dragTo, else synthetic drag
 *   events carrying a DataTransfer) onto the piano lane at bar 3 lands a
 *   clip there on that track; dropped below the last row it makes a new
 *   track with the clip at bar 3.
 *
 * A step that throws is recorded with its error and the next one goes on.
 */
import { designProbe } from '../designProbe.mjs';
import { MOD } from './_shared.mjs';

export const flags = {
  panelFloors: {
    goal: true,
    text: 'the Library panel kept the floors and nothing ran out sideways, at 300 and 240 px',
  },
  facetCounts: {
    goal: true,
    text: 'the facet menus’ counts matched the list: Type summed to it, Grooves left only grooves, Instrument and Genre counts followed',
  },
  searchAndChips: {
    goal: true,
    text: 'a search narrowed the list, a tag chip narrowed it further, and Clear restored it',
  },
  rowMeta: {
    goal: true,
    text: 'a part row showed its key, tempo, length and numerals; a groove row its tempo and length',
  },
  fitsYourSong: {
    goal: true,
    text: 'Fits your song led with grooves in an empty song, with bass parts after a groove, and hid while searching',
  },
  plusPart: {
    goal: true,
    text: '+ on a bass part in C major gave one bass track with a clip at bar 1 that fit the key, and one Undo removed it',
  },
  keyFill: {
    goal: true,
    text: '+ on a part in a keyless song gave the song the part’s key, and one Undo put back no key',
  },
  grooveTempo: {
    goal: true,
    text: 'the groove tempo question: Cancel added nothing, Change set the tempo and added in one step, Add anyway kept the tempo',
  },
  kitAndPreset: {
    goal: true,
    text: 'a kit set the new track’s kit, a Studio sound its instrument and GM program, an Oracle preset its preset name',
  },
  favourite: {
    goal: true,
    text: '♡ marked a row, the ♡ filter showed it, and it was still marked after a reload',
  },
  preview: {
    goal: true,
    text: '▶ played (■), ■ stopped it, a second ▶ moved it, and Play stopped it',
  },
  dragDrop: {
    goal: true,
    text: 'a part dragged onto the piano lane at bar 3 landed there, and below the last row it made a new track',
  },
  pickerSteps: {
    goal: true,
    text: 'the add-track picker: 8 tiles with About lines, step 2 and back, Drum grid opens Notes, Keys has 3, Bass adds at once, the chips work, in the window and on the floors',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

/** The Inspector widths the panel is probed at (300 is the default). */
const WIDTHS = [300, 240];

const PANEL = '[data-testid="inspector-panel"][data-panel="library"]';
const BROWSER = `${PANEL} [data-testid="library-browser"]`;
const SEARCH = `${BROWSER} input[data-testid="library-search"]`;
/** The list's rows (Fits your song's rows are outside the sections). */
const LIST = `${BROWSER} [data-testid="library-section"]`;
const FITS = `${BROWSER} [data-testid="library-fits"]`;
const QUESTION = '[data-testid="library-tempo-question"]';
const CANVAS = '[data-testid="track-scroller"] > div:nth-child(2) canvas';
const SHEET = '[data-testid="add-track-sheet"]';
const ADD_BUTTON = '[data-tutorial-id="add-track-button"]';
const tile = (anchor) => `${SHEET} [data-tutorial-id="add-track-${anchor}"]`;
const quoted = (value) => String(value).replace(/["\\]/g, '\\$&');
const rowSel = (id, where = LIST) =>
  `${where} li[data-testid="library-row"][data-item-id="${quoted(id)}"]`;

/** Step 1's tiles (contract B: a category's anchor, else its one choice's). */
const STEP1 = [
  'cat-keys',
  'cat-drums',
  'bass-electric',
  'synth',
  'soundfont',
  'sampler',
  'vocal-fx',
  'cat-amp',
];
const DRUMS = ['drum-machine', 'grooves'];
const KEYS = ['piano-sampler', 'electric-piano', 'tonewheel-organ'];

/** C major, as setRootNote / setMode write it. */
const C_MAJOR = { rootPc: 0, mode: 'ionian' };
const IONIAN = [0, 2, 4, 5, 7, 9, 11];
/** C major's modes as shortKeyLabel spells them (a part landed on its notes). */
/** The modes' intervals (prism's names), for a part's own key. */
const MODE_STEPS = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};
/** Whether a key's scale is C major's notes (one of its modes). */
function onCMajor(key) {
  const steps = MODE_STEPS[key?.mode];
  if (!steps) return false;
  const pcs = steps.map((i) => (i + key.tonic) % 12).sort((a, b) => a - b);
  return pcs.join() === IONIAN.join();
}
/**
 * The shift (1–11, mod 12) that takes the part's pitch classes onto the
 * clip's, as multisets (a register move by octaves is allowed), or 0 when
 * they are the same unmoved, or null when no shift matches.
 */
function pitchShift(partNotes, clipNotes) {
  if (partNotes.length === 0 || partNotes.length !== clipNotes.length) {
    return null;
  }
  const bag = (notes, by) =>
    notes
      .map((n) => (((n.note + by) % 12) + 12) % 12)
      .sort((a, b) => a - b)
      .join();
  const want = bag(clipNotes, 0);
  for (let by = 0; by < 12; by++) {
    if (bag(partNotes, by) === want) return by;
  }
  return null;
}

const C_FAMILY = [
  'C',
  'D Dorian',
  'E Phrygian',
  'F Lydian',
  'G Mixolydian',
  'Am',
  'B Locrian',
];

// ── In-page helpers (sent as source: nothing from this module's scope) ──

/**
 * The song as the checks judge it: every track with its sound fields and
 * clips (notes included), the key, the tempo, the dock's tab, the undo
 * steps pushed so far, the transport and the Inspector.
 */
function songNow() {
  const s = window.__MA_STORE__.getState();
  const history = window.__MA_HISTORY__;
  return {
    bar: s.timeSignatureNumerator * (1920 / s.timeSignatureDenominator),
    tracks: s.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      instrument: t.instrument,
      bassVoice: t.bassVoice ?? null,
      gmProgram: t.gmProgram ?? null,
      drumKit: t.drumKit ?? null,
      presetName: t.presetName ?? null,
      trackRole: t.trackRole ?? null,
      clips: (t.midiClips ?? []).map((c) => ({
        id: c.id,
        name: c.name ?? null,
        startTick: c.startTick,
        durationTicks: c.durationTicks ?? null,
        events: c.events.map((e) => ({
          note: e.note,
          startTick: e.startTick,
          durationTicks: e.durationTicks,
          velocity: e.velocity,
        })),
      })),
    })),
    bpm: s.bpm,
    rootNote: s.rootNote,
    mode: s.mode,
    selectedTrackId: s.selectedTrackId,
    channelStripTab: s.channelStripTab,
    isPlaying: s.isPlaying,
    libraryOpen: s.libraryOpen,
    inspectorPanel: s.inspectorPanel,
    inspectorWidth: s.inspectorWidth,
    favourites: [...(s.libraryFavourites ?? [])],
    zoom: s.timelineZoom,
    scrollLeft: s.timelineScrollLeft,
    pushed: typeof history?.pushed === 'function' ? history.pushed() : null,
    labels: typeof history?.labels === 'function' ? history.labels() : null,
  };
}

/**
 * Puts the song back to empty, out of the history (the harness's own write):
 * no tracks, 120 BPM, `key` (or none), nothing selected, zoom 1 from bar 1,
 * the transport stopped.
 */
function resetSong(key) {
  const store = window.__MA_STORE__;
  const quiet = window.__MA_HISTORY__?.withoutHistory ?? ((fn) => fn());
  quiet(() => {
    const s = store.getState();
    if (s.isPlaying) s.stop();
    for (const t of [...s.tracks]) store.getState().removeTrack(t.id);
    const now = store.getState();
    now.setBpm(120);
    now.setRootNote(null);
    if (key) {
      now.setMode(key.mode);
      store.getState().setRootNote(key.rootPc);
    }
    store.getState().setSelectedTrackId(null);
    store.getState().setSelectedClip?.(null, null);
    store.getState().setTimelineZoom(1);
    store.getState().setTimelineScrollLeft(0);
    store.getState().setPosition?.(0);
  });
}

/**
 * The Library panel as a student sees it: the search, the list's sections
 * (their heading counts) and rows, Fits your song, the chips, the filters
 * and the tempo question.
 */
function libraryNow() {
  const panel = document.querySelector(
    '[data-testid="inspector-panel"][data-panel="library"]',
  );
  const browser = panel?.querySelector('[data-testid="library-browser"]');
  if (!browser) return { found: false };
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const shown = (el) => !!el && el.getBoundingClientRect().height > 1;
  const countOf = (el) => {
    if (!el) return null;
    const raw = el.getAttribute('data-count');
    const n = Number(
      raw !== null && raw !== '' ? raw : text(el).replace(/[^\d]+/g, ''),
    );
    return Number.isFinite(n) ? n : null;
  };
  const rowOf = (li) => ({
    id: li.getAttribute('data-item-id'),
    type: li.getAttribute('data-type'),
    name: text(li.querySelector('[data-testid="library-row-name"]')),
    meta: text(li.querySelector('[data-testid="library-row-meta"]')),
    draggable: li.getAttribute('draggable') === 'true',
    favourite:
      li
        .querySelector('[data-testid="library-favourite"]')
        ?.getAttribute('aria-pressed') === 'true',
    preview:
      li
        .querySelector('[data-testid="library-preview"]')
        ?.getAttribute('data-state') ?? null,
  });
  const sections = [
    ...browser.querySelectorAll('[data-testid="library-section"]'),
  ].map((section) => ({
    type: section.getAttribute('data-type'),
    count: countOf(section.querySelector('[data-count]')),
    rows: section.querySelectorAll('li[data-testid="library-row"]').length,
  }));
  const rows = [
    ...browser.querySelectorAll(
      '[data-testid="library-section"] li[data-testid="library-row"]',
    ),
  ].map(rowOf);
  const counted =
    sections.length > 0 && sections.every((s) => s.count !== null);
  const fits = browser.querySelector('[data-testid="library-fits"]');
  const favourites = browser.querySelector(
    '[data-testid="library-filter-favourites"]',
  );
  return {
    found: true,
    search:
      browser.querySelector('input[data-testid="library-search"]')?.value ??
      null,
    sections,
    count: counted ? sections.reduce((n, s) => n + s.count, 0) : rows.length,
    counted,
    domRows: rows.length,
    rows,
    fits: shown(fits)
      ? {
          reason: text(
            fits.querySelector('[data-testid="library-fits-reason"]'),
          ),
          rows: [...fits.querySelectorAll('li[data-testid="library-row"]')].map(
            rowOf,
          ),
        }
      : null,
    chips: [
      ...browser.querySelectorAll('button[data-testid="library-chip"]'),
    ].map((b) => ({
      tag: b.getAttribute('data-tag'),
      pressed: b.getAttribute('aria-pressed') === 'true',
    })),
    clearShown: shown(
      browser.querySelector('[data-testid="library-filter-clear"]'),
    ),
    favouritesOnly: favourites?.getAttribute('aria-pressed') === 'true',
    empty: shown(browser.querySelector('[data-testid="library-empty"]')),
    question: shown(
      document.querySelector('[data-testid="library-tempo-question"]'),
    ),
  };
}

/** The open facet menu's radio items: value, count, checked, off. */
function facetMenuNow() {
  const open = [
    ...document.querySelectorAll(
      '[role="menu"][data-state="open"] [role="menuitemradio"][data-value]',
    ),
  ];
  const items = (
    open.length > 0
      ? open
      : [...document.querySelectorAll('[role="menuitemradio"][data-value]')]
  ).filter((el) => el.getBoundingClientRect().height > 1);
  return items.map((el) => {
    const holder = el.matches('[data-count]')
      ? el
      : el.querySelector('[data-count]');
    const raw = holder?.getAttribute('data-count');
    const count = holder
      ? Number(
          raw !== null && raw !== ''
            ? raw
            : (holder.textContent ?? '').replace(/[^\d]+/g, ''),
        )
      : null;
    return {
      value: el.getAttribute('data-value'),
      count: Number.isFinite(count) ? count : null,
      checked: el.getAttribute('aria-checked') === 'true',
      off:
        el.getAttribute('aria-disabled') === 'true' ||
        el.hasAttribute('data-disabled'),
    };
  });
}

/**
 * Whether the Library panel runs out sideways: a scroller in it that scrolls
 * sideways, or a shown element past the panel's left or right edge.
 */
function panelOverflow() {
  const panel = document.querySelector(
    '[data-testid="inspector-panel"][data-panel="library"]',
  );
  if (!panel) return null;
  const box = panel.getBoundingClientRect();
  const offenders = [];
  let scrollers = 0;
  for (const el of [panel, ...panel.querySelectorAll('*')]) {
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    // A resize edge (the Resizer primitive) may straddle the panel's edge.
    if (el.matches('[role="separator"]')) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden') continue;
    const sideways =
      (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
      el.scrollWidth > el.clientWidth + 1;
    if (sideways) scrollers += 1;
    if (sideways || r.left < box.left - 1 || r.right > box.right + 1) {
      offenders.push(
        `${el.tagName.toLowerCase()}${el.dataset.testid ? `[${el.dataset.testid}]` : ''} ${Math.round(r.left - box.left)}…${Math.round(r.right - box.left)} of ${Math.round(box.width)}${sideways ? ' (scrolls sideways)' : ''} “${(el.textContent ?? '').trim().slice(0, 30)}”`,
      );
    }
  }
  return {
    width: Math.round(box.width),
    scrollers,
    offenders: offenders.slice(0, 8),
    total: offenders.length,
  };
}

/** The add-track sheet: its step, tiles, chips, focus and fit. */
function sheetNow() {
  const dialog = document.querySelector('[data-testid="add-track-sheet"]');
  if (!dialog) return null;
  const box = dialog.getBoundingClientRect();
  if (box.height <= 1) return null;
  const grid = dialog.querySelector('.grid');
  const anchorOf = (el) =>
    (el?.getAttribute('data-tutorial-id') ?? '').replace(/^add-track-/, '');
  const tiles = grid
    ? [...grid.querySelectorAll('[data-tutorial-id^="add-track-"]')]
    : [];
  const chip = (id) => {
    const el = dialog.querySelector(`[data-tutorial-id="add-track-${id}"]`);
    if (!el) return { id, found: false };
    const r = el.getBoundingClientRect();
    return {
      id,
      found: true,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
    };
  };
  const active = document.activeElement;
  return {
    step:
      dialog.getAttribute('data-step') ??
      dialog.closest('[data-step]')?.getAttribute('data-step') ??
      dialog.querySelector('[data-step]')?.getAttribute('data-step') ??
      null,
    inside:
      box.top >= -0.5 &&
      box.left >= -0.5 &&
      box.bottom <= window.innerHeight + 0.5 &&
      box.right <= window.innerWidth + 0.5,
    box: {
      top: Math.round(box.top),
      left: Math.round(box.left),
      bottom: Math.round(box.bottom),
      right: Math.round(box.right),
    },
    grid: !!grid,
    gridOverflow: grid ? grid.scrollWidth > grid.clientWidth + 1 : null,
    dialogOverflow: dialog.scrollWidth > dialog.clientWidth + 1,
    tiles: tiles.map((el) => ({
      anchor: anchorOf(el),
      about: (
        el.querySelector('[data-testid="add-track-about"]')?.textContent ?? ''
      ).trim(),
    })),
    back: !!dialog.querySelector('[data-testid="add-track-back"]'),
    chips: [chip('import'), chip('browser')],
    focused: active?.getAttribute('data-tutorial-id')
      ? anchorOf(active)
      : (active?.getAttribute('data-testid') ?? active?.tagName ?? null),
  };
}

/**
 * The parts behind `ids` (part:<id>) from the parts registry: what a row's
 * meta and a pick are judged against. The key label (clipKey.ts) and the
 * numerals (the browser's chordFunction.ts) when their modules load.
 */
async function partsInfo(ids) {
  const load = window.__RT_DEV_MODULE__;
  const registry = await load('/src/curriculum/engine/parts/registry.ts');
  const label = await load('/src/daw/harmony/clipKey.ts').then(
    (m) => m.shortKeyLabel,
    () => null,
  );
  const numerals = await load(
    '/src/daw/shell/inspector/browser/chordFunction.ts',
  ).then(
    (m) => m.chordFunction,
    () => null,
  );
  return Object.fromEntries(
    ids.map((id) => {
      const part = registry.getPart(String(id).replace(/^part:/, ''));
      if (!part) return [id, null];
      let fn;
      try {
        fn = numerals ? numerals(part) : undefined;
      } catch (error) {
        fn = `threw: ${String(error).slice(0, 80)}`;
      }
      return [
        id,
        {
          instrument: part.instrument,
          role: part.role,
          sound: part.sound,
          key: part.key,
          keyLabel: label ? label(part.key.tonic, part.key.mode) : null,
          tempo: part.tempo,
          bars: part.bars,
          chords: part.chordSymbols?.length ?? 0,
          numerals: fn,
          notes: part.notes.map((n) => ({
            note: n.midi,
            durationTicks: n.duration,
            velocity: n.velocity,
          })),
        },
      ];
    }),
  );
}

/** The Studio sounds (instrumentPresets.ts PRESETS), for kitAndPreset. */
async function studioPresets() {
  const m = await window.__RT_DEV_MODULE__(
    '/src/daw/data/instrumentPresets.ts',
  );
  return m.PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    instrumentType: p.instrumentType,
    gmProgram: p.gmProgram ?? null,
  }));
}

/**
 * Arms a timer: from the first pointerdown on `press` to the moment `watch`
 * shows data-state `want` (a MutationObserver, in the page's own clock).
 */
function armTimer({ press, watch, want }) {
  const rec = { t0: null, t1: null };
  window.__R33_TIMER__ = rec;
  let observer = null;
  const onDown = (event) => {
    if (rec.t0 === null && event.target?.closest?.(press)) {
      rec.t0 = performance.now();
    }
  };
  const check = () => {
    if (
      rec.t0 !== null &&
      rec.t1 === null &&
      document.querySelector(watch)?.getAttribute('data-state') === want
    ) {
      rec.t1 = performance.now();
      observer?.disconnect();
      document.removeEventListener('pointerdown', onDown, true);
    }
  };
  document.addEventListener('pointerdown', onDown, true);
  observer = new MutationObserver(check);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-state'],
  });
}

/** The armed timer's ms, or null if it never saw both ends. */
function readTimer() {
  const rec = window.__R33_TIMER__;
  return rec && rec.t0 !== null && rec.t1 !== null
    ? Math.round(rec.t1 - rec.t0)
    : null;
}

/** A drop's DataTransfer through synthetic drag events (dragTo's fallback). */
function syntheticDrop({ row, canvas, x, y }) {
  const source = document.querySelector(row);
  const target = document.querySelector(canvas);
  if (!source || !target) return { ok: false, why: 'source or canvas missing' };
  const data = new DataTransfer();
  const fire = (el, type, at) =>
    el.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: data,
        clientX: at.x,
        clientY: at.y,
      }),
    );
  const r = source.getBoundingClientRect();
  const from = { x: r.left + 8, y: r.top + r.height / 2 };
  fire(source, 'dragstart', from);
  fire(target, 'dragenter', { x, y });
  fire(target, 'dragover', { x, y });
  fire(target, 'drop', { x, y });
  fire(source, 'dragend', { x, y });
  return { ok: true, types: [...data.types] };
}

// ── Node-side helpers ───────────────────────────────────────────────────────

const song = (page) => page.evaluate(songNow);
const library = (page) => page.evaluate(libraryNow);
const clipCount = (s) => s.tracks.reduce((n, t) => n + t.clips.length, 0);
const fresh = (before, after) =>
  after.tracks.filter((t) => !before.tracks.some((b) => b.id === t.id));
const err = (error) => ({
  error: String(error?.message ?? error).slice(0, 300),
});
const ok = (facts) => !!facts && !facts.error;

/** A row's meta in its parts (the " · " separators). */
const metaParts = (meta) =>
  (meta ?? '')
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

/** How much of the notes' weight (duration × velocity) is on the scale. */
function scaleFit(events, rootPc, intervals = IONIAN) {
  const scale = new Set(intervals.map((i) => (i + rootPc) % 12));
  let total = 0;
  let on = 0;
  for (const e of events) {
    const w = Math.max(1, e.durationTicks) * (e.velocity / 127);
    total += w;
    if (scale.has(((e.note % 12) + 12) % 12)) on += w;
  }
  return total > 0 ? Math.round((on / total) * 1000) / 1000 : 0;
}

/** Polls `fn(page)` until `until(value)`, or resolves to the last value. */
async function waitFor(kit, page, fn, until, timeout = 5000, every = 150) {
  const deadline = Date.now() + timeout;
  let value = await fn(page);
  while (!until(value) && Date.now() < deadline) {
    await kit.sleep(every);
    value = await fn(page);
  }
  return value;
}

/** The list once its count has moved from `from` and held for a moment. */
async function listAfter(kit, page, from, timeout = 4000) {
  const deadline = Date.now() + timeout;
  let last = await library(page);
  for (;;) {
    await kit.sleep(200);
    const now = await library(page);
    if (now.count !== from && now.count === last.count) return now;
    if (Date.now() > deadline) return now;
    last = now;
  }
}

/** Shows the Library panel (the side rail's Library), its browser loaded. */
async function openLibrary(kit, page) {
  const showing = await page.evaluate(() => {
    const s = window.__MA_STORE__.getState();
    return s.libraryOpen && s.inspectorPanel === 'library';
  });
  if (!showing) await page.click('[data-testid="rail-library"]');
  // The panel's body is a lazy chunk (a cold dev server compiles it first).
  await page.waitForSelector(BROWSER, { state: 'visible', timeout: 90_000 });
  await page
    .waitForSelector(`${BROWSER} li[data-testid="library-row"]`, {
      state: 'attached',
      timeout: 30_000,
    })
    .catch(() => {});
  await kit.sleep(300);
}

/** Escape until no menu, dialog or tempo question is open (three at most). */
async function closeOverlays(kit, page) {
  for (let i = 0; i < 3; i++) {
    const open = await page.evaluate(
      () =>
        !!document.querySelector(
          '[role="menu"][data-state="open"], [role="dialog"][data-state="open"], [role="alertdialog"], [data-testid="add-track-sheet"]',
        ),
    );
    if (!open) return;
    if (await page.locator('[data-testid="library-tempo-cancel"]').count()) {
      await page
        .click('[data-testid="library-tempo-cancel"]', { timeout: 2000 })
        .catch(() => {});
    } else {
      await page.keyboard.press('Escape');
    }
    await kit.sleep(250);
  }
}

/** Clears the panel's query: Clear, the search text, the ♡ filter. */
async function clearQuery(kit, page) {
  const before = await library(page);
  if (!before.found) return;
  if (before.clearShown) {
    await page
      .click(`${BROWSER} [data-testid="library-filter-clear"]`, {
        timeout: 3000,
      })
      .catch(() => {});
    await kit.sleep(250);
  }
  const now = await library(page);
  if (now.search) {
    await page.fill(SEARCH, '');
    await kit.sleep(300);
  }
  if ((await library(page)).favouritesOnly) {
    await page.click(`${BROWSER} [data-testid="library-filter-favourites"]`);
    await kit.sleep(250);
  }
  for (const chip of (await library(page)).chips.filter((c) => c.pressed)) {
    await page
      .click(
        `${BROWSER} button[data-testid="library-chip"][data-tag="${quoted(chip.tag)}"]`,
        { timeout: 2000 },
      )
      .catch(() => {});
    await kit.sleep(200);
  }
}

/** The song back to empty with `key`, the panel showing with no query. */
async function resetAll(kit, page, key) {
  await closeOverlays(kit, page);
  await page.evaluate(resetSong, key);
  await kit.sleep(300);
  await openLibrary(kit, page);
  await clearQuery(kit, page);
  await kit.sleep(300);
}

/** Opens a facet's menu; resolves to its items (then leaves it open). */
async function openFacet(kit, page, facet) {
  await page.click(`${BROWSER} [data-testid="library-filter-${facet}"]`, {
    timeout: 5000,
  });
  await page
    .waitForSelector('[role="menuitemradio"][data-value]', {
      state: 'visible',
      timeout: 5000,
    })
    .catch(() => {});
  await kit.sleep(200);
  return page.evaluate(facetMenuNow);
}

/** Picks `value` in a facet's menu; resolves to the menu as it was. */
async function setFacet(kit, page, facet, value) {
  const from = (await library(page)).count;
  const items = await openFacet(kit, page, facet);
  await page
    .locator(`[role="menuitemradio"][data-value="${quoted(value)}"]`)
    .filter({ visible: true })
    .first()
    .click({ timeout: 5000 });
  const list = await listAfter(kit, page, from, 3000);
  return { items, list };
}

/** One Undo, with focus on the page (the editor takes Ctrl or ⌘ as Mod). */
async function undoOnce(kit, page) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press(`${MOD}+KeyZ`);
  await kit.sleep(500);
}

/**
 * + on a row: resolves to 'added', 'question' (the tempo question showed,
 * then `answer` was pressed: change, keep or cancel; null leaves it open)
 * or 'nothing', with the song before and after.
 */
async function plus(kit, page, id, { where = LIST, answer = 'keep' } = {}) {
  const before = await song(page);
  await page
    .locator(rowSel(id, where))
    .first()
    .locator('[data-testid="library-add"]')
    .click({ timeout: 8000 });
  const outcome = await page
    .waitForFunction(
      ({ n, question }) =>
        window.__MA_STORE__.getState().tracks.length !== n
          ? 'added'
          : document.querySelector(question)
            ? 'question'
            : false,
      { n: before.tracks.length, question: QUESTION },
      { timeout: 20_000, polling: 150 },
    )
    .then(
      (handle) => handle.jsonValue(),
      () => 'nothing',
    );
  if (outcome === 'question' && answer) {
    await page.click(`[data-testid="library-tempo-${answer}"]`, {
      timeout: 5000,
    });
    await waitFor(
      kit,
      page,
      song,
      (s) => s.tracks.length !== before.tracks.length,
      answer === 'cancel' ? 800 : 15_000,
    );
    await kit.sleep(300);
  } else {
    await kit.sleep(400);
  }
  return { outcome, before, after: await song(page) };
}

/** A track's facts for the report. */
const trackFacts = (t) =>
  t && {
    name: t.name,
    instrument: t.instrument,
    bassVoice: t.bassVoice,
    gmProgram: t.gmProgram,
    drumKit: t.drumKit,
    presetName: t.presetName,
    trackRole: t.trackRole,
    clips: t.clips.map((c) => `${c.startTick}+${c.durationTicks}`),
  };

/** The design floors in `root`'s subtree (designProbe's subtree mode). */
async function floorsOf(page, root) {
  const found = (await page.locator(root).count()) > 0;
  const findings = found
    ? await page.evaluate(designProbe, { root, subtree: true })
    : [];
  return { root, found, findings };
}

const floorText = (p) =>
  !p
    ? ['not measured']
    : !p.found
      ? [`${p.root} not found`]
      : p.findings.map((f) =>
          f.kind === 'text'
            ? `text ${f.size}px “${f.text}”`
            : `target ${f.width}×${f.height} “${f.text}”`,
        );

// ── Each size: the panel's floors and the picker ───────────────────────────

/** The panel at `width`: its floors, its sideways overflow, the Type menu. */
async function panelAt(kit, page, width) {
  await page.evaluate(
    (px) => window.__MA_STORE__.getState().setInspectorWidth(px),
    width,
  );
  await kit.sleep(500);
  const panel = await floorsOf(page, PANEL);
  const overflow = await page.evaluate(panelOverflow);
  let menu = null;
  try {
    await openFacet(kit, page, 'type');
    menu = await floorsOf(page, '[role="menu"][data-state="open"]');
  } catch (error) {
    menu = { root: 'type menu', found: false, findings: [], ...err(error) };
  }
  await closeOverlays(kit, page);
  return {
    width,
    stored: (await song(page)).inspectorWidth,
    panel,
    menu,
    overflow,
  };
}

async function panelFloors(kit, page) {
  await openLibrary(kit, page);
  const at = [];
  for (const width of WIDTHS) at.push(await panelAt(kit, page, width));
  await page.evaluate(() =>
    window.__MA_STORE__.getState().setInspectorWidth(300),
  );
  return { at };
}

/** Opens the sheet on + Add track; resolves to it. */
async function openSheet(kit, page) {
  await page.click(ADD_BUTTON, { timeout: 5000 });
  await page.waitForSelector(SHEET, { state: 'visible', timeout: 5000 });
  await kit.sleep(350);
  return page.evaluate(sheetNow);
}

const sheetGone = (kit, page) =>
  waitFor(
    kit,
    page,
    (p) => p.evaluate(sheetNow),
    (s) => s === null,
    3000,
  ).then((s) => s === null);

/** Clicks a tile and waits for the step (or the sheet to close). */
async function clickTile(kit, page, anchor) {
  await page.click(tile(anchor), { timeout: 5000 });
  await kit.sleep(400);
  return page.evaluate(sheetNow);
}

async function pickerSteps(kit, page) {
  // Step 1, and its floors.
  const step1 = await openSheet(kit, page);
  const out = { step1, step1Floors: await floorsOf(page, SHEET) };
  // Drums: step 2, its floors, and back.
  out.step2 = await clickTile(kit, page, 'cat-drums');
  out.step2Floors = await floorsOf(page, SHEET);
  await page.click(`${SHEET} [data-testid="add-track-back"]`, {
    timeout: 5000,
  });
  await kit.sleep(400);
  out.back = await page.evaluate(sheetNow);
  // Drum grid adds a drum machine and opens Notes.
  {
    const before = await song(page);
    await clickTile(kit, page, 'cat-drums');
    await page.click(tile('drum-machine'), { timeout: 5000 });
    const after = await waitFor(
      kit,
      page,
      song,
      (s) => s.tracks.length !== before.tracks.length,
      5000,
    );
    await kit.sleep(300);
    const added = fresh(before, after);
    out.drumGrid = {
      closed: await sheetGone(kit, page),
      added: added.map(trackFacts),
      selected: added[0] ? after.selectedTrackId === added[0].id : false,
      tab: (await song(page)).channelStripTab,
    };
  }
  // Keys: three choices; Escape closes; the next open is step 1.
  await openSheet(kit, page);
  out.keys = await clickTile(kit, page, 'cat-keys');
  await page.keyboard.press('Escape');
  out.keysClosed = await sheetGone(kit, page);
  out.reopened = await openSheet(kit, page);
  // Bass adds at once (the sheet is on step 1).
  {
    const before = await song(page);
    await page.click(tile('bass-electric'), { timeout: 5000 });
    const after = await waitFor(
      kit,
      page,
      song,
      (s) => s.tracks.length !== before.tracks.length,
      5000,
    );
    const added = fresh(before, after);
    out.bass = {
      closed: await sheetGone(kit, page),
      added: added.map(trackFacts),
      tab: after.channelStripTab,
    };
  }
  // Browse the library: from a shut Inspector, the Library panel shows.
  {
    await page.evaluate(() => {
      const s = window.__MA_STORE__.getState();
      s.setInspectorOpenFor(s.currentView, false);
    });
    await kit.sleep(300);
    await openSheet(kit, page);
    await page.click(`${SHEET} [data-tutorial-id="add-track-browser"]`, {
      timeout: 5000,
    });
    const shown = await page
      .waitForSelector(BROWSER, { state: 'visible', timeout: 60_000 })
      .then(
        () => true,
        () => false,
      );
    await kit.sleep(300);
    const s = await song(page);
    out.browse = {
      closed: await sheetGone(kit, page),
      shown,
      open: s.libraryOpen,
      panel: s.inspectorPanel,
      focusInSearch: await page.evaluate(
        () =>
          document.activeElement?.getAttribute('data-testid') ===
          'library-search',
      ),
    };
  }
  // Import: the file picker, and nothing added.
  {
    const before = await song(page);
    await openSheet(kit, page);
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 }).then(
      () => true,
      () => false,
    );
    await page.click(`${SHEET} [data-tutorial-id="add-track-import"]`, {
      timeout: 5000,
    });
    const fired = await chooser;
    await kit.sleep(500);
    out.import = {
      fired,
      closed: await sheetGone(kit, page),
      tracks: (await song(page)).tracks.length - before.tracks.length,
    };
  }
  return out;
}

async function sizeAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await kit.settle(page, 'R33 open');
      await kit.sleep(500);
      const out = { viewport };
      const step = async (name, fn) => {
        try {
          out[name] = await fn();
        } catch (error) {
          out[name] = err(error);
        }
        await closeOverlays(kit, page).catch(() => {});
      };
      await step('panel', () => panelFloors(kit, page));
      await step('picker', () => pickerSteps(kit, page));
      return out;
    },
    api,
  );
}

// ── Once: a keyless song ────────────────────────────────────────────────────

async function rowMeta(kit, page) {
  const lib = await library(page);
  const parts = lib.rows.filter((r) => r.type === 'part').slice(0, 40);
  const info = await page.evaluate(
    partsInfo,
    parts.map((r) => r.id),
  );
  const part = parts.find((r) => info[r.id]?.chords > 0) ?? parts[0] ?? null;
  const groove = lib.rows.find((r) => r.type === 'groove') ?? null;
  return {
    part: part && { id: part.id, meta: part.meta, info: info[part.id] },
    groove: groove && { id: groove.id, meta: groove.meta },
  };
}

async function keyFill(kit, page) {
  await setFacet(kit, page, 'type', 'part');
  const lib = await library(page);
  const row = lib.rows.find((r) => r.type === 'part');
  if (!row) throw new Error('no part row');
  const info = (await page.evaluate(partsInfo, [row.id]))[row.id];
  const added = await plus(kit, page, row.id);
  // The key fill's notice: a Sonner toast naming the key it filled.
  const toastNow = (p) =>
    p.evaluate(
      () =>
        [...document.querySelectorAll('[data-sonner-toast]')]
          .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
          .find((t) => /now in/i.test(t)) ?? null,
    );
  const toast = await waitFor(kit, page, toastNow, (t) => t !== null, 3000);
  const steps =
    added.before.pushed === null || added.after.pushed === null
      ? null
      : added.after.pushed - added.before.pushed;
  await undoOnce(kit, page);
  const undone = await song(page);
  return {
    id: row.id,
    meta: row.meta,
    partKey: info?.key ?? null,
    keyLabel: info?.keyLabel ?? null,
    outcome: added.outcome,
    before: {
      rootNote: added.before.rootNote,
      tracks: added.before.tracks.length,
    },
    after: {
      rootNote: added.after.rootNote,
      mode: added.after.mode,
      tracks: added.after.tracks.length,
    },
    steps,
    toast,
    undone: {
      rootNote: undone.rootNote,
      mode: undone.mode,
      tracks: undone.tracks.length,
    },
  };
}

async function facetCounts(kit, page) {
  const start = await library(page);
  const typeMenu = await openFacet(kit, page, 'type');
  await closeOverlays(kit, page);
  const groove = await setFacet(kit, page, 'type', 'groove');
  const grooveCount = typeMenu.find((i) => i.value === 'groove')?.count ?? null;
  const instrumentMenu = await openFacet(kit, page, 'instrument');
  await closeOverlays(kit, page);
  const genreMenu = await openFacet(kit, page, 'genre');
  await closeOverlays(kit, page);
  const top = genreMenu
    .filter((i) => i.value && (i.count ?? 0) > 0)
    .sort((a, b) => b.count - a.count)[0];
  const genre = top
    ? await setFacet(kit, page, 'genre', top.value)
    : { items: genreMenu, list: await library(page) };
  const from = (await library(page)).count;
  await page.click(`${BROWSER} [data-testid="library-filter-clear"]`, {
    timeout: 5000,
  });
  const cleared = await listAfter(kit, page, from, 3000);
  const summary = (lib) => ({
    count: lib.count,
    counted: lib.counted,
    domRows: lib.domRows,
    sections: lib.sections.map((s) => `${s.type}:${s.count}`),
    types: [...new Set(lib.rows.map((r) => r.type))],
  });
  return {
    start: summary(start),
    typeMenu,
    grooveCount,
    groove: summary(groove.list),
    instrumentMenu,
    genreMenu,
    genre: top ? { value: top.value, count: top.count } : null,
    genreList: summary(genre.list),
    cleared: summary(cleared),
  };
}

async function searchAndChips(kit, page) {
  const start = await library(page);
  await page.fill(SEARCH, 'bass');
  const searched = await listAfter(kit, page, start.count, 4000);
  let chip = null;
  const tried = [];
  for (const c of searched.chips.slice(0, 8)) {
    const sel = `${BROWSER} button[data-testid="library-chip"][data-tag="${quoted(c.tag)}"]`;
    const clicked = await page.click(sel, { timeout: 3000 }).then(
      () => true,
      () => false,
    );
    if (!clicked) {
      // The chip row follows the results: a tag can leave it.
      tried.push(`${c.tag}: gone`);
      continue;
    }
    const now = await listAfter(kit, page, searched.count, 2500);
    const pressed = now.chips.find((x) => x.tag === c.tag)?.pressed ?? false;
    tried.push(`${c.tag}:${now.count}${pressed ? '' : ' (not pressed)'}`);
    if (now.count > 0 && now.count < searched.count && pressed) {
      chip = { tag: c.tag, count: now.count, pressed };
      break;
    }
    // Not narrower: unpress it and try the next.
    if (pressed) await page.click(sel, { timeout: 3000 }).catch(() => {});
    await kit.sleep(250);
  }
  const from = (await library(page)).count;
  await page.click(`${BROWSER} [data-testid="library-filter-clear"]`, {
    timeout: 5000,
  });
  const cleared = await listAfter(kit, page, from, 3000);
  return {
    total: start.count,
    searched: {
      count: searched.count,
      fitsShown: searched.fits !== null,
      chips: searched.chips.map((c) => c.tag),
    },
    chip,
    tried,
    cleared: {
      count: cleared.count,
      search: cleared.search,
      pressed: cleared.chips.filter((c) => c.pressed).map((c) => c.tag),
    },
  };
}

async function favourite(kit, page) {
  await setFacet(kit, page, 'type', 'groove');
  const lib = await library(page);
  const row = lib.rows.find((r) => r.type === 'groove');
  if (!row) throw new Error('no groove row');
  await page
    .locator(rowSel(row.id))
    .first()
    .locator('[data-testid="library-favourite"]')
    .click({ timeout: 5000 });
  await kit.sleep(300);
  const marked = {
    store: (await song(page)).favourites.includes(row.id),
    pressed:
      (await library(page)).rows.find((r) => r.id === row.id)?.favourite ??
      false,
  };
  // The ♡ filter: only marked rows, this one among them.
  await page.click(`${BROWSER} [data-testid="library-filter-favourites"]`, {
    timeout: 5000,
  });
  const filtered = await listAfter(kit, page, lib.count, 3000);
  const favourites = (await song(page)).favourites;
  const filter = {
    pressed: filtered.favouritesOnly,
    ids: filtered.rows.map((r) => r.id),
    onlyMarked: filtered.rows.every((r) => favourites.includes(r.id)),
    hasIt: filtered.rows.some((r) => r.id === row.id),
  };
  await page.click(`${BROWSER} [data-testid="library-filter-favourites"]`, {
    timeout: 5000,
  });
  await kit.sleep(300);
  // The prefs write (per user, per device), then a reload.
  const stored = await waitFor(
    kit,
    page,
    (p) =>
      p.evaluate((id) => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key?.startsWith('musicAtlas:daw:prefs') &&
            (localStorage.getItem(key) ?? '').includes(id)
          ) {
            return true;
          }
        }
        return false;
      }, row.id),
    (v) => v === true,
    5000,
  );
  await kit
    .waitForDraft(page, { allowMissing: true, timeout: 10_000 })
    .catch(() => {});
  await page.reload({ waitUntil: 'domcontentloaded' });
  const state = await kit.waitForEditor(page, 180_000);
  await kit.settle(page, 'R33 favourite reload');
  await openLibrary(kit, page);
  await clearQuery(kit, page);
  await setFacet(kit, page, 'type', 'groove');
  const reloaded = await library(page);
  return {
    id: row.id,
    marked,
    filter: { ...filter, ids: filter.ids.slice(0, 6) },
    stored,
    state,
    afterReload: {
      store: (await song(page)).favourites.includes(row.id),
      pressed: reloaded.rows.find((r) => r.id === row.id)?.favourite ?? null,
    },
  };
}

// ── Once: a C major song ────────────────────────────────────────────────────

async function fitsYourSong(kit, page) {
  const empty = await waitFor(kit, page, library, (l) => l.fits !== null, 5000);
  const emptyPicks = empty.fits?.rows ?? [];
  // A groove from the picks (a kit when there is none), answering the
  // tempo question with Add anyway.
  const pick =
    emptyPicks.find((r) => r.type === 'groove') ??
    emptyPicks.find((r) => r.type === 'kit');
  let added = null;
  let after = null;
  if (pick) {
    added = await plus(kit, page, pick.id, { where: FITS, answer: 'keep' });
    after = await waitFor(
      kit,
      page,
      library,
      (l) => l.fits !== null && !/no drums/i.test(l.fits.reason),
      5000,
    );
  }
  const afterPicks = after?.fits?.rows ?? [];
  const info = await page.evaluate(
    partsInfo,
    afterPicks.filter((r) => r.type === 'part').map((r) => r.id),
  );
  // A search hides the block.
  await page.fill(SEARCH, 'bass');
  const searching = await listAfter(kit, page, (after ?? empty).count, 3000);
  return {
    empty: {
      reason: empty.fits?.reason ?? null,
      picks: emptyPicks.map((r) => r.id),
    },
    added: pick
      ? {
          id: pick.id,
          outcome: added.outcome,
          tracks: added.after.tracks.length - added.before.tracks.length,
        }
      : null,
    after: {
      reason: after?.fits?.reason ?? null,
      picks: afterPicks.map((r) => ({
        id: r.id,
        type: r.type,
        instrument: info[r.id]?.instrument ?? null,
        role: info[r.id]?.role ?? null,
      })),
    },
    hiddenWhileSearching: searching.fits === null,
  };
}

async function plusPart(kit, page) {
  await setFacet(kit, page, 'instrument', 'bass');
  await setFacet(kit, page, 'type', 'part');
  const lib = await library(page);
  const rows = lib.rows.filter((r) => r.type === 'part');
  const info = await page.evaluate(
    partsInfo,
    rows.map((r) => r.id),
  );
  // A finger bass line (one part plays the 808) that has to move: its own
  // key and its notes are off C major's notes, and its row's landed key (the meta's first
  // part) is one of C major's modes, so moveForSong found a shift that fits.
  // Without one, the earlier pick: a part that lands on C major's notes.
  const finger = (r) =>
    info[r.id]?.instrument === 'bass' &&
    info[r.id]?.sound === 'bass-electric:finger';
  const onC = (r) => C_FAMILY.includes(metaParts(r.meta)[0]);
  // Its notes too: a part in C dorian that plays only Cs is on C major's
  // notes already and needs no move.
  const moves = (r) =>
    finger(r) &&
    onC(r) &&
    !onCMajor(info[r.id]?.key) &&
    scaleFit(info[r.id]?.notes ?? [], C_MAJOR.rootPc) < 0.9;
  const qualifies = rows.some(moves);
  const row =
    rows.find(moves) ??
    rows.find((r) => finger(r) && onC(r)) ??
    rows.find((r) => info[r.id]?.instrument === 'bass' && onC(r)) ??
    rows.find(finger) ??
    rows[0];
  if (!row) throw new Error('no bass part row');
  const added = await plus(kit, page, row.id);
  const tracks = fresh(added.before, added.after);
  const track = tracks[0] ?? null;
  const events = track?.clips[0]?.events ?? [];
  const steps =
    added.before.pushed === null || added.after.pushed === null
      ? null
      : added.after.pushed - added.before.pushed;
  await undoOnce(kit, page);
  const undone = await song(page);
  const partNotes = info[row.id]?.notes ?? [];
  return {
    id: row.id,
    meta: row.meta,
    qualifies,
    landedOnC: onC(row),
    ownKeyOnC: onCMajor(info[row.id]?.key),
    sound: info[row.id]?.sound ?? null,
    partKey: info[row.id]?.key ?? null,
    shift: pitchShift(partNotes, events),
    partNotes: partNotes.length,
    unmovedFit: scaleFit(partNotes, C_MAJOR.rootPc),
    outcome: added.outcome,
    added: tracks.length,
    track: trackFacts(track),
    notes: events.length,
    fit: scaleFit(events, C_MAJOR.rootPc),
    key: { rootNote: added.after.rootNote, mode: added.after.mode },
    steps,
    undone: {
      tracks: undone.tracks.map((t) => t.id),
      before: added.before.tracks.map((t) => t.id),
    },
  };
}

async function grooveTempo(kit, page) {
  await setFacet(kit, page, 'type', 'groove');
  const lib = await library(page);
  const bpm = (await song(page)).bpm;
  const tempoOf = (r) => Number(/(\d+)\s*BPM/.exec(r.meta)?.[1] ?? NaN);
  const row = lib.rows.find(
    (r) =>
      r.type === 'groove' && Number.isFinite(tempoOf(r)) && tempoOf(r) !== bpm,
  );
  if (!row) throw new Error(`no groove at a tempo other than ${bpm} BPM`);
  const tempo = tempoOf(row);
  // Cancel.
  const cancel = await plus(kit, page, row.id, { answer: 'cancel' });
  const cancelGone = !(await library(page)).question;
  // Change to N BPM, then one Undo.
  const change = await plus(kit, page, row.id, { answer: 'change' });
  const changeSteps =
    change.before.pushed === null || change.after.pushed === null
      ? null
      : change.after.pushed - change.before.pushed;
  const changed = fresh(change.before, change.after)[0] ?? null;
  await undoOnce(kit, page);
  const undone = await song(page);
  // Add anyway.
  const keep = await plus(kit, page, row.id, { answer: 'keep' });
  const kept = fresh(keep.before, keep.after)[0] ?? null;
  return {
    id: row.id,
    meta: row.meta,
    tempo,
    songBpm: bpm,
    cancel: {
      outcome: cancel.outcome,
      tracks: cancel.after.tracks.length - cancel.before.tracks.length,
      bpm: cancel.after.bpm,
      closed: cancelGone,
    },
    change: {
      outcome: change.outcome,
      tracks: change.after.tracks.length - change.before.tracks.length,
      bpm: change.after.bpm,
      track: trackFacts(changed),
      steps: changeSteps,
    },
    undone: {
      tracks: undone.tracks.length - change.before.tracks.length,
      bpm: undone.bpm,
    },
    keep: {
      outcome: keep.outcome,
      tracks: keep.after.tracks.length - keep.before.tracks.length,
      bpm: keep.after.bpm,
      track: trackFacts(kept),
    },
  };
}

async function kitAndPreset(kit, page) {
  const out = {};
  // A kit other than the default one.
  await setFacet(kit, page, 'type', 'kit');
  const kits = (await library(page)).rows.filter((r) => r.type === 'kit');
  const kitRow = kits.find((r) => r.id !== 'kit:natural') ?? kits[0];
  if (kitRow) {
    const added = await plus(kit, page, kitRow.id);
    out.kit = {
      id: kitRow.id,
      outcome: added.outcome,
      track: trackFacts(fresh(added.before, added.after)[0] ?? null),
    };
  }
  await clearQuery(kit, page);
  await setFacet(kit, page, 'type', 'preset');
  const presets = (await library(page)).rows.filter((r) => r.type === 'preset');
  // A Studio sound with a GM program.
  const studio = await page.evaluate(studioPresets).catch(() => []);
  const studioRow = presets
    .filter((r) => r.id.startsWith('preset:studio:'))
    .map((r) => {
      const name = r.id.slice('preset:studio:'.length);
      return {
        row: r,
        preset:
          studio.find((p) => p.name === name || p.id === name) ??
          studio.find((p) => p.name === r.name) ??
          null,
      };
    })
    .find((x) => x.preset?.gmProgram !== null && x.preset !== null);
  if (studioRow) {
    const added = await plus(kit, page, studioRow.row.id);
    out.studio = {
      id: studioRow.row.id,
      preset: studioRow.preset,
      outcome: added.outcome,
      track: trackFacts(fresh(added.before, added.after)[0] ?? null),
    };
  } else {
    out.studio = {
      missing: presets
        .filter((r) => r.id.startsWith('preset:studio:'))
        .slice(0, 4)
        .map((r) => r.id),
    };
  }
  // An Oracle preset.
  const oracleRow = presets.find((r) => r.id.startsWith('preset:oracle:'));
  if (oracleRow) {
    const added = await plus(kit, page, oracleRow.id);
    out.oracle = {
      id: oracleRow.id,
      name: oracleRow.name,
      outcome: added.outcome,
      track: trackFacts(fresh(added.before, added.after)[0] ?? null),
    };
  }
  out.presetIds = presets.slice(0, 3).map((r) => r.id);
  return out;
}

async function preview(kit, page) {
  await setFacet(kit, page, 'type', 'part');
  const rows = (await library(page)).rows.filter((r) => r.type === 'part');
  const [a, b] = rows;
  if (!a || !b) throw new Error('fewer than two part rows');
  const button = (id) =>
    page.locator(rowSel(id)).first().locator('[data-testid="library-preview"]');
  const stateOf = (id) =>
    button(id)
      .evaluate(
        (el) => ({
          state: el.getAttribute('data-state'),
          pressed: el.getAttribute('aria-pressed'),
        }),
        null,
        { timeout: 2000 },
      )
      .catch(() => null);
  const reach = async (id, want, timeout) => {
    const deadline = Date.now() + timeout;
    let now = await stateOf(id);
    while (now?.state !== want && Date.now() < deadline) {
      await kit.sleep(100);
      now = await stateOf(id);
    }
    return now;
  };
  const out = { a: a.id, b: b.id };
  await button(a.id).click({ timeout: 5000 });
  out.aPlaying = await reach(a.id, 'playing', 25_000);
  // ■ stops it, timed from the press to idle.
  const aButton = `${rowSel(a.id)} [data-testid="library-preview"]`;
  const bButton = `${rowSel(b.id)} [data-testid="library-preview"]`;
  await page.evaluate(armTimer, {
    press: aButton,
    watch: aButton,
    want: 'idle',
  });
  await button(a.id).click({ timeout: 5000 });
  out.aStopped = await reach(a.id, 'idle', 3000);
  out.stopMs = await page.evaluate(readTimer);
  // ▶ again, then ▶ on another row moves it.
  await button(a.id).click({ timeout: 5000 });
  out.aAgain = await reach(a.id, 'playing', 25_000);
  await button(b.id).click({ timeout: 5000 });
  out.bPlaying = await reach(b.id, 'playing', 25_000);
  out.aAfterB = await stateOf(a.id);
  // Play stops it, timed from the press to idle; B still played up to it.
  out.bBeforePlay = await stateOf(b.id);
  await page.evaluate(armTimer, {
    press: '[data-testid="transport-play"]',
    watch: bButton,
    want: 'idle',
  });
  await page.click('[data-testid="transport-play"]', { timeout: 5000 });
  out.bAfterPlay = await reach(b.id, 'idle', 3000);
  out.playStopMs = await page.evaluate(readTimer);
  out.transportPlaying = (await song(page)).isPlaying;
  if ((await song(page)).isPlaying) {
    await page.click('[data-testid="transport-play"]').catch(() => {});
    await kit.sleep(300);
  }
  return out;
}

/** The canvas's box and where a lane and a bar sit in it (R31's way). */
async function laneGeometry(page) {
  const box = await page.locator(CANVAS).boundingBox();
  const s = await song(page);
  const barPx = (s.bar / 480) * 40 * s.zoom;
  return {
    box,
    barPx,
    bar: s.bar,
    scrollLeft: s.scrollLeft,
    rows: s.tracks.length,
  };
}

/**
 * A row dragged onto the canvas at `at` (px in the canvas): Playwright's
 * dragTo first, synthetic drag events with a DataTransfer if no clip
 * landed. Resolves to the method that landed it and the song before and
 * after.
 */
async function dropOnCanvas(kit, page, id, at) {
  const before = await song(page);
  const row = page.locator(rowSel(id)).first();
  await row.scrollIntoViewIfNeeded({ timeout: 5000 });
  const rowBox = await row.boundingBox();
  const nameBox = await row
    .locator('[data-testid="library-row-name"]')
    .boundingBox()
    .catch(() => null);
  // Grab the row by its name, not by one of its buttons.
  const sourcePosition =
    rowBox && nameBox
      ? {
          x: nameBox.x - rowBox.x + Math.min(10, nameBox.width / 2),
          y: nameBox.y - rowBox.y + nameBox.height / 2,
        }
      : undefined;
  const landed = (s) =>
    clipCount(s) !== clipCount(before) ||
    s.tracks.length !== before.tracks.length;
  let method = 'dragTo';
  let dragError = null;
  await row
    .dragTo(page.locator(CANVAS), {
      sourcePosition,
      targetPosition: at,
      timeout: 10_000,
    })
    .catch((error) => {
      dragError = String(error?.message ?? error).slice(0, 200);
    });
  let after = await waitFor(kit, page, song, landed, 4000);
  let synthetic = null;
  if (!landed(after)) {
    method = 'synthetic';
    const box = await page.locator(CANVAS).boundingBox();
    synthetic = await page.evaluate(syntheticDrop, {
      row: rowSel(id),
      canvas: CANVAS,
      x: box.x + at.x,
      y: box.y + at.y,
    });
    after = await waitFor(kit, page, song, landed, 8000);
  }
  await kit.sleep(300);
  after = await song(page);
  return { method, dragError, synthetic, before, after, landed: landed(after) };
}

async function dragDrop(kit, page) {
  const pianoId = await page.evaluate(() => {
    const s = window.__MA_STORE__.getState();
    const id = s.addTrack('midi', 'piano-sampler', 'Piano');
    s.setSelectedTrackId(null);
    s.setSelectedClip?.(null, null);
    s.setTimelineZoom(1);
    s.setTimelineScrollLeft(0);
    return id;
  });
  await kit.sleep(500);
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="track-scroller"]');
    if (el) el.scrollTop = 0;
  });
  await setFacet(kit, page, 'type', 'part');
  const rows = (await library(page)).rows.filter((r) => r.type === 'part');
  const row = rows.find((r) => r.draggable) ?? rows[0];
  if (!row) throw new Error('no part row');
  const geo = await laneGeometry(page);
  if (!geo.box) throw new Error('no timeline canvas');
  // The middle of the first lane (under the 56 px canvas header), a quarter
  // into bar 3.
  const lane = {
    x: 2 * geo.barPx + geo.barPx / 4 - geo.scrollLeft,
    y: 56 + 32,
  };
  const onLane = await dropOnCanvas(kit, page, row.id, lane);
  const piano = (s) => s.tracks.find((t) => t.id === pianoId);
  const newClips = (piano(onLane.after)?.clips ?? []).filter(
    (c) => !(piano(onLane.before)?.clips ?? []).some((b) => b.id === c.id),
  );
  // Below the last row (the lanes are 64 px), at the same bar.
  const rowsNow = onLane.after.tracks.length;
  const below = { x: lane.x, y: 56 + rowsNow * 64 + 24 };
  const geo2 = await laneGeometry(page);
  const underRows = await dropOnCanvas(kit, page, row.id, below);
  const made = fresh(underRows.before, underRows.after);
  return {
    id: row.id,
    draggable: row.draggable,
    bar: geo.bar,
    barPx: geo.barPx,
    canvas: {
      width: Math.round(geo.box.width),
      height: Math.round(geo2.box?.height ?? geo.box.height),
    },
    lane,
    below,
    onLane: {
      method: onLane.method,
      dragError: onLane.dragError,
      synthetic: onLane.synthetic,
      tracks: onLane.after.tracks.length - onLane.before.tracks.length,
      newClips: newClips.map((c) => c.startTick),
      otherTracksTouched: onLane.after.tracks
        .filter((t) => t.id !== pianoId)
        .some((t) => {
          const was = onLane.before.tracks.find((b) => b.id === t.id);
          return !was || was.clips.length !== t.clips.length;
        }),
    },
    underRows: {
      method: underRows.method,
      dragError: underRows.dragError,
      synthetic: underRows.synthetic,
      tracks: underRows.after.tracks.length - underRows.before.tracks.length,
      made: made.map(trackFacts),
    },
  };
}

/** One session at 1366×655: `steps` in order, the song reset before each. */
async function onceSession(kit, run, label, key, steps) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[0]);
      await kit.settle(page, `R33 ${label}`);
      await kit.sleep(500);
      const out = {};
      for (const [name, fn] of steps) {
        try {
          await resetAll(kit, page, key);
          out[name] = await fn(kit, page);
        } catch (error) {
          out[name] = err(error);
        }
        await closeOverlays(kit, page).catch(() => {});
      }
      return out;
    },
    api,
  );
}

// ── Judging ─────────────────────────────────────────────────────────────────

const sameSet = (a, b) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

function judgePanel(p) {
  if (!ok(p)) return false;
  return (
    p.at.length === WIDTHS.length &&
    p.at.every(
      (w) =>
        w.stored === w.width &&
        w.panel.found &&
        w.panel.findings.length === 0 &&
        (w.menu?.found ?? false) &&
        w.menu.findings.length === 0 &&
        !!w.overflow &&
        w.overflow.total === 0,
    )
  );
}

function judgePicker(p) {
  if (!ok(p)) return false;
  const fits = (s, floors) =>
    !!s &&
    s.inside &&
    s.grid &&
    s.gridOverflow === false &&
    !s.dialogOverflow &&
    !!floors?.found &&
    floors.findings.length === 0;
  const abouts = (s) => s.tiles.every((t) => t.about.length > 0);
  const tiles = (s, want) =>
    !!s &&
    sameSet(
      s.tiles.map((t) => t.anchor),
      want,
    ) &&
    abouts(s);
  const step1 =
    fits(p.step1, p.step1Floors) &&
    p.step1.step === 'categories' &&
    tiles(p.step1, STEP1) &&
    p.step1.chips.every((c) => c.found && c.height >= 24 && c.width >= 24);
  const step2 =
    fits(p.step2, p.step2Floors) &&
    p.step2.step === 'drums' &&
    p.step2.back &&
    tiles(p.step2, DRUMS) &&
    p.step2.focused === 'drum-machine';
  const back =
    !!p.back && p.back.step === 'categories' && p.back.focused === 'cat-drums';
  const drumGrid =
    !!p.drumGrid &&
    p.drumGrid.closed &&
    p.drumGrid.added.length === 1 &&
    p.drumGrid.added[0].instrument === 'drum-machine' &&
    p.drumGrid.selected &&
    p.drumGrid.tab === 'piano-roll';
  const keys =
    !!p.keys &&
    p.keys.step === 'keys' &&
    tiles(p.keys, KEYS) &&
    p.keysClosed &&
    p.reopened?.step === 'categories';
  const bass =
    !!p.bass &&
    p.bass.closed &&
    p.bass.added.length === 1 &&
    p.bass.added[0].instrument === 'bass-electric' &&
    p.bass.added[0].bassVoice === 'finger' &&
    p.bass.added[0].trackRole === 'bass';
  const browse =
    !!p.browse &&
    p.browse.focusInSearch &&
    p.browse.closed &&
    p.browse.shown &&
    p.browse.open &&
    p.browse.panel === 'library';
  const imported =
    !!p.import && p.import.fired && p.import.closed && p.import.tracks === 0;
  return {
    step1,
    step2,
    back,
    drumGrid,
    keys,
    bass,
    browse,
    import: imported,
  };
}

function judgeRowMeta(m) {
  if (!ok(m) || !m.part || !m.groove) return false;
  const info = m.part.info;
  const [key, tempo, bars, numerals] = metaParts(m.part.meta);
  const barsN = Number(/^(\d+)\s+bars?$/.exec(bars ?? '')?.[1] ?? NaN);
  const part =
    !!info &&
    info.chords > 0 &&
    metaParts(m.part.meta).length === 4 &&
    (info.keyLabel === null ? !!key : key === info.keyLabel) &&
    tempo === `${info.tempo} BPM` &&
    barsN === info.bars &&
    !!numerals &&
    (typeof info.numerals === 'string' && !info.numerals.startsWith('threw')
      ? numerals === info.numerals
      : /[IViv]/.test(numerals));
  const [gTempo, gBars] = metaParts(m.groove.meta);
  const groove =
    /^\d+ BPM$/.test(gTempo ?? '') && /^\d+ bars?$/.test(gBars ?? '');
  return part && groove;
}

function judgeKeyFill(k) {
  return (
    ok(k) &&
    !!k.partKey &&
    k.before.rootNote === null &&
    k.before.tracks === 0 &&
    k.outcome === 'added' &&
    k.after.tracks === 1 &&
    k.after.rootNote === k.partKey.tonic &&
    k.after.mode === k.partKey.mode &&
    k.undone.rootNote === null &&
    k.undone.tracks === 0 &&
    !!k.keyLabel &&
    !!k.toast &&
    k.toast.toLowerCase().includes(`now in ${k.keyLabel.toLowerCase()}`)
  );
}

function judgeFacets(f) {
  if (!ok(f)) return false;
  const named = (menu) => menu.filter((i) => i.value !== '');
  const sum = (menu) => named(menu).reduce((n, i) => n + (i.count ?? 0), 0);
  const any = f.typeMenu.find((i) => i.value === '');
  const typeSums =
    f.start.count > 0 &&
    named(f.typeMenu).every((i) => i.count !== null) &&
    sum(f.typeMenu) === f.start.count &&
    (!any || any.count === null || any.count === f.start.count);
  const grooves =
    f.grooveCount !== null &&
    f.grooveCount > 0 &&
    f.groove.count === f.grooveCount &&
    f.groove.types.length === 1 &&
    f.groove.types[0] === 'groove' &&
    f.groove.sections.every((s) => s.startsWith('groove:'));
  const drums = f.instrumentMenu.find((i) => i.value === 'drums');
  const instrument =
    !!drums &&
    drums.count === f.grooveCount &&
    named(f.instrumentMenu)
      .filter((i) => i.value !== 'drums')
      .every((i) => (i.count ?? 0) === 0);
  const genre =
    !!f.genre &&
    sum(f.genreMenu) <= f.grooveCount &&
    f.genreList.count === f.genre.count &&
    f.genreList.types.every((t) => t === 'groove');
  const cleared = f.cleared.count === f.start.count;
  return typeSums && grooves && instrument && genre && cleared;
}

function judgeSearch(s) {
  return (
    ok(s) &&
    s.total > 0 &&
    s.searched.count > 0 &&
    s.searched.count < s.total &&
    !s.searched.fitsShown &&
    !!s.chip &&
    s.chip.count < s.searched.count &&
    s.cleared.count === s.total &&
    s.cleared.search === '' &&
    s.cleared.pressed.length === 0
  );
}

function judgeFits(f) {
  if (!ok(f)) return false;
  const types = f.empty.picks.map((p) => p.split(':')[0]);
  const lead = types.slice(0, Math.min(3, types.length));
  const empty =
    /no drums/i.test(f.empty.reason ?? '') &&
    types.length > 0 &&
    lead.every((t) => t === 'groove' || t === 'kit') &&
    lead.includes('groove');
  const first = f.after.picks[0];
  const after =
    !!f.added &&
    f.added.tracks === 1 &&
    !!f.after.reason &&
    !/no drums/i.test(f.after.reason) &&
    !!first &&
    first.type === 'part' &&
    (first.role === 'bassline' || first.instrument === 'bass');
  return empty && after && f.hiddenWhileSearching;
}

function judgePlusPart(p) {
  if (!ok(p) || !p.track) return false;
  const voice = (p.sound ?? 'bass-electric:finger').split(':')[1] ?? 'finger';
  return (
    p.outcome === 'added' &&
    p.added === 1 &&
    p.track.instrument === 'bass-electric' &&
    p.track.bassVoice === voice &&
    p.track.trackRole === 'bass' &&
    p.track.clips.length === 1 &&
    p.track.clips[0].startsWith('0+') &&
    p.notes > 0 &&
    p.fit >= 0.9 &&
    p.key.rootNote === C_MAJOR.rootPc &&
    p.key.mode === C_MAJOR.mode &&
    sameSet(p.undone.tracks, p.undone.before) &&
    // A part that had to move: its pitches, shifted by a non-zero step
    // (octaves aside), and off C major before the move. Without such a part
    // (p.qualifies false, reported) the earlier judge stands.
    (!p.qualifies ||
      (!p.ownKeyOnC &&
        p.shift !== null &&
        p.shift !== 0 &&
        p.partNotes === p.notes &&
        p.unmovedFit < 0.9))
  );
}

function judgeGroove(g) {
  return (
    ok(g) &&
    g.cancel.outcome === 'question' &&
    g.cancel.tracks === 0 &&
    g.cancel.bpm === g.songBpm &&
    g.cancel.closed &&
    g.change.outcome === 'question' &&
    g.change.tracks === 1 &&
    g.change.bpm === g.tempo &&
    g.change.track?.instrument === 'drum-machine' &&
    g.change.track.clips.length === 1 &&
    g.undone.tracks === 0 &&
    g.undone.bpm === g.songBpm &&
    g.keep.outcome === 'question' &&
    g.keep.tracks === 1 &&
    g.keep.bpm === g.songBpm
  );
}

function judgeKitPreset(k) {
  if (!ok(k)) return false;
  const kitId = k.kit?.id?.replace(/^kit:/, '');
  const kitOk =
    !!k.kit?.track &&
    k.kit.track.instrument === 'drum-machine' &&
    k.kit.track.drumKit === kitId;
  const studioOk =
    !!k.studio?.track &&
    k.studio.track.instrument === k.studio.preset.instrumentType &&
    k.studio.track.gmProgram === k.studio.preset.gmProgram;
  const oracleName = k.oracle?.id?.replace(/^preset:oracle:/, '');
  const oracleOk =
    !!k.oracle?.track &&
    k.oracle.track.instrument === 'oracle-synth' &&
    (k.oracle.track.presetName === oracleName ||
      k.oracle.track.presetName === k.oracle.name);
  return kitOk && studioOk && oracleOk;
}

function judgeFavourite(f) {
  return (
    ok(f) &&
    f.marked.store &&
    f.marked.pressed &&
    f.filter.pressed &&
    f.filter.hasIt &&
    f.filter.onlyMarked &&
    f.state === 'ready' &&
    f.afterReload.store &&
    f.afterReload.pressed === true
  );
}

function judgePreview(p) {
  return (
    ok(p) &&
    p.aPlaying?.state === 'playing' &&
    p.aPlaying.pressed === 'true' &&
    p.aStopped?.state === 'idle' &&
    p.aAgain?.state === 'playing' &&
    p.bPlaying?.state === 'playing' &&
    p.aAfterB?.state === 'idle' &&
    p.bBeforePlay?.state === 'playing' &&
    p.bAfterPlay?.state === 'idle' &&
    p.transportPlaying === true &&
    // Both stops are prompt: under 400 ms from the press to idle.
    p.stopMs !== null &&
    p.stopMs < 400 &&
    p.playStopMs !== null &&
    p.playStopMs < 400
  );
}

function judgeDrag(d) {
  if (!ok(d)) return false;
  const bar3 = 2 * d.bar;
  return (
    d.draggable &&
    d.onLane.tracks === 0 &&
    d.onLane.newClips.length === 1 &&
    d.onLane.newClips[0] === bar3 &&
    !d.onLane.otherTracksTouched &&
    d.underRows.tracks === 1 &&
    d.underRows.made.length === 1 &&
    d.underRows.made[0].clips.some((c) => c.startsWith(`${bar3}+`))
  );
}

// ── The report ──────────────────────────────────────────────────────────────

function sizeReport(v, judged) {
  const panel = ok(v.panel)
    ? v.panel.at.map((w) => ({
        width: w.width,
        stored: w.stored,
        panelWidth: w.overflow?.width ?? null,
        floors: floorText(w.panel),
        menuFloors: w.menu?.error ? [w.menu.error] : floorText(w.menu),
        overflow: w.overflow
          ? {
              total: w.overflow.total,
              scrollers: w.overflow.scrollers,
              first: w.overflow.offenders,
            }
          : 'panel not found',
      }))
    : v.panel;
  const p = v.picker;
  const sheet = (s, floors) =>
    s && {
      step: s.step,
      tiles: s.tiles.map((t) => `${t.anchor}${t.about ? '' : ' (no about)'}`),
      inside: s.inside,
      box: s.box,
      gridOverflow: s.gridOverflow,
      dialogOverflow: s.dialogOverflow,
      focused: s.focused,
      chips: s.chips,
      floors: floorText(floors),
    };
  return {
    viewport: `${v.viewport.width}x${v.viewport.height}`,
    panel,
    picker: ok(p)
      ? {
          step1: sheet(p.step1, p.step1Floors),
          step2: sheet(p.step2, p.step2Floors),
          back: p.back && { step: p.back.step, focused: p.back.focused },
          drumGrid: p.drumGrid,
          keys: p.keys && {
            step: p.keys.step,
            tiles: p.keys.tiles.map((t) => t.anchor),
            closedByEscape: p.keysClosed,
            reopenedOn: p.reopened?.step ?? null,
          },
          bass: p.bass,
          browse: p.browse,
          import: p.import,
          parts: judged.pickerParts,
        }
      : p,
    failed: Object.entries(judged.flags)
      .filter(([, good]) => !good)
      .map(([key]) => key),
  };
}

async function browser(kit, run) {
  const sizes = [];
  for (const viewport of VIEWPORTS)
    sizes.push(await sizeAt(kit, run, viewport));
  const keyless = await onceSession(kit, run, 'keyless', null, [
    ['rowMeta', rowMeta],
    ['keyFill', keyFill],
    ['facetCounts', facetCounts],
    ['searchAndChips', searchAndChips],
    ['favourite', favourite],
  ]);
  const cMajor = await onceSession(kit, run, 'C major', C_MAJOR, [
    ['fitsYourSong', fitsYourSong],
    ['plusPart', plusPart],
    ['grooveTempo', grooveTempo],
    ['kitAndPreset', kitAndPreset],
    ['preview', preview],
    ['dragDrop', dragDrop],
  ]);

  const sizeJudged = sizes.map((v) => {
    const parts = judgePicker(v.picker);
    return {
      pickerParts: parts,
      flags: {
        panelFloors: judgePanel(v.panel),
        pickerSteps:
          !!parts &&
          typeof parts === 'object' &&
          Object.values(parts).every(Boolean),
      },
    };
  });
  const onceFlags = {
    rowMeta: judgeRowMeta(keyless.rowMeta),
    keyFill: judgeKeyFill(keyless.keyFill),
    facetCounts: judgeFacets(keyless.facetCounts),
    searchAndChips: judgeSearch(keyless.searchAndChips),
    favourite: judgeFavourite(keyless.favourite),
    fitsYourSong: judgeFits(cMajor.fitsYourSong),
    plusPart: judgePlusPart(cMajor.plusPart),
    grooveTempo: judgeGroove(cMajor.grooveTempo),
    kitAndPreset: judgeKitPreset(cMajor.kitAndPreset),
    preview: judgePreview(cMajor.preview),
    dragDrop: judgeDrag(cMajor.dragDrop),
  };
  return {
    diffs: [],
    extraLosses: [],
    flags: Object.fromEntries(
      Object.keys(flags).map((key) => [
        key,
        key in onceFlags
          ? onceFlags[key]
          : sizeJudged.every((j) => j.flags[key]),
      ]),
    ),
    checks: [
      ...sizes.map((v, i) => sizeReport(v, sizeJudged[i])),
      {
        once: '1366x655, keyless song',
        ...keyless,
        failed: [
          'rowMeta',
          'keyFill',
          'facetCounts',
          'searchAndChips',
          'favourite',
        ].filter((key) => !onceFlags[key]),
      },
      {
        once: '1366x655, C major song',
        ...cMajor,
        failed: [
          'fitsYourSong',
          'plusPart',
          'grooveTempo',
          'kitAndPreset',
          'preview',
          'dragDrop',
        ].filter((key) => !onceFlags[key]),
      },
    ],
  };
}

export const scenarios = (kit) => [
  {
    group: 'R33',
    key: '',
    id: 'R33-browser',
    title:
      'The browser and the add-track picker: at 1366×655, 1440×787 and 1280×720 the Library panel keeps the floors at 300 and 240 px with nothing running out sideways, and the two-step picker (tiles, step 2 and back, Drum grid, Keys, Bass, the chips) fits and keeps the floors; and once, the facet counts, search and chips, row meta, Fits your song, + on a part, the key fill, the groove tempo question, kits and presets, ♡ across a reload, previews and drag to a lane',
    run: (run) => browser(kit, run),
  },
];
