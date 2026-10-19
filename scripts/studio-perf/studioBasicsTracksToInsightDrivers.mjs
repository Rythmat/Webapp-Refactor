/* eslint-env node */
/**
 * Step drivers for Studio Basics 1 to 5 (Your Tracks, Add a Track, Record,
 * The Piano Roll, Insight), in the shape lessonDrivers.mjs describes: what a
 * student does on each step's turn, through the real UI of the Stage B
 * shell, with a fallback through the store. lessonDrivers.mjs's driverFor
 * reads these after its own DRIVERS. They are written for the course's song
 * ("Studio Basics Song": Melody, Chords, Bass, Drums), which a cold start
 * opens; the steps that point at the bottom track or the chosen one find it
 * in the page.
 *
 * The piano roll's drags (move a note, change its length) go through the
 * store, as the walkthrough does for every drag; a note is drawn with a
 * real click, and the recording plays real keys with Typing on.
 */

const anchor = (id) => `[data-tutorial-id="${id}"]`;

const NEXT = {
  how: 'next',
  describe: "the coach card's Next button",
  run: (ctx) => ctx.next(),
};

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

/** In the page: the place of the bottom track, or of the chosen one. */
const lastIndexInPage = () => window.__MA_STORE__.getState().tracks.length - 1;
const selectedIndexInPage = () => {
  const s = window.__MA_STORE__.getState();
  return s.tracks.findIndex((t) => t.id === s.selectedTrackId);
};

/** In the page: toggle switch `action` (toggleMute …) on track `i`. */
function toggleInPage([action, i]) {
  const s = window.__MA_STORE__.getState();
  s[action](s.tracks[i].id);
}

/** A track switch (M, S, Arm) on track `which` ('bottom' or an index). */
function trackSwitch(kind, action, which) {
  return {
    how: 'click',
    describe: `click track-${kind}-${which}`,
    async run(ctx) {
      const i = which === 'bottom' ? await ctx.read(lastIndexInPage) : which;
      await ctx.clickAnchor(`track-${kind}-${i}`);
    },
    async fallback(ctx) {
      const i = which === 'bottom' ? await ctx.read(lastIndexInPage) : which;
      await ctx.act(`${action} on track ${i}`, toggleInPage, [action, i]);
    },
  };
}

/** In the page: track `i` plays GM program `program`. */
function soundfontInPage([i, program]) {
  const s = window.__MA_STORE__.getState();
  s.updateTrack(s.tracks[i].id, {
    instrument: 'soundfont',
    gmProgram: program,
  });
}

/**
 * The chosen track's instrument from `opener` (the dock's instrument
 * button, or the row's ⋯ ▸ Instrument…), then a family and an instrument.
 */
function pickInstrument(opener, family, id, program) {
  const steps =
    opener === 'dock'
      ? ['dock-instrument']
      : ['track-menu-button', 'track-menu-change-instrument'];
  return {
    how: 'click',
    describe: `click ${steps.join(', ')}, instrument-family-${family}, instrument-${id}`,
    async run(ctx) {
      for (const step of steps) await ctx.clickAnchor(step);
      await ctx.clickAnchor(`instrument-family-${family}`);
      await ctx.clickAnchor(`instrument-${id}`);
    },
    async fallback(ctx) {
      const i = await ctx.read(selectedIndexInPage);
      await ctx.act(`track ${i} plays GM ${program}`, soundfontInPage, [
        i,
        program,
      ]);
    },
  };
}

/** Monitor input on the chosen track, from its row's ⋯ menu. */
const MONITOR_CHOSEN = {
  how: 'click',
  describe: 'click track-menu-button, then track-menu-monitor',
  async run(ctx) {
    await ctx.clickAnchor('track-menu-button');
    await ctx.clickAnchor('track-menu-monitor');
  },
  fallback: storeSet('Monitor input on the chosen track', () => {
    const s = window.__MA_STORE__.getState();
    const t = s.tracks.find((tr) => tr.id === s.selectedTrackId);
    if (t && !t.monitoring) s.toggleMonitoring(t.id);
  }),
};

/** Row `i`'s ⋯ button (only the chosen row's carries the anchor). */
const rowMenuButton = (ctx, i) =>
  ctx.page
    .locator(`${anchor(`track-header-${i}`)} [data-testid="track-menu-button"]`)
    .first();

/** In the page: arm only the chosen track (others off). */
function armOnlySelectedInPage() {
  const s = window.__MA_STORE__.getState();
  for (const t of s.tracks) {
    const want = t.id === s.selectedTrackId;
    if (t.recordArmed !== want) s.toggleRecordArm(t.id);
  }
}

/** In the page: Monitor input on the armed track only. */
function monitorOnlyArmedInPage() {
  const s = window.__MA_STORE__.getState();
  const target = s.tracks.find((t) => t.recordArmed && t.type === 'midi');
  for (const t of s.tracks) {
    if (t.type !== 'midi') continue;
    if (t.monitoring !== (t.id === target?.id)) s.toggleMonitoring(t.id);
  }
}

/**
 * In the page: a note edit on the clip Notes shows (the chosen track's
 * chosen clip, else its first).
 */
function editShownClipInPage(kind) {
  const s = window.__MA_STORE__.getState();
  const track = s.tracks.find((t) => t.id === s.selectedTrackId);
  const clip =
    track.midiClips.find((c) => c.id === s.selectedClipId) ??
    track.midiClips[0];
  const events = clip.events.map((e, i) => {
    if (i !== 0) return e;
    if (kind === 'move') return { ...e, startTick: e.startTick + 240 };
    if (kind === 'resize')
      return { ...e, durationTicks: e.durationTicks + 240 };
    return e;
  });
  if (kind === 'add') {
    events.push({
      note: 40,
      velocity: 100,
      startTick: clip.startTick,
      durationTicks: 480,
      channel: 0,
    });
  }
  s.updateMidiClipEvents(
    track.id,
    clip.id,
    kind === 'delete' ? events.slice(1) : events,
  );
}

function editNotes(kind, describe) {
  return {
    how: 'store',
    describe,
    run: (ctx) => ctx.act(describe, editShownClipInPage, kind),
  };
}

/** In the page: add every note of track `i` to the note selection. */
function pickTrackInPage(i) {
  const s = window.__MA_STORE__.getState();
  const track = s.tracks[i];
  s.setSelectedNotes([
    ...s.selectedNotes.filter((pick) => pick.trackId !== track.id),
    ...track.midiClips.map((clip) => ({
      trackId: track.id,
      clipId: clip.id,
      noteIndices: clip.events.map((_, n) => n),
    })),
  ]);
}

export const TRACKS_TO_INSIGHT_DRIVERS = {
  'studio-basics-your-tracks': {
    'select-track': click(
      'track-name-1',
      storeSet('select track 1', () => {
        const s = window.__MA_STORE__.getState();
        s.setSelectedTrackId(s.tracks[1].id);
      }),
    ),
    'change-instrument': pickInstrument('dock', 'brass', 'trumpet', 56),
    mute: trackSwitch('mute', 'toggleMute', 1),
    unmute: trackSwitch('mute', 'toggleMute', 1),
    solo: trackSwitch('solo', 'toggleSolo', 1),
    unsolo: trackSwitch('solo', 'toggleSolo', 1),
    arm: trackSwitch('arm', 'toggleRecordArm', 1),
    monitor: MONITOR_CHOSEN,
    'wrap-up': NEXT,
  },
  'studio-basics-add-a-track': {
    'add-track': {
      how: 'click',
      describe:
        'click add-track-button, add-track-soundfont, instrument-family-woodwinds, instrument-flute',
      async run(ctx) {
        await ctx.clickAnchor('add-track-button');
        await ctx.clickAnchor('add-track-soundfont');
        await ctx.clickAnchor('instrument-family-woodwinds');
        await ctx.clickAnchor('instrument-flute');
      },
      fallback: storeSet('add a Flute track', () => {
        const s = window.__MA_STORE__.getState();
        const id = s.addTrack('midi', 'soundfont', 'Flute');
        s.updateTrack(id, { gmProgram: 73 });
        s.setSelectedTrackId(id);
      }),
    },
    'new-sound': pickInstrument('menu', 'woodwinds', 'clarinet', 71),
    mute: trackSwitch('mute', 'toggleMute', 'bottom'),
    unmute: trackSwitch('mute', 'toggleMute', 'bottom'),
    solo: trackSwitch('solo', 'toggleSolo', 'bottom'),
    unsolo: trackSwitch('solo', 'toggleSolo', 'bottom'),
    arm: trackSwitch('arm', 'toggleRecordArm', 'bottom'),
    monitor: MONITOR_CHOSEN,
    'wrap-up': NEXT,
  },
  'studio-basics-record': {
    'click-on': click(
      'metronome-toggle',
      storeSet('toggleMetronome', () =>
        window.__MA_STORE__.getState().toggleMetronome(),
      ),
    ),
    'click-off': click(
      'metronome-toggle',
      storeSet('toggleMetronome', () =>
        window.__MA_STORE__.getState().toggleMetronome(),
      ),
    ),
    'count-in': {
      how: 'click',
      describe: 'click count-in-menu, then count-in-1, then Escape',
      async run(ctx) {
        await ctx.clickAnchor('count-in-menu');
        await ctx.clickAnchor('count-in-1');
        // The settings stay open on a choice; Esc closes them.
        await ctx.press('Escape', 'Escape closes the Click settings');
      },
      fallback: storeSet('setCountInBars(1)', () =>
        window.__MA_STORE__.getState().setCountInBars(1),
      ),
    },
    'choose-track': {
      how: 'click',
      describe:
        "click track-name-1 if the drums are chosen, then the chosen track's track-arm-* if it is off, and every other armed track's",
      async run(ctx) {
        const drums = await ctx.read(() => {
          const s = window.__MA_STORE__.getState();
          const t = s.tracks.find((tr) => tr.id === s.selectedTrackId);
          return !t || t.instrument === 'drum-machine';
        });
        if (drums) await ctx.clickAnchor('track-name-1');
        const plan = await ctx.read(() => {
          const s = window.__MA_STORE__.getState();
          const sel = s.tracks.findIndex((t) => t.id === s.selectedTrackId);
          return s.tracks.flatMap((t, i) =>
            (i === sel) !== t.recordArmed ? [i] : [],
          );
        });
        for (const i of plan) await ctx.clickAnchor(`track-arm-${i}`);
      },
      fallback: storeSet('arm only the chosen track', armOnlySelectedInPage),
    },
    monitor: {
      how: 'click',
      describe:
        "Monitor input from each row's ⋯ menu: on for the armed track, off for the others",
      async run(ctx) {
        const plan = await ctx.read(() => {
          const s = window.__MA_STORE__.getState();
          const rec = s.tracks.findIndex(
            (t) => t.recordArmed && t.type === 'midi',
          );
          return s.tracks.flatMap((t, i) =>
            t.type === 'midi' && t.monitoring !== (i === rec) ? [i] : [],
          );
        });
        for (const i of plan) {
          await ctx.click(rowMenuButton(ctx, i), `track ${i}'s ⋯`);
          await ctx.clickAnchor('track-menu-monitor');
        }
      },
      fallback: storeSet(
        'Monitor input on the armed track only',
        monitorOnlyArmedInPage,
      ),
    },
    'play-notes': {
      how: 'click',
      describe: 'click top-bar-more, top-bar-more-typing, then press A, S, D',
      async run(ctx) {
        await ctx.clickAnchor('top-bar-more');
        await ctx.clickAnchor('top-bar-more-typing');
        for (const key of ['a', 's', 'd']) await ctx.press(key, key);
      },
      fallback: storeSet('hwNoteOn(60)', () =>
        window.__MA_STORE__.getState().hwNoteOn(60),
      ),
    },
    record: click(
      'transport-record',
      storeSet('record()', () => window.__MA_STORE__.getState().record()),
    ),
    stop: {
      how: 'click',
      describe:
        'once recording, press A S D F G (Typing is on), then click transport-play (Pause)',
      advanceTimeoutMs: 20_000,
      async run(ctx) {
        await ctx.waitFor(
          'recording',
          () => window.__MA_STORE__.getState().isRecording,
          undefined,
          10_000,
        );
        for (const key of ['a', 's', 'd', 'f', 'g']) {
          await ctx.page.keyboard.down(key);
          await ctx.page.waitForTimeout(200);
          await ctx.page.keyboard.up(key);
        }
        await ctx.clickAnchor('transport-play');
      },
      fallback: storeSet('a take on the armed track, then pause()', () => {
        const s = window.__MA_STORE__.getState();
        const t = s.tracks.find((tr) => tr.recordArmed && tr.type === 'midi');
        if (t) {
          s.addMidiClip(t.id, {
            id: `take-driver-${crypto.randomUUID().slice(0, 8)}`,
            startTick: 0,
            events: [
              {
                note: 60,
                velocity: 100,
                startTick: 0,
                durationTicks: 240,
                channel: 0,
              },
            ],
          });
        }
        s.pause();
      }),
    },
    'wrap-up': {
      ...NEXT,
      describe:
        "click musical-typing (Typing off) if it shows, then the coach card's Next",
      async run(ctx) {
        const pill = ctx.page.locator(anchor('musical-typing')).first();
        if (await pill.isVisible().catch(() => false)) {
          await ctx.clickAnchor('musical-typing');
        }
        await ctx.next();
      },
    },
  },
  'studio-basics-piano-roll': {
    'choose-clip': {
      how: 'click',
      describe: 'click the canvas at timeline-clip-1-0',
      async run(ctx) {
        const box = await ctx.page
          .locator(anchor('timeline-clip-1-0'))
          .first()
          .boundingBox();
        if (!box) throw new Error('timeline-clip-1-0 has no box');
        await ctx.page.mouse.click(
          box.x + box.width * 0.3,
          box.y + box.height / 2,
        );
      },
      fallback: storeSet("choose track 1's first clip", () => {
        const s = window.__MA_STORE__.getState();
        const t = s.tracks[1];
        s.setSelectedTrackId(t.id);
        s.setSelectedClip(t.midiClips[0].id, t.id);
      }),
    },
    'open-notes': click(
      'chanstrip-tab-piano-roll',
      storeSet("setChannelStripTab('piano-roll')", () =>
        window.__MA_STORE__.getState().setChannelStripTab('piano-roll'),
      ),
    ),
    maximize: click(
      'dock-maximize',
      storeSet('setDockMaximized(true)', () =>
        window.__MA_STORE__.getState().setDockMaximized(true),
      ),
    ),
    'add-note': {
      how: 'click',
      describe:
        'click piano-roll-tool-draw, then the grid near its bottom left (under the notes)',
      async run(ctx) {
        await ctx.clickAnchor('piano-roll-tool-draw');
        const grid = ctx.page.locator(anchor('piano-roll-grid')).first();
        const box = await grid.boundingBox();
        if (!box) throw new Error('piano-roll-grid has no box');
        // The grid scrolls its canvas: the spot is in the grid's own box.
        await ctx.clickAt(
          grid,
          70 / box.width,
          (box.height - 20) / box.height,
          'an empty spot in the grid',
        );
      },
      fallback: (ctx) =>
        ctx.act('a note in the shown clip', editShownClipInPage, 'add'),
    },
    'move-note': editNotes('move', "the shown clip's first note an 8th later"),
    'resize-note': editNotes(
      'resize',
      "the shown clip's first note an 8th longer",
    ),
    'delete-note': editNotes('delete', "the shown clip's first note deleted"),
    close: click(
      'dock-toggle',
      storeSet('setChannelStripTab(null)', () =>
        window.__MA_STORE__.getState().setChannelStripTab(null),
      ),
    ),
    'wrap-up': NEXT,
  },
  'studio-basics-insight': {
    'open-insight': click(
      'rail-insight',
      storeSet("toggleInspectorPanel('insight')", () =>
        window.__MA_STORE__.getState().toggleInspectorPanel('insight'),
      ),
    ),
    'pick-chords': click(
      'insight-track-1',
      storeSet("pick track 1's notes", pickTrackInPage, 1),
    ),
    'pick-bass': click(
      'insight-track-2',
      storeSet("pick track 2's notes", pickTrackInPage, 2),
    ),
    analyze: click(
      'insight-analyze',
      storeSet('analyzeNoteSelection', () => {
        const s = window.__MA_STORE__.getState();
        s.analyzeNoteSelection(s.selectedNotes);
      }),
    ),
    'read-chords': NEXT,
    'wrap-up': NEXT,
  },
};
