/* eslint-env node */
/**
 * Step drivers for Studio Basics 6 to 9 (The Score, The Lead Sheet, Loop and
 * Repeat, Save and Export), in the shape lessonDrivers.mjs describes: what a
 * student does on each step's turn, through the real UI, with a fallback
 * through the store. lessonDrivers.mjs's driverFor reads these after its own
 * DRIVERS. They are written for the course's song ("Studio Basics Song":
 * Melody, Chords, Bass, Drums, a chord a bar), which a cold start opens.
 *
 * Print is stubbed in the page before a Print step's click, so no print
 * dialog blocks the run; the step checks the done moment the click counts.
 */

const anchor = (id) => `[data-tutorial-id="${id}"]`;

const NEXT = {
  how: 'next',
  describe: "the coach card's Next button",
  run: (ctx) => ctx.next(),
};

/** The center of an anchor's box (the timeline's are boxes over its canvas). */
async function boxOf(ctx, id) {
  const box = await ctx.page.locator(anchor(id)).first().boundingBox();
  if (!box) throw new Error(`${id} has no box`);
  return box;
}

/** A real right-click at the center of an anchor, then a click on a menu item. */
function rightClickThen(id, item, describe, fallback) {
  return {
    how: 'click',
    describe,
    async run(ctx) {
      const box = await boxOf(ctx, id);
      await ctx.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2,
        { button: 'right' },
      );
      await ctx.clickAnchor(item);
    },
    fallback,
  };
}

/** The store's own setter, as a fallback for a click. */
const storeSet = (label, fn, arg) => (ctx) => ctx.act(label, fn, arg);

function click(id, fallback) {
  return {
    how: 'click',
    describe: `click ${id}`,
    run: (ctx) => ctx.clickAnchor(id),
    fallback,
  };
}

/** Print with the dialog stubbed: the click still counts its done moment. */
function print(id, moment) {
  return {
    how: 'click',
    describe: `click ${id} (window.print stubbed)`,
    async run(ctx) {
      await ctx.act('stub window.print', () => {
        window.print = () => {};
      });
      await ctx.clickAnchor(id);
    },
    fallback: storeSet(
      `markDone(${moment})`,
      (m) => window.__MA_STORE__.getState().markDone(m),
      moment,
    ),
  };
}

/** A Project menu item. */
function projectMenu(id, moment) {
  return {
    how: 'click',
    describe: `click file-menu (Project), then ${id}`,
    advanceTimeoutMs: 60_000,
    async run(ctx) {
      await ctx.clickAnchor('file-menu');
      await ctx.clickAnchor(id);
    },
    fallback: storeSet(
      `markDone(${moment})`,
      (m) => window.__MA_STORE__.getState().markDone(m),
      moment,
    ),
  };
}

/** A copy of track `t`'s first clip, `at` ticks in (a Duplicate, a Paste). */
function addClipCopyInPage([t, at]) {
  const s = window.__MA_STORE__.getState();
  const track = s.tracks[t];
  const clip = track.midiClips[0];
  s.addMidiClip(track.id, {
    ...structuredClone(clip),
    id: `clip-driver-${crypto.randomUUID().slice(0, 8)}`,
    startTick: at,
  });
}

export const SCORE_TO_SAVE_DRIVERS = {
  'studio-basics-score': {
    'open-score': click(
      'view-switch-score',
      storeSet('setCurrentView(score)', () =>
        window.__MA_STORE__.getState().setCurrentView('score'),
      ),
    ),
    'add-notes-on': click(
      'score-note-input',
      storeSet('setScoreNoteInput(true)', () =>
        window.__MA_STORE__.getState().setScoreNoteInput(true),
      ),
    ),
    'add-a-note': {
      how: 'click',
      describe:
        'move over score-sheet until the ghost note shows, then click there',
      async run(ctx) {
        const sheet = await boxOf(ctx, 'score-sheet');
        const x = sheet.x + sheet.width * 0.45;
        for (let y = sheet.y + 120; y < sheet.y + sheet.height - 10; y += 4) {
          await ctx.page.mouse.move(x, y);
          const ghost = await ctx.read(
            () => !!document.querySelector('[data-note-ghost]'),
          );
          if (ghost) {
            await ctx.page.mouse.click(x, y);
            return;
          }
        }
        ctx.problem('no ghost note anywhere on the sheet');
      },
      fallback: storeSet('a new note on the first track', () => {
        const s = window.__MA_STORE__.getState();
        const track = s.tracks[0];
        const clip = track.midiClips[0];
        s.updateMidiClipEvents(track.id, clip.id, [
          ...clip.events,
          { ...clip.events[0], id: crypto.randomUUID(), startTick: 7200 },
        ]);
      }),
    },
    'move-the-note': {
      how: 'key',
      describe: 'ArrowUp (the new note is selected)',
      run: (ctx) => ctx.press('ArrowUp', 'ArrowUp'),
      fallback: storeSet('the first note a step up', () => {
        const s = window.__MA_STORE__.getState();
        const track = s.tracks[0];
        const clip = track.midiClips[0];
        const [first, ...rest] = clip.events;
        s.updateMidiClipEvents(track.id, clip.id, [
          { ...first, note: first.note + 2 },
          ...rest,
        ]);
      }),
    },
    'add-notes-off': {
      how: 'key',
      describe: 'Escape',
      run: (ctx) => ctx.press('Escape', 'Escape'),
      fallback: storeSet('setScoreNoteInput(false)', () =>
        window.__MA_STORE__.getState().setScoreNoteInput(false),
      ),
    },
    print: print('score-print', 'printScore'),
    'wrap-up': NEXT,
  },
  'studio-basics-lead-sheet': {
    'open-lead-sheet': click(
      'view-switch-leadsheet',
      storeSet('setCurrentView(leadsheet)', () =>
        window.__MA_STORE__.getState().setCurrentView('leadsheet'),
      ),
    ),
    'melody-on': click(
      'leadsheet-melody-toggle',
      storeSet('setLeadSheetShowMelody(true)', () =>
        window.__MA_STORE__.getState().setLeadSheetShowMelody(true),
      ),
    ),
    'pick-melody-track': {
      how: 'click',
      describe:
        'click leadsheet-melody-picker, tick leadsheet-melody-track-0, Escape',
      async run(ctx) {
        await ctx.clickAnchor('leadsheet-melody-picker');
        await ctx.clickAnchor('leadsheet-melody-track-0');
        await ctx.press('Escape', 'Escape closes the picker');
      },
      fallback: storeSet('tick the first track', () => {
        const s = window.__MA_STORE__.getState();
        s.toggleLeadSheetMelodyTrack(s.tracks[0].id);
      }),
    },
    'melody-off': click(
      'leadsheet-melody-toggle',
      storeSet('setLeadSheetShowMelody(false)', () =>
        window.__MA_STORE__.getState().setLeadSheetShowMelody(false),
      ),
    ),
    'change-a-chord': {
      how: 'click',
      describe: 'double-click leadsheet-chord-2-0, type Dm, Enter',
      async run(ctx) {
        await ctx.page
          .locator(anchor('leadsheet-chord-2-0'))
          .first()
          .dblclick();
        await ctx.page
          .locator(anchor('leadsheet-chord-input'))
          .first()
          .waitFor();
        await ctx.page.keyboard.type('Dm');
        await ctx.press('Enter', 'Enter');
      },
      fallback: storeSet('rename bar 3’s chord Dm', () => {
        const s = window.__MA_STORE__.getState();
        s.renameChordRegion(s.chordRegions[2].id, '2 min', 'D min');
      }),
    },
    print: print('leadsheet-print', 'printLeadSheet'),
    'wrap-up': NEXT,
  },
  'studio-basics-loop-and-repeat': {
    'loop-on': click(
      'transport-loop',
      storeSet('setLoopEnabled(true)', () =>
        window.__MA_STORE__.getState().setLoopEnabled(true),
      ),
    ),
    'loop-shorter': {
      how: 'click',
      describe: 'drag loop-region’s right end half its length to the left',
      async run(ctx) {
        const loop = await boxOf(ctx, 'loop-region');
        const x = loop.x + loop.width - 1;
        const y = loop.y + loop.height / 2;
        await ctx.page.mouse.move(x, y);
        await ctx.page.mouse.down();
        await ctx.page.mouse.move(x - loop.width / 2, y, { steps: 12 });
        await ctx.page.mouse.up();
      },
      fallback: storeSet('setLoopRange to its first half', () => {
        const s = window.__MA_STORE__.getState();
        s.setLoopRange(
          s.loopStart,
          s.loopStart + (s.loopEnd - s.loopStart) / 2,
        );
      }),
    },
    'play-the-loop': {
      ...click(
        'transport-play',
        storeSet('play()', () => window.__MA_STORE__.getState().play()),
      ),
      // Stop again, as the student would, so the next steps aren't measured
      // during playback.
      after: (ctx) =>
        ctx.act('pause()', () => window.__MA_STORE__.getState().pause()),
    },
    // The bottom track's clip (the drums), which the step points at.
    'duplicate-a-clip': rightClickThen(
      'timeline-clip-3-0',
      'clip-menu-duplicate',
      'right-click timeline-clip-3-0, then clip-menu-duplicate',
      storeSet(
        'a copy of the drums’ clip at bar 5',
        addClipCopyInPage,
        [3, 7680],
      ),
    ),
    'copy-and-paste': {
      how: 'click',
      describe:
        'right-click timeline-clip-1-0, Copy; right-click right after it on its row, Paste Here',
      async run(ctx) {
        const clip = await boxOf(ctx, 'timeline-clip-1-0');
        const y = clip.y + clip.height / 2;
        await ctx.page.mouse.click(clip.x + clip.width / 2, y, {
          button: 'right',
        });
        await ctx.clickAnchor('clip-menu-copy');
        await ctx.page.mouse.click(clip.x + clip.width + 6, y, {
          button: 'right',
        });
        await ctx.clickAnchor('lane-menu-paste');
      },
      fallback: storeSet(
        'a copy of the chords’ clip at bar 5',
        addClipCopyInPage,
        [1, 7680],
      ),
    },
    'duplicate-a-track': rightClickThen(
      'track-header-1',
      'track-menu-duplicate',
      'right-click track-header-1, then track-menu-duplicate',
      storeSet('duplicateTrack(second track)', () => {
        const s = window.__MA_STORE__.getState();
        s.duplicateTrack(s.tracks[1].id);
      }),
    ),
    'wrap-up': NEXT,
  },
  'studio-basics-save-and-export': {
    save: projectMenu('file-save', 'save'),
    'export-midi': projectMenu('file-export-midi', 'exportMidi'),
    'export-musicxml': projectMenu('file-export-musicxml', 'exportMusicXml'),
    'export-audio': {
      how: 'click',
      describe:
        'click file-menu (Project), file-export-audio, then export-audio-run',
      // The offline render of the whole mix, on a throttled CPU.
      advanceTimeoutMs: 240_000,
      async run(ctx) {
        await ctx.clickAnchor('file-menu');
        await ctx.clickAnchor('file-export-audio', 'Export ▸ Audio…');
        await ctx.clickAnchor('export-audio-run', 'Export');
      },
      fallback: storeSet('markDone(exportAudio)', () =>
        window.__MA_STORE__.getState().markDone('exportAudio'),
      ),
    },
    'wrap-up': NEXT,
  },
};
