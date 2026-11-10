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

describe('genre pack — Jazz checks', () => {
  it('seventh-chord requires growth AND a 7 in the new chord', () => {
    const check = stepOf('jazz-color-your-chords', 'seventh-chord').check!;
    const armed = mock({ stringSeq: ['1 maj'] });
    expect(check(mock({ stringSeq: ['1 maj', '2 min7'] }), armed)).toBe(true);
    expect(check(mock({ stringSeq: ['1 maj', '4 maj'] }), armed)).toBe(false);
    // No growth (same length) → not satisfied even if a 7th exists.
    expect(check(mock({ stringSeq: ['1 maj7'] }), armed)).toBe(false);
  });

  it('jazz-rhythm requires a changed, Jazz-family pattern', () => {
    const check = stepOf('jazz-color-your-chords', 'jazz-rhythm').check!;
    const armed = mock({ rhythmName: 'Quarters' });
    expect(check(mock({ rhythmName: 'Jazz 2' }), armed)).toBe(true);
    expect(check(mock({ rhythmName: 'Eighths' }), armed)).toBe(false);
    // Unchanged Jazz pattern (e.g. genre preset already set it) → must change.
    expect(
      check(mock({ rhythmName: 'Jazz 2' }), mock({ rhythmName: 'Jazz 2' })),
    ).toBe(false);
  });

  it('mode-dorian matches the exact mode key', () => {
    const check = stepOf('jazz-color-your-chords', 'mode-dorian').check!;
    expect(check(mock({ mode: 'dorian' }), mock({}))).toBe(true);
    expect(check(mock({ mode: 'ionian' }), mock({}))).toBe(false);
  });
});

describe('genre pack — Hip Hop checks', () => {
  const drumTrack = (events: unknown[], extra: Record<string, unknown> = {}) =>
    mock({
      tracks: [
        {
          id: 'd1',
          type: 'midi',
          instrument: 'drum-machine',
          midiClips: [{ id: 'c1', events }],
          ...extra,
        },
      ],
      selectedTrackId: 'd1',
    });

  it('add-drums requires a selected drum-machine track', () => {
    const check = stepOf('hiphop-build-the-beat', 'add-drums').check!;
    expect(check(drumTrack([]), mock({}))).toBe(true);
    expect(
      check(
        mock({
          tracks: [{ id: 't1', type: 'midi', instrument: 'oracle-synth' }],
          selectedTrackId: 't1',
        }),
        mock({}),
      ),
    ).toBe(false);
  });

  it('swap-kit requires the selected drum track to use the 808 kit', () => {
    const check = stepOf('hiphop-build-the-beat', 'swap-kit').check!;
    expect(check(drumTrack([], { drumKit: '808' }), mock({}))).toBe(true);
    expect(check(drumTrack([], { drumKit: 'natural' }), mock({}))).toBe(false);
    expect(check(drumTrack([]), mock({}))).toBe(false); // kit never set
  });

  it('program-hits requires 4 more events than when armed', () => {
    const check = stepOf('hiphop-build-the-beat', 'program-hits').check!;
    const armed = drumTrack([{}, {}]);
    expect(check(drumTrack([{}, {}, {}, {}, {}]), armed)).toBe(false); // +3
    expect(check(drumTrack([{}, {}, {}, {}, {}, {}]), armed)).toBe(true); // +4
  });

  it('slow-bpm requires ≤95 and a change', () => {
    const check = stepOf('hiphop-build-the-beat', 'slow-bpm').check!;
    expect(check(mock({ bpm: 90 }), mock({ bpm: 120 }))).toBe(true);
    expect(check(mock({ bpm: 120 }), mock({ bpm: 120 }))).toBe(false);
    expect(check(mock({ bpm: 90 }), mock({ bpm: 90 }))).toBe(false);
  });

  it('load-groove requires the clip count to grow', () => {
    const check = stepOf('hiphop-build-the-beat', 'load-groove').check!;
    const one = drumTrack([]);
    const two = mock({
      tracks: [
        {
          id: 'd1',
          instrument: 'drum-machine',
          midiClips: [{ id: 'c1' }, { id: 'c2' }],
        },
      ],
      selectedTrackId: 'd1',
    });
    expect(check(two, one)).toBe(true);
    expect(check(one, one)).toBe(false);
  });

  it('pad-mix requires the drumPads reference to change', () => {
    const check = stepOf('hiphop-build-the-beat', 'pad-mix').check!;
    const pads = { 36: { volume: 0.8, pan: 0 } };
    const before = drumTrack([], { drumPads: pads });
    const unchanged = drumTrack([], { drumPads: pads });
    const changed = drumTrack([], { drumPads: { ...pads } });
    expect(check(unchanged, before)).toBe(false);
    expect(check(changed, before)).toBe(true);
  });
});

describe('genre pack — EDM checks', () => {
  it('load-wobble synthCheck matches the WOBBLE preset', () => {
    const synthCheck = stepOf('edm-design-the-drop', 'load-wobble').synthCheck!;
    const sy = (presetName: string) =>
      ({ presetName }) as unknown as SynthStore;
    expect(synthCheck(sy('WOBBLE'), sy('INITIALIZE'))).toBe(true);
    expect(synthCheck(sy('BASS'), sy('INITIALIZE'))).toBe(false);
  });

  it('minor-mode requires aeolian', () => {
    const check = stepOf('edm-design-the-drop', 'minor-mode').check!;
    expect(check(mock({ mode: 'aeolian' }), mock({}))).toBe(true);
    expect(check(mock({ mode: 'dorian' }), mock({}))).toBe(false);
  });

  it('saturate requires saturator among active effects', () => {
    const check = stepOf('edm-design-the-drop', 'saturate').check!;
    const withFx = (activeEffects: string[]) =>
      mock({
        tracks: [{ id: 't1', instrument: 'oracle-synth', activeEffects }],
        selectedTrackId: 't1',
      });
    expect(check(withFx(['saturator']), mock({}))).toBe(true);
    expect(check(withFx(['reverb']), mock({}))).toBe(false);
    expect(check(mock({ tracks: [], selectedTrackId: null }), mock({}))).toBe(
      false,
    );
  });

  it('add-ott requires the multiband effect among active effects', () => {
    const check = stepOf('edm-design-the-drop', 'add-ott').check!;
    const selected = (activeEffects: string[]) =>
      mock({
        tracks: [{ id: 'm1', instrument: 'oracle-synth', activeEffects }],
        selectedTrackId: 'm1',
      });
    expect(check(selected(['multiband']), mock({}))).toBe(true);
    expect(check(selected(['saturator', 'reverb']), mock({}))).toBe(false);
    expect(check(selected([]), mock({}))).toBe(false);
  });

  it('push-depth requires depth raised past 40% (an increase from armed)', () => {
    const check = stepOf('edm-design-the-drop', 'push-depth').check!;
    const withDepth = (depth: number) =>
      mock({
        tracks: [{ id: 't1', effects: { multiband: { depth } } }],
        selectedTrackId: 't1',
      });
    // Raised from the default 0.3 up past 40% → done
    expect(check(withDepth(0.6), withDepth(0.3))).toBe(true);
    // Unchanged at the default 0.3 (below threshold) → not done
    expect(check(withDepth(0.3), withDepth(0.3))).toBe(false);
    // Above threshold but NOT increased vs armed (e.g. only another knob moved,
    // or depth already high on arm) → not done, so it can't auto-satisfy
    expect(check(withDepth(0.6), withDepth(0.6))).toBe(false);
    // Increased but still at/below 40% → not done
    expect(check(withDepth(0.4), withDepth(0.3))).toBe(false);
    // LOWERING depth → not done
    expect(check(withDepth(0.45), withDepth(0.7))).toBe(false);
  });
});

describe('genre pack — House (sidechain) checks', () => {
  const bassWithDucker = (ducker: Record<string, unknown>, drumId = 'd1') =>
    mock({
      tracks: [
        { id: drumId, instrument: 'drum-machine' },
        {
          id: 'b1',
          instrument: 'oracle-synth',
          activeEffects: ['ducker'],
          effects: { ducker },
        },
      ],
      selectedTrackId: 'b1',
    });

  it('add-drums requires a drum-machine track anywhere', () => {
    const check = stepOf('house-make-it-pump', 'add-drums').check!;
    expect(
      check(
        mock({ tracks: [{ id: 'd1', instrument: 'drum-machine' }] }),
        mock({}),
      ),
    ).toBe(true);
    expect(
      check(
        mock({ tracks: [{ id: 's1', instrument: 'oracle-synth' }] }),
        mock({}),
      ),
    ).toBe(false);
  });

  it('add-ducker requires the ducker on the selected synth', () => {
    const check = stepOf('house-make-it-pump', 'add-ducker').check!;
    expect(
      check(
        mock({
          tracks: [
            { id: 'b1', instrument: 'oracle-synth', activeEffects: ['ducker'] },
          ],
          selectedTrackId: 'b1',
        }),
        mock({}),
      ),
    ).toBe(true);
    expect(
      check(
        mock({
          tracks: [{ id: 'b1', instrument: 'oracle-synth', activeEffects: [] }],
          selectedTrackId: 'b1',
        }),
        mock({}),
      ),
    ).toBe(false);
  });

  it('set-key requires the ducker key to equal the drum track id', () => {
    const check = stepOf('house-make-it-pump', 'set-key').check!;
    // Key points at the drum track → done
    expect(check(bassWithDucker({ keyTrackId: 'd1' }), mock({}))).toBe(true);
    // Key still null → not done
    expect(check(bassWithDucker({ keyTrackId: null }), mock({}))).toBe(false);
    // Key points somewhere else → not done
    expect(check(bassWithDucker({ keyTrackId: 'x9' }), mock({}))).toBe(false);
  });

  it('raise-amount requires amount raised past 40% from armed', () => {
    const check = stepOf('house-make-it-pump', 'raise-amount').check!;
    const armed = bassWithDucker({ keyTrackId: 'd1', amount: 0.2 });
    expect(
      check(bassWithDucker({ keyTrackId: 'd1', amount: 0.6 }), armed),
    ).toBe(true);
    // At/below 40% → not done
    expect(
      check(bassWithDucker({ keyTrackId: 'd1', amount: 0.4 }), armed),
    ).toBe(false);
    // Above 40% but unchanged from armed → not done
    const armedHot = bassWithDucker({ keyTrackId: 'd1', amount: 0.6 });
    expect(
      check(bassWithDucker({ keyTrackId: 'd1', amount: 0.6 }), armedHot),
    ).toBe(false);
  });
});

describe('genre pack — R&B checks', () => {
  const trackWith = (extra: Record<string, unknown>) =>
    mock({
      tracks: [
        { id: 't1', type: 'midi', instrument: 'oracle-synth', ...extra },
      ],
      selectedTrackId: 't1',
    });

  it('add-reverb requires reverb among active effects', () => {
    const check = stepOf('rnb-mix-and-polish', 'add-reverb').check!;
    expect(check(trackWith({ activeEffects: ['reverb'] }), mock({}))).toBe(
      true,
    );
    expect(check(trackWith({ activeEffects: [] }), mock({}))).toBe(false);
  });

  it('tweak-reverb requires the reverb params reference to change', () => {
    const check = stepOf('rnb-mix-and-polish', 'tweak-reverb').check!;
    const rev = { enabled: true, wet: 0.3 };
    const before = trackWith({ effects: { reverb: rev } });
    const unchanged = trackWith({ effects: { reverb: rev } });
    const changed = trackWith({ effects: { reverb: { ...rev, wet: 0.5 } } });
    expect(check(unchanged, before)).toBe(false);
    expect(check(changed, before)).toBe(true);
  });

  it('goto-master requires the studio view', () => {
    const check = stepOf('rnb-mix-and-polish', 'goto-master').check!;
    expect(check(mock({ currentView: 'studio' }), mock({}))).toBe(true);
    expect(check(mock({ currentView: 'arrange' }), mock({}))).toBe(false);
  });

  it('balance-fader requires some track volume to differ from armed', () => {
    const check = stepOf('rnb-mix-and-polish', 'balance-fader').check!;
    const armed = mock({ tracks: [{ id: 't1', volume: 0.8 }] });
    expect(check(mock({ tracks: [{ id: 't1', volume: 0.6 }] }), armed)).toBe(
      true,
    );
    expect(check(mock({ tracks: [{ id: 't1', volume: 0.8 }] }), armed)).toBe(
      false,
    );
  });

  it('use-send requires a track send A raised past 25% from armed', () => {
    const check = stepOf('rnb-mix-and-polish', 'use-send').check!;
    const armed = mock({ tracks: [{ id: 't1', sends: {} }] });
    // Raised past 25% → done
    expect(
      check(mock({ tracks: [{ id: 't1', sends: { A: 0.4 } }] }), armed),
    ).toBe(true);
    // At/below 25% → not done
    expect(
      check(mock({ tracks: [{ id: 't1', sends: { A: 0.25 } }] }), armed),
    ).toBe(false);
    // Above 25% but unchanged from armed (already set) → not done
    const armedHot = mock({ tracks: [{ id: 't1', sends: { A: 0.4 } }] });
    expect(
      check(mock({ tracks: [{ id: 't1', sends: { A: 0.4 } }] }), armedHot),
    ).toBe(false);
    // Send B doesn't satisfy the A check
    expect(
      check(mock({ tracks: [{ id: 't1', sends: { B: 0.9 } }] }), armed),
    ).toBe(false);
  });

  it('tweak-return requires Return A effects to change', () => {
    const check = stepOf('rnb-mix-and-polish', 'tweak-return').check!;
    const fx = { reverb: { wet: 1 } };
    const armed = mock({ returns: [{ id: 'A', effects: fx }] });
    // Same reference → not done
    expect(check(mock({ returns: [{ id: 'A', effects: fx }] }), armed)).toBe(
      false,
    );
    // New effects object (a knob moved) → done
    expect(
      check(mock({ returns: [{ id: 'A', effects: { ...fx } }] }), armed),
    ).toBe(true);
  });

  it('mastering-fx requires the mastering chain to grow', () => {
    const check = stepOf('rnb-mix-and-polish', 'mastering-fx').check!;
    expect(
      check(
        mock({ masteringFxChain: ['compressor'] }),
        mock({ masteringFxChain: [] }),
      ),
    ).toBe(true);
    expect(
      check(mock({ masteringFxChain: [] }), mock({ masteringFxChain: [] })),
    ).toBe(false);
  });

  it('asks for a click on the FX list, never a drag or a drop', () => {
    // The FX list's rows add their effect on a click and can't be dragged
    // (fx-mixer-19), so no step that points at one may ask for a drop.
    const fxListSteps = TUTORIALS.flatMap((t) => t.steps).filter((st) =>
      [st.target ?? []].flat().some((id) => id.startsWith('fx-add-')),
    );
    expect(fxListSteps.map((st) => st.id)).toContain('mastering-fx');
    for (const step of fxListSteps) {
      expect(step.instruction, step.id).not.toMatch(/\b(drag|drop)/i);
    }
    expect(stepOf('rnb-mix-and-polish', 'mastering-fx').instruction).toMatch(
      /\bclick\b/i,
    );
  });

  it('master-volume requires a change', () => {
    const check = stepOf('rnb-mix-and-polish', 'master-volume').check!;
    expect(
      check(mock({ masterVolume: 0.7 }), mock({ masterVolume: 0.8 })),
    ).toBe(true);
    expect(
      check(mock({ masterVolume: 0.8 }), mock({ masterVolume: 0.8 })),
    ).toBe(false);
  });

  it('bounce-mixdown fires when a fresh export advances the timestamp', () => {
    const check = stepOf('rnb-mix-and-polish', 'bounce-mixdown').check!;
    // Never exported → not done.
    expect(
      check(
        mock({ lastAudioExportAt: null }),
        mock({ lastAudioExportAt: null }),
      ),
    ).toBe(false);
    // A prior bounce that predates arming (same value) → not done (replay-safe).
    expect(
      check(
        mock({ lastAudioExportAt: 1000 }),
        mock({ lastAudioExportAt: 1000 }),
      ),
    ).toBe(false);
    // Fresh export after arming with no prior bounce → done.
    expect(
      check(
        mock({ lastAudioExportAt: 2000 }),
        mock({ lastAudioExportAt: null }),
      ),
    ).toBe(true);
    // Re-export during the step (timestamp advanced) → done.
    expect(
      check(
        mock({ lastAudioExportAt: 2000 }),
        mock({ lastAudioExportAt: 1000 }),
      ),
    ).toBe(true);
  });
});

describe('genre pack — Indie (automation) checks', () => {
  const withAutomation = (
    automation: Record<string, unknown> | undefined,
    openId = 't1',
  ) =>
    mock({
      tracks: [{ id: 't1', automation }],
      automationOpenTrackId: openId,
    });

  it('open-automation fires when a lane is disclosed', () => {
    const check = stepOf(
      'indie-movement-and-dynamics',
      'open-automation',
    ).check!;
    expect(check(mock({ automationOpenTrackId: 't1' }), mock({}))).toBe(true);
    expect(check(mock({ automationOpenTrackId: null }), mock({}))).toBe(false);
  });

  it('draw-volume requires ≥2 points on the OPEN track volume lane', () => {
    const check = stepOf('indie-movement-and-dynamics', 'draw-volume').check!;
    expect(
      check(withAutomation({ volume: [{ tick: 0, value: 1 }] }), mock({})),
    ).toBe(false);
    expect(
      check(
        withAutomation({
          volume: [
            { tick: 0, value: 1 },
            { tick: 480, value: 0 },
          ],
        }),
        mock({}),
      ),
    ).toBe(true);
    // Points on a different param don't satisfy the volume requirement.
    expect(
      check(
        withAutomation({
          pan: [
            { tick: 0, value: -1 },
            { tick: 480, value: 1 },
          ],
        }),
        mock({}),
      ),
    ).toBe(false);
    // A different open track → its (empty) lane, not t1's.
    expect(
      check(
        withAutomation(
          {
            volume: [
              { tick: 0, value: 1 },
              { tick: 1, value: 0 },
            ],
          },
          'other',
        ),
        mock({}),
      ),
    ).toBe(false);
  });

  it('hear-it fires once playback starts', () => {
    const check = stepOf('indie-movement-and-dynamics', 'hear-it').check!;
    expect(check(mock({ isPlaying: true }), mock({}))).toBe(true);
    expect(check(mock({ isPlaying: false }), mock({}))).toBe(false);
  });

  it('second-lane requires a second param lane on the open track', () => {
    const check = stepOf('indie-movement-and-dynamics', 'second-lane').check!;
    expect(
      check(withAutomation({ volume: [{ tick: 0, value: 1 }] }), mock({})),
    ).toBe(false);
    expect(
      check(
        withAutomation({
          volume: [{ tick: 0, value: 1 }],
          pan: [{ tick: 0, value: 0 }],
        }),
        mock({}),
      ),
    ).toBe(true);
    expect(check(withAutomation(undefined), mock({}))).toBe(false);
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
