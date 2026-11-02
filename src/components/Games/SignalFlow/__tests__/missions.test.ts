import { describe, expect, it } from 'vitest';
import {
  missionReducer,
  rackFor,
  startMission,
  type MissionAction,
  type MissionState,
} from '../rig/missionReducer';
import { ALL_MISSIONS, CHAPTERS, missionById } from '../rig/missions';
import { SOLUTIONS } from './solutions';

// Every mission can be won, by the actions a student really has.

const play = (id: string, actions: readonly MissionAction[]) => {
  const mission = missionById(id);
  if (!mission) throw new Error(`No mission ${id}`);
  return actions.reduce<MissionState>((state, action) => {
    // A student can only pick up what the rack offers at that moment.
    if (action.type === 'pickCable' && action.cable) {
      expect(rackFor(state), `${id}, step ${state.step + 1}`).toContain(
        action.cable,
      );
    }
    return missionReducer(state, action);
  }, startMission(mission));
};

describe('the missions', () => {
  it('has five chapters of four', () => {
    expect(CHAPTERS).toHaveLength(5);
    for (const chapter of CHAPTERS) expect(chapter.missions).toHaveLength(4);
    expect(new Set(ALL_MISSIONS.map((m) => m.id)).size).toBe(20);
  });

  it.each(ALL_MISSIONS.map((m) => m.id))('%s can be won cleanly', (id) => {
    const state = play(id, SOLUTIONS[id] ?? []);
    expect(state.mission.steps[state.step].prompt).toBeTruthy();
    expect(state.won).toBe(true);
    expect(state.mistakes).toBe(0);
  });

  it.each(ALL_MISSIONS.map((m) => m.id))(
    '%s does not win itself at the start',
    (id) => {
      expect(play(id, []).won).toBe(false);
    },
  );

  it('places every piece of gear', () => {
    for (const mission of ALL_MISSIONS) {
      for (const id of Object.keys(mission.rig().gear)) {
        expect(mission.layout, `${mission.id}: ${id}`).toHaveProperty(id);
      }
    }
  });

  it('has real teaching text everywhere', () => {
    for (const mission of ALL_MISSIONS) {
      expect(mission.why.length).toBeGreaterThan(40);
      for (const step of mission.steps) {
        expect(step.prompt.length).toBeGreaterThan(10);
        expect(step.hint.length).toBeGreaterThan(5);
      }
    }
  });
});
