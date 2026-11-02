import { describe, expect, it } from 'vitest';
import {
  missionReducer,
  rackFor,
  startMission,
  type MissionState,
} from '../rig/missionReducer';
import { ALL_MISSIONS, missionById } from '../rig/missions';
import { CONFIRM, SOLUTIONS } from './solutions';

// Any plug can be pulled at any time, so the rack must always hold what it
// takes to put it back. Nothing a student does should leave a mission stuck.

const pull = (state: MissionState, cable: string) =>
  missionReducer(state, { type: 'unplug', cable });

const replug = (state: MissionState, from: MissionState, cable: string) => {
  const original = from.rig.cables.find((c) => c.id === cable);
  if (!original) throw new Error(cable);
  // Only with what the rack really offers.
  expect(rackFor(state)).toContain(original.kind);
  let next = missionReducer(state, {
    type: 'pickCable',
    cable: original.kind,
  });
  next = missionReducer(next, { type: 'pressPort', port: original.a });
  return missionReducer(next, { type: 'pressPort', port: original.b });
};

describe('the cable rack', () => {
  it.each(ALL_MISSIONS.map((m) => m.id))(
    '%s offers every kind of cable on its bench',
    (id) => {
      const mission = missionById(id);
      if (!mission) throw new Error(id);
      const state = startMission(mission);
      for (const cable of state.rig.cables) {
        expect(rackFor(state), cable.id).toContain(cable.kind);
      }
    },
  );

  it.each(ALL_MISSIONS.map((m) => m.id))(
    '%s still offers what its own job asks for',
    (id) => {
      const mission = missionById(id);
      if (!mission) throw new Error(id);
      const state = startMission(mission);
      for (const kind of mission.rack) expect(rackFor(state)).toContain(kind);
    },
  );

  it('lists each kind once', () => {
    for (const mission of ALL_MISSIONS) {
      const rack = rackFor(startMission(mission));
      expect(new Set(rack).size, mission.id).toBe(rack.length);
    }
  });
});

describe('pulling a plug and putting it back', () => {
  it.each(ALL_MISSIONS.map((m) => m.id))(
    '%s returns to the same rig, whichever cable it was',
    (id) => {
      const mission = missionById(id);
      if (!mission) throw new Error(id);
      const start = startMission(mission);
      for (const cable of start.rig.cables) {
        const pulled = pull(start, cable.id);
        expect(pulled.rig.cables.some((c) => c.id === cable.id)).toBe(false);
        const back = replug(pulled, start, cable.id);
        // The same cable, so a question about it can still be answered.
        expect(back.rig.cables.map((c) => c.id).sort()).toEqual(
          start.rig.cables.map((c) => c.id).sort(),
        );
        expect(back.mistakes).toBe(0);
      }
    },
  );

  it('still answers a question about a cable that was pulled and replaced', () => {
    const mission = missionById('voice-probe');
    if (!mission) throw new Error('voice-probe');
    const start = startMission(mission);
    let state = replug(pull(start, 'mic-cable'), start, 'mic-cable');
    state = missionReducer(state, { type: 'pickCable', cable: null });
    state = missionReducer(state, { type: 'probe', cable: 'mic-cable' });
    state = missionReducer(state, { type: 'probe', cable: 'main-cable' });
    state = missionReducer(state, { type: 'confirm' });
    expect(state.won).toBe(true);
  });

  it('gives a cable a new name when it goes somewhere new', () => {
    const mission = missionById('band-check');
    if (!mission) throw new Error('band-check');
    let state = pull(startMission(mission), 'input-2');
    state = pull(state, 'input-3');
    state = missionReducer(state, { type: 'pickCable', cable: 'xlr' });
    state = missionReducer(state, {
      type: 'pressPort',
      port: { gear: 'kit', port: 'snare' },
    });
    state = missionReducer(state, {
      type: 'pressPort',
      port: { gear: 'box', port: 'in2' },
    });
    // input-2 ran from the hi-hat. This is a different cable.
    expect(state.rig.cables.some((c) => c.id === 'input-2')).toBe(false);
    expect(
      state.rig.cables.some((c) => c.a.port === 'snare' && c.b.port === 'in2'),
    ).toBe(true);
  });
});

// These jobs are the crowd's mix: the wedge's cable has no bearing on them.
const BESIDE_THE_POINT: Readonly<Record<string, readonly string[]>> = {
  'stage-balance': ['aux-cable'],
  'band-mix': ['aux-cable'],
};

describe('pulling a plug is never the answer', () => {
  it.each(ALL_MISSIONS.map((m) => m.id))(
    '%s can’t be cleared by unplugging something',
    (id) => {
      const mission = missionById(id);
      if (!mission) throw new Error(id);
      let state = startMission(mission);
      for (const action of SOLUTIONS[id]) {
        for (const cable of state.rig.cables) {
          if (cable.kind === 'iec') continue;
          const pulled = pull(state, cable.id);
          expect(pulled.step, `pulling ${cable.id}`).toBe(state.step);
          expect(pulled.won, `pulling ${cable.id}`).toBe(false);
          // Nor by unplugging something and then saying it sounds right. A
          // question about which cable is which doesn't depend on the sound.
          if (
            action === CONFIRM &&
            mission.activity !== 'probe' &&
            !BESIDE_THE_POINT[id]?.includes(cable.id)
          ) {
            const confirmed = missionReducer(pulled, CONFIRM);
            expect(confirmed.step, `confirming without ${cable.id}`).toBe(
              state.step,
            );
            expect(confirmed.won, `confirming without ${cable.id}`).toBe(false);
          }
        }
        state = missionReducer(state, action);
      }
      expect(state.won).toBe(true);
    },
  );
});
