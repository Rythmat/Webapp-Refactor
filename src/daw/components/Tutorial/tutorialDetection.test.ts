// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, type AllSlices } from '@/daw/store';
import type { SynthStore } from '@/daw/oracle-synth/store';
import { TUTORIALS, getTutorial, type TutorialStep } from './tutorials';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

const INTRO = 'make-first-track';
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

describe('intro lesson checks (pure)', () => {
  const armed = mock({});

  it('add-track accepts a melodic MIDI track, not a drum machine', () => {
    const check = stepOf(INTRO, 'add-track').check!;
    const withTrack = (instrument: string, type = 'midi') =>
      mock({ tracks: [{ id: 't1', type, instrument }], selectedTrackId: 't1' });
    expect(check(withTrack('oracle-synth'), armed)).toBe(true);
    // Drum machines are type 'midi' but Prism is hidden for them.
    expect(check(withTrack('drum-machine'), armed)).toBe(false);
    // Audio-input tracks are not type 'midi'.
    expect(check(withTrack('vocal-fx', 'audio'), armed)).toBe(false);
    expect(check(mock({ tracks: [], selectedTrackId: null }), armed)).toBe(
      false,
    );
  });

  it('pick-key passes only for G (rootNote 7)', () => {
    const check = stepOf(INTRO, 'pick-key').check!;
    expect(check(mock({ rootNote: null }), armed)).toBe(false);
    expect(check(mock({ rootNote: 2 }), armed)).toBe(false);
    expect(check(mock({ rootNote: 7 }), armed)).toBe(true);
  });

  it('add-chords needs at least three chords', () => {
    const check = stepOf(INTRO, 'add-chords').check!;
    expect(check(mock({ chordSeq: [[60], [64]] }), armed)).toBe(false);
    expect(check(mock({ chordSeq: [[60], [64], [67]] }), armed)).toBe(true);
  });

  it('add-swing requires a change AND a value above 20', () => {
    const check = stepOf(INTRO, 'add-swing').check!;
    const armed30 = mock({ swing: 30 });
    expect(check(mock({ swing: 30 }), armed30)).toBe(false);
    expect(check(mock({ swing: 35 }), armed30)).toBe(true);
    expect(check(mock({ swing: 10 }), armed30)).toBe(false);
  });

  it('create fires when chordRegions is replaced with a fresh non-empty array', () => {
    const check = stepOf(INTRO, 'create').check!;
    const armedEmpty = mock({ chordRegions: [] });
    expect(check(mock({ chordRegions: [] }), armedEmpty)).toBe(false);
    const regs = [{}];
    expect(
      check(mock({ chordRegions: regs }), mock({ chordRegions: regs })),
    ).toBe(false);
    expect(check(mock({ chordRegions: [{}] }), armedEmpty)).toBe(true);
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

describe('genre pack — Pop (Chops) checks', () => {
  const chopsTrack = (events: unknown[], extra: Record<string, unknown> = {}) =>
    mock({
      tracks: [
        {
          id: 's1',
          type: 'midi',
          instrument: 'sampler',
          activeEffects: [],
          midiClips: [{ id: 'c1', events }],
          ...extra,
        },
      ],
      selectedTrackId: 's1',
    });

  const otherInstrumentTrack = () =>
    mock({
      tracks: [{ id: 'd1', type: 'midi', instrument: 'drum-machine' }],
      selectedTrackId: 'd1',
    });

  it('add-chops requires a selected sampler track', () => {
    const check = stepOf('pop-flip-a-sample', 'add-chops').check!;
    expect(check(chopsTrack([]), mock({}))).toBe(true);
    expect(check(otherInstrumentTrack(), mock({}))).toBe(false);
  });

  it('load-sample requires a NEW sample identity (change-based)', () => {
    const check = stepOf('pop-flip-a-sample', 'load-sample').check!;
    const sample = {
      sampleId: 'smp-1',
      assetId: null,
      rootNote: 'C4',
      attack: 0.005,
      release: 0.25,
    };
    const empty = chopsTrack([]);
    const loaded = chopsTrack([], { samplerSample: sample });
    // No sample at all → not done
    expect(check(empty, empty)).toBe(false);
    // Sample loaded after arming → done
    expect(check(loaded, empty)).toBe(true);
    // Same sample already present when armed → not done (replay-safe)
    expect(check(loaded, chopsTrack([], { samplerSample: sample }))).toBe(
      false,
    );
    // Knob/root tweak replaces the object but keeps the sampleId → not done
    const tweaked = chopsTrack([], {
      samplerSample: { ...sample, rootNote: 'D4', attack: 0.1 },
    });
    expect(check(tweaked, loaded)).toBe(false);
    // A genuine replace mints a new sampleId → done
    const replaced = chopsTrack([], {
      samplerSample: { ...sample, sampleId: 'smp-2' },
    });
    expect(check(replaced, loaded)).toBe(true);
  });

  it('play-notes requires 3 more events than when armed', () => {
    const check = stepOf('pop-flip-a-sample', 'play-notes').check!;
    const armed = chopsTrack([{}]);
    expect(check(chopsTrack([{}, {}, {}]), armed)).toBe(false); // +2
    expect(check(chopsTrack([{}, {}, {}, {}]), armed)).toBe(true); // +3
  });

  it('space-it-out requires the delay effect active', () => {
    const check = stepOf('pop-flip-a-sample', 'space-it-out').check!;
    expect(check(chopsTrack([], { activeEffects: ['delay'] }), mock({}))).toBe(
      true,
    );
    expect(check(chopsTrack([]), mock({}))).toBe(false);
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
  it('open-prism check flips when the Prism tab is opened', () => {
    const check = stepOf(INTRO, 'open-prism').check!;
    s().setChannelStripTab('controls');
    const armed = s();
    expect(check(s(), armed)).toBe(false);
    s().setChannelStripTab('prism');
    expect(check(s(), armed)).toBe(true);
  });

  it('a store subscription (as useTutorialDetection uses) detects the key change', () => {
    const step = stepOf(INTRO, 'pick-key');
    s().setRootNote(null); // ensure not G
    const armed = s();
    let completed = false;
    const unsub = useStore.subscribe((st) => {
      if (step.check!(st, armed)) completed = true;
    });
    expect(completed).toBe(false);
    s().setRootNote(3); // wrong key → still waiting
    expect(completed).toBe(false);
    s().setRootNote(7); // G → detected
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
  it('is eight lessons with unique ids, unique step ids, and a target per step', () => {
    expect(TUTORIALS.length).toBe(8);
    const lessonIds = TUTORIALS.map((t) => t.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    for (const t of TUTORIALS) {
      const ids = t.steps.map((st) => st.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const st of t.steps) {
        expect(st.target).toBeDefined();
        // A validated step declares check OR synthCheck, never both.
        expect(st.check && st.synthCheck).toBeFalsy();
      }
    }
  });
});
