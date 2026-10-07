/* eslint-env node */
/**
 * Step drivers for the Studio lesson walkthrough (scripts/studio-perf/
 * lessons.mjs): one for every step of every lesson in
 * src/daw/components/Tutorial/tutorials.ts, keyed by lesson id and step id.
 * This module is not run on its own; lessons.mjs imports it.
 *
 * A driver does what a student does to satisfy the step's `check` (or
 * `synthCheck`), in one of these ways:
 *
 * - `click`: a real click (or menu pick) on the spotlighted anchor, or
 *   inside it. Used when the step is about that click: adding a track, the
 *   G slice, a genre, mode or chord button, Create, an FX row, the Master
 *   view, the automation button, Export. The click goes through
 *   Playwright's actionability checks, so a covered, clipped or disabled
 *   control fails the step with Playwright's reason.
 * - `store`: an action on the editor's store (window.__MA_STORE__) or the
 *   Oracle synth's (window.__MA_SYNTH_STORE__). Used when the step is about a
 *   value a person drags (slider, knob, fader), draws (notes, drum hits) or
 *   picks from a long list (the WOBBLE preset). The perf checks measure those
 *   gestures; here only the lesson's detection is under test.
 * - `next`: the coach card's Next button, on a free-form step (no check).
 * - `none`: the step's own `requires` already satisfies its check, so it
 *   should advance by itself.
 *
 * A driver is `{ how, describe, run(ctx) }`, plus, when needed:
 *
 * - `fallback(ctx)`: the same change made another way (through the store, or
 *   the keyboard for Export). lessons.mjs runs it only after `run` failed to
 *   advance the step, keeps the step marked failed with the reason, and lets
 *   the later steps start from the state the lesson expects;
 * - `after(ctx)`: runs once the step is over (Play is stopped again);
 * - `advanceTimeoutMs`: how long the step may take to advance (a render or
 *   a download), instead of the walkthrough's --step-timeout;
 * - `related`: audit findings (branch studio/audit-archive,
 *   docs/studio-audit-2026-10/register.md) that explain the step's known
 *   behaviour, so the summary can point at them.
 *
 * Drivers never work around the product silently. When a step cannot be done
 * the way the lesson says, the driver calls ctx.problem(reason), which fails
 * the step, and then does the least a student would do to go on. An error a
 * driver throws itself is recorded as the step's failure too.
 *
 * Every click and menu step has a fallback: when the click fails (the step
 * with it), the fallback puts the lesson where it expects to be, so its later
 * steps are still measured. (The free student never meets Prism's premium
 * lock in a lesson: a Premium lesson is gated, and lessons.mjs checks its
 * gate instead of walking it.)
 *
 * KNOWN_FAILURES at the end of this file lists the steps that fail today,
 * each with the audit finding (or the new problem) that explains it. A run
 * fails on any failing step not listed there, and reports listed steps that
 * pass now, so the list only shrinks as fixes land; a new failure is either
 * fixed or listed here with its finding, in review.
 *
 * The context lessons.mjs passes (see makeDriverContext there):
 *
 *   ctx.page                          the Playwright page
 *   ctx.clickAnchor(id, label?)       real click on [data-tutorial-id=id]
 *   ctx.click(locator, label)         real click on any locator
 *   ctx.clickAt(locator, fx, fy, label)  real click at a fraction of a box,
 *                                     after checking nothing covers the point
 *   ctx.select(locator, value, label) pick an option in a <select>, after
 *                                     checking nothing covers the menu
 *   ctx.press(key, label)             a key press on the focused element
 *   ctx.act(label, fn, arg)           page.evaluate(fn, arg), recorded
 *   ctx.read(fn, arg)                 page.evaluate(fn, arg), not recorded
 *   ctx.waitFor(label, fn, arg, ms?)  page.waitForFunction, recorded
 *   ctx.measure(id)                   record one more anchor measurement
 *   ctx.next()                        the coach card's Next button
 *   ctx.note(text)                    a fact for the report
 *   ctx.problem(text)                 the step cannot be done as written
 */

const anchor = (id) => `[data-tutorial-id="${id}"]`;

/** The chord buttons of Prism's Chord Selection card, in option order. */
const CHORD_BUTTONS = `${anchor('prism-chord-selection')} .grid-cols-2 > button`;

/** Instruments the + Add Track cards create (AddTrackMenu.tsx). */
const ADD_TRACK_CARDS = {
  'add-track-synth': ['midi', 'oracle-synth', 'Synth'],
  'add-track-drum-machine': ['midi', 'drum-machine', 'Drums'],
  'add-track-sampler': ['midi', 'sampler', 'Sampler'],
};

/** In the page: the chords Prism offers next, as ChordSelection lists them. */
function chordOptionsInPage() {
  const s = window.__MA_STORE__.getState();
  return s.stringSeq.length === 0
    ? s.availableFirstChords
    : s.availableNextChords;
}

const chordCountInPage = () => window.__MA_STORE__.getState().chordSeq.length;

/**
 * In the page: addChord with the first chord offered each time, until the
 * progression has `count` chords (the fallback of the chord steps).
 */
function addChordsInPage(count) {
  const store = window.__MA_STORE__;
  for (let i = 0; i < count; i++) {
    const s = store.getState();
    if (s.chordSeq.length >= count) return;
    const options =
      s.stringSeq.length === 0 ? s.availableFirstChords : s.availableNextChords;
    if (!options.length) return;
    s.addChord(options[0]);
  }
}

/** + Add Track, then the card for one instrument. */
function addTrack(cardId) {
  const [type, instrument, name] = ADD_TRACK_CARDS[cardId];
  return {
    how: 'click',
    describe: `click add-track-button, then ${cardId}`,
    async run(ctx) {
      await ctx.clickAnchor('add-track-button');
      // The spotlight follows into the menu (the step's first target id).
      await ctx.measure(cardId);
      await ctx.clickAnchor(cardId);
    },
    fallback: (ctx) =>
      ctx.act(
        `addTrack(${instrument})`,
        ([t, i, n]) => {
          const s = window.__MA_STORE__.getState();
          const id = s.addTrack(t, i, n);
          if (id) s.setSelectedTrackId(id);
        },
        [type, instrument, name],
      ),
  };
}

/**
 * An orientation step whose `requires` opens the tab its check looks for.
 * It should advance by itself; if it has not, open the tab like a student.
 */
function openedByStep(tab) {
  return {
    how: 'none',
    describe: `none: the step's requires opens the ${tab} tab`,
    related: ['practice-tutorial-08'],
    async run(ctx) {
      const open = await ctx.read(
        () => window.__MA_STORE__.getState().channelStripTab,
      );
      if (open !== tab) await ctx.clickAnchor(`chanstrip-tab-${tab}`);
    },
    fallback: (ctx) =>
      ctx.act(
        `setChannelStripTab(${tab})`,
        (t) => window.__MA_STORE__.getState().setChannelStripTab(t),
        tab,
      ),
  };
}

/** A slice of Prism's circle of fifths, found by its label. */
function pickKey(label, semitone) {
  return {
    how: 'click',
    describe: `click ${label} on the circle of fifths`,
    related: ['prism-ui-03'],
    async run(ctx) {
      const slices = ctx.page.locator(`${anchor('prism-key')} svg g`);
      const index = await slices.evaluateAll(
        (gs, text) => gs.findIndex((g) => g.textContent.trim() === text),
        label,
      );
      if (index < 0) throw new Error(`no ${label} slice in the circle`);
      await ctx.click(slices.nth(index), `${label} slice`);
    },
    fallback: (ctx) =>
      ctx.act(
        `setRootNote(${semitone})`,
        (n) => window.__MA_STORE__.getState().setRootNote(n),
        semitone,
      ),
  };
}

/** Chord Selection buttons, the first option each time, up to `count`. */
function addChords(count) {
  return {
    how: 'click',
    describe: `click chord buttons in prism-chord-selection up to ${count} chords`,
    async run(ctx) {
      for (let guard = 0; guard <= count; guard++) {
        const have = await ctx.read(chordCountInPage);
        if (have >= count) return;
        const options = await ctx.read(chordOptionsInPage);
        if (!options.length) {
          throw new Error(`no chord options offered after ${have} chords`);
        }
        await ctx.click(
          ctx.page.locator(CHORD_BUTTONS).first(),
          `chord "${options[0]}"`,
        );
        await ctx.waitFor(
          'the chord to land',
          (n) => window.__MA_STORE__.getState().chordSeq.length > n,
          have,
        );
      }
      throw new Error(`still under ${count} chords after ${count + 1} clicks`);
    },
    fallback: (ctx) =>
      ctx.act(`addChord until ${count}`, addChordsInPage, count),
  };
}

/** A chord whose name has a 7, after plain chords if none is offered yet. */
function addSeventhChord() {
  return {
    how: 'click',
    describe: 'click a 7th chord in prism-chord-selection',
    async run(ctx) {
      for (let tries = 0; tries < 4; tries++) {
        const options = await ctx.read(chordOptionsInPage);
        if (!options.length) throw new Error('no chord options offered');
        const index = options.findIndex((name) => /7/.test(name));
        const buttons = ctx.page.locator(CHORD_BUTTONS);
        if (index >= 0) {
          await ctx.click(buttons.nth(index), `chord "${options[index]}"`);
          return;
        }
        ctx.note(`no 7th chord among ${options.join(', ')}: added one first`);
        const have = await ctx.read(chordCountInPage);
        await ctx.click(buttons.first(), `chord "${options[0]}"`);
        await ctx.waitFor(
          'the chord to land',
          (n) => window.__MA_STORE__.getState().chordSeq.length > n,
          have,
        );
      }
      throw new Error('no 7th chord offered after four tries');
    },
    fallback: (ctx) =>
      ctx.act(
        'addChord (a 7th chord, after plain ones if none is offered)',
        () => {
          const store = window.__MA_STORE__;
          for (let tries = 0; tries < 4; tries++) {
            const s = store.getState();
            const options =
              s.stringSeq.length === 0
                ? s.availableFirstChords
                : s.availableNextChords;
            if (!options.length) return;
            const seventh = options.find((name) => /7/.test(name));
            s.addChord(seventh ?? options[0]);
            if (seventh) return;
          }
        },
      ),
  };
}

/** A genre pill in Prism's Style card. */
function pickGenre(genre) {
  return {
    how: 'click',
    describe: `click ${genre} in prism-style`,
    async run(ctx) {
      const pills = ctx.page.locator(`${anchor('prism-style')} button`);
      const index = await pills.evaluateAll(
        (buttons, name) =>
          buttons.findIndex(
            (b) => b.textContent.replace('♪', '').trim() === name,
          ),
        genre,
      );
      if (index < 0) throw new Error(`no ${genre} pill in the Style card`);
      await ctx.click(pills.nth(index), `${genre} pill`);
    },
    fallback: (ctx) =>
      ctx.act(
        `selectGenre(${genre})`,
        (g) => window.__MA_STORE__.getState().selectGenre(g),
        genre,
      ),
  };
}

/** The mode menu under the circle of fifths, then one mode in it. */
function pickMode(modeKey, label) {
  const menu = `${anchor('prism-key')} .relative`;
  return {
    how: 'click',
    describe: `open the mode menu in prism-key and pick ${label}`,
    related: ['practice-tutorial-20'],
    async run(ctx) {
      await ctx.click(
        ctx.page.locator(`${menu} > button`).first(),
        'mode menu',
      );
      const option = ctx.page
        .locator(`${menu} > div button`)
        .filter({ hasText: new RegExp(`^${label}$`) })
        .first();
      await ctx.click(option, `${label} in the mode menu`);
    },
    fallback: (ctx) =>
      ctx.act(
        `setMode(${modeKey})`,
        (m) => window.__MA_STORE__.getState().setMode(m),
        modeKey,
      ),
  };
}

/** Swing moved to a new value past `min` (a slider drag). */
function moveSwingPast(min) {
  return {
    how: 'store',
    describe: `setSwing to a new value past ${min} (a slider drag)`,
    related: ['practice-tutorial-14'],
    async run(ctx) {
      const swing = await ctx.read(() => window.__MA_STORE__.getState().swing);
      if (swing > min) {
        ctx.note(
          `Swing was already ${swing} (past ${min}) when the step began`,
        );
      }
      const next =
        swing > min ? (swing >= 55 ? swing - 5 : swing + 5) : min + 15;
      await ctx.act(
        `setSwing(${next})`,
        (v) => window.__MA_STORE__.getState().setSwing(v),
        next,
      );
    },
  };
}

/** A different pattern from one genre's group in the Rhythm Pattern menu. */
function pickRhythmOf(genre) {
  return {
    how: 'select',
    describe: `choose another ${genre} pattern in prism-rhythm's Rhythm Pattern menu`,
    related: ['practice-tutorial-14'],
    async run(ctx) {
      // RhythmSelector is the card's first <select> (Strum Mode and Velocity
      // Tilt follow it).
      const select = ctx.page
        .locator(`${anchor('prism-rhythm')} select`)
        .first();
      const { current, value } = await select.evaluate((el, g) => {
        const group = [...el.querySelectorAll('optgroup')].find(
          (o) => o.label === g,
        );
        const options = group ? [...group.querySelectorAll('option')] : [];
        return {
          current: el.value,
          value: options.find((o) => o.value !== el.value)?.value ?? null,
        };
      }, genre);
      if (!value) throw new Error(`no other ${genre} pattern in the menu`);
      ctx.note(`Rhythm Pattern was "${current}" when the step began`);
      await ctx.select(select, value, `"${value}" in Rhythm Pattern`);
    },
    fallback: (ctx) =>
      ctx.act(
        `setRhythm (another ${genre} pattern)`,
        ([selector, g]) => {
          const el = document.querySelector(selector);
          const group = el
            ? [...el.querySelectorAll('optgroup')].find((o) => o.label === g)
            : null;
          const option = group
            ? [...group.querySelectorAll('option')].find(
                (o) => o.value !== el.value,
              )
            : null;
          if (!option) throw new Error(`no other ${g} pattern in the menu`);
          window.__MA_STORE__.getState().setRhythm(option.value);
        },
        [`${anchor('prism-rhythm')} select`, genre],
      ),
  };
}

const CREATE = {
  how: 'click',
  describe: 'click prism-create',
  advanceTimeoutMs: 30_000,
  run: (ctx) => ctx.clickAnchor('prism-create'),
  fallback: (ctx) =>
    ctx.act('generateToTracks()', () =>
      window.__MA_STORE__.getState().generateToTracks(),
    ),
};

const NEXT = {
  how: 'next',
  describe: "the coach card's Next button",
  run: (ctx) => ctx.next(),
};

/** A row of the dock's FX list (the first fx-add-* anchor in the page). */
function addFx(type) {
  return {
    how: 'click',
    describe: `click fx-add-${type}`,
    async run(ctx) {
      await ctx.clickAnchor(`fx-add-${type}`);
    },
    fallback: (ctx) =>
      ctx.act(
        `addActiveEffect(${type})`,
        (fx) => {
          const s = window.__MA_STORE__.getState();
          s.addActiveEffect(s.selectedTrackId, fx);
        },
        type,
      ),
  };
}

/** One parameter of an effect on the selected track (a knob drag). */
function setTrackEffect(slot, param, value) {
  return {
    how: 'store',
    describe: `updateTrackEffects: ${slot}.${param} = ${value} (a knob drag)`,
    run: (ctx) =>
      ctx.act(
        `${slot}.${param} = ${value}`,
        ([fx, key, v]) => {
          const s = window.__MA_STORE__.getState();
          const track = s.tracks.find((t) => t.id === s.selectedTrackId);
          s.updateTrackEffects(track.id, {
            [fx]: { ...track.effects[fx], [key]: v },
          });
        },
        [slot, param, value],
      ),
  };
}

/** The kit menu in the drum sequencer's toolbar, then one kit. */
function pickKit(kit) {
  const selector = anchor('drum-kit-selector');
  return {
    how: 'click',
    describe: `open drum-kit-selector and pick ${kit}`,
    related: ['practice-tutorial-20'],
    async run(ctx) {
      await ctx.click(ctx.page.locator(`${selector} > button`), 'kit menu');
      const option = ctx.page
        .locator(`${selector} > div button`)
        .filter({ hasText: new RegExp(`^${kit}$`) });
      await ctx.click(option, `${kit} in the kit menu`);
    },
    fallback: (ctx) =>
      ctx.act(
        `setDrumKit(${kit})`,
        (k) => {
          const s = window.__MA_STORE__.getState();
          s.setDrumKit(s.selectedTrackId, k);
        },
        kit,
      ),
  };
}

/** Kick on 1 and 3, snare on 2 and 4, as clicks on the grid would add them. */
const PAINT_HITS = {
  how: 'store',
  describe: 'add four hits to the drum clip (clicks on the grid canvas)',
  run: (ctx) =>
    ctx.act('four drum hits', () => {
      const s = window.__MA_STORE__.getState();
      const track = s.tracks.find((t) => t.id === s.selectedTrackId);
      const hits = [
        [36, 0],
        [38, 480],
        [36, 960],
        [38, 1440],
      ].map(([note, startTick]) => ({
        note,
        velocity: 100,
        startTick,
        durationTicks: 120,
        channel: 10,
      }));
      const clip = track.midiClips[0];
      if (clip) {
        s.updateMidiClipEvents(track.id, clip.id, [...clip.events, ...hits]);
      } else {
        s.addMidiClip(track.id, {
          id: `clip-drums-lessons-${Date.now()}`,
          name: 'Drum Pattern',
          startTick: 0,
          events: hits,
        });
      }
    }),
};

/** "Add to track" on the first groove; "Add Anyway" if the BPM dialog asks. */
const ADD_FIRST_GROOVE = {
  how: 'click',
  describe: 'click "Add to track" on the first groove in grooves-browser',
  advanceTimeoutMs: 30_000,
  async run(ctx) {
    const add = ctx.page
      .locator(`${anchor('grooves-browser')} button[title="Add to track"]`)
      .first();
    await ctx.click(add, 'Add to track on the first groove');
    const dialog = ctx.page.getByText('Change Project BPM?');
    const asked = await dialog
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
    if (asked) {
      ctx.note(
        'A "Change Project BPM?" dialog asked to undo the BPM the lesson just set; chose Add Anyway',
      );
      await ctx.click(
        ctx.page.getByRole('button', { name: 'Add Anyway' }),
        'Add Anyway',
      );
    }
  },
  fallback: (ctx) =>
    ctx.act('addMidiClip (a one-bar groove)', () => {
      const s = window.__MA_STORE__.getState();
      s.addMidiClip(s.selectedTrackId, {
        id: `clip-groove-lessons-${Date.now()}`,
        name: 'Groove',
        startTick: 0,
        events: [0, 480, 960, 1440].map((startTick) => ({
          note: 42,
          velocity: 90,
          startTick,
          durationTicks: 120,
          channel: 10,
        })),
      });
    }),
};

/** "Use demo sample" in the sampler's drop zone. */
const USE_DEMO_SAMPLE = {
  how: 'click',
  describe: 'click sampler-demo-button in sampler-dropzone',
  advanceTimeoutMs: 60_000,
  run: (ctx) => ctx.clickAnchor('sampler-demo-button'),
  // Loading decodes audio in the component, so there is no store action to
  // stand in; the keyboard reaches the button when the mouse cannot.
  async fallback(ctx) {
    await ctx.act(
      'focus Use demo sample',
      (sel) => document.querySelector(sel)?.focus(),
      anchor('sampler-demo-button'),
    );
    await ctx.press('Enter', 'Enter on Use demo sample');
  },
};

/** Notes on the selected track, as the piano roll's blank mode adds them. */
function drawNotes(count) {
  return {
    how: 'store',
    describe: `add a clip with ${count} notes on the selected track (piano-roll drawing)`,
    related: ['practice-tutorial-20'],
    run: (ctx) =>
      ctx.act(
        `addMidiClip with ${count} notes`,
        (n) => {
          const s = window.__MA_STORE__.getState();
          const events = Array.from({ length: n }, (_, i) => ({
            note: 60 + i * 4,
            velocity: 100,
            startTick: i * 480,
            durationTicks: 480,
            channel: 0,
          }));
          s.addMidiClip(s.selectedTrackId, {
            id: `clip-lessons-${Date.now()}`,
            name: 'Untitled',
            startTick: 0,
            events,
          });
        },
        count,
      ),
  };
}

/** A factory preset through the Oracle synth's own store. */
function loadSynthPreset(name) {
  return {
    how: 'store',
    describe: `__MA_SYNTH_STORE__.loadPreset('${name}') (the preset menu's pick)`,
    run: (ctx) =>
      ctx.act(
        `loadPreset(${name})`,
        (preset) => window.__MA_SYNTH_STORE__.getState().loadPreset(preset),
        name,
      ),
  };
}

/** Clickable colour segments of Prism's Harmony spectrum, up to `count` chords. */
function pickHarmonyColours(count) {
  return {
    how: 'click',
    describe: `click colour segments in prism-harmony up to ${count} chords`,
    async run(ctx) {
      const segments = ctx.page.locator(
        `${anchor('prism-harmony')} .absolute.inset-0.flex > div.cursor-pointer`,
      );
      for (let guard = 0; guard <= count; guard++) {
        const have = await ctx.read(chordCountInPage);
        if (have >= count) return;
        if ((await segments.count()) === 0) {
          throw new Error(`no colour offers a chord after ${have} chords`);
        }
        await ctx.click(segments.first(), 'a colour in the spectrum');
        await ctx.waitFor(
          'the chord to land',
          (n) => window.__MA_STORE__.getState().chordSeq.length > n,
          have,
        );
      }
      throw new Error(`still under ${count} chords after ${count + 1} clicks`);
    },
    fallback: (ctx) =>
      ctx.act(`addChord until ${count}`, addChordsInPage, count),
  };
}

/** The ducker's Key menu, set to the drum track. */
const KEY_TO_DRUMS = {
  how: 'select',
  describe: 'pick the Drums track in ducker-key-select',
  async run(ctx) {
    const drumId = await ctx.read(
      () =>
        window.__MA_STORE__
          .getState()
          .tracks.find((t) => t.instrument === 'drum-machine')?.id ?? null,
    );
    if (!drumId) throw new Error('no drum track to key from');
    await ctx.select(
      ctx.page.locator(anchor('ducker-key-select')),
      drumId,
      'the Drums track as Key',
    );
  },
  fallback: (ctx) =>
    ctx.act('ducker.keyTrackId = drums', () => {
      const s = window.__MA_STORE__.getState();
      const drum = s.tracks.find((t) => t.instrument === 'drum-machine');
      const track = s.tracks.find((t) => t.id === s.selectedTrackId);
      s.updateTrackEffects(track.id, {
        ducker: { ...track.effects.ducker, keyTrackId: drum.id },
      });
    }),
};

/** The selected track's reverb a little wetter (a knob drag). */
const raiseReverbWet = (ctx) =>
  ctx.act('reverb.wet + 0.15', () => {
    const s = window.__MA_STORE__.getState();
    const track = s.tracks.find((t) => t.id === s.selectedTrackId);
    const reverb = track.effects.reverb;
    s.updateTrackEffects(track.id, {
      reverb: { ...reverb, wet: Math.min(1, reverb.wet + 0.15) },
    });
  });

/** Select the Reverb block (a click), then turn a knob (the store). */
const TWEAK_REVERB = {
  how: 'click',
  describe: 'click fx-slot-reverb, then reverb.wet + 0.15 (a knob drag)',
  async run(ctx) {
    await ctx.clickAnchor('fx-slot-reverb', 'the Reverb block');
    await raiseReverbWet(ctx);
  },
  fallback: raiseReverbWet,
};

function switchView(view) {
  return {
    how: 'click',
    describe: `click view-switch-${view}`,
    run: (ctx) => ctx.clickAnchor(`view-switch-${view}`),
    fallback: (ctx) =>
      ctx.act(
        `setCurrentView(${view})`,
        (v) => window.__MA_STORE__.getState().setCurrentView(v),
        view,
      ),
  };
}

const MOVE_TRACK_FADER = {
  how: 'store',
  describe: 'updateTrack volume 0.8 → 0.65 (a fader drag)',
  related: ['ia-flows-12', 'fx-mixer-04'],
  run: (ctx) =>
    ctx.act('track volume = 0.65', () => {
      const s = window.__MA_STORE__.getState();
      const id = s.selectedTrackId ?? s.tracks[0].id;
      s.updateTrack(id, { volume: 0.65 });
    }),
};

function raiseSend(returnId, level) {
  return {
    how: 'store',
    describe: `setSend(${returnId}, ${level}) (a send knob drag)`,
    related: ['ia-flows-12', 'fx-mixer-04', 'fx-mixer-14'],
    run: (ctx) =>
      ctx.act(
        `send ${returnId} = ${level}`,
        ([r, v]) => {
          const s = window.__MA_STORE__.getState();
          s.setSend(s.selectedTrackId ?? s.tracks[0].id, r, v);
        },
        [returnId, level],
      ),
  };
}

/** A return bus's reverb decay one second longer (a knob drag). */
const lengthenReturnReverb = (ctx, returnId) =>
  ctx.act(
    `return ${returnId} reverb.decay + 1`,
    (r) => {
      const s = window.__MA_STORE__.getState();
      const bus = s.returns.find((b) => b.id === r);
      s.updateReturnEffects(r, {
        reverb: { ...bus.effects.reverb, decay: bus.effects.reverb.decay + 1 },
      });
    },
    returnId,
  );

/**
 * Click "Return X" on its strip, which opens its FX rack, then turn a knob.
 * The label, not the strip's middle: the strip's fader area stops the click
 * from selecting the return.
 */
function tweakReturn(returnId) {
  return {
    how: 'click',
    describe: `click the "Return ${returnId}" label in return-strip-${returnId}, then its reverb decay (a knob drag)`,
    related: ['ia-flows-12', 'fx-mixer-04'],
    async run(ctx) {
      const label = ctx.page
        .locator(`${anchor(`return-strip-${returnId}`)} span`)
        .first();
      await ctx.click(label, `"Return ${returnId}" label`);
      await ctx.measure(`return-fx-${returnId}`);
      await lengthenReturnReverb(ctx, returnId);
    },
    fallback: (ctx) => lengthenReturnReverb(ctx, returnId),
  };
}

/** The mastering rack's FX list is the first fx-add-* anchor in MASTER view. */
function addMasteringFx(type) {
  return {
    how: 'click',
    describe: `click fx-add-${type} in mastering-section`,
    related: ['fx-mixer-19'],
    run: (ctx) => ctx.clickAnchor(`fx-add-${type}`),
    fallback: (ctx) =>
      ctx.act(
        `addMasteringFx(${type})`,
        (fx) => window.__MA_STORE__.getState().addMasteringFx(fx),
        type,
      ),
  };
}

const TRIM_MASTER = {
  how: 'store',
  describe: 'setMasterVolume − 0.1 (a fader drag)',
  related: ['ia-flows-12', 'fx-mixer-04'],
  run: (ctx) =>
    ctx.act('master volume − 0.1', () => {
      const s = window.__MA_STORE__.getState();
      s.setMasterVolume(Math.round((s.masterVolume - 0.1) * 100) / 100);
    }),
};

const EXPORT_AUDIO = {
  how: 'click',
  describe: 'click file-menu, file-export-audio, then export-audio-run',
  related: ['practice-tutorial-20', 'audio-core-01'],
  // The offline render of the whole mix, on a throttled CPU.
  advanceTimeoutMs: 240_000,
  async run(ctx) {
    await ctx.clickAnchor('file-menu');
    await ctx.measure('file-export-audio');
    await ctx.clickAnchor('file-export-audio', 'Export Audio…');
    await ctx.measure('export-audio-run');
    await ctx.clickAnchor('export-audio-run', 'Export');
  },
  // When the mouse cannot reach the menu item, the keyboard still can (the
  // File menu is a Radix menu): focus the item, Enter, then Export. This
  // way the bounce itself is still measured.
  async fallback(ctx) {
    const item = ctx.page.locator(anchor('file-export-audio')).first();
    if (!(await item.isVisible())) await ctx.clickAnchor('file-menu');
    await ctx.act(
      'focus Export Audio…',
      (sel) => document.querySelector(sel)?.focus(),
      anchor('file-export-audio'),
    );
    await ctx.press('Enter', 'Enter on Export Audio…');
    await ctx.clickAnchor('export-audio-run', 'Export');
  },
};

/** The automation button on the selected track's header. */
const OPEN_AUTOMATION = {
  how: 'click',
  describe: 'click automation-toggle on a track header',
  async run(ctx) {
    const buttons = await ctx.read(
      (sel) => document.querySelectorAll(sel).length,
      anchor('automation-toggle'),
    );
    if (buttons === 0) {
      ctx.problem(
        'The lesson opens in an empty session and its first step asks to pick a track, but there is no track and no step adds one, so there is no automation button',
      );
      // What a student would do: add a track first.
      await ctx.clickAnchor('add-track-button');
      await ctx.clickAnchor('add-track-synth');
    }
    await ctx.clickAnchor('automation-toggle');
  },
  fallback: (ctx) =>
    ctx.act('setAutomationOpenTrackId(selected)', () => {
      const s = window.__MA_STORE__.getState();
      s.setAutomationOpenTrackId(s.selectedTrackId ?? s.tracks[0]?.id ?? null);
    }),
};

/** Clicks in the automation lane's canvas, after picking its parameter. */
function drawLanePoints(paramId, count) {
  return {
    how: 'click',
    describe: `${paramId === 'volume' ? '' : `pick ${paramId} in automation-param-select, then `}click ${count} points in automation-lane`,
    async run(ctx) {
      const current = await ctx.read(
        () => window.__MA_STORE__.getState().automationParamId,
      );
      if (current !== paramId) {
        await ctx.select(
          ctx.page.locator(anchor('automation-param-select')),
          paramId,
          `${paramId} in the lane's parameter menu`,
        );
      }
      const canvas = ctx.page.locator(`${anchor('automation-lane')} canvas`);
      for (let i = 0; i < count; i++) {
        await ctx.clickAt(
          canvas,
          0.2 + (0.5 * i) / Math.max(1, count - 1),
          i % 2 ? 0.3 : 0.7,
          `point ${i + 1} in the lane`,
        );
      }
    },
    fallback: (ctx) =>
      ctx.act(
        `upsertAutomationPoint ×${count} (${paramId})`,
        ([p, n]) => {
          const s = window.__MA_STORE__.getState();
          for (let i = 0; i < n; i++) {
            s.upsertAutomationPoint(s.automationOpenTrackId, p, {
              tick: 1920 * (i + 1),
              value: i % 2 ? 0.8 : 0.3,
            });
          }
        },
        [paramId, count],
      ),
  };
}

const PRESS_PLAY = {
  how: 'store',
  describe: 'play() (the transport Play button, which has no anchor)',
  related: ['practice-tutorial-20'],
  run: (ctx) => ctx.act('play()', () => window.__MA_STORE__.getState().play()),
  // Stop again so the next steps are not measured during playback.
  after: (ctx) =>
    ctx.act('pause()', () => window.__MA_STORE__.getState().pause()),
};

const NUDGE_PAD = {
  how: 'store',
  describe: 'updateDrumPad kick volume 0.6 (a pad fader drag)',
  related: ['practice-tutorial-15'],
  run: (ctx) =>
    ctx.act('kick pad volume = 0.6', () => {
      const s = window.__MA_STORE__.getState();
      s.updateDrumPad(s.selectedTrackId, 36, { volume: 0.6 });
    }),
};

function setBpm(bpm) {
  return {
    how: 'store',
    describe: `setBpm(${bpm}) (typing in transport-bpm)`,
    run: (ctx) =>
      ctx.act(
        `setBpm(${bpm})`,
        (v) => window.__MA_STORE__.getState().setBpm(v),
        bpm,
      ),
  };
}

/**
 * Drivers by lesson id, then step id. A step without a driver is reported as
 * such (a new or renamed step), and the walkthrough moves past it.
 */
export const DRIVERS = {
  'make-first-track': {
    'add-track': addTrack('add-track-synth'),
    'open-prism': openedByStep('prism'),
    'pick-key': pickKey('G', 7),
    'add-chords': addChords(3),
    'pick-genre': pickGenre('Jazz'),
    'add-swing': moveSwingPast(20),
    experiment: NEXT,
    create: CREATE,
  },
  'jazz-color-your-chords': {
    'select-track': addTrack('add-track-synth'),
    'genre-jazz': pickGenre('Jazz'),
    'mode-dorian': pickMode('dorian', 'Dorian'),
    'seventh-chord': addSeventhChord(),
    'four-chords': addChords(4),
    'jazz-rhythm': pickRhythmOf('Jazz'),
    swing: moveSwingPast(25),
    create: CREATE,
  },
  'hiphop-build-the-beat': {
    'add-drums': addTrack('add-track-drum-machine'),
    'open-sequencer': openedByStep('controls'),
    'swap-kit': pickKit('808'),
    'program-hits': PAINT_HITS,
    'slow-bpm': setBpm(90),
    'load-groove': ADD_FIRST_GROOVE,
    'pad-mix': NUDGE_PAD,
  },
  'pop-flip-a-sample': {
    'add-chops': addTrack('add-track-sampler'),
    'load-sample': USE_DEMO_SAMPLE,
    'play-notes': drawNotes(3),
    'space-it-out': addFx('delay'),
  },
  'edm-design-the-drop': {
    'add-synth': addTrack('add-track-synth'),
    'open-synth': openedByStep('controls'),
    'load-wobble': loadSynthPreset('WOBBLE'),
    'tweak-wobble': { ...NEXT, related: ['synth-ui-07'] },
    'genre-edm': pickGenre('EDM'),
    'minor-mode': pickMode('aeolian', 'Aeolian'),
    'riff-chords': pickHarmonyColours(2),
    create: CREATE,
    saturate: addFx('saturator'),
    'add-ott': addFx('multiband'),
    'push-depth': setTrackEffect('multiband', 'depth', 0.6),
  },
  'house-make-it-pump': {
    'add-drums': addTrack('add-track-drum-machine'),
    'add-bass': addTrack('add-track-synth'),
    'add-ducker': addFx('ducker'),
    'set-key': KEY_TO_DRUMS,
    'raise-amount': setTrackEffect('ducker', 'amount', 0.6),
  },
  'rnb-mix-and-polish': {
    'select-track': addTrack('add-track-synth'),
    'genre-rnb': pickGenre('R&B'),
    'add-reverb': addFx('reverb'),
    'tweak-reverb': TWEAK_REVERB,
    'goto-master': switchView('studio'),
    'balance-fader': MOVE_TRACK_FADER,
    'use-send': raiseSend('A', 0.5),
    'tweak-return': tweakReturn('A'),
    'mastering-fx': addMasteringFx('compressor'),
    'master-volume': TRIM_MASTER,
    'bounce-mixdown': EXPORT_AUDIO,
  },
  'indie-movement-and-dynamics': {
    'open-automation': OPEN_AUTOMATION,
    'draw-volume': drawLanePoints('volume', 2),
    'hear-it': PRESS_PLAY,
    'second-lane': drawLanePoints('pan', 2),
  },
};

/** The driver for one step, or null when the lessons have changed. */
export function driverFor(lessonId, stepId) {
  return DRIVERS[lessonId]?.[stepId] ?? null;
}

// ── Known failures ────────────────────────────────────────────────────────

/**
 * The steps that fail today (the 1.0 baseline), as
 * `'<profile>/<persona>/<lesson>/<step>': '<audit finding>: why'`. A `*`
 * segment matches any value there and `a|b` either value, so a pattern is
 * only as wide as the runs where the step really fails (profiles differ: the
 * window decides what is cut). A Premium lesson's gate check for the free
 * student is listed the same way, with `gate:<check>` for the step. Findings
 * are on branch studio/audit-archive; "new" marks a problem the walkthrough
 * found that the register does not have yet.
 *
 * (Milestone 1.2 took off the free student's Prism steps, ia-flows-14 and
 * prism-ui-23: the four Prism lessons are gated for a free student now.)
 */
export const KNOWN_FAILURES = {
  '*/*/edm-design-the-drop/saturate':
    'practice-tutorial-20: fx-add-saturator is scrolled out of the dock’s FX list, so the spotlight points below the list',
  '*/*/house-make-it-pump/add-ducker':
    'practice-tutorial-20: fx-add-ducker is scrolled out of the dock’s FX list, so the spotlight points below the list',
  'chromebook/*/rnb-mix-and-polish/balance-fader':
    'ia-flows-12, fx-mixer-04: mixer-section has a 0 px tall box in MASTER at 1366×655',
  'chromebook|small/*/rnb-mix-and-polish/use-send':
    'ia-flows-12, fx-mixer-04: mixer-sends-A is cut off by the scrolling strips row (none of it shows at 1366×655, 31% at 1280×720)',
  'chromebook|small/*/rnb-mix-and-polish/tweak-return':
    'ia-flows-12, fx-mixer-04: return-strip-A is cut off by the scrolling strips row (none of it shows at 1366×655, where mastering-section also takes the click on its label; 75% at 1280×720)',
  '*/*/rnb-mix-and-polish/master-volume':
    'ia-flows-12, fx-mixer-04: master-strip is cut off by the scrolling strips row',
  '*/*/rnb-mix-and-polish/bounce-mixdown':
    'new (nearest practice-tutorial-18): the coach card covers File > Export Audio…, so the click on it times out',
  '*/*/indie-movement-and-dynamics/open-automation':
    'new: ?tutorial= boots an empty session and no step adds a track, so there is no automation button to click',
  'chromebook/*/indie-movement-and-dynamics/draw-volume':
    'new (nearest practice-tutorial-18): the coach card is clamped back over the wide automation lane',
};

/** The KNOWN_FAILURES pattern that lists `key`, or null. */
export function knownFailureFor(key) {
  const parts = key.split('/');
  for (const pattern of Object.keys(KNOWN_FAILURES)) {
    const segments = pattern.split('/');
    if (
      segments.length === parts.length &&
      segments.every((s, i) => s === '*' || s.split('|').includes(parts[i]))
    ) {
      return pattern;
    }
  }
  return null;
}
