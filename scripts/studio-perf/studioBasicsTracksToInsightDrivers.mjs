/* eslint-env node */
/**
 * Step drivers for Studio Basics 1 to 5 (Your Tracks, Add a Track, Record,
 * The Piano Roll, Insight), in the shape lessonDrivers.mjs describes: what a
 * student does on each step's turn, through the real UI, with a fallback
 * through the store. lessonDrivers.mjs's driverFor reads these after its own
 * DRIVERS. They are written for the course's song ("Studio Basics Song":
 * Melody, Chords, Bass, Drums), which a cold start opens; the steps that
 * point at the bottom track or the selected one find it in the page.
 *
 * The piano roll's drags (move a note, change its length) go through the
 * store, as the walkthrough does for every drag; the recording plays real
 * keys with Typing on.
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

/** In the page: the place of the bottom track, or of the selected one. */
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

/** A track switch (M, S, Arm, MON) on track `which` ('bottom' or an index). */
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

/** The instrument button of track `which`, a family, then an instrument. */
function pickInstrument(which, family, id, program) {
  return {
    how: 'click',
    describe: `click track-instrument-${which}, instrument-family-${family}, instrument-${id}`,
    async run(ctx) {
      const i =
        which === 'bottom'
          ? await ctx.read(lastIndexInPage)
          : which === 'selected'
            ? await ctx.read(selectedIndexInPage)
            : which;
      await ctx.clickAnchor(`track-instrument-${i}`);
      if (family) await ctx.clickAnchor(`instrument-family-${family}`);
      await ctx.clickAnchor(`instrument-${id}`);
    },
    async fallback(ctx) {
      const i =
        which === 'bottom'
          ? await ctx.read(lastIndexInPage)
          : await ctx.read(selectedIndexInPage);
      await ctx.act(`track ${i} plays GM ${program}`, soundfontInPage, [
        i,
        program,
      ]);
    },
  };
}

/** In the page: a note edit on the open clip (or the first track's). */
function editOpenClipInPage(kind) {
  const s = window.__MA_STORE__.getState();
  const track =
    s.tracks.find((t) => t.id === s.editingClipTrackId) ?? s.tracks[0];
  const clip =
    track.midiClips.find((c) => c.id === s.editingClipId) ?? track.midiClips[0];
  const events = clip.events.map((e, i) => {
    if (i !== 0) return e;
    if (kind === 'move') return { ...e, startTick: e.startTick + 240 };
    if (kind === 'resize')
      return { ...e, durationTicks: e.durationTicks + 240 };
    return e;
  });
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
    run: (ctx) => ctx.act(describe, editOpenClipInPage, kind),
  };
}

/** In the page: arm only the selected track (others off). */
function armOnlySelectedInPage() {
  const s = window.__MA_STORE__.getState();
  for (const t of s.tracks) {
    const want = t.id === s.selectedTrackId;
    if (t.recordArmed !== want) s.toggleRecordArm(t.id);
  }
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
    'change-instrument': pickInstrument('selected', 'brass', 'trumpet', 56),
    mute: trackSwitch('mute', 'toggleMute', 1),
    unmute: trackSwitch('mute', 'toggleMute', 1),
    solo: trackSwitch('solo', 'toggleSolo', 1),
    unsolo: trackSwitch('solo', 'toggleSolo', 1),
    arm: trackSwitch('arm', 'toggleRecordArm', 1),
    monitor: trackSwitch('monitor', 'toggleMonitoring', 1),
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
    'new-sound': pickInstrument('bottom', null, 'clarinet', 71),
    mute: trackSwitch('mute', 'toggleMute', 'bottom'),
    unmute: trackSwitch('mute', 'toggleMute', 'bottom'),
    solo: trackSwitch('solo', 'toggleSolo', 'bottom'),
    unsolo: trackSwitch('solo', 'toggleSolo', 'bottom'),
    arm: trackSwitch('arm', 'toggleRecordArm', 'bottom'),
    monitor: trackSwitch('monitor', 'toggleMonitoring', 'bottom'),
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
      describe: 'click count-in-menu (or top-bar-more), then count-in-1',
      async run(ctx) {
        const caret = ctx.page.locator(anchor('count-in-menu')).first();
        if (await caret.isVisible().catch(() => false)) {
          await ctx.clickAnchor('count-in-menu');
        } else {
          await ctx.clickAnchor('top-bar-more');
        }
        await ctx.clickAnchor('count-in-1');
      },
      fallback: storeSet('setCountInBars(1)', () =>
        window.__MA_STORE__.getState().setCountInBars(1),
      ),
    },
    'choose-track': {
      how: 'click',
      describe:
        "click the selected track's track-arm-* if it is off, and every other armed track's",
      async run(ctx) {
        const plan = await ctx.read(() => {
          const s = window.__MA_STORE__.getState();
          const sel = s.tracks.findIndex((t) => t.id === s.selectedTrackId);
          return s.tracks.flatMap((t, i) =>
            (i === sel) !== t.recordArmed ? [i] : [],
          );
        });
        for (const i of plan) await ctx.clickAnchor(`track-arm-${i}`);
      },
      fallback: storeSet('arm only the selected track', armOnlySelectedInPage),
    },
    monitor: {
      how: 'click',
      describe: "click the selected track's track-monitor-* (if it is off)",
      async run(ctx) {
        const [i, on] = await ctx.read(() => {
          const s = window.__MA_STORE__.getState();
          const i = s.tracks.findIndex((t) => t.id === s.selectedTrackId);
          return [i, s.tracks[i]?.monitoring];
        });
        if (!on) await ctx.clickAnchor(`track-monitor-${i}`);
      },
      fallback: storeSet('MON on the selected track', () => {
        const s = window.__MA_STORE__.getState();
        const t = s.tracks.find((tr) => tr.id === s.selectedTrackId);
        if (t && !t.monitoring) s.toggleMonitoring(t.id);
      }),
    },
    'play-notes': {
      how: 'click',
      describe: 'click musical-typing, then press A, S and D',
      async run(ctx) {
        await ctx.clickAnchor('musical-typing');
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
        'once recording, press A S D F G (Typing is on), then click transport-stop',
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
        await ctx.clickAnchor('transport-stop');
      },
      fallback: storeSet('a take on the armed track, then stop()', () => {
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
        s.stop();
      }),
    },
    'wrap-up': {
      ...NEXT,
      describe: "click musical-typing (Typing off), then the coach card's Next",
      async run(ctx) {
        await ctx.clickAnchor('musical-typing');
        await ctx.next();
      },
    },
  },
  'studio-basics-piano-roll': {
    open: {
      how: 'click',
      describe: 'double-click the canvas at timeline-clip-1-0',
      async run(ctx) {
        const box = await ctx.page
          .locator(anchor('timeline-clip-1-0'))
          .first()
          .boundingBox();
        if (!box) throw new Error('timeline-clip-1-0 has no box');
        await ctx.page.mouse.dblclick(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
      },
      fallback: storeSet('setEditingClip(track 1, clip 0)', () => {
        const s = window.__MA_STORE__.getState();
        const t = s.tracks[1];
        s.setEditingClip(t.midiClips[0].id, t.id);
      }),
    },
    'add-note': {
      how: 'click',
      describe: 'click piano-roll-tool-draw, then the grid near its top left',
      async run(ctx) {
        await ctx.clickAnchor('piano-roll-tool-draw');
        const grid = await ctx.page
          .locator(anchor('piano-roll-grid'))
          .first()
          .boundingBox();
        await ctx.page.mouse.click(grid.x + 70, grid.y + 14);
      },
      fallback: storeSet('a note at the top of the open clip', () => {
        const s = window.__MA_STORE__.getState();
        const t = s.tracks.find((tr) => tr.id === s.editingClipTrackId);
        const clip = t.midiClips.find((c) => c.id === s.editingClipId);
        s.updateMidiClipEvents(t.id, clip.id, [
          ...clip.events,
          {
            note: 96,
            velocity: 100,
            startTick: 0,
            durationTicks: 480,
            channel: 0,
          },
        ]);
      }),
    },
    'move-note': editNotes('move', "the open clip's first note an 8th later"),
    'resize-note': editNotes(
      'resize',
      "the open clip's first note an 8th longer",
    ),
    'delete-note': editNotes('delete', "the open clip's first note deleted"),
    close: click(
      'piano-roll-close',
      storeSet('setEditingClip(null)', () =>
        window.__MA_STORE__.getState().setEditingClip(null, null),
      ),
    ),
    'wrap-up': NEXT,
  },
  'studio-basics-insight': {
    'open-insight': click(
      'inspector-toggle',
      storeSet('setLibraryOpen(true)', () =>
        window.__MA_STORE__.getState().setLibraryOpen(true),
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
