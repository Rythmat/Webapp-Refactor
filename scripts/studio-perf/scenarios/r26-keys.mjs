/* eslint-env node */
/**
 * R26 keyboard (milestone 1.6, the command registry; fast), in a real
 * browser with real key presses:
 *
 * - deleteInScoreKeepsClip: Delete in the Score, with a clip left selected
 *   in Create, keeps the clip (in Create the same key deletes it).
 * - altRInLeadSheet: ⌥R in the lead sheet neither records nor counts in.
 * - typingKeepsTransport: with the computer keyboard on, L plays a D (the
 *   key lights) and neither L nor M toggles loop or metronome; with it off,
 *   L toggles the loop again.
 * - recordGuardBothWays: R over an existing take asks first, from the key
 *   and from the Record button.
 * - sheetListsCommands: '?' opens the shortcut sheet listing the commands,
 *   every scope's heading among them, and Escape closes it without stopping
 *   anything.
 * - pageZoomFree: ⌘/Ctrl with = and − reach the browser (not prevented) and
 *   leave the timeline's zoom; ⌥= zooms the timeline.
 * - typingChipFits: the computer-keyboard chip is in the TopRail at
 *   1366×655, 1440×787 and 1280×720, on and off: unclipped, at least 24 px
 *   high, Glacial at 12 px or more, no teal or brand yellow.
 * - noticeOnce: a student new to 1.6 gets the "shortcuts changed" notice
 *   once, and not again after a reload.
 */
import { MOD } from './_shared.mjs';

export const flags = {
  deleteInScoreKeepsClip: {
    goal: true,
    text: 'Delete in the Score kept the clip selected in Create',
  },
  altRInLeadSheet: {
    goal: true,
    text: '⌥R in the lead sheet did not record',
  },
  typingKeepsTransport: {
    goal: true,
    text: 'playing the computer keyboard never toggled loop or metronome',
  },
  recordGuardBothWays: {
    goal: true,
    text: 'R and the Record button both asked before recording over a take',
  },
  sheetListsCommands: {
    goal: true,
    text: '? opened the shortcut sheet with every scope’s commands',
  },
  pageZoomFree: {
    goal: true,
    text: '⌘/Ctrl +/− were left to the browser; ⌥= zoomed the timeline',
  },
  typingChipFits: {
    goal: true,
    text: 'the computer-keyboard chip fit the TopRail at every window size',
  },
  noticeOnce: {
    goal: true,
    text: 'the shortcuts notice showed once, and not after a reload',
  },
};

const SLOT = '[data-slot="toprail-leading"]';
const CHIP = '[data-testid="musical-typing-chip"]';

const VIEWPORTS = [
  { width: 1366, height: 655 },
  { width: 1440, height: 787 },
  { width: 1280, height: 720 },
];

/** In-page: the chip measured (size, clipping, type, off colours). */
function measureTypingChip({ slot, chip }) {
  const el = document.querySelector(`${slot} ${chip}`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const off = (css) => {
    const m = /rgba?\(([^)]+)\)/.exec(css ?? '');
    if (!m) return null;
    const [r, g, b, a = 1] = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    if (a === 0) return null;
    if (g > r + 60 && b > r + 40) return `teal ${css}`;
    if (r > b + 100 && g > b + 80 && Math.abs(r - g) < 60)
      return `yellow ${css}`;
    return null;
  };
  const colours = [];
  const fonts = [];
  for (const node of [el, ...el.querySelectorAll('*')]) {
    const cs = getComputedStyle(node);
    for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
      const bad = off(cs[prop]);
      if (bad) colours.push(`${prop} ${bad}`);
    }
    const text = [...node.childNodes].some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
    );
    if (text) {
      fonts.push({
        size: parseFloat(cs.fontSize),
        glacial: /Glacial/i.test(cs.fontFamily),
      });
    }
  }
  return {
    text: el.textContent.trim(),
    pressed: el.getAttribute('aria-pressed'),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    onScreen:
      rect.width > 0 &&
      rect.right <= innerWidth + 1 &&
      rect.bottom <= innerHeight &&
      rect.top >= 0,
    clipped: el.scrollWidth > el.clientWidth + 1,
    fonts,
    colours,
  };
}

/** Runs `fn` on the editor store's state in the page. */
const store = (page, fn, arg) => page.evaluate(fn, arg);

const setView = (page, view) =>
  page.evaluate((v) => window.__MA_STORE__.getState().setCurrentView(v), view);

const blur = (page) =>
  page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

async function keysIn(kit, run) {
  return kit.withSession(run, '?new=1', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 655 });
    await kit.sleep(300);
    const checks = {};

    // A MIDI clip, selected in Create.
    await store(page, () => {
      const st = window.__MA_STORE__.getState();
      const id = st.addTrack('midi', 'piano-sampler', 'Keys R26');
      st.addMidiClip(id, {
        id: 'r26-clip',
        startTick: 0,
        durationTicks: 1920,
        events: [
          {
            id: 'n1',
            note: 60,
            velocity: 90,
            startTick: 0,
            durationTicks: 480,
            channel: 0,
          },
        ],
      });
      st.setSelectedTrackId(id);
      st.setSelectedClip('r26-clip', id);
    });
    const hasClip = () =>
      store(page, () =>
        window.__MA_STORE__
          .getState()
          .tracks.some((t) => t.midiClips.some((c) => c.id === 'r26-clip')),
      );

    // Delete in the Score.
    await setView(page, 'score');
    await kit.sleep(500);
    await blur(page);
    await page.keyboard.press('Delete');
    await page.keyboard.press('Backspace');
    await kit.sleep(200);
    const keptInScore = await hasClip();
    await setView(page, 'arrange');
    await kit.sleep(500);
    await blur(page);
    await page.keyboard.press('Delete');
    await kit.sleep(200);
    const deletedInCreate = !(await hasClip());
    await page.keyboard.press(`${MOD}+KeyZ`);
    await kit.sleep(300);
    checks.delete = { keptInScore, deletedInCreate };

    // ⌥R in the lead sheet.
    await setView(page, 'leadsheet');
    await kit.sleep(500);
    await blur(page);
    await page.keyboard.press('Alt+KeyR');
    await kit.sleep(300);
    checks.altR = await store(page, () => {
      const st = window.__MA_STORE__.getState();
      return { recording: st.isRecording, countingIn: st.isCountingIn };
    });
    await store(page, () => window.__MA_STORE__.getState().stop());
    await setView(page, 'arrange');
    await kit.sleep(400);

    // The computer keyboard.
    const transport = () =>
      store(page, () => {
        const st = window.__MA_STORE__.getState();
        return {
          loop: st.loopEnabled,
          metronome: st.metronomeEnabled,
          lit: [...st.hwActiveNotes],
        };
      });
    const before = await transport();
    await page.click(`${SLOT} ${CHIP}`);
    await blur(page);
    await page.keyboard.down('KeyL');
    await kit.sleep(100);
    const held = await transport();
    await page.keyboard.up('KeyL');
    await page.keyboard.press('KeyM');
    await kit.sleep(100);
    const playing = await transport();
    await page.keyboard.press('Backquote');
    await kit.sleep(100);
    const chipOff = await page.evaluate(
      (sel) => document.querySelector(sel)?.getAttribute('aria-pressed'),
      `${SLOT} ${CHIP}`,
    );
    await page.keyboard.press('KeyL');
    await kit.sleep(100);
    const off = await transport();
    await page.keyboard.press('KeyL');
    checks.typing = { before, held, playing, chipOff, off };

    // R and the Record button over a take.
    await store(page, () => {
      const st = window.__MA_STORE__.getState();
      const id = st.addTrack('audio', 'vocal-fx', 'Vox R26');
      st.addAudioClip(id, {
        id: 'r26-take',
        startTick: 0,
        duration: 3840,
        fadeInTicks: 0,
        fadeOutTicks: 0,
      });
      // Only this track armed: the guard asks about the first armed one.
      for (const t of window.__MA_STORE__.getState().tracks) {
        st.updateTrack(t.id, { recordArmed: t.id === id });
      }
      st.setPosition(960);
    });
    await kit.sleep(300);
    const guardShown = () =>
      page
        .getByText('Overwrite existing recording?')
        .first()
        .isVisible()
        .catch(() => false);
    await blur(page);
    await page.keyboard.press('KeyR');
    await kit.sleep(400);
    const fromKey = await guardShown();
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await kit.sleep(300);
    await page.click('button[title="Record"]');
    await kit.sleep(400);
    const fromButton = await guardShown();
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await kit.sleep(300);
    checks.guard = {
      fromKey,
      fromButton,
      recording: await store(
        page,
        () => window.__MA_STORE__.getState().isRecording,
      ),
    };
    await store(page, () => {
      const st = window.__MA_STORE__.getState();
      const t = st.tracks.find((x) => x.name === 'Vox R26');
      if (t) st.updateTrack(t.id, { recordArmed: false });
    });

    // The '?' sheet.
    await blur(page);
    await page.keyboard.press('Shift+Slash');
    await kit.sleep(500);
    checks.sheet = await page.evaluate(() => {
      const dialog = [...document.querySelectorAll('[role="dialog"]')].find(
        (d) => /Keyboard shortcuts/.test(d.textContent ?? ''),
      );
      if (!dialog) return null;
      return {
        rows: dialog.querySelectorAll('li').length,
        headings: [...dialog.querySelectorAll('h3')].map((h) =>
          h.textContent.trim(),
        ),
        has: [
          'Play / Pause',
          'Delete the selected clip',
          'Write rests',
          'Add a chord symbol',
          'Octave up',
          'Single-key shortcuts',
        ].filter((t) => dialog.textContent.includes(t)),
      };
    });
    await page.keyboard.press('Escape');
    await kit.sleep(400);
    checks.sheetClosed = await page.evaluate(
      () =>
        ![...document.querySelectorAll('[role="dialog"]')].some((d) =>
          /Keyboard shortcuts/.test(d.textContent ?? ''),
        ),
    );

    // Page zoom stays the browser's.
    await page.evaluate(() => {
      window.__r26Zoom = [];
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Equal' || e.code === 'Minus') {
          window.__r26Zoom.push({
            alt: e.altKey,
            prevented: e.defaultPrevented,
          });
        }
      });
    });
    const zoomNow = () =>
      store(page, () => window.__MA_STORE__.getState().timelineZoom);
    const zoomBefore = await zoomNow();
    await blur(page);
    await page.keyboard.press(`${MOD}+Equal`);
    await page.keyboard.press(`${MOD}+Minus`);
    await kit.sleep(200);
    const zoomAfterMod = await zoomNow();
    await page.keyboard.press('Alt+Equal');
    await kit.sleep(200);
    const zoomAfterAlt = await zoomNow();
    checks.zoom = {
      zoomBefore,
      zoomAfterMod,
      zoomAfterAlt,
      events: await page.evaluate(() => window.__r26Zoom),
    };

    // The chip at every window size, off and on.
    const chips = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await kit.sleep(300);
      for (const on of [false, true]) {
        const pressed = await page.evaluate(
          (sel) => document.querySelector(sel)?.getAttribute('aria-pressed'),
          `${SLOT} ${CHIP}`,
        );
        if ((pressed === 'true') !== on) await page.click(`${SLOT} ${CHIP}`);
        await kit.sleep(150);
        chips.push({
          viewport: `${viewport.width}x${viewport.height}`,
          on,
          ...(await page.evaluate(measureTypingChip, {
            slot: SLOT,
            chip: CHIP,
          })),
        });
      }
      await page.click(`${SLOT} ${CHIP}`);
    }
    checks.chips = chips;
    return checks;
  });
}

async function noticeIn(kit, run) {
  const session = await kit.openEditorContext(run, '?new=1', run.api, {
    shortcutsNotice: true,
  });
  try {
    const { page } = session;
    const first = await kit.waitForToast(page, {
      match: /Keyboard shortcuts now follow/,
      timeout: 8000,
    });
    await page.reload();
    await kit.waitForEditor(page);
    await kit.sleep(4000);
    const again = (await kit.readToasts(page)).filter((t) =>
      /Keyboard shortcuts now follow/.test(t.text),
    );
    return { first: first?.text ?? null, again: again.length };
  } finally {
    await session.context.close();
  }
}

async function keys(kit, run) {
  const k = await keysIn(kit, run);
  const notice = await noticeIn(kit, run);
  const t = k.typing;
  const chipOk = (c) =>
    c.onScreen &&
    !c.clipped &&
    c.height >= 24 &&
    c.width >= 24 &&
    c.fonts.every((f) => f.size >= 12 && f.glacial) &&
    c.colours.length === 0 &&
    c.pressed === String(c.on);
  return {
    diffs: [],
    extraLosses: [],
    flags: {
      deleteInScoreKeepsClip: k.delete.keptInScore && k.delete.deletedInCreate,
      altRInLeadSheet: !k.altR.recording && !k.altR.countingIn,
      typingKeepsTransport:
        t.held.lit.includes(74) &&
        t.playing.loop === t.before.loop &&
        t.playing.metronome === t.before.metronome &&
        t.chipOff === 'false' &&
        t.off.loop !== t.before.loop,
      recordGuardBothWays:
        k.guard.fromKey && k.guard.fromButton && !k.guard.recording,
      sheetListsCommands:
        !!k.sheet &&
        k.sheet.rows >= 40 &&
        k.sheet.has.length === 6 &&
        k.sheetClosed,
      pageZoomFree:
        k.zoom.zoomAfterMod === k.zoom.zoomBefore &&
        k.zoom.zoomAfterAlt > k.zoom.zoomBefore &&
        k.zoom.events.filter((e) => !e.alt).every((e) => !e.prevented),
      typingChipFits:
        k.chips.length === VIEWPORTS.length * 2 && k.chips.every(chipOk),
      noticeOnce: notice.first !== null && notice.again === 0,
    },
    checks: { ...k, notice },
  };
}

export const scenarios = (kit) => [
  {
    group: 'R26',
    key: '',
    id: 'R26-keys',
    title:
      'Keys stay where the student works: Score, lead sheet, musical typing, R, ?, page zoom',
    run: (run) => keys(kit, run),
  },
];
