// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, type AllSlices } from '@/daw/store';
import type { SynthStore } from '@/daw/oracle-synth/store';
import { TUTORIALS, getTutorial, type TutorialStep } from './tutorials';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

const INTRO = 'studio-basics';
const s = () => useStore.getState();
const stepOf = (tutorialId: string, stepId: string): TutorialStep => {
  const step = getTutorial(tutorialId)?.steps.find((st) => st.id === stepId);
  if (!step) throw new Error(`missing step ${tutorialId}/${stepId}`);
  return step;
};
const mock = (partial: Record<string, unknown>) =>
  partial as unknown as AllSlices;

describe('tutorial slice runtime', () => {
  beforeEach(() => s().quitTutorial());

  it('starts, marks a step done, advances, and quits', () => {
    s().startTutorial(INTRO);
    expect(s().activeTutorialId).toBe(INTRO);
    expect(s().tutorialStepIndex).toBe(0);
    expect(s().tutorialStepStatus).toBe('waiting');

    s().completeTutorialStep(true);
    expect(s().tutorialStepStatus).toBe('done');

    s().goToTutorialStep(1);
    expect(s().tutorialStepIndex).toBe(1);
    expect(s().tutorialStepStatus).toBe('waiting');

    s().quitTutorial();
    expect(s().activeTutorialId).toBeNull();
    expect(s().tutorialStepIndex).toBe(0);
  });

  it('completeTutorialStep is idempotent once done', () => {
    s().startTutorial(INTRO);
    s().completeTutorialStep(false);
    // A second (celebrating) completion must not flip the flag back on.
    s().completeTutorialStep(true);
    expect(s().tutorialStepCelebrate).toBe(false);
  });
});

describe('Studio Basics checks', () => {
  const step = (id: string) => stepOf(INTRO, id);

  it('passes the tempo, key and click steps only once the student sets them', () => {
    const armed = mock({ bpm: 120, rootNote: null, metronomeEnabled: false });
    expect(step('set-tempo').check!(mock({ bpm: 120 }), armed)).toBe(false);
    expect(step('set-tempo').check!(mock({ bpm: 100 }), armed)).toBe(true);
    expect(step('set-key').check!(mock({ rootNote: null }), armed)).toBe(false);
    expect(step('set-key').check!(mock({ rootNote: 0 }), armed)).toBe(true);
    expect(
      step('click-on').check!(mock({ metronomeEnabled: false }), armed),
    ).toBe(false);
    expect(
      step('click-on').check!(mock({ metronomeEnabled: true }), armed),
    ).toBe(true);
  });

  it('adds the drums as a new, selected drum track', () => {
    const armed = mock({ tracks: [], selectedTrackId: null });
    const drums = { id: 'd', instrument: 'drum-machine', midiClips: [] };
    expect(
      step('add-drums').check!(
        mock({ tracks: [drums], selectedTrackId: 'd' }),
        armed,
      ),
    ).toBe(true);
    expect(
      step('add-drums').check!(
        mock({
          tracks: [{ ...drums, instrument: 'soundfont' }],
          selectedTrackId: 'd',
        }),
        armed,
      ),
    ).toBe(false);
  });

  it('counts eight new hits on the selected drum track', () => {
    const drums = (n: number) =>
      mock({
        selectedTrackId: 'd',
        tracks: [
          {
            id: 'd',
            instrument: 'drum-machine',
            midiClips: [{ id: 'c', events: Array.from({ length: n }) }],
          },
        ],
      });
    expect(step('program-beat').check!(drums(7), drums(0))).toBe(false);
    expect(step('program-beat').check!(drums(8), drums(0))).toBe(true);
  });

  it('knows Prism’s chords and bass by their track’s role and new clip', () => {
    const song = (role: string, clips: { id: string; events: unknown[] }[]) =>
      mock({ tracks: [{ id: 't', trackRole: role, midiClips: clips }] });
    const before = song('chords', []);
    const chords = song('chords', [{ id: 'new', events: [{}] }]);
    expect(step('ask-chords').check!(chords, before)).toBe(true);
    expect(step('ask-chords').check!(before, before)).toBe(false);
    // An empty clip, or a bass part, isn't the chords.
    expect(
      step('ask-chords').check!(
        song('chords', [{ id: 'new', events: [] }]),
        before,
      ),
    ).toBe(false);
    expect(
      step('ask-chords').check!(
        song('bass', [{ id: 'new', events: [{}] }]),
        before,
      ),
    ).toBe(false);
    expect(
      step('ask-bass').check!(
        song('bass', [{ id: 'new', events: [{}] }]),
        song('bass', []),
      ),
    ).toBe(true);
  });

  it('opens Prism from the side rail: a check on Prism’s own store', () => {
    const open = step('open-prism').promptCheck!;
    const bar = (collapsed: boolean) =>
      ({ collapsed }) as unknown as Parameters<typeof open>[0];
    expect(open(bar(true), bar(true))).toBe(false);
    expect(open(bar(false), bar(true))).toBe(true);
  });

  it('takes Undo and Redo by the clips they take away and bring back', () => {
    const clips = (n: number) =>
      mock({
        tracks: [
          {
            id: 't',
            midiClips: Array.from({ length: n }, (_, i) => ({ id: `${i}` })),
            audioClips: [],
          },
        ],
      });
    expect(step('undo').check!(clips(2), clips(4))).toBe(true);
    expect(step('undo').check!(clips(4), clips(4))).toBe(false);
    expect(step('redo').check!(clips(4), clips(2))).toBe(true);
  });

  it('asks nothing on a blank Studio that the student hasn’t done', () => {
    useStore.setState(useStore.getInitialState(), true);
    const blank = s();
    // Steps that may pass on arrival: a setting the student already has, a
    // playhead already at the start, or an undo of the step before it (the
    // unmute after the mute: with nothing muted there's nothing to undo).
    const settled = new Set([
      'click-on',
      'count-in',
      'back-to-start',
      'unmute',
      'unsolo',
      // The Inspector opens on Insight on a wide window.
      'open-insight',
    ]);
    for (const st of getTutorial(INTRO)!.steps) {
      if (!st.check || settled.has(st.id)) continue;
      expect(st.check(blank, blank), st.id).toBe(false);
    }
  });
});

// ── The skills lessons ─────────────────────────────────────────────────────
// Each check passes on the student's move and not before: a track by its
// role (Prism's parts, the track menu's Role), never by its name or place.

const track = (extra: Record<string, unknown>) => ({
  id: 't',
  instrument: 'soundfont',
  trackRole: 'auto',
  midiClips: [],
  audioClips: [],
  activeEffects: [],
  effects: { ducker: { keyTrackId: null, amount: 0.3, release: 0.2 } },
  ...extra,
});

describe('the skills lessons’ checks', () => {
  it('Hip Hop takes a tempo in the pocket, and counts ghost notes by their velocity', () => {
    const tempo = stepOf('hiphop-build-the-beat', 'slow-bpm').check!;
    const armed = mock({ bpm: 120 });
    expect(tempo(mock({ bpm: 90 }), armed)).toBe(true);
    expect(tempo(mock({ bpm: 110 }), armed)).toBe(false);

    const ghosts = stepOf('hiphop-build-the-beat', 'ghost-notes').check!;
    const drums = (events: { id: string; velocity: number }[]) =>
      mock({
        selectedTrackId: 'd',
        tracks: [
          track({
            id: 'd',
            instrument: 'drum-machine',
            midiClips: [{ id: 'c', events }],
          }),
        ],
      });
    const before = drums([{ id: 'a', velocity: 100 }]);
    expect(
      ghosts(
        drums([
          { id: 'a', velocity: 100 },
          { id: 'b', velocity: 100 },
        ]),
        before,
      ),
    ).toBe(false);
    expect(
      ghosts(
        drums([
          { id: 'a', velocity: 100 },
          { id: 'b', velocity: 50 },
        ]),
        before,
      ),
    ).toBe(true);
  });

  it('House keys the bass’s sidechain to the drums, and wants the amount raised', () => {
    const song = (ducker: Record<string, unknown>) =>
      mock({
        selectedTrackId: 'b',
        tracks: [
          track({ id: 'd', instrument: 'drum-machine', trackRole: 'drums' }),
          track({
            id: 'b',
            trackRole: 'bass',
            effects: {
              ducker: {
                keyTrackId: null,
                amount: 0.3,
                release: 0.2,
                ...ducker,
              },
            },
          }),
        ],
      });
    const key = stepOf('house-make-it-pump', 'set-key').check!;
    expect(key(song({ keyTrackId: 'b' }), song({}))).toBe(false);
    expect(key(song({ keyTrackId: 'd' }), song({}))).toBe(true);
    const amount = stepOf('house-make-it-pump', 'raise-amount').check!;
    expect(amount(song({ amount: 0.35 }), song({}))).toBe(false);
    expect(amount(song({ amount: 0.6 }), song({}))).toBe(true);
    const release = stepOf('house-make-it-pump', 'shape-release').check!;
    expect(release(song({}), song({}))).toBe(false);
    expect(release(song({ release: 0.4 }), song({}))).toBe(true);
  });

  it('EDM’s synth steps read the synth’s own store', () => {
    const filter = stepOf('edm-design-the-drop', 'filter-down').synthCheck!;
    const sy = (cutoff: number, presetName = 'INITIALIZE') =>
      ({ filters: [{ cutoff }], presetName }) as unknown as SynthStore;
    expect(filter(sy(13400), sy(13400))).toBe(false);
    expect(filter(sy(2000), sy(13400))).toBe(true);
    const wobble = stepOf('edm-design-the-drop', 'load-wobble').synthCheck!;
    expect(wobble(sy(1, 'WOBBLE'), sy(1))).toBe(true);
    const minor = stepOf('edm-design-the-drop', 'minor-key').check!;
    expect(minor(mock({ rootNote: 9, mode: 'aeolian' }), mock({}))).toBe(true);
    expect(minor(mock({ rootNote: 9, mode: 'ionian' }), mock({}))).toBe(false);
  });

  it('Jazz counts seventh chords typed into the lane', () => {
    const lane = (...names: string[]) =>
      mock({ chordRegions: names.map((noteName) => ({ noteName })) });
    const first = stepOf('jazz-color-your-chords', 'first-chord').check!;
    expect(first(lane('Dm'), lane())).toBe(false);
    expect(first(lane('Dm7'), lane())).toBe(true);
    const iiVI = stepOf('jazz-color-your-chords', 'ii-v-i').check!;
    expect(iiVI(lane('Dm7', 'G7'), lane('Dm7'))).toBe(false);
    expect(iiVI(lane('Dm7', 'G7', 'Cmaj7'), lane('Dm7'))).toBe(true);
  });

  it('R&B and Indie wait for Prism’s whole band', () => {
    const band = (roles: string[]) =>
      mock({
        tracks: roles.map((role, i) =>
          track({
            id: role,
            trackRole: role,
            midiClips: [{ id: `c${i}`, events: [{}] }],
          }),
        ),
      });
    for (const lesson of [
      'rnb-mix-and-polish',
      'indie-movement-and-dynamics',
    ]) {
      const ask = stepOf(lesson, 'ask-band').check!;
      expect(ask(band(['drums', 'bass']), band([]))).toBe(false);
      expect(ask(band(['drums', 'bass', 'chords']), band([]))).toBe(true);
    }
  });

  it('Indie opens the chords’ automation and wants two volume points on it', () => {
    const song = (automationOpenTrackId: string | null, points = 0) =>
      mock({
        automationOpenTrackId,
        tracks: [
          track({
            id: 'c',
            trackRole: 'chords',
            automation: { volume: Array.from({ length: points }) },
          }),
          track({ id: 'b', trackRole: 'bass' }),
        ],
      });
    const open = stepOf(
      'indie-movement-and-dynamics',
      'open-automation',
    ).check!;
    expect(open(song('b'), song(null))).toBe(false);
    expect(open(song('c'), song(null))).toBe(true);
    const draw = stepOf('indie-movement-and-dynamics', 'draw-volume').check!;
    expect(draw(song('c', 1), song('c'))).toBe(false);
    expect(draw(song('c', 2), song('c'))).toBe(true);
  });

  it('asks nothing of a blank Studio that the student hasn’t done, in any skills lesson', () => {
    useStore.setState(useStore.getInitialState(), true);
    const blank = s();
    // A step that may pass on arrival: Loop already on, Jazz's key already
    // C, the playhead at the start, the Inspector open on Insight.
    const settled = new Set([
      'loop-on',
      'pick-key',
      'back-to-start',
      'open-insight',
    ]);
    for (const lesson of TUTORIALS.filter((t) => t.id !== INTRO)) {
      for (const st of lesson.steps) {
        if (!st.check || settled.has(st.id)) continue;
        expect(st.check(blank, blank), `${lesson.id}/${st.id}`).toBe(false);
      }
    }
  });
});

describe('detection fires on a real store mutation', () => {
  it('a store subscription (as useTutorialDetection uses) detects the key change', () => {
    const step = stepOf(INTRO, 'set-key');
    s().setRootNote(null);
    const armed = s();
    let completed = false;
    const unsub = useStore.subscribe((st) => {
      if (step.check!(st, armed)) completed = true;
    });
    expect(completed).toBe(false);
    s().setRootNote(7);
    expect(completed).toBe(true);
    unsub();
  });
});

describe('tutorial progress persistence', () => {
  it('marks a lesson complete and reports it', () => {
    useTutorialProgressStore.getState().markComplete(INTRO);
    expect(useTutorialProgressStore.getState().isComplete(INTRO)).toBe(true);
    expect(typeof useTutorialProgressStore.getState().completedAt[INTRO]).toBe(
      'number',
    );
  });
});

describe('lesson data integrity', () => {
  it('is the course’s seven lessons, from blank projects, with unique ids and a target for every validated step', () => {
    expect(TUTORIALS.map((t) => t.id)).toEqual([
      'studio-basics',
      'hiphop-build-the-beat',
      'house-make-it-pump',
      'edm-design-the-drop',
      'jazz-color-your-chords',
      'rnb-mix-and-polish',
      'indie-movement-and-dynamics',
    ]);
    for (const t of TUTORIALS) {
      expect(t.course).toBe('studio-production');
      expect(t.seed).toBeUndefined();
      const ids = t.steps.map((st) => st.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const st of t.steps) {
        const checks = [st.check, st.synthCheck, st.promptCheck].filter(
          Boolean,
        );
        // A validated step declares one check, and points at what it asks.
        expect(checks.length, `${t.id}/${st.id}`).toBeLessThanOrEqual(1);
        if (checks.length) expect(st.target, `${t.id}/${st.id}`).toBeDefined();
      }
    }
  });
});
