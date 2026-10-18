/* eslint-env node */
/**
 * R34 commands and output (milestone 2.15, fast), at 1366×655, 1440×787 and
 * 1280×720. Each size opens a fresh project named "R34 Song" (120 BPM, 4/4,
 * two bars) with three MIDI tracks that play (Lead on the Oracle synth, Bass
 * on the electric bass, Drums on the drum machine), an empty audio track
 * (Vox), two chord symbols and a saturator on the master chain (seedSong),
 * and runs the story with the pointer and the keys:
 *
 * - paletteOpens: ⌘K / Ctrl+K (MOD) opens the palette from Create, Mix, the
 *   Score and a focused track row; ⇧⌘P from the Lead sheet, and ⌘K there
 *   too with nothing selected on the chart (no chord symbol added); each
 *   time focus is in its field, and Escape closes it.
 * - paletteShortcuts: every row of every opening shows its keys in a Kbd
 *   equal to the registry's (the command's keysLabel when it declares one,
 *   else shortcutKeys(id).label), a row without keys shows none, a row
 *   whose first key a command earlier in the keys' precedence there takes
 *   (dispatcher.availableCommands of the palette's opener) shows none, and the
 *   groups come in SCOPE_ORDER; the row-focused opening lists the track
 *   list's group.
 * - paletteRuns: "Loop on / off" toggles the loop; "Add a marker at the
 *   playhead" asks for a name in the app's dialog and adds the marker at
 *   the playhead (bar 2); "Export…" opens the Export dialog; "Mute the
 *   track", chosen after opening from a focused row that isn't the
 *   selected one, mutes that row's track and nothing else.
 * - paletteClickAfterClose: with Lead selected, ⌘K then Escape, and a click
 *   on Bass's name 30 ms later (page.mouse at the point measured before,
 *   so Playwright's own waiting can't hide a scrim that swallows it)
 *   selects Bass.
 * - paletteFloors: the palette (designProbe in subtree mode) has no text
 *   under the floor and no target under 24×24, no sideways overflow, and
 *   sits inside the window, at every opening.
 * - exportPill: the pill is in the share zone after '⋯' and before the
 *   avatar, is the top bar's only primary (white) button, shows its label,
 *   and the bar has not folded (data-fold 0).
 * - exportTabs: the pill opens the dialog on Audio; Audio (with Whole song,
 *   Each track and One track) and Notation both sit inside the window with
 *   no scrolling or sideways overflow in the dialog, and the floors hold.
 * - trackMenuField: the ⋯ menu's first child is the name field; typing a
 *   name and Enter renames the track; typing another and Escape closes the
 *   menu with the name kept.
 * - exportTrack: Export track ▸ WAV audio file opens the dialog on Audio ▸
 *   One track with that track chosen and its effects on; ▸ WAV (no
 *   effects) opens it with No effects; that export downloads
 *   `<song>-<track>-dry.wav`, a valid WAV that isn't silent and differs
 *   from the song without mastering (decoded PCM, RMS difference > 0.01).
 * - rowContextMenu: a right-click on a row's name opens the track menu at
 *   the pointer and selects that row; after Escape, one click on another
 *   row selects it (no click swallowed).
 * - selectedEdge: only the selected row has the edge, 4 px wide, in its
 *   track's colour, the row's full height.
 * - instrumentIcon: the instrument button of a MIDI row selects it and opens
 *   the dock on Instrument with focus in it; on the audio row, on its chain
 *   (Effects); the button is at least 24×24.
 *
 * And the downloads (two bars render in a few seconds, even on the
 * Chromebook profile, so every size runs them):
 * - exportAudio: Whole song, WAV, mastering on and then off: each downloads
 *   `<song>.wav`, a valid WAV of the song's length; the two differ
 *   (decoded PCM, RMS difference > 0.01: renders of one song already
 *   differ by an LSB in a few samples, so bytes prove nothing).
 * - exportStems: Each track downloads `<song>-stems.zip` with one entry per
 *   track that plays, named `NN-<track>.wav` in track order, each a valid
 *   WAV of the song's length that differs from every other stem and from
 *   the song (RMS difference > 0.01).
 * - exportNotation: MIDI downloads `<song>.mid` (header parsed; the Drums
 *   track's notes on channel 10, the others not); MusicXML lead sheet and
 *   full score download `<song>-lead-sheet.musicxml` and
 *   `<song>-score.musicxml`, which DOMParser reads without an error, with
 *   the chords (harmony) and the parts.
 * - duplicateTrack: the track menu's Duplicate puts the copy right after
 *   the source with new ids (track, clips, notes), the same clips and
 *   notes; one ⌘Z removes it; a second Duplicate survives a reload (the
 *   draft).
 *
 * Downloads come from Playwright's download event and are saved under the
 * run's --out (r34-downloads/<profile>/<size>/). A step that throws is
 * recorded with its error and the next goes on.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { designProbe } from '../designProbe.mjs';
import { ROOT } from '../harness.mjs';
import { MOD } from './_shared.mjs';

export const flags = {
  paletteOpens: {
    goal: true,
    text: '⌘K opened the palette from Create, Mix, the Score, a track row and the Lead sheet with nothing selected, ⇧⌘P from the Lead sheet, with focus in its field',
  },
  paletteShortcuts: {
    goal: true,
    text: 'every palette row showed the registry’s keys (none where it has none or an earlier command takes its key there), groups in SCOPE_ORDER',
  },
  paletteRuns: {
    goal: true,
    text: 'from the palette, Loop toggled the loop, Add a marker added one at the playhead, Export… opened the dialog, and Mute acted on the focused row',
  },
  paletteClickAfterClose: {
    goal: true,
    text: 'a click on another track 30 ms after Escape closed the palette selected that track',
  },
  paletteFloors: {
    goal: true,
    text: 'the palette had no text under the floor, no target under 24×24, no overflow, and sat inside the window',
  },
  exportPill: {
    goal: true,
    text: 'the Export pill sat in the share zone, the top bar’s only primary, with the bar unfolded',
  },
  exportTabs: {
    goal: true,
    text: 'the Export dialog’s Audio and Notation tabs fit the window with no overflow and held the floors',
  },
  exportAudio: {
    goal: true,
    text: 'Whole song WAV downloaded <song>.wav with mastering on and off, valid, the song’s length, the two different (PCM RMS difference > 0.01)',
  },
  exportStems: {
    goal: true,
    text: 'Each track downloaded one zip of NN-<track>.wav entries, one per playing track, each a valid WAV of the song’s length, different from each other and from the song (PCM RMS difference > 0.01)',
  },
  exportNotation: {
    goal: true,
    text: 'MIDI downloaded <song>.mid with the drums on channel 10; the lead sheet and full score MusicXML parsed',
  },
  trackMenuField: {
    goal: true,
    text: 'the track menu opened on its name field; typing and Enter renamed, Escape kept the name',
  },
  duplicateTrack: {
    goal: true,
    text: 'Duplicate put a copy with new ids and the same notes right after the track, one Undo removed it, and a reload kept a copy',
  },
  exportTrack: {
    goal: true,
    text: 'Export track ▸ WAV opened the dialog on that track; no effects downloaded <song>-<track>-dry.wav, different from the song (PCM RMS difference > 0.01)',
  },
  rowContextMenu: {
    goal: true,
    text: 'a right-click on a row opened its menu at the pointer and selected it; after Escape the next click went through',
  },
  selectedEdge: {
    goal: true,
    text: 'only the selected row had the 4 px edge, in its track colour',
  },
  instrumentIcon: {
    goal: true,
    text: 'the instrument button opened the dock on Instrument (MIDI) or the chain (audio), with focus in the dock',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

const SONG = 'R34 Song';
const SLUG = 'r34-song';
const BAR = 1920;

const PALETTE = '[data-testid="command-palette"]';
const paletteItem = (id) =>
  `${PALETTE} [data-testid="command-palette-item"][data-command-id="${id}"]`;
const PILL = '[data-tutorial-id="export-pill"]';
const DIALOG = '[data-tutorial-id="export-audio-dialog"]';
const RUN_AUDIO = '[data-tutorial-id="export-audio-run"]';
const RUN_NOTATION = '[data-testid="export-notation-run"]';
const TRACK_MENU = '[data-testid="track-menu"]';
const row = (id) => `[data-testid="track-row"][data-track-id="${id}"]`;
const selector = (id) => `${row(id)} [data-track-selector]`;
const radio = (group, value) =>
  `[data-testid="${group}"] button[value="${value}"]`;

// ── In-page helpers (sent as source: nothing from this module's scope) ──

/** The tracks as the steps judge them, with every clip and note. */
function tracksNow() {
  const s = window.__MA_STORE__.getState();
  return s.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    instrument: t.instrument,
    color: t.color,
    mute: t.mute,
    clips: t.midiClips.map((c) => ({
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
  }));
}

/** What the rest of the store the steps read. */
function stateNow() {
  const s = window.__MA_STORE__.getState();
  return {
    view: s.currentView,
    loop: s.loopEnabled,
    position: s.position,
    playhead: window.__MA_PLAYHEAD__?.tick?.() ?? null,
    markers: s.markers.map((m) => ({ id: m.id, tick: m.tick, name: m.name })),
    selectedTrackId: s.selectedTrackId,
    channelStripTab: s.channelStripTab,
    dockMaster: s.dockMaster,
    projectName: s.projectName,
    bpm: s.bpm,
  };
}

/**
 * The open palette as drawn: its groups (scope and rows, each row's keys),
 * where focus is, its box against the window and whether it or its list
 * overflows sideways. With the registry's own label for each row's keys
 * (`expected`) and SCOPE_ORDER, read from the app's modules.
 */
async function paletteNow() {
  const panel = document.querySelector('[data-testid="command-palette"]');
  if (!panel) return null;
  const registry = await window.__RT_DEV_MODULE__(
    '/src/daw/commands/registry.ts',
  );
  const shortcuts = await window.__RT_DEV_MODULE__(
    '/src/daw/commands/shortcuts.ts',
  );
  const order = await window.__RT_DEV_MODULE__(
    '/src/daw/commands/scopeOrder.ts',
  );
  const dispatcher = await window.__RT_DEV_MODULE__(
    '/src/daw/commands/dispatcher.ts',
  );
  const keys = await window.__RT_DEV_MODULE__('/src/daw/commands/keys.ts');
  const paletteStore = await window.__RT_DEV_MODULE__(
    '/src/daw/shell/help/usePaletteStore.ts',
  );
  // What works where the palette was opened, in the keys' precedence order:
  // a key an earlier command takes there would never run a later one, so
  // the later row shows none (2.15 review: "only the keys that work there").
  const opener = paletteStore.usePaletteStore.getState().opener ?? null;
  const precedence = dispatcher.availableCommands(opener);
  const shadowOf = (command) => {
    const first = command.chords?.[0];
    if (!first) return null;
    const label = keys.chordLabel(first, false);
    const at = precedence.findIndex((c) => c.id === command.id);
    const earlier = precedence
      .slice(0, at === -1 ? precedence.length : at)
      .find((c) => c.chords.some((ch) => keys.chordLabel(ch, false) === label));
    return earlier?.id ?? null;
  };
  const expectedKeys = (id) => {
    const command = registry.getCommand(id);
    if (!command) return { expected: { missing: true }, shadowedBy: null };
    const shadowedBy = shadowOf(command);
    if (shadowedBy) return { expected: null, shadowedBy };
    if (command.keysLabel) return { expected: command.keysLabel, shadowedBy };
    if (!command.chords?.length) return { expected: null, shadowedBy };
    return { expected: shortcuts.shortcutKeys(id).label, shadowedBy };
  };
  const groups = [
    ...panel.querySelectorAll('[data-testid="command-palette-group"]'),
  ].map((g) => ({
    scope: g.getAttribute('data-scope'),
    rows: [...g.querySelectorAll('[data-testid="command-palette-item"]')].map(
      (el) => {
        const id = el.getAttribute('data-command-id');
        const kbd = el.querySelector('[data-testid="command-palette-keys"]');
        return {
          id,
          keys: kbd ? kbd.textContent.trim() : null,
          ...expectedKeys(id),
        };
      },
    ),
  }));
  const box = panel.getBoundingClientRect();
  const list = panel.querySelector('[cmdk-list]');
  return {
    groups,
    scopeOrder: [...order.SCOPE_ORDER],
    focusInField:
      document.activeElement?.getAttribute('data-testid') ===
      'command-palette-input',
    inside:
      box.top >= 0 &&
      box.left >= 0 &&
      box.bottom <= window.innerHeight + 0.5 &&
      box.right <= window.innerWidth + 0.5,
    box: {
      left: Math.round(box.left),
      top: Math.round(box.top),
      width: Math.round(box.width),
      height: Math.round(box.height),
    },
    overflowX:
      panel.scrollWidth > panel.clientWidth + 1 ||
      (!!list && list.scrollWidth > list.clientWidth + 1),
  };
}

/** Whether the palette is open. */
function paletteOpen() {
  const panel = document.querySelector('[data-testid="command-palette"]');
  return !!panel && panel.getAttribute('data-state') === 'open';
}

/** Whether a menu or a dialog is open (what a step may leave behind). */
function overlayOpen() {
  return !!document.querySelector(
    '[role="menu"][data-state="open"], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="listbox"][data-state="open"]',
  );
}

/**
 * The top bar's share zone and the pill: the zone's children in order (by
 * testid or tutorial id), the pill's zone, the primary buttons in the bar,
 * the bar's fold and the pill's box and label.
 */
function pillNow() {
  const bar = document.querySelector('[data-testid="top-bar"]');
  const pill = document.querySelector('[data-tutorial-id="export-pill"]');
  const zone = document.querySelector('[data-zone="share"]');
  const name = (el) =>
    el.getAttribute('data-testid') ??
    el.querySelector('[data-testid]')?.getAttribute('data-testid') ??
    el.getAttribute('aria-label') ??
    el.tagName.toLowerCase();
  const box = pill?.getBoundingClientRect();
  const primaries = bar
    ? [...bar.querySelectorAll('button, a, [role="button"]')].filter((el) =>
        el.classList.contains('bg-daw-primary'),
      )
    : [];
  return {
    fold: bar ? Number(bar.dataset.fold ?? -1) : null,
    zone: pill?.closest('[data-zone]')?.getAttribute('data-zone') ?? null,
    zoneChildren: zone ? [...zone.children].map(name) : [],
    pillIndex: zone && pill ? [...zone.children].indexOf(pill) : -1,
    overflowIndex: zone
      ? [...zone.children].findIndex(
          (el) =>
            el.matches('[data-testid="top-bar-overflow"]') ||
            !!el.querySelector('[data-testid="top-bar-overflow"]'),
        )
      : -1,
    primaries: primaries.length,
    pillIsPrimary: primaries.length === 1 && primaries[0] === pill,
    label: pill?.textContent.trim() ?? null,
    box: box && {
      width: Math.round(box.width),
      height: Math.round(box.height),
      inside:
        box.top >= 0 &&
        box.left >= 0 &&
        box.bottom <= window.innerHeight &&
        box.right <= window.innerWidth,
    },
  };
}

/**
 * The open Export dialog: its checked tab, what and the other choices, the
 * track select's text, whether it sits inside the window, and any element
 * in it that scrolls (scrollHeight or scrollWidth past its box).
 */
function dialogNow() {
  const panel = [
    ...document.querySelectorAll('[data-tutorial-id="export-audio-dialog"]'),
  ].find((el) => el.getAttribute('data-state') === 'open');
  if (!panel) return null;
  const checked = (group) =>
    panel
      .querySelector(
        `[data-testid="${group}"] button[data-state="checked"], [data-testid="${group}"] [role="radio"][aria-checked="true"]`,
      )
      ?.getAttribute('value') ?? null;
  const box = panel.getBoundingClientRect();
  const scrolls = [];
  for (const el of [panel, ...panel.querySelectorAll('*')]) {
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    const style = getComputedStyle(el);
    const scrollY =
      /(auto|scroll)/.test(style.overflowY) &&
      el.scrollHeight > el.clientHeight + 1;
    const scrollX =
      /(auto|scroll|hidden)/.test(style.overflowX) &&
      el.scrollWidth > el.clientWidth + 1;
    if (scrollY || scrollX) {
      scrolls.push({
        tag: el.tagName.toLowerCase(),
        className: String(el.className).slice(0, 60),
        scrollY,
        scrollX,
        sizes: `${el.scrollWidth}×${el.scrollHeight} in ${el.clientWidth}×${el.clientHeight}`,
      });
    }
  }
  return {
    tab: checked('export-tab'),
    tabs: [
      ...panel.querySelectorAll(
        '[data-testid="export-tab-audio"], [data-testid="export-tab-notation"]',
      ),
    ].map((el) => el.getAttribute('data-testid')),
    what: checked('export-what'),
    whatOptions: [
      ...panel.querySelectorAll('[data-testid="export-what"] button[value]'),
    ].map((el) => el.getAttribute('value')),
    dry: checked('export-dry'),
    mastering: checked('export-mastering'),
    notation: checked('export-notation-format'),
    track:
      panel.querySelector('#export-track-select')?.textContent.trim() ?? null,
    inside:
      box.top >= 0 &&
      box.left >= 0 &&
      box.bottom <= window.innerHeight + 0.5 &&
      box.right <= window.innerWidth + 0.5,
    box: {
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      height: Math.round(box.height),
      width: Math.round(box.width),
    },
    scrolls,
  };
}

/** The open track menu: what its first child holds, its box and items. */
function trackMenuNow() {
  const menu = [
    ...document.querySelectorAll('[data-testid="track-menu"]'),
  ].find((el) => el.getAttribute('data-state') === 'open');
  if (!menu) return null;
  const first = menu.firstElementChild;
  const field = menu.querySelector('[data-testid="track-menu-name"]');
  const items = [...menu.querySelectorAll('[role^="menuitem"]')];
  const box = menu.getBoundingClientRect();
  return {
    firstIsField:
      !!first &&
      !!field &&
      (first === field || first.contains(field)) &&
      items.every(
        (item) =>
          field.compareDocumentPosition(item) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    field: field?.value ?? null,
    focus:
      document.activeElement?.getAttribute('data-testid') ??
      document.activeElement?.getAttribute('role') ??
      null,
    box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
    inside:
      box.top >= 0 &&
      box.left >= 0 &&
      box.bottom <= window.innerHeight + 0.5 &&
      box.right <= window.innerWidth + 0.5,
  };
}

/** Each row: selected or not, its edge (box and colour) and its height. */
function rowsNow() {
  const tracks = window.__MA_STORE__.getState().tracks;
  return [...document.querySelectorAll('[data-testid="track-row"]')].map(
    (el) => {
      const id = el.getAttribute('data-track-id');
      const edges = el.querySelectorAll('[data-testid="track-selected-edge"]');
      const edge = edges[0];
      const r = edge?.getBoundingClientRect();
      const rowBox = el.getBoundingClientRect();
      const icon = el
        .querySelector('[data-testid="track-instrument-button"]')
        ?.getBoundingClientRect();
      return {
        id,
        selected: el.hasAttribute('data-selected'),
        edges: edges.length,
        edge: edge
          ? {
              width: Math.round(r.width * 10) / 10,
              height: Math.round(r.height),
              color: getComputedStyle(edge).backgroundColor,
            }
          : null,
        rowHeight: Math.round(rowBox.height),
        trackColor: tracks.find((t) => t.id === id)?.color ?? null,
        icon: icon
          ? { width: Math.round(icon.width), height: Math.round(icon.height) }
          : null,
      };
    },
  );
}

/** Where focus is: the track row its element is in, the dock, a field. */
function focusNow() {
  const el = document.activeElement;
  return {
    row: el?.closest('[data-track-id]')?.getAttribute('data-track-id') ?? null,
    selector: !!el?.closest('[data-track-selector]'),
    inDock: !!el?.closest('[data-dock-content]'),
    testid: el?.getAttribute('data-testid') ?? null,
  };
}

/** Text parsed as XML in the page: its root, any parser error and counts. */
function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const error = doc.getElementsByTagName('parsererror')[0];
  return {
    error: error ? error.textContent.slice(0, 200) : null,
    root: doc.documentElement?.nodeName ?? null,
    parts: doc.getElementsByTagName('score-part').length,
    harmonies: doc.getElementsByTagName('harmony').length,
    notes: doc.getElementsByTagName('note').length,
    measures: doc.getElementsByTagName('measure').length,
  };
}

// ── Node-side file readers ──────────────────────────────────────────────────

/** A WAV's header: its format, channels, rate, bits and frames; or why not. */
function readWav(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const tag = (at) => String.fromCharCode(...u8.subarray(at, at + 4));
  if (u8.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
    return { valid: false, reason: 'not RIFF/WAVE' };
  }
  let fmt = null;
  let data = null;
  for (let at = 12; at + 8 <= u8.length; ) {
    const id = tag(at);
    const size = view.getUint32(at + 4, true);
    if (id === 'fmt ') {
      fmt = {
        format: view.getUint16(at + 8, true),
        channels: view.getUint16(at + 10, true),
        sampleRate: view.getUint32(at + 12, true),
        blockAlign: view.getUint16(at + 20, true),
        bits: view.getUint16(at + 22, true),
      };
    } else if (id === 'data') {
      data = { offset: at + 8, size: Math.min(size, u8.length - at - 8) };
    }
    at += 8 + size + (size % 2);
  }
  if (!fmt || !data) return { valid: false, reason: 'no fmt or data chunk' };
  const frames = fmt.blockAlign ? data.size / fmt.blockAlign : 0;
  let silent = true;
  for (let i = data.offset; i < data.offset + data.size; i++) {
    if (u8[i] !== 0) {
      silent = false;
      break;
    }
  }
  return {
    valid:
      (fmt.format === 1 || fmt.format === 3 || fmt.format === 0xfffe) &&
      fmt.channels > 0 &&
      fmt.sampleRate > 0 &&
      Number.isInteger(frames) &&
      frames > 0,
    ...fmt,
    frames,
    seconds: fmt.sampleRate ? frames / fmt.sampleRate : 0,
    silent,
    dataOffset: data.offset,
    dataSize: data.size,
  };
}

/**
 * A WAV's samples as floats in −1…1 (interleaved), or null when it isn't a
 * WAV readWav accepts: 16, 24 and 32-bit PCM and 32-bit float.
 */
function pcmOf(bytes) {
  const wav = readWav(bytes);
  if (!wav.valid) return null;
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const width = wav.bits / 8;
  const count = Math.floor(wav.dataSize / width);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const at = wav.dataOffset + i * width;
    if (wav.bits === 16) out[i] = view.getInt16(at, true) / 32768;
    else if (wav.bits === 24) {
      const v = u8[at] | (u8[at + 1] << 8) | (u8[at + 2] << 16);
      out[i] = (v & 0x800000 ? v - 0x1000000 : v) / 8388608;
    } else if (wav.format === 3) out[i] = view.getFloat32(at, true);
    else out[i] = view.getInt32(at, true) / 2147483648;
  }
  return out;
}

/**
 * The RMS of the difference of two signals (over the shorter one), or null
 * without both. Two renders of the same song differ by an LSB here and
 * there, so the bytes of two renders of one song can differ: a real
 * difference is judged by a threshold, never by byte inequality.
 */
function rmsDiff(a, b) {
  if (!a || !b) return null;
  const n = Math.min(a.length, b.length);
  if (n === 0) return null;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / n);
}

/** What counts as different audio: an RMS difference past −40 dBFS. */
const DIFFERENT_RMS = 0.01;

const round = (x) => (x === null ? null : Math.round(x * 1e5) / 1e5);

/** A store-only zip's entries, from its central directory (DataView). */
function readZip(bytes) {
  const u8 = new Uint8Array(bytes);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let end = -1;
  for (let at = u8.length - 22; at >= 0; at--) {
    if (view.getUint32(at, true) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) return { valid: false, reason: 'no end record', entries: [] };
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) {
      return { valid: false, reason: `bad central header ${i}`, entries };
    }
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLen = view.getUint16(at + 28, true);
    const extraLen = view.getUint16(at + 30, true);
    const commentLen = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(u8.subarray(at + 46, at + 46 + nameLen));
    if (view.getUint32(local, true) !== 0x04034b50) {
      return { valid: false, reason: `bad local header ${name}`, entries };
    }
    const localName = view.getUint16(local + 26, true);
    const localExtra = view.getUint16(local + 28, true);
    const start = local + 30 + localName + localExtra;
    entries.push({
      name,
      method,
      data: u8.subarray(start, start + size),
    });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return { valid: true, entries };
}

/**
 * A Standard MIDI File: its header, and each track's name and the channels
 * its note-ons play on (0x9n with velocity > 0, running status followed).
 */
function readMidi(bytes) {
  const u8 = new Uint8Array(bytes);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const tag = (at) => String.fromCharCode(...u8.subarray(at, at + 4));
  if (u8.length < 14 || tag(0) !== 'MThd') {
    return { valid: false, reason: 'no MThd' };
  }
  const header = {
    format: view.getUint16(8),
    tracks: view.getUint16(10),
    division: view.getUint16(12),
  };
  const tracks = [];
  let at = 8 + view.getUint32(4);
  const varLen = (pos) => {
    let value = 0;
    let p = pos;
    for (;;) {
      const b = u8[p++];
      value = (value << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return { value, next: p };
  };
  const decoder = new TextDecoder();
  while (at + 8 <= u8.length) {
    const id = tag(at);
    const size = view.getUint32(at + 4);
    const startAt = at + 8;
    const endAt = Math.min(u8.length, startAt + size);
    if (id === 'MTrk') {
      const track = { name: null, channels: [], noteOns: 0 };
      let p = startAt;
      let status = 0;
      while (p < endAt) {
        p = varLen(p).next;
        if (u8[p] & 0x80) {
          status = u8[p];
          p++;
        }
        if (status === 0xff) {
          const type = u8[p++];
          const len = varLen(p);
          if (type === 0x03) {
            track.name = decoder.decode(
              u8.subarray(len.next, len.next + len.value),
            );
          }
          p = len.next + len.value;
          status = 0;
        } else if (status === 0xf0 || status === 0xf7) {
          const len = varLen(p);
          p = len.next + len.value;
          status = 0;
        } else {
          const kind = status & 0xf0;
          const two = kind !== 0xc0 && kind !== 0xd0;
          // The note-on's velocity: its second data byte.
          const d2 = two ? u8[p + 1] : 0;
          p += two ? 2 : 1;
          if (kind === 0x90 && d2 > 0) {
            track.noteOns++;
            const ch = (status & 0x0f) + 1;
            if (!track.channels.includes(ch)) track.channels.push(ch);
          }
        }
      }
      tracks.push(track);
    }
    at = endAt;
  }
  return { valid: true, ...header, chunks: tracks };
}

// ── Node-side helpers ───────────────────────────────────────────────────────

/** Where this size's downloads go. */
function downloadDir(run, viewport) {
  const out = resolve(
    run.args?.out ?? join(ROOT, 'docs/studio-perf/runs', 'roundtrip'),
  );
  const dir = join(
    out,
    'r34-downloads',
    run.profile ?? 'profile',
    `${viewport.width}x${viewport.height}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * The song: Lead (Oracle synth), Bass (electric bass), Drums (drum
 * machine), each one two-bar clip; an empty audio track (Vox); two chord
 * symbols; a saturator on the master chain. Saved to the draft, reloaded.
 */
async function seedSong(kit, page) {
  await page.evaluate(
    ({ song, bar }) => {
      const store = window.__MA_STORE__;
      const s = store.getState();
      s.setProjectName(song);
      const note = (n, t, d = 240, v = 100) => ({
        note: n,
        velocity: v,
        startTick: t,
        durationTicks: d,
        channel: 0,
      });
      const lead = s.addTrack('midi', 'oracle-synth', 'Lead');
      s.addMidiClip(lead, {
        id: 'r34-clip-lead',
        name: 'Lead',
        startTick: 0,
        durationTicks: 2 * bar,
        events: [
          note(72, 0, 480),
          note(76, 480, 480),
          note(79, 960, 480),
          note(77, bar, 960),
          note(74, bar + 960, 960),
        ],
      });
      const bass = s.addTrack('midi', 'bass-electric', 'Bass');
      s.addMidiClip(bass, {
        id: 'r34-clip-bass',
        name: 'Bass',
        startTick: 0,
        durationTicks: 2 * bar,
        events: [note(36, 0, 900), note(43, 960, 900), note(41, bar, 1800)],
      });
      const drums = s.addTrack('midi', 'drum-machine', 'Drums');
      const hits = [];
      for (let beat = 0; beat < 8; beat++) {
        hits.push(note(beat % 2 === 0 ? 36 : 38, beat * 480, 120, 110));
        hits.push(note(42, beat * 480 + 240, 120, 80));
      }
      s.addMidiClip(drums, {
        id: 'r34-clip-drums',
        name: 'Drums',
        startTick: 0,
        durationTicks: 2 * bar,
        events: hits,
      });
      s.addTrack('audio', 'none', 'Vox');
      s.setChordRegions(
        [
          ['1 maj', 'C maj', '1 major', [200, 120, 80], [60, 64, 67]],
          ['5 maj', 'G maj', '5 major', [80, 120, 200], [55, 59, 62]],
        ].map(([name, noteName, degreeKey, color, midis], i) => ({
          startTick: i * bar,
          endTick: (i + 1) * bar,
          name,
          noteName,
          color,
          degreeKey,
          midis,
          confidence: 0.9,
        })),
        true,
      );
      s.addMasteringFx('saturator');
      const sat = store.getState().masteringEffects?.saturator;
      if (sat) {
        s.updateMasteringEffects({ saturator: { ...sat, drive: 80 } });
      }
      s.setSelectedTrackId(lead);
      s.setSelectedClip(null, null);
      s.setChannelStripTab(null);
    },
    { song: SONG, bar: BAR },
  );
  await kit.waitForDraft(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await kit.waitForEditor(page, 180_000);
}

const tracks = (page) => page.evaluate(tracksNow);
const state = (page) => page.evaluate(stateNow);

/** Escape until no menu, dialog or palette is open (at most four times). */
async function closeOverlays(kit, page) {
  for (let i = 0; i < 4; i++) {
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

/** Switches the view through the store and lets it draw. */
async function toView(kit, page, view) {
  await page.evaluate((v) => {
    const s = window.__MA_STORE__.getState();
    if (s.currentView !== v) s.setCurrentView(v);
  }, view);
  await kit.sleep(900);
  await page.evaluate(() => document.activeElement?.blur());
}

/** Presses `keys` and waits for the palette; its state, floors and keys. */
async function openPalette(kit, page, keys) {
  await page.keyboard.press(keys);
  await page
    .waitForSelector(`${PALETTE}[data-state="open"]`, { timeout: 5000 })
    .catch(() => {});
  await kit.sleep(250);
  if (!(await page.evaluate(paletteOpen))) return { opened: false };
  const now = await page.evaluate(paletteNow);
  const floors = await floorsOf(page, PALETTE);
  return { opened: true, ...now, floors };
}

/** Escape on the palette; whether it closed. */
async function closePalette(kit, page) {
  await page.keyboard.press('Escape');
  await kit.sleep(300);
  return !(await page.evaluate(paletteOpen));
}

/** Opens the palette with focus where it is, and clicks command `id`. */
async function runFromPalette(kit, page, id, { query = null } = {}) {
  await page.keyboard.press(`${MOD}+KeyK`);
  await page.waitForSelector(`${PALETTE}[data-state="open"]`, {
    timeout: 5000,
  });
  await kit.sleep(200);
  if (query) {
    await page.keyboard.type(query, { delay: 20 });
    await kit.sleep(200);
  }
  const listed = (await page.locator(paletteItem(id)).count()) > 0;
  if (!listed) {
    await closePalette(kit, page);
    return { listed: false };
  }
  await page.click(paletteItem(id), { timeout: 5000 });
  await kit.sleep(600);
  return { listed: true, closed: !(await page.evaluate(paletteOpen)) };
}

/** Opens the Export dialog from the pill. */
async function openFromPill(kit, page) {
  await page.click(PILL, { timeout: 5000 });
  await page.waitForSelector(`${DIALOG}[data-state="open"]`, {
    timeout: 10_000,
  });
  await kit.sleep(400);
}

/** Clicks a Segmented option of the open dialog if it isn't chosen yet. */
async function choose(kit, page, group, value) {
  const option = page.locator(`${DIALOG} ${radio(group, value)}`);
  if ((await option.getAttribute('data-state')) !== 'checked') {
    await option.click({ timeout: 5000 });
    await kit.sleep(250);
  }
}

/**
 * Clicks `run` and saves the download it starts into `dir`; resolves to
 * { filename, path } (or throws when none came).
 */
async function download(kit, page, run, dir, as, timeout) {
  const waiting = page.waitForEvent('download', { timeout });
  await page.click(run, { timeout: 5000 });
  const file = await waiting;
  const filename = file.suggestedFilename();
  const path = join(dir, as ?? filename);
  await file.saveAs(path);
  await page
    .waitForSelector(`${DIALOG}[data-state="open"]`, {
      state: 'detached',
      timeout: 10_000,
    })
    .catch(() => {});
  await kit.sleep(300);
  return { filename, path };
}

/** The ⋯ menu of `trackId`'s row, opened from its button. */
async function openTrackMenu(kit, page, trackId) {
  await page.click(`${row(trackId)} [data-testid="track-menu-button"]`, {
    timeout: 5000,
  });
  await page.waitForSelector(`${TRACK_MENU}[data-state="open"]`, {
    timeout: 5000,
  });
  await kit.sleep(250);
}

/** One Undo, with focus on the page (the editor takes Ctrl or ⌘ as Mod). */
async function undoOnce(kit, page) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press(`${MOD}+KeyZ`);
  await kit.sleep(500);
}

/** The render's expected length: the last note's end and the 2 s tail. */
async function expectedSeconds(page) {
  return page.evaluate(async () => {
    const { projectEndTick } = await window.__RT_DEV_MODULE__(
      '/src/daw/audio/renderProject.ts',
    );
    const s = window.__MA_STORE__.getState();
    const end = projectEndTick(s);
    return (end * 60) / (s.bpm * 480) + 2;
  });
}

// ── The steps ───────────────────────────────────────────────────────────────

/** The palette from Create, Mix, the Score, the Lead sheet and a row. */
async function paletteOpens(kit, page, ids) {
  const at = {};
  for (const [name, view, keys] of [
    ['create', 'arrange', `${MOD}+KeyK`],
    ['mix', 'studio', `${MOD}+KeyK`],
    ['score', 'score', `${MOD}+KeyK`],
    ['leadsheet', 'leadsheet', `${MOD}+Shift+KeyP`],
    // ⌘K is also the Lead sheet's Add a chord symbol, which needs something
    // selected on the chart: with nothing selected it opens the palette.
    ['leadsheetK', 'leadsheet', `${MOD}+KeyK`],
  ]) {
    await toView(kit, page, view);
    const chordsBefore = await page.evaluate(
      () => window.__MA_STORE__.getState().chordRegions.length,
    );
    const opened = await openPalette(kit, page, keys);
    at[name] = { ...opened, view, closed: await closePalette(kit, page) };
    at[name].chordsAdded =
      (await page.evaluate(
        () => window.__MA_STORE__.getState().chordRegions.length,
      )) - chordsBefore;
    await closeOverlays(kit, page);
  }
  await toView(kit, page, 'arrange');
  await page.focus(selector(ids.bass));
  const fromRow = await openPalette(kit, page, `${MOD}+KeyK`);
  at.row = {
    ...fromRow,
    view: 'arrange',
    closed: await closePalette(kit, page),
  };
  at.row.focusBack = await page.evaluate(focusNow);
  return at;
}

/** Escape on the palette, then a click on another row 30 ms later. */
async function clickAfterClose(kit, page, ids) {
  await toView(kit, page, 'arrange');
  await page.evaluate((id) => {
    window.__MA_STORE__.getState().setSelectedTrackId(id);
  }, ids.lead);
  await kit.sleep(200);
  const box = await page.locator(selector(ids.bass)).boundingBox();
  if (!box) throw new Error('no Bass row');
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press(`${MOD}+KeyK`);
  await page.waitForSelector(`${PALETTE}[data-state="open"]`, {
    timeout: 5000,
  });
  await kit.sleep(300);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // What the click's pointerdown reaches (recorded by the page as it
  // happens, so reading it doesn't delay the click).
  await page.evaluate(() => {
    window.__R34_CLICK__ = null;
    window.addEventListener(
      'pointerdown',
      (e) => {
        window.__R34_CLICK__ = {
          target:
            e.target instanceof Element
              ? (e.target.getAttribute('data-testid') ??
                e.target.getAttribute('aria-label') ??
                e.target.tagName.toLowerCase())
              : String(e.target),
          bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
        };
      },
      { capture: true, once: true },
    );
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(30);
  const atClick = await page.evaluate(
    ({ px, py }) => {
      const hit = document.elementFromPoint(px, py);
      return {
        hit: hit?.closest('[data-track-selector]')
          ? 'track name'
          : hit
            ? `${hit.tagName.toLowerCase()}${hit.getAttribute('data-state') ? `[data-state=${hit.getAttribute('data-state')}]` : ''}`
            : null,
        // The element on top there: its classes, inline pointer-events
        // (Radix sets its own) and what the cascade made of them.
        hitClass: hit ? String(hit.className).slice(0, 80) : null,
        hitInlinePointerEvents: hit?.style?.pointerEvents || null,
        hitPointerEvents: hit ? getComputedStyle(hit).pointerEvents : null,
        bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
      };
    },
    { px: x, py: y },
  );
  await page.mouse.click(x, y);
  await kit.sleep(400);
  const after = await state(page);
  return {
    before: ids.lead,
    selected: after.selectedTrackId,
    paletteClosed: !(await page.evaluate(paletteOpen)),
    atClick,
    pointerDown: await page.evaluate(() => window.__R34_CLICK__),
  };
}

/** Loop, Add a marker, Export… and a track list command, by name. */
async function paletteRuns(kit, page, ids) {
  await toView(kit, page, 'arrange');
  const out = {};
  // Loop.
  const loopBefore = (await state(page)).loop;
  out.loopRun = await runFromPalette(kit, page, 'transport.loop', {
    query: 'loop',
  });
  out.loop = { before: loopBefore, after: (await state(page)).loop };
  // Put it back for the exports' range.
  if (out.loop.after !== loopBefore) {
    await page.evaluate(
      (on) => window.__MA_STORE__.getState().setLoopEnabled(on),
      loopBefore,
    );
  }
  // Add a marker at the playhead, bar 2.
  await page.evaluate((bar) => {
    window.__MA_STORE__.getState().setPosition(bar);
  }, BAR);
  await kit.sleep(300);
  await page.evaluate(() => document.activeElement?.blur());
  const before = await state(page);
  out.markerRun = await runFromPalette(kit, page, 'timeline.addMarker', {
    query: 'marker',
  });
  const prompt = await page
    .waitForSelector('[role="dialog"][data-state="open"] input', {
      timeout: 5000,
    })
    .then(() => true)
    .catch(() => false);
  if (prompt) {
    await page.keyboard.press('Enter');
    await kit.sleep(500);
  }
  const after = await state(page);
  out.marker = {
    prompt,
    playhead: before.playhead ?? before.position,
    added: after.markers.filter(
      (m) => !before.markers.some((b) => b.id === m.id),
    ),
  };
  await closeOverlays(kit, page);
  // Export….
  await page.evaluate(() => document.activeElement?.blur());
  out.exportRun = await runFromPalette(kit, page, 'project.export', {
    query: 'export',
  });
  out.exportDialog = await page
    .waitForSelector(`${DIALOG}[data-state="open"]`, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  await closeOverlays(kit, page);
  // A track list command from a focused row that isn't the selected one.
  await page.evaluate((id) => {
    window.__MA_STORE__.getState().setSelectedTrackId(id);
  }, ids.lead);
  await kit.sleep(200);
  const mutedBefore = await tracks(page);
  await page.focus(selector(ids.bass));
  out.muteRun = await runFromPalette(kit, page, 'tracks.mute', {
    query: 'mute',
  });
  const mutedAfter = await tracks(page);
  out.mute = {
    before: mutedBefore.map((t) => `${t.name}:${t.mute}`),
    after: mutedAfter.map((t) => `${t.name}:${t.mute}`),
    bassMuted:
      mutedAfter.find((t) => t.id === ids.bass)?.mute === true &&
      mutedBefore.find((t) => t.id === ids.bass)?.mute === false,
    othersSame: mutedAfter
      .filter((t) => t.id !== ids.bass)
      .every((t) => mutedBefore.find((b) => b.id === t.id)?.mute === t.mute),
    focus: await page.evaluate(focusNow),
  };
  // Unmute it again (the exports want every track).
  await page.evaluate((id) => {
    const s = window.__MA_STORE__.getState();
    if (s.tracks.find((t) => t.id === id)?.mute) s.toggleMute(id);
  }, ids.bass);
  await kit.sleep(200);
  return out;
}

/** The pill and the bar, then the dialog's tabs from it. */
async function exportPillAndTabs(kit, page) {
  await toView(kit, page, 'arrange');
  const pill = await page.evaluate(pillNow);
  await openFromPill(kit, page);
  const opened = await page.evaluate(dialogNow);
  const audio = {};
  for (const what of ['song', 'stems', 'track']) {
    await choose(kit, page, 'export-what', what);
    audio[what] = {
      ...(await page.evaluate(dialogNow)),
      floors: await floorsOf(page, `${DIALOG}[data-state="open"]`),
    };
  }
  await choose(kit, page, 'export-what', 'song');
  await page.click(`${DIALOG} [data-testid="export-tab-notation"]`, {
    timeout: 5000,
  });
  await kit.sleep(300);
  const notation = {
    ...(await page.evaluate(dialogNow)),
    floors: await floorsOf(page, `${DIALOG}[data-state="open"]`),
  };
  await page.click(`${DIALOG} [data-testid="export-tab-audio"]`, {
    timeout: 5000,
  });
  await kit.sleep(200);
  await closeOverlays(kit, page);
  return { pill, opened, audio, notation };
}

/** The ⋯ menu's name field: Enter renames, Escape keeps the name. */
async function trackMenuField(kit, page, ids) {
  await openTrackMenu(kit, page, ids.lead);
  const menu = await page.evaluate(trackMenuNow);
  const field = page.locator(
    `${TRACK_MENU}[data-state="open"] [data-testid="track-menu-name"]`,
  );
  await field.click({ timeout: 5000 });
  await page.keyboard.press(`${MOD}+KeyA`);
  await page.keyboard.type('R34 Renamed', { delay: 15 });
  await page.keyboard.press('Enter');
  await kit.sleep(300);
  const renamed = (await tracks(page)).find((t) => t.id === ids.lead)?.name;
  const stillOpen = !!(await page.evaluate(trackMenuNow));
  await field.click({ timeout: 5000 }).catch(() => {});
  await page.keyboard.press(`${MOD}+KeyA`);
  await page.keyboard.type('Never Kept', { delay: 15 });
  await page.keyboard.press('Escape');
  await kit.sleep(400);
  const closed = !(await page.evaluate(trackMenuNow));
  const kept = (await tracks(page)).find((t) => t.id === ids.lead)?.name;
  // Back to Lead for the exports' names.
  await page.evaluate((id) => {
    window.__MA_STORE__.getState().updateTrack(id, { name: 'Lead' });
  }, ids.lead);
  await closeOverlays(kit, page);
  return { menu, renamed, stillOpen, closed, kept };
}

/** A right-click on a row's name, then Escape and a click on another row. */
async function rowContextMenu(kit, page, ids) {
  await page.evaluate((id) => {
    window.__MA_STORE__.getState().setSelectedTrackId(id);
  }, ids.lead);
  await kit.sleep(200);
  const box = await page.locator(selector(ids.drums)).boundingBox();
  if (!box) throw new Error('no Drums row');
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.mouse.click(x, y, { button: 'right' });
  await page
    .waitForSelector(`${TRACK_MENU}[data-state="open"]`, { timeout: 5000 })
    .catch(() => {});
  await kit.sleep(250);
  const menu = await page.evaluate(trackMenuNow);
  const selected = (await state(page)).selectedTrackId;
  const rowSelected = await page
    .locator(row(ids.drums))
    .getAttribute('data-selected');
  await page.keyboard.press('Escape');
  await kit.sleep(400);
  const closed = !(await page.evaluate(trackMenuNow));
  const focusAfter = await page.evaluate(focusNow);
  await page.click(selector(ids.bass), { timeout: 5000 });
  await kit.sleep(300);
  const clicked = (await state(page)).selectedTrackId;
  return {
    pointer: { x, y },
    menu,
    selected,
    rowSelected: rowSelected !== null,
    closed,
    focusAfter,
    clicked,
  };
}

/** The rows' edges with one track selected. */
async function selectedEdge(kit, page, ids) {
  await page.click(selector(ids.bass), { timeout: 5000 });
  await kit.sleep(300);
  return { selected: ids.bass, rows: await page.evaluate(rowsNow) };
}

/** The instrument button on a MIDI row, then on the audio row. */
async function instrumentIcon(kit, page, ids) {
  const out = {};
  for (const [name, id] of [
    ['midi', ids.bass],
    ['audio', ids.vox],
  ]) {
    await page.evaluate(() => {
      const s = window.__MA_STORE__.getState();
      if (s.dockMaster) s.setDockMaster(false);
      s.setChannelStripTab(null);
    });
    await kit.sleep(300);
    await page.click(`${row(id)} [data-testid="track-instrument-button"]`, {
      timeout: 5000,
    });
    await page
      .waitForSelector('[data-dock-content]', { timeout: 8000 })
      .catch(() => {});
    await kit.sleep(500);
    const s = await state(page);
    out[name] = {
      selected: s.selectedTrackId === id,
      tab: s.channelStripTab,
      dockContent: (await page.locator('[data-dock-content]').count()) > 0,
      focus: await page.evaluate(focusNow),
      activeTab: await page.evaluate(
        () =>
          document
            .querySelector(
              '[data-testid^="dock-tab-"][data-state="active"], [data-testid^="dock-tab-"][aria-selected="true"]',
            )
            ?.getAttribute('data-testid') ?? null,
      ),
    };
  }
  out.rows = await page.evaluate(rowsNow);
  out.rowFloors = await floorsOf(page, '[data-testid="track-row"]');
  await page.evaluate(() =>
    window.__MA_STORE__.getState().setChannelStripTab(null),
  );
  await kit.sleep(300);
  return out;
}

/** Export track ▸ WAV and ▸ WAV (no effects) from Bass's menu. */
async function exportTrackDialog(kit, page, ids, item) {
  await openTrackMenu(kit, page, ids.bass);
  const sub = page.locator(
    `${TRACK_MENU}[data-state="open"] [data-testid="track-menu-export"]`,
  );
  await sub.hover({ timeout: 5000 });
  await kit.sleep(150);
  await sub.click({ timeout: 5000 });
  await page.waitForSelector(`[data-testid="${item}"]`, {
    state: 'visible',
    timeout: 5000,
  });
  await page.click(`[data-testid="${item}"]`, { timeout: 5000 });
  await page.waitForSelector(`${DIALOG}[data-state="open"]`, {
    timeout: 10_000,
  });
  await kit.sleep(400);
  return page.evaluate(dialogNow);
}

async function exportTrack(kit, page, ids, { dir, renderTimeout, song }) {
  const wet = await exportTrackDialog(kit, page, ids, 'track-menu-export-wav');
  await closeOverlays(kit, page);
  const dry = await exportTrackDialog(
    kit,
    page,
    ids,
    'track-menu-export-wav-dry',
  );
  let file = null;
  if (dir) {
    const got = await download(kit, page, RUN_AUDIO, dir, null, renderTimeout);
    const bytes = readFileSync(got.path);
    file = {
      filename: got.filename,
      wav: readWav(bytes),
      // Against the whole song without mastering (dry leaves it out too).
      vsSong: round(rmsDiff(pcmOf(bytes), song.off ?? null)),
    };
  }
  await closeOverlays(kit, page);
  return { wet, dry, file };
}

/** Whole song, WAV, mastering on then off. */
async function exportAudio(kit, page, { dir, renderTimeout, song }) {
  const files = {};
  for (const mastering of ['on', 'off']) {
    await openFromPill(kit, page);
    await choose(kit, page, 'export-tab', 'audio');
    await choose(kit, page, 'export-what', 'song');
    await choose(kit, page, 'export-mastering', mastering);
    const dialog = await page.evaluate(dialogNow);
    const got = await download(
      kit,
      page,
      RUN_AUDIO,
      dir,
      `song-mastering-${mastering}.wav`,
      renderTimeout,
    );
    const bytes = readFileSync(got.path);
    files[mastering] = {
      filename: got.filename,
      dialog: { mastering: dialog?.mastering, what: dialog?.what },
      wav: readWav(bytes),
      bytes,
    };
  }
  // Kept for the stems and the track export to compare against.
  song.on = pcmOf(files.on.bytes);
  song.off = pcmOf(files.off.bytes);
  for (const f of Object.values(files)) delete f.bytes;
  return {
    ...files,
    masteringRms: round(rmsDiff(song.on, song.off)),
    expectedSeconds: await expectedSeconds(page),
  };
}

/** Each track: one zip of WAVs. */
async function exportStems(kit, page, { dir, renderTimeout, song }) {
  await openFromPill(kit, page);
  await choose(kit, page, 'export-tab', 'audio');
  await choose(kit, page, 'export-what', 'stems');
  await choose(kit, page, 'export-mastering', 'on');
  const got = await download(
    kit,
    page,
    RUN_AUDIO,
    dir,
    null,
    renderTimeout * 3,
  );
  const zip = readZip(readFileSync(got.path));
  // The tracks that play, in order, as the zip should name them.
  const expected = await page.evaluate(async () => {
    const { fileSlug } = await window.__RT_DEV_MODULE__(
      '/src/daw/utils/exportFiles.ts',
    );
    const { stemTracks } = await window.__RT_DEV_MODULE__(
      '/src/daw/audio/exportAudio.ts',
    );
    return stemTracks(window.__MA_STORE__.getState()).map(
      (t, i) =>
        `${String(i + 1).padStart(2, '0')}-${fileSlug(t.name, 'track')}.wav`,
    );
  });
  // Reset what to the song for the next opening.
  await openFromPill(kit, page);
  await choose(kit, page, 'export-what', 'song');
  await closeOverlays(kit, page);
  // Each stem against each other one and against the song (mastering on,
  // as the stems were rendered).
  const pcms = zip.entries.map((e) => pcmOf(e.data));
  const pairs = {};
  for (let i = 0; i < pcms.length; i++) {
    for (let j = i + 1; j < pcms.length; j++) {
      pairs[`${zip.entries[i].name} | ${zip.entries[j].name}`] = round(
        rmsDiff(pcms[i], pcms[j]),
      );
    }
  }
  return {
    filename: got.filename,
    valid: zip.valid,
    reason: zip.reason ?? null,
    expected,
    entries: zip.entries.map((e, i) => ({
      name: e.name,
      method: e.method,
      wav: readWav(e.data),
      vsSong: round(rmsDiff(pcms[i], song.on ?? null)),
    })),
    pairs,
    expectedSeconds: await expectedSeconds(page),
  };
}

/** MIDI, lead sheet and full score from the Notation tab. */
async function exportNotation(kit, page, { dir }) {
  const out = {};
  for (const format of ['midi', 'leadsheet', 'score']) {
    await openFromPill(kit, page);
    await page.click(`${DIALOG} [data-testid="export-tab-notation"]`, {
      timeout: 5000,
    });
    await kit.sleep(250);
    await choose(kit, page, 'export-what', 'song');
    await choose(kit, page, 'export-notation-format', format);
    const got = await download(kit, page, RUN_NOTATION, dir, null, 30_000);
    const bytes = readFileSync(got.path);
    out[format] =
      format === 'midi'
        ? { filename: got.filename, midi: readMidi(bytes) }
        : {
            filename: got.filename,
            xml: await page.evaluate(parseXml, bytes.toString('utf8')),
          };
  }
  await closeOverlays(kit, page);
  return out;
}

/** Duplicate from the menu, one Undo, Duplicate again and a reload. */
async function duplicateTrack(kit, page, ids) {
  const before = await tracks(page);
  await openTrackMenu(kit, page, ids.lead);
  await page.click(
    `${TRACK_MENU}[data-state="open"] [data-testid="track-menu-duplicate"]`,
    { timeout: 5000 },
  );
  await kit.sleep(600);
  const after = await tracks(page);
  await undoOnce(kit, page);
  const undone = await tracks(page);
  await openTrackMenu(kit, page, ids.lead);
  await page.click(
    `${TRACK_MENU}[data-state="open"] [data-testid="track-menu-duplicate"]`,
    { timeout: 5000 },
  );
  await kit.sleep(600);
  const again = await tracks(page);
  await kit.waitForDraft(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const ready = await kit.waitForEditor(page, 180_000);
  await kit.settle(page, 'R34 reload');
  const reloaded = await tracks(page);
  return { before, after, undone, again, reloaded, ready };
}

// ── Each size ───────────────────────────────────────────────────────────────

async function commandsAt(kit, run, viewport, { renders }) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  const throttled = run.profile === 'chromebook';
  const renderTimeout = throttled ? 240_000 : 90_000;
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedSong(kit, page);
      await kit.settle(page, 'R34 open');
      await kit.sleep(500);
      const seeded = await tracks(page);
      const byName = (name) => seeded.find((t) => t.name === name)?.id ?? null;
      const ids = {
        lead: byName('Lead'),
        bass: byName('Bass'),
        drums: byName('Drums'),
        vox: byName('Vox'),
      };
      const out = { viewport, ids, renders };
      const step = async (name, fn) => {
        const started = Date.now();
        try {
          out[name] = await fn();
        } catch (error) {
          out[name] = { error: String(error?.message ?? error).slice(0, 300) };
        }
        (out.seconds ??= {})[name] =
          Math.round((Date.now() - started) / 100) / 10;
        await closeOverlays(kit, page).catch(() => {});
      };
      if (Object.values(ids).some((id) => !id)) {
        out.seed = { error: `seeding failed: ${JSON.stringify(ids)}` };
        return out;
      }
      const dir = renders ? downloadDir(run, viewport) : null;
      await step('opens', () => paletteOpens(kit, page, ids));
      await step('runs', () => paletteRuns(kit, page, ids));
      await step('afterClose', () => clickAfterClose(kit, page, ids));
      await step('pill', () => exportPillAndTabs(kit, page));
      await step('field', () => trackMenuField(kit, page, ids));
      await step('context', () => rowContextMenu(kit, page, ids));
      await step('edge', () => selectedEdge(kit, page, ids));
      await step('icon', () => instrumentIcon(kit, page, ids));
      // The song's renders, which the stems and the track export are
      // compared against.
      const song = { on: null, off: null };
      if (renders) {
        await step('audio', () =>
          exportAudio(kit, page, { dir, renderTimeout, song }),
        );
      }
      await step('exportTrack', () =>
        exportTrack(kit, page, ids, { dir, renderTimeout, song }),
      );
      if (renders) {
        await step('stems', () =>
          exportStems(kit, page, { dir, renderTimeout, song }),
        );
        await step('notation', () => exportNotation(kit, page, { dir }));
        await step('duplicate', () => duplicateTrack(kit, page, ids));
      }
      return out;
    },
    api,
  );
}

// ── Judging ─────────────────────────────────────────────────────────────────

const ok = (facts) => !!facts && !facts.error;

/** Rows whose keys don't match the registry, as `id: shown ≠ expected`. */
function keyMismatches(p) {
  if (!p?.groups) return ['no palette'];
  return p.groups.flatMap((g) =>
    g.rows
      .filter(
        (r) =>
          (r.expected && typeof r.expected === 'object') ||
          r.keys !== r.expected,
      )
      .map((r) => `${r.id}: ${r.keys} ≠ ${JSON.stringify(r.expected)}`),
  );
}

/** Whether the groups come in SCOPE_ORDER (unknown scopes last). */
function groupsInOrder(p) {
  if (!p?.groups?.length) return false;
  const rank = (scope) => {
    const i = p.scopeOrder.indexOf(scope);
    return i === -1 ? p.scopeOrder.length : i;
  };
  const ranks = p.groups.map((g) => rank(g.scope));
  return ranks.every((r, i) => i === 0 || r >= ranks[i - 1]);
}

const OPENINGS = ['create', 'mix', 'score', 'leadsheet', 'leadsheetK', 'row'];

function judgeOpens(o, ids) {
  if (!ok(o)) return false;
  return (
    OPENINGS.every((k) => o[k]?.opened && o[k].focusInField && o[k].closed) &&
    o.leadsheetK.chordsAdded === 0 &&
    o.row.groups.some((g) => g.scope === 'tracks') &&
    o.row.focusBack?.row === ids.bass
  );
}

function judgeRuns(r, ids) {
  if (!ok(r)) return false;
  const marker = r.marker;
  return (
    r.loopRun?.listed &&
    r.loop.after === !r.loop.before &&
    r.markerRun?.listed &&
    marker.prompt &&
    marker.added.length === 1 &&
    marker.added[0].tick === BAR &&
    r.exportRun?.listed &&
    r.exportDialog &&
    r.muteRun?.listed &&
    r.mute.bassMuted &&
    r.mute.othersSame &&
    r.mute.focus?.row === ids.bass
  );
}

function floorsClean(p) {
  return !!p && p.found && p.findings.length === 0;
}

function judgePill(p) {
  if (!ok(p) || !p.pill) return false;
  const pill = p.pill;
  const zone = pill.zoneChildren;
  return (
    pill.zone === 'share' &&
    pill.fold === 0 &&
    pill.pillIsPrimary &&
    pill.label === 'Export' &&
    pill.overflowIndex >= 0 &&
    pill.pillIndex > pill.overflowIndex &&
    pill.pillIndex === zone.length - 2 &&
    !!pill.box?.inside &&
    pill.box.height >= 24
  );
}

function dialogFits(d) {
  return !!d && d.inside && d.scrolls.length === 0 && floorsClean(d.floors);
}

function judgeTabs(p) {
  if (!ok(p)) return false;
  return (
    p.opened?.tab === 'audio' &&
    p.opened.tabs.length === 2 &&
    ['song', 'stems', 'track'].every(
      (w) => p.audio[w]?.what === w && dialogFits(p.audio[w]),
    ) &&
    p.notation?.tab === 'notation' &&
    dialogFits(p.notation)
  );
}

function judgeField(f) {
  return (
    ok(f) &&
    !!f.menu?.firstIsField &&
    f.menu.field === 'Lead' &&
    f.renamed === 'R34 Renamed' &&
    f.stillOpen &&
    f.closed &&
    f.kept === 'R34 Renamed'
  );
}

function judgeContext(c, ids) {
  if (!ok(c) || !c.menu) return false;
  const near =
    Math.abs(c.menu.box.left - c.pointer.x) <= 12 &&
    Math.abs(c.menu.box.top - c.pointer.y) <= 16;
  return (
    near &&
    c.menu.inside &&
    c.selected === ids.drums &&
    c.rowSelected &&
    c.closed &&
    c.clicked === ids.bass
  );
}

/** `#rrggbb` (or `#rgb`) as the `rgb(r, g, b)` getComputedStyle gives. */
function rgbOf(hex) {
  const h = String(hex ?? '').replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function judgeEdge(e) {
  if (!ok(e)) return false;
  const selected = e.rows.filter((r) => r.selected);
  return (
    selected.length === 1 &&
    selected[0].id === e.selected &&
    e.rows.every((r) =>
      r.selected
        ? r.edges === 1 &&
          Math.abs(r.edge.width - 4) <= 0.5 &&
          r.edge.height >= r.rowHeight - 2 &&
          r.edge.color === rgbOf(r.trackColor)
        : r.edges === 0,
    )
  );
}

function judgeIcon(i) {
  if (!ok(i)) return false;
  return (
    i.midi.selected &&
    i.midi.tab === 'controls' &&
    i.midi.dockContent &&
    i.midi.focus.inDock &&
    i.midi.activeTab === 'dock-tab-controls' &&
    i.audio.selected &&
    i.audio.tab === 'fx' &&
    i.audio.dockContent &&
    i.audio.focus.inDock &&
    i.rows.every((r) => r.icon && r.icon.width >= 24 && r.icon.height >= 24) &&
    floorsClean(i.rowFloors)
  );
}

const lengthOk = (wav, seconds) =>
  !!wav?.valid && Math.abs(wav.seconds - seconds) <= 0.05;

function judgeExportTrack(t, renders) {
  if (!ok(t)) return false;
  const opened = (d, dry) =>
    !!d &&
    d.tab === 'audio' &&
    d.what === 'track' &&
    d.track === 'Bass' &&
    d.dry === dry;
  const dialogs = opened(t.wet, 'wet') && opened(t.dry, 'dry');
  if (!renders) return dialogs;
  return (
    dialogs &&
    t.file?.filename === `${SLUG}-bass-dry.wav` &&
    !!t.file.wav?.valid &&
    !t.file.wav.silent &&
    t.file.vsSong !== null &&
    t.file.vsSong > DIFFERENT_RMS
  );
}

function judgeAudio(a) {
  if (!ok(a)) return false;
  return (
    ['on', 'off'].every(
      (m) =>
        a[m].filename === `${SLUG}.wav` &&
        a[m].dialog.mastering === m &&
        lengthOk(a[m].wav, a.expectedSeconds) &&
        !a[m].wav.silent,
    ) &&
    a.masteringRms !== null &&
    a.masteringRms > DIFFERENT_RMS
  );
}

function judgeStems(s, sameValue) {
  if (!ok(s)) return false;
  return (
    s.filename === `${SLUG}-stems.zip` &&
    s.valid &&
    s.expected.length === 3 &&
    sameValue(
      s.entries.map((e) => e.name),
      s.expected,
    ) &&
    s.entries.every(
      (e) =>
        /^\d{2}-.+\.wav$/.test(e.name) &&
        lengthOk(e.wav, s.expectedSeconds) &&
        !e.wav.silent &&
        e.vsSong !== null &&
        e.vsSong > DIFFERENT_RMS,
    ) &&
    Object.keys(s.pairs).length === 3 &&
    Object.values(s.pairs).every((d) => d !== null && d > DIFFERENT_RMS)
  );
}

function judgeNotation(n) {
  if (!ok(n)) return false;
  const midi = n.midi?.midi;
  const chunks = midi?.chunks ?? [];
  const drums = chunks.filter((c) => c.name === 'Drums');
  const melodic = chunks.filter((c) => c.noteOns > 0 && c.name !== 'Drums');
  const midiOk =
    n.midi?.filename === `${SLUG}.mid` &&
    !!midi?.valid &&
    drums.length === 1 &&
    drums[0].noteOns > 0 &&
    drums[0].channels.length === 1 &&
    drums[0].channels[0] === 10 &&
    melodic.length === 2 &&
    melodic.every((c) => !c.channels.includes(10));
  const xmlOk = (f, name) =>
    f?.filename === name &&
    !!f.xml &&
    f.xml.error === null &&
    f.xml.root === 'score-partwise';
  return (
    midiOk &&
    xmlOk(n.leadsheet, `${SLUG}-lead-sheet.musicxml`) &&
    n.leadsheet.xml.harmonies >= 2 &&
    xmlOk(n.score, `${SLUG}-score.musicxml`) &&
    n.score.xml.parts >= 3 &&
    n.score.xml.notes > 0
  );
}

/** Notes without ids, in clip time: what a copy shares with its source. */
const shape = (t) =>
  t.clips.map((c) => ({
    startTick: c.startTick,
    durationTicks: c.durationTicks,
    notes: c.notes.map(({ id: _id, ...n }) => n),
  }));

function copyOf(before, after, sourceId, same) {
  const fresh = after.filter((t) => !before.some((b) => b.id === t.id));
  if (fresh.length !== 1) return { ok: false, why: `${fresh.length} new` };
  const copy = fresh[0];
  const source = after.find((t) => t.id === sourceId);
  const at = after.indexOf(copy);
  const sourceAt = after.indexOf(source);
  const oldClipIds = new Set(source.clips.map((c) => c.id));
  const oldNoteIds = new Set(
    source.clips.flatMap((c) => c.notes.map((n) => n.id)),
  );
  const newIds =
    copy.clips.every((c) => !oldClipIds.has(c.id)) &&
    copy.clips.every((c) => c.notes.every((n) => !oldNoteIds.has(n.id)));
  return {
    ok:
      at === sourceAt + 1 &&
      copy.clips.length === source.clips.length &&
      same(shape(copy), shape(source)) &&
      newIds,
    copy,
    at,
    sourceAt,
    newIds,
  };
}

function judgeDuplicate(d, ids, same) {
  if (!ok(d)) return { ok: false };
  const first = copyOf(d.before, d.after, ids.lead, same);
  const undone = same(
    d.undone.map((t) => t.id),
    d.before.map((t) => t.id),
  );
  const second = copyOf(d.before, d.again, ids.lead, same);
  const kept =
    second.ok &&
    d.reloaded.some((t) => t.id === second.copy.id) &&
    same(
      d.reloaded.map((t) => t.id),
      d.again.map((t) => t.id),
    ) &&
    same(
      shape(d.reloaded.find((t) => t.id === second.copy.id)),
      shape(second.copy),
    );
  return { ok: first.ok && undone && kept, first, undone, second, kept };
}

function judge(v, same) {
  const ids = v.ids;
  const openings = ok(v.opens)
    ? OPENINGS.map((k) => v.opens[k]).filter(Boolean)
    : [];
  const palettes = openings.filter((o) => o.opened);
  return {
    paletteOpens: judgeOpens(v.opens, ids),
    paletteShortcuts:
      palettes.length === OPENINGS.length &&
      palettes.every(
        (p) =>
          p.groups.length > 0 &&
          keyMismatches(p).length === 0 &&
          groupsInOrder(p),
      ),
    paletteRuns: judgeRuns(v.runs, ids),
    paletteClickAfterClose:
      ok(v.afterClose) &&
      v.afterClose.paletteClosed &&
      v.afterClose.selected === ids.bass,
    paletteFloors:
      palettes.length === OPENINGS.length &&
      palettes.every((p) => floorsClean(p.floors) && p.inside && !p.overflowX),
    exportPill: judgePill(v.pill),
    exportTabs: judgeTabs(v.pill),
    trackMenuField: judgeField(v.field),
    rowContextMenu: judgeContext(v.context, ids),
    selectedEdge: judgeEdge(v.edge),
    instrumentIcon: judgeIcon(v.icon),
    exportTrack: judgeExportTrack(v.exportTrack, v.renders),
    ...(v.renders
      ? {
          exportAudio: judgeAudio(v.audio),
          exportStems: judgeStems(v.stems, same),
          exportNotation: judgeNotation(v.notation),
          duplicateTrack: judgeDuplicate(v.duplicate, ids, same).ok,
        }
      : {}),
  };
}

// ── The report ──────────────────────────────────────────────────────────────

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

const wavText = (w) =>
  !w
    ? null
    : w.valid
      ? `${w.channels}ch ${w.sampleRate} Hz ${w.bits}-bit ${w.seconds.toFixed(3)} s${w.silent ? ' (silent)' : ''}`
      : `invalid (${w.reason})`;

function report(v, judged, same) {
  const err = (facts) => (facts?.error ? { error: facts.error } : null);
  const palette = (p) =>
    !p
      ? null
      : !p.opened
        ? 'did not open'
        : {
            focusInField: p.focusInField,
            closed: p.closed,
            groups: p.groups.map((g) => `${g.scope} (${g.rows.length})`),
            keyMismatches: keyMismatches(p),
            shadowed: p.groups.flatMap((g) =>
              g.rows
                .filter((r) => r.shadowedBy)
                .map((r) => `${r.id} (by ${r.shadowedBy})`),
            ),
            inOrder: groupsInOrder(p),
            inside: p.inside,
            box: p.box,
            overflowX: p.overflowX,
            floors: floorText(p.floors),
          };
  const dialog = (d) =>
    d && {
      tab: d.tab,
      what: d.what,
      inside: d.inside,
      box: d.box,
      scrolls: d.scrolls,
      floors: floorText(d.floors),
    };
  const dup =
    v.duplicate && !v.duplicate.error
      ? judgeDuplicate(v.duplicate, v.ids, same)
      : null;
  return {
    viewport: `${v.viewport.width}x${v.viewport.height}`,
    seconds: v.seconds,
    seed: v.seed ?? undefined,
    opens:
      err(v.opens) ??
      (v.opens &&
        Object.fromEntries(OPENINGS.map((k) => [k, palette(v.opens[k])]))),
    rowFocusBack: v.opens?.row?.focusBack ?? null,
    leadsheetKChordsAdded: v.opens?.leadsheetK?.chordsAdded ?? null,
    afterClose: err(v.afterClose) ?? v.afterClose,
    runs: err(v.runs) ?? {
      loop: v.runs?.loop,
      marker: v.runs?.marker,
      exportDialog: v.runs?.exportDialog,
      mute: v.runs?.mute,
      listed: {
        loop: v.runs?.loopRun?.listed,
        marker: v.runs?.markerRun?.listed,
        export: v.runs?.exportRun?.listed,
        mute: v.runs?.muteRun?.listed,
      },
    },
    pill: err(v.pill) ?? v.pill?.pill,
    dialog: err(v.pill) ?? {
      opened: v.pill?.opened && {
        tab: v.pill.opened.tab,
        tabs: v.pill.opened.tabs,
      },
      audio: v.pill?.audio && {
        song: dialog(v.pill.audio.song),
        stems: dialog(v.pill.audio.stems),
        track: dialog(v.pill.audio.track),
      },
      notation: dialog(v.pill?.notation),
    },
    field: err(v.field) ?? v.field,
    context: err(v.context) ?? v.context,
    edge:
      err(v.edge) ??
      v.edge?.rows.map(
        (r) =>
          `${r.id.slice(0, 6)}${r.selected ? ' selected' : ''}: ${r.edges} edge${r.edge ? ` ${r.edge.width}×${r.edge.height} ${r.edge.color} (track ${r.trackColor})` : ''}`,
      ),
    icon: err(v.icon) ?? {
      midi: v.icon?.midi,
      audio: v.icon?.audio,
      icons: v.icon?.rows.map((r) => r.icon),
      floors: floorText(v.icon?.rowFloors),
    },
    exportTrack: err(v.exportTrack) ?? {
      wet: v.exportTrack?.wet && {
        what: v.exportTrack.wet.what,
        track: v.exportTrack.wet.track,
        dry: v.exportTrack.wet.dry,
      },
      dry: v.exportTrack?.dry && {
        what: v.exportTrack.dry.what,
        track: v.exportTrack.dry.track,
        dry: v.exportTrack.dry.dry,
      },
      file: v.exportTrack?.file && {
        filename: v.exportTrack.file.filename,
        wav: wavText(v.exportTrack.file.wav),
        vsSong: v.exportTrack.file.vsSong,
      },
    },
    ...(v.renders
      ? {
          audio: err(v.audio) ?? {
            expectedSeconds: v.audio?.expectedSeconds,
            on: v.audio?.on && {
              filename: v.audio.on.filename,
              wav: wavText(v.audio.on.wav),
            },
            off: v.audio?.off && {
              filename: v.audio.off.filename,
              wav: wavText(v.audio.off.wav),
            },
            masteringRms: v.audio?.masteringRms,
          },
          stems: err(v.stems) ?? {
            filename: v.stems?.filename,
            valid: v.stems?.valid,
            expected: v.stems?.expected,
            entries: v.stems?.entries.map(
              (e) => `${e.name}: ${wavText(e.wav)}, vs song RMS ${e.vsSong}`,
            ),
            pairs: v.stems?.pairs,
            expectedSeconds: v.stems?.expectedSeconds,
          },
          notation: err(v.notation) ?? {
            midi: v.notation?.midi && {
              filename: v.notation.midi.filename,
              format: v.notation.midi.midi?.format,
              tracks: v.notation.midi.midi?.tracks,
              chunks: v.notation.midi.midi?.chunks?.map(
                (c) =>
                  `${c.name ?? '(no name)'}: ${c.noteOns} notes on ${c.channels.join(',') || '-'}`,
              ),
            },
            leadsheet: v.notation?.leadsheet,
            score: v.notation?.score,
          },
          duplicate: err(v.duplicate) ?? {
            ready: v.duplicate?.ready,
            first: dup && {
              ok: dup.first.ok,
              at: dup.first.at,
              sourceAt: dup.first.sourceAt,
              newIds: dup.first.newIds,
              why: dup.first.why,
            },
            undone: dup?.undone,
            second: dup && { ok: dup.second.ok, why: dup.second.why },
            keptAfterReload: dup?.kept,
            tracks: {
              before: v.duplicate?.before.map((t) => t.name),
              after: v.duplicate?.after.map((t) => t.name),
              undone: v.duplicate?.undone.map((t) => t.name),
              reloaded: v.duplicate?.reloaded.map((t) => t.name),
            },
          },
        }
      : {}),
    failed: Object.entries(judged)
      .filter(([, good]) => !good)
      .map(([key]) => key),
  };
}

async function commands(kit, run) {
  const at = [];
  for (const viewport of VIEWPORTS) {
    at.push(await commandsAt(kit, run, viewport, { renders: true }));
  }
  const judged = at.map((v) => judge(v, kit.sameValue));
  return {
    diffs: [],
    extraLosses: [],
    flags: Object.fromEntries(
      Object.keys(flags).map((key) => [
        key,
        judged.every((j) => !(key in j) || j[key]) &&
          judged.some((j) => key in j),
      ]),
    ),
    checks: at.map((v, i) => report(v, judged[i], kit.sameValue)),
  };
}

export const scenarios = (kit) => [
  {
    group: 'R34',
    key: '',
    id: 'R34-commands-output',
    title:
      'Commands and output at 1366×655, 1440×787 and 1280×720: the command palette from every view and a row (keys, groups, running commands, floors), the Export pill and dialog (Audio and Notation fit), the track menu’s name field, Export track, a row’s right-click menu, the selected edge and the instrument button; the downloads (song WAV with and without mastering, the stems zip, MIDI with drums on channel 10, lead sheet and score MusicXML) and Duplicate track with Undo and a reload',
    run: (run) => commands(kit, run),
  },
];
