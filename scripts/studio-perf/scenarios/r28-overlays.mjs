/* eslint-env node */
/**
 * R28 overlays (milestones 2.1 and 2.3, fast), at 1366×655 (a Chromebook)
 * and 1440×787 (a laptop). Every overlay the editor opens, one at a time:
 *
 * - the dialogs on the 2.2 primitives: Audio & MIDI settings, Export Audio,
 *   Project ▸ Save as's prompt, Projects, the recording-limit notice, the
 *   removed-from-session notice, the leave prompt, the chord analysis prompt
 *   and a confirmDialog() asked through the editor's DialogHost;
 * - the menus and popovers: the Project menu, the Song popover (key, metre
 *   and tempo, milestone 2.5), the Share popover, the account menu and a
 *   track's colour popover (still the old one).
 *
 * Flags:
 * - overlaysOpaque: each panel's background is at least 95 % opaque (the
 *   tokens reach <body>, design-system-01).
 * - noTeal: no computed colour in any of them is the retired teal.
 * - primaryPills: each primary is the white pill, its text 4.5:1 or more.
 * - designFloors: inside the v2 parts (dialogs, and the shell on the page)
 *   no text is under the floor and no target under 24×24 (designProbe.mjs;
 *   [data-ds="legacy"] content is skipped).
 * - focusTrapped: a dialog opens with focus inside, and Tab keeps it there.
 * - escapeCloses: Escape closes each dialog; Settings gives focus back to
 *   its button.
 * - dialogHostAnswers: confirmDialog() shows the editor's alert dialog and
 *   answers false when it is cancelled.
 * - noNativeDialogs: no window.confirm, prompt or alert opened.
 */
import { designProbe, overlayLook } from '../designProbe.mjs';

export const flags = {
  overlaysOpaque: {
    goal: true,
    text: 'every dialog, menu and popover painted at least 95 % opaque',
  },
  noTeal: { goal: true, text: 'no overlay had any of the retired teal' },
  primaryPills: {
    goal: true,
    text: 'every primary was the white pill, its text at 4.5:1 or more',
  },
  designFloors: {
    goal: true,
    text: 'no text under the floor and no target under 24×24 in the v2 parts',
  },
  focusTrapped: {
    goal: true,
    text: 'each dialog opened with focus inside, and Tab kept it there',
  },
  escapeCloses: {
    goal: true,
    text: 'Escape closed each dialog; Settings gave focus back to its button',
  },
  dialogHostAnswers: {
    goal: true,
    text: 'confirmDialog() asked in the editor’s dialog and answered a cancel with false',
  },
  noNativeDialogs: {
    goal: true,
    text: 'no native confirm, prompt or alert opened',
  },
};

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
];

/** The top bar's Settings button (milestone 2.5). */
const SETTINGS_BUTTON = '[data-testid="settings-button"]';

/** The open v2 panel: a DawDialog or ConfirmDialog. */
const V2_PANEL = '[data-ds="v2"][data-state="open"]';

/** The dialogs, each with how it opens and, if it has one, its opener. */
function dialogs(kit) {
  return [
    {
      name: 'Audio & MIDI settings',
      // The top bar's button, or its '⋯' menu where a narrow window folds
      // it (milestone 2.5); focus goes back to the button when there is one.
      opener: SETTINGS_BUTTON,
      open: async (page) => {
        if (await page.locator(SETTINGS_BUTTON).count()) {
          await page.click(SETTINGS_BUTTON);
          return;
        }
        await page.click('[data-testid="top-bar-overflow"]');
        await page
          .locator('[role=menu][data-state=open] [role=menuitem]', {
            hasText: 'Audio & MIDI settings',
          })
          .first()
          .click();
      },
    },
    {
      name: 'Export Audio',
      open: (page) => kit.clickFileItem(page, 'Audio'),
    },
    {
      name: 'Save a copy',
      open: (page) => kit.clickFileItem(page, 'Save as'),
    },
    { name: 'Projects', open: (page) => kit.clickFileItem(page, 'Open') },
    {
      name: 'Recording limit',
      open: (page) =>
        page.evaluate(() =>
          window.__MA_STORE__.getState().setRecordingLimitModalOpen(true),
        ),
    },
    {
      name: 'Removed from session',
      open: (page) =>
        page.evaluate(() =>
          window.__MA_STORE__.getState()._setKickedNotice(true),
        ),
    },
    {
      name: 'Leave session',
      open: (page) =>
        page.evaluate(() => {
          const s = window.__MA_STORE__.getState();
          s._setConnectionStatus('connected');
          s._setLeavePrompt(true);
        }),
      after: (page) =>
        page.evaluate(() => {
          const s = window.__MA_STORE__.getState();
          s._setLeavePrompt(false);
          s._setConnectionStatus('disconnected');
        }),
    },
    {
      name: 'Chord analysis',
      open: (page) =>
        page.evaluate(() =>
          window.__MA_STORE__.setState({ chordAnalysisPromptOpen: true }),
        ),
    },
  ];
}

/** The menus and popovers: opacity and teal (and the v2 ones' floors). */
const POPOVERS = [
  {
    name: 'Project menu',
    trigger: '[data-tutorial-id="file-menu"]',
    panel: '[role=menu][data-state=open]',
  },
  {
    name: 'Song popover',
    trigger: '[data-testid="song-chip"]',
    panel: '[data-testid="song-popover"]',
    v2: true,
  },
  {
    name: 'Share popover',
    trigger: '[data-testid="share-pill"]',
    panel: '[data-testid="collab-popover"]',
    v2: true,
  },
  {
    name: 'Account menu',
    trigger: '[data-testid="avatar-menu"]',
    panel: '[role=menu][data-state=open]',
  },
  // The track row's ⋯ menu holds its colours since milestone 2.6.
  {
    name: 'Track menu',
    trigger: '[data-testid="track-menu-button"]',
    panel: '[data-testid="track-menu"]',
    v2: true,
  },
  {
    name: 'Grid menu',
    trigger: '[data-testid="grid-menu"]',
    panel: '[role=menu][data-state=open]',
    v2: true,
  },
  {
    name: 'Chord lane key',
    trigger: '[data-testid="chord-lane-key"]',
    panel: '[data-testid="chord-lane-song-popover"]',
    v2: true,
  },
];

/** In-page: whether focus is inside the open v2 panel. */
const focusInside = (selector) => {
  const panel = document.querySelector(selector);
  return !!panel && panel.contains(document.activeElement);
};

async function checkDialog(kit, page, dialog) {
  const out = { name: dialog.name };
  try {
    await dialog.open(page);
    await page.waitForSelector(V2_PANEL, { timeout: 10_000 });
    await kit.sleep(400);
    out.look = await page.evaluate(overlayLook, V2_PANEL);
    out.floors = await page.evaluate(designProbe, V2_PANEL);
    out.focusStarts = await page.evaluate(focusInside, V2_PANEL);
    let trapped = true;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      if (!(await page.evaluate(focusInside, V2_PANEL))) trapped = false;
    }
    out.trapped = trapped;
    await page.keyboard.press('Escape');
    out.closed = await page
      .waitForSelector(V2_PANEL, { state: 'detached', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (dialog.opener && (await page.locator(dialog.opener).count())) {
      // Focus goes back as the panel unmounts, after its exit animation.
      await kit.sleep(300);
      out.focusBack = await page.evaluate(
        (selector) =>
          document.activeElement === document.querySelector(selector),
        dialog.opener,
      );
    }
  } catch (err) {
    out.error = String(err).slice(0, 200);
  } finally {
    if (dialog.after) await dialog.after(page).catch(() => {});
    // Nothing left open for the next one.
    if (await page.locator(V2_PANEL).count()) {
      await page.keyboard.press('Escape');
      await kit.sleep(300);
    }
  }
  return out;
}

async function checkPopover(kit, page, popover) {
  const out = { name: popover.name };
  try {
    // A Radix menu can miss the first click while the page settles, as
    // clickFileItem allows for.
    for (let i = 0; i < 3; i++) {
      await page.click(popover.trigger, { timeout: 5000 });
      await kit.sleep(250);
      if (await page.locator(popover.panel).count()) break;
    }
    await page.waitForSelector(popover.panel, { timeout: 5000 });
    await kit.sleep(300);
    out.look = await page.evaluate(overlayLook, popover.panel);
    // A popover built on the primitives keeps the design floors too.
    out.floors = popover.v2
      ? await page.evaluate(designProbe, popover.panel)
      : [];
  } catch (err) {
    out.error = String(err).slice(0, 200);
  }
  await page.keyboard.press('Escape');
  await kit.sleep(200);
  if (await page.locator(popover.panel).count()) {
    await page.click(popover.trigger).catch(() => {});
    await kit.sleep(200);
  }
  return out;
}

/** confirmDialog(), through the DialogHost the editor mounts. */
async function checkDialogHost(kit, page) {
  await page.evaluate(async () => {
    const { confirmDialog } = await window.__RT_DEV_MODULE__(
      '/src/daw/ui/DialogHost.tsx',
    );
    window.__rtConfirm = confirmDialog({
      title: 'Delete this marker?',
      description: 'R28 asks through the editor’s own dialog.',
      danger: true,
    });
  });
  const shown = await page
    .waitForSelector('[role="alertdialog"][data-state="open"]', {
      timeout: 5000,
    })
    .then(() => true)
    .catch(() => false);
  await page.keyboard.press('Escape');
  const answer = await page.evaluate(() => window.__rtConfirm);
  return { shown, answer };
}

async function overlaysAt(kit, run, viewport) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async (session) => {
      const { page } = session;
      let nativeDialogs = 0;
      page.on('dialog', (d) => {
        nativeDialogs += 1;
        d.dismiss().catch(() => {});
      });
      await page.setViewportSize(viewport);
      await page.evaluate(() =>
        window.__MA_STORE__
          .getState()
          .addTrack('midi', 'piano-sampler', 'Overlay Keys'),
      );
      await kit.settle(page, 'R28 setup');

      const results = [];
      for (const dialog of dialogs(kit)) {
        results.push(await checkDialog(kit, page, dialog));
      }
      const popovers = [];
      for (const popover of POPOVERS) {
        popovers.push(await checkPopover(kit, page, popover));
      }
      const host = await checkDialogHost(kit, page);
      const pageFloors = await page.evaluate(designProbe);
      return {
        viewport,
        dialogs: results,
        popovers,
        host,
        pageFloors,
        nativeDialogs,
      };
    },
    api,
  );
}

async function overlays(kit, run) {
  const at = [];
  for (const viewport of VIEWPORTS)
    at.push(await overlaysAt(kit, run, viewport));
  const dialogsAll = at.flatMap((v) => v.dialogs);
  const looks = [
    ...dialogsAll.map((d) => d.look),
    ...at.flatMap((v) => v.popovers.map((p) => p.look)),
  ];
  const errors = [
    ...dialogsAll.filter((d) => d.error),
    ...at.flatMap((v) => v.popovers.filter((p) => p.error)),
  ];
  return {
    diffs: [],
    extraLosses: [],
    flags: {
      overlaysOpaque:
        errors.length === 0 && looks.every((l) => l && l.alpha >= 0.95),
      noTeal: looks.every((l) => l && l.teals.length === 0),
      primaryPills: dialogsAll.every((d) =>
        (d.look?.primaries ?? []).every((p) => p.pill && p.contrast >= 4.5),
      ),
      designFloors:
        dialogsAll.every((d) => d.floors && d.floors.length === 0) &&
        at.every((v) => v.popovers.every((p) => !p.floors?.length)) &&
        at.every((v) => v.pageFloors.length === 0),
      focusTrapped: dialogsAll.every((d) => d.focusStarts && d.trapped),
      escapeCloses: dialogsAll.every((d) => d.closed && d.focusBack !== false),
      dialogHostAnswers: at.every(
        (v) => v.host.shown && v.host.answer === false,
      ),
      noNativeDialogs: at.every((v) => v.nativeDialogs === 0),
    },
    checks: at.map((v) => ({
      viewport: `${v.viewport.width}x${v.viewport.height}`,
      dialogs: v.dialogs.map((d) => ({
        name: d.name,
        ...(d.error ? { error: d.error } : {}),
        alpha: d.look?.alpha,
        teals: d.look?.teals,
        primaries: d.look?.primaries?.map(
          (p) => `${p.text} ${p.contrast}:1${p.pill ? '' : ' not a pill'}`,
        ),
        floors: d.floors?.map((f) =>
          f.kind === 'text'
            ? `text ${f.size}px “${f.text}”`
            : `target ${f.width}×${f.height} “${f.text}”`,
        ),
        focus: `${d.focusStarts ? 'inside' : 'outside'}${d.trapped ? ', trapped' : ', escaped on Tab'}`,
        escape: `${d.closed ? 'closed' : 'stayed open'}${d.focusBack === undefined ? '' : d.focusBack ? ', focus back' : ', focus lost'}`,
      })),
      popovers: v.popovers.map((p) => ({
        name: p.name,
        ...(p.error ? { error: p.error } : {}),
        alpha: p.look?.alpha,
        teals: p.look?.teals,
        ...(p.floors?.length ? { floors: p.floors } : {}),
      })),
      host: v.host,
      pageFloors: v.pageFloors,
      nativeDialogs: v.nativeDialogs,
    })),
  };
}

export const scenarios = (kit) => [
  {
    group: 'R28',
    key: '',
    id: 'R28-overlays',
    title:
      'Every dialog, menu and popover at 1366×655 and 1440×787: opaque, no teal, white-pill primaries, the design floors, focus and Escape',
    run: (run) => overlays(kit, run),
  },
];
