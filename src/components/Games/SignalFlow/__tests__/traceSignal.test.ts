import { describe, expect, it } from 'vitest';
import { initialControls, MIC_LEVEL } from '../rig/gearDefs';
import {
  fitProblem,
  missionReducer,
  startMission,
  clearedCleanly,
} from '../rig/missionReducer';
import { missionById } from '../rig/missions';
import type {
  Cable,
  CableKind,
  ControlValue,
  GearKind,
  RigEnv,
  RigState,
} from '../rig/rigTypes';
import {
  HUM,
  cableEdges,
  chainFrom,
  reaches,
  sinkHiss,
  sinkHum,
  sinkLevel,
  traceSignal,
  wouldLoop,
} from '../rig/traceSignal';

// The facts the game teaches are the facts its rules run on.

type Spec =
  | GearKind
  | {
      kind: GearKind;
      channels?: number;
      controls?: Record<string, ControlValue>;
    };

function rig(
  gear: Record<string, Spec>,
  cables: [CableKind, string, string][] = [],
  env: RigEnv = {},
): RigState {
  const ref = (text: string) => {
    const [g, port] = text.split('/');
    return { gear: g, port };
  };
  return {
    gear: Object.fromEntries(
      Object.entries(gear).map(([id, spec]) => {
        const s = typeof spec === 'string' ? { kind: spec } : spec;
        return [
          id,
          {
            id,
            kind: s.kind,
            channels: 'channels' in s ? s.channels : undefined,
            placed: true,
            controls: initialControls(
              s,
              'controls' in s ? s.controls : undefined,
            ),
          },
        ];
      }),
    ),
    cables: cables.map(
      ([kind, a, b], i): Cable => ({
        id: `c${i + 1}`,
        kind,
        a: ref(a),
        b: ref(b),
      }),
    ),
    env,
  };
}

describe('levels', () => {
  it('leaves a mic at mic level, and the gain stage lifts it about 20 dB', () => {
    const trace = traceSignal(
      rig(
        {
          mic: 'dynamicMic',
          mixer: { kind: 'mixer', channels: 4 },
          speaker: 'speaker',
        },
        [
          ['xlr', 'mic/out', 'mixer/ch1'],
          ['xlr', 'mixer/main', 'speaker/in'],
        ],
      ),
    );
    expect(trace.cables.c1.levelDb).toBe(MIC_LEVEL);
    expect(trace.cables.c2.levelDb).toBeCloseTo(MIC_LEVEL + 20);
  });

  it('is far too quiet with a mic in a line input, and fine in a mic input', () => {
    const level = (inputMode: string) =>
      sinkLevel(
        traceSignal(
          rig(
            {
              mic: 'dynamicMic',
              speaker: { kind: 'speaker', controls: { inputMode } },
            },
            [['xlr', 'mic/out', 'speaker/in']],
          ),
        ),
        'speaker',
      );
    expect(level('mic') - level('line')).toBeCloseTo(20);
  });

  it('clips when the gain is too high', () => {
    const trace = traceSignal(
      rig(
        {
          mic: 'dynamicMic',
          speaker: {
            kind: 'speaker',
            controls: { inputMode: 'mic', gain: 16 },
          },
        },
        [['xlr', 'mic/out', 'speaker/in']],
      ),
    );
    expect(trace.clipped).toContain('speaker/gain');
  });

  it('raises the hiss with the volume, not with the gain', () => {
    const hiss = (gain: number, volume: number) =>
      sinkHiss(
        traceSignal(
          rig(
            {
              mic: 'dynamicMic',
              speaker: {
                kind: 'speaker',
                controls: { inputMode: 'mic', gain, volume },
              },
            },
            [['xlr', 'mic/out', 'speaker/in']],
            { noiseFloorDb: -50 },
          ),
        ),
        'speaker',
      );
    expect(hiss(0, 14) - hiss(0, 0)).toBeCloseTo(14);
    expect(hiss(10, 0)).toBeCloseTo(hiss(0, 0));
  });
});

describe('direction', () => {
  it('passes nothing through a pedal plugged in backwards', () => {
    const trace = traceSignal(
      rig({ guitar: 'guitar', pedal: 'overdrive', amp: 'amp' }, [
        ['ts', 'guitar/out', 'pedal/out'],
        ['ts', 'pedal/in', 'amp/in'],
      ]),
    );
    expect(trace.cables.c1.dead).toBe(true);
    expect(trace.cables.c2.dead).toBe(true);
    expect(reaches(trace, 'amp', 'guitar')).toBe(false);
  });

  it('works whichever end of a cable went in first', () => {
    const a = rig({ guitar: 'guitar', amp: 'amp' }, [
      ['ts', 'guitar/out', 'amp/in'],
    ]);
    const b = rig({ guitar: 'guitar', amp: 'amp' }, [
      ['ts', 'amp/in', 'guitar/out'],
    ]);
    expect(reaches(traceSignal(a), 'amp', 'guitar')).toBe(true);
    expect(reaches(traceSignal(b), 'amp', 'guitar')).toBe(true);
  });

  it('follows the chain in signal order', () => {
    const r = rig(
      { guitar: 'guitar', drive: 'overdrive', echo: 'delay', amp: 'amp' },
      [
        ['ts', 'guitar/out', 'echo/in'],
        ['ts', 'echo/out', 'drive/in'],
        ['ts', 'drive/out', 'amp/in'],
      ],
    );
    expect(chainFrom(r, 'guitar')).toEqual(['guitar', 'echo', 'drive', 'amp']);
  });
});

describe('MIDI', () => {
  const studio = (extra: [CableKind, string, string][] = []) =>
    rig(
      {
        keys: 'midiKeyboard',
        laptop: 'laptop',
        iface: 'interface',
        monitor: 'monitor',
      },
      [
        ['usb', 'keys/out', 'laptop/usb1'],
        ['usb', 'iface/usb', 'laptop/usb2'],
        ['trs', 'iface/mon', 'monitor/in'],
        ...extra,
      ],
    );

  it('carries notes, and no sound', () => {
    const trace = traceSignal(studio());
    expect(trace.cables.c1.notes).toBe(true);
    expect(trace.cables.c1.levelDb).toBe(-Infinity);
  });

  it('plays the laptop’s instrument, which is the first sound on a cable', () => {
    const trace = traceSignal(studio());
    expect(trace.cables.c2.levelDb).toBeGreaterThan(-30);
    expect(reaches(trace, 'monitor', 'keys')).toBe(true);
  });

  it('leaves the instrument silent with no notes arriving', () => {
    const trace = traceSignal(
      rig({ laptop: 'laptop', iface: 'interface', monitor: 'monitor' }, [
        ['usb', 'iface/usb', 'laptop/usb2'],
        ['trs', 'iface/mon', 'monitor/in'],
      ]),
    );
    expect(reaches(trace, 'monitor', 'keys')).toBe(false);
  });
});

describe('phantom power', () => {
  const condenser = (phantom: string) =>
    traceSignal(
      rig(
        {
          mic: 'condenserMic',
          iface: { kind: 'interface', controls: { phantom } },
        },
        [['xlr', 'mic/out', 'iface/in1']],
      ),
    );

  it('wakes a condenser, which is silent without it', () => {
    expect(condenser('off').cables.c1.levelDb).toBe(-Infinity);
    expect(condenser('on').cables.c1.levelDb).toBe(MIC_LEVEL);
  });

  it('isn’t needed by a dynamic mic', () => {
    const trace = traceSignal(
      rig({ mic: 'dynamicMic', iface: 'interface' }, [
        ['xlr', 'mic/out', 'iface/in1'],
      ]),
    );
    expect(trace.cables.c1.levelDb).toBe(MIC_LEVEL);
  });
});

describe('hum', () => {
  const FAR = { farGear: ['mixer'] };
  const gear = {
    guitar: 'guitar',
    di: 'di',
    mixer: { kind: 'mixer', channels: 4 },
    speaker: 'speaker',
  } as const;

  it('gets into a long instrument lead, and not a long XLR', () => {
    const long = traceSignal(
      rig(
        gear,
        [
          ['ts', 'guitar/out', 'mixer/ch1'],
          ['xlr', 'mixer/main', 'speaker/in'],
        ],
        FAR,
      ),
    );
    expect(long.cables.c1.levels[HUM]).toBeDefined();
    expect(sinkHum(long, 'speaker')).toBeGreaterThan(-60);

    const balanced = traceSignal(
      rig(
        gear,
        [
          ['ts', 'guitar/out', 'di/in'],
          ['xlr', 'di/out', 'mixer/ch1'],
          ['xlr', 'mixer/main', 'speaker/in'],
        ],
        FAR,
      ),
    );
    expect(balanced.cables.c2.levels[HUM]).toBeUndefined();
    expect(sinkHum(balanced, 'speaker')).toBe(-Infinity);
  });

  it('comes from a ground loop until the DI’s ground is lifted', () => {
    const withLift = (lift: string) =>
      traceSignal(
        rig(
          {
            ...gear,
            di: { kind: 'di', controls: { lift } },
          },
          [
            ['ts', 'guitar/out', 'di/in'],
            ['xlr', 'di/out', 'mixer/ch1'],
            ['xlr', 'mixer/main', 'speaker/in'],
          ],
          { groundLoop: true },
        ),
      );
    expect(sinkHum(withLift('off'), 'speaker')).toBeGreaterThan(-60);
    expect(sinkHum(withLift('on'), 'speaker')).toBe(-Infinity);
  });
});

describe('the mixer', () => {
  const desk = (controls: Record<string, ControlValue>) =>
    traceSignal(
      rig(
        {
          mic: 'dynamicMic',
          guitar: 'guitar',
          mixer: { kind: 'mixer', channels: 4, controls },
          speaker: 'speaker',
          wedge: 'wedge',
        },
        [
          ['xlr', 'mic/out', 'mixer/ch1'],
          ['ts', 'guitar/out', 'mixer/ch2'],
          ['xlr', 'mixer/main', 'speaker/in'],
          ['xlr', 'mixer/aux', 'wedge/in'],
        ],
      ),
    );

  it('keeps a post-fader aux tied to the fader', () => {
    const up = desk({ aux1: -6, fader1: 0, auxMode: 'post' });
    const down = desk({ aux1: -6, fader1: -30, auxMode: 'post' });
    expect(sinkLevel(up, 'wedge') - sinkLevel(down, 'wedge')).toBeCloseTo(30);
  });

  it('frees a pre-fader aux from the fader', () => {
    const up = desk({ aux1: -6, fader1: 0, auxMode: 'pre' });
    const down = desk({ aux1: -6, fader1: -30, auxMode: 'pre' });
    expect(sinkLevel(up, 'wedge')).toBeCloseTo(sinkLevel(down, 'wedge'));
    expect(sinkLevel(down, 'speaker')).toBeLessThan(sinkLevel(up, 'speaker'));
  });

  it('solo leaves one channel in the mains', () => {
    const trace = desk({ solo: '2' });
    expect(reaches(trace, 'speaker', 'guitar')).toBe(true);
    expect(reaches(trace, 'speaker', 'vox')).toBe(false);
  });

  it('carries every lane of a multicore', () => {
    const trace = traceSignal(
      rig(
        {
          mic: 'dynamicMic',
          box: 'stageBox',
          mixer: { kind: 'mixer', channels: 8 },
          speaker: 'speaker',
        },
        [
          ['xlr', 'mic/out', 'box/in5'],
          ['multicore', 'box/multi', 'mixer/multi'],
          ['xlr', 'mixer/main', 'speaker/in'],
        ],
      ),
    );
    expect(reaches(trace, 'speaker', 'vox')).toBe(true);
    const r = rig({ box: 'stageBox', mixer: { kind: 'mixer', channels: 8 } }, [
      ['multicore', 'box/multi', 'mixer/multi'],
    ]);
    expect(cableEdges(r, r.cables[0])).toHaveLength(8);
  });
});

describe('what the plugs allow', () => {
  const r = rig({
    mic: 'dynamicMic',
    speaker: 'speaker',
    guitar: 'guitar',
    pedal: 'overdrive',
    amp: 'amp',
  });
  const ref = (gear: string, port: string) => ({ gear, port });

  it('refuses a plug the jack doesn’t take, and says what it does', () => {
    expect(fitProblem(r, 'ts', ref('mic', 'out'), null)).toContain('XLR');
    expect(fitProblem(r, 'xlr', ref('mic', 'out'), null)).toBeNull();
  });

  it('explains that speakON is for passive speakers', () => {
    expect(fitProblem(r, 'speakon', ref('speaker', 'in'), null)).toContain(
      'passive',
    );
  });

  it('won’t let an XLR join two inputs, because its ends differ', () => {
    expect(
      fitProblem(r, 'xlr', ref('speaker', 'in'), ref('amp', 'in')),
    ).toBeTruthy();
  });

  it('will let a jack cable join two outputs, because it physically fits', () => {
    expect(
      fitProblem(r, 'ts', ref('guitar', 'out'), ref('pedal', 'out')),
    ).toBeNull();
  });

  it('refuses a loop, which would feed back on itself', () => {
    expect(wouldLoop(r, ref('pedal', 'out'), ref('pedal', 'in'))).toBe(true);
    const chain = rig({ a: 'overdrive', b: 'delay' }, [
      ['ts', 'a/out', 'b/in'],
    ]);
    expect(wouldLoop(chain, ref('b', 'out'), ref('a', 'in'))).toBe(true);
  });

  it('allows USB both ways, which isn’t a loop', () => {
    const usb = rig({ iface: 'interface', laptop: 'laptop' });
    expect(wouldLoop(usb, ref('iface', 'usb'), ref('laptop', 'usb1'))).toBe(
      false,
    );
  });
});

describe('playing a mission', () => {
  const start = (id: string) => {
    const mission = missionById(id);
    if (!mission) throw new Error(id);
    return startMission(mission);
  };

  it('counts a plug that won’t fit as a mistake, and undoes a patch', () => {
    let state = start('voice-build');
    state = missionReducer(state, { type: 'placeGear', gear: 'mic' });
    state = missionReducer(state, { type: 'placeGear', gear: 'speaker' });
    state = missionReducer(state, { type: 'pickCable', cable: 'ts' });
    state = missionReducer(state, {
      type: 'pressPort',
      port: { gear: 'mic', port: 'out' },
    });
    expect(state.mistakes).toBe(1);
    expect(state.refusal?.reason).toContain('XLR');
    expect(state.rig.cables).toHaveLength(0);

    state = missionReducer(state, { type: 'undo' });
    expect(state.rig.gear.speaker.placed).toBe(false);
  });

  it('refuses gear the job doesn’t need', () => {
    const state = missionReducer(start('voice-build'), {
      type: 'placeGear',
      gear: 'guitar',
    });
    expect(state.rig.gear.guitar.placed).toBe(false);
    expect(state.mistakes).toBe(1);
  });

  it('won’t accept a wrong answer, and says why', () => {
    let state = start('voice-probe');
    state = missionReducer(state, { type: 'probe', cable: 'mic-cable' });
    state = missionReducer(state, { type: 'probe', cable: 'main-cable' });
    state = missionReducer(state, { type: 'probe', cable: 'mic-cable' });
    state = missionReducer(state, { type: 'confirm' });
    expect(state.won).toBe(false);
    expect(state.refusal?.reason).toContain('weaker');
  });

  it('thumps when a mixer wakes through a live speaker, until both are off', () => {
    let state = start('voice-fix');
    const set = (gear: string, value: string) => {
      state = missionReducer(state, {
        type: 'setControl',
        gear,
        control: 'power',
        value,
      });
    };
    state = missionReducer(state, { type: 'pickCable', cable: 'iec' });
    for (const [a, b] of [
      ['strip/socket1', 'mixer/power'],
      ['strip/socket2', 'speaker/power'],
    ]) {
      for (const text of [a, b]) {
        const [gear, port] = text.split('/');
        state = missionReducer(state, {
          type: 'pressPort',
          port: { gear, port },
        });
      }
    }
    set('speaker', 'on');
    set('mixer', 'on');
    expect(state.thumped).toBe(true);
    expect(state.thumpNonce).toBe(1);
    expect(state.won).toBe(false);
    set('speaker', 'off');
    set('mixer', 'off');
    expect(state.thumped).toBe(false);
    set('mixer', 'on');
    set('speaker', 'on');
    expect(state.thumpNonce).toBe(1);
    expect(state.won).toBe(true);
  });

  it('counts up to two mistakes as clean, and a hint as help', () => {
    const base = start('voice-build');
    expect(clearedCleanly({ ...base, mistakes: 2 })).toBe(true);
    expect(clearedCleanly({ ...base, mistakes: 3 })).toBe(false);
    expect(clearedCleanly(missionReducer(base, { type: 'hint' }))).toBe(false);
  });

  it('trades pedals’ places, cables and all', () => {
    let state = start('guitar-order');
    state = missionReducer(state, { type: 'pressGear', gear: 'delay' });
    expect(state.swapping).toBe('delay');
    state = missionReducer(state, { type: 'pressGear', gear: 'overdrive' });
    expect(chainFrom(state.rig, 'guitar').slice(0, 3)).toEqual([
      'guitar',
      'overdrive',
      'delay',
    ]);
  });
});
