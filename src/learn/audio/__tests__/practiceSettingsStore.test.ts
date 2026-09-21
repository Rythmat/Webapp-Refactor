// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function freshStore() {
  vi.resetModules();
  return import('../practiceSettingsStore');
}

describe('practiceSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to a clicking metronome at the activity tempo', async () => {
    const store = await freshStore();
    expect(store.getPracticeSettings()).toEqual({
      metronomeEnabled: true,
      tempoBpm: null,
    });
    // null means "whatever this activity says", not "80".
    expect(store.resolveTempo(80)).toBe(80);
    expect(store.resolveTempo(130)).toBe(130);
  });

  it('lets an explicit tempo override the activity default', async () => {
    const store = await freshStore();
    store.setTempoBpm(60);
    expect(store.resolveTempo(80)).toBe(60);
    expect(store.resolveTempo(130)).toBe(60);
  });

  it('hands the activity back its own tempo when the override is cleared', async () => {
    const store = await freshStore();
    store.setTempoBpm(60);
    store.setTempoBpm(null);
    expect(store.getPracticeSettings().tempoBpm).toBeNull();
    expect(store.resolveTempo(130)).toBe(130);
  });

  it('clamps a tempo outside the supported range', async () => {
    const store = await freshStore();
    store.setTempoBpm(5);
    expect(store.getPracticeSettings().tempoBpm).toBe(store.MIN_PRACTICE_BPM);
    store.setTempoBpm(9000);
    expect(store.getPracticeSettings().tempoBpm).toBe(store.MAX_PRACTICE_BPM);
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const store = await freshStore();
    const seen: number[] = [];
    const unsubscribe = store.subscribePracticeSettings(() =>
      seen.push(seen.length),
    );
    store.setMetronomeEnabled(false);
    store.setTempoBpm(72);
    expect(seen).toHaveLength(2);
    unsubscribe();
    store.setTempoBpm(96);
    expect(seen).toHaveLength(2);
  });

  it('does not notify when the value is unchanged', async () => {
    const store = await freshStore();
    let calls = 0;
    store.subscribePracticeSettings(() => calls++);
    store.setMetronomeEnabled(true); // already true
    store.setTempoBpm(null); // already null
    expect(calls).toBe(0);
  });

  it('restores a saved tempo on the next session', async () => {
    const first = await freshStore();
    first.setMetronomeEnabled(false);
    first.setTempoBpm(64);

    const second = await freshStore();
    expect(second.getPracticeSettings()).toEqual({
      metronomeEnabled: false,
      tempoBpm: 64,
    });
  });

  it('falls back to defaults on unreadable stored settings', async () => {
    localStorage.setItem('learn-practice-settings', 'not json');
    const store = await freshStore();
    expect(store.getPracticeSettings()).toEqual({
      metronomeEnabled: true,
      tempoBpm: null,
    });
  });
});
