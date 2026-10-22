// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  echoRandom,
  echoCountOff,
  echoTimeline,
  melodyCall,
  melodyPads,
  melodyEchoNotes,
  chordCall,
  chordEchoNotes,
  bossCalls,
  bossTimelines,
  type MelodyCall,
} from '@/curriculum/engine/echo';
import type { RunGroove } from '@/curriculum/engine/musicLiteracy/run';
import { easiestContours, roundCall } from '../echoCalls';
import { echoHeadline } from '../echoCues';
import { echoFlowReducer, newEchoFlow, runCallsOf } from '../echoFlow';
import { gradeRunCall } from '../echoOutcome';
import {
  ECHO_PROGRESS_KEY,
  highScoreOf,
  levelOpen,
  nextLevelOf,
  parseEchoProgress,
  readEchoProgress,
  recordSongFinished,
  recordStreak,
  rememberSetup,
} from '../echoProgress';
import { callIndexAt, echoRunCues, placeCall } from '../echoRunCues';
import {
  DEFAULT_ECHO_SETTINGS,
  ECHO_SETTINGS_KEY,
  getEchoSettings,
  inputFor,
  parseEchoSettings,
  resetEchoSettingsCache,
  updateEchoSettings,
} from '../echoSettings';

/**
 * Echo's play-screen parts that need no screen: the easier call after a
 * miss, the device's progress and settings, a run's
 * cues, the hub's words, and an echo described.
 */

const C = { tonic: 'C', mode: 'major' } as const;
const D = { tonic: 'D', mode: 'major' } as const;

describe('the easier call after a miss', () => {
  it('is Level 1’s shortest contour on the 1, at any level', () => {
    const ids = easiestContours().map((c) => c.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(easiestContours().every((c) => c.noteCount === 3)).toBe(true);
    for (const level of [1, 2, 3] as const) {
      const call = roundCall('melodyEcho', level, C, echoRandom(level), {
        easier: true,
      }) as MelodyCall;
      expect(call.level).toBe(level);
      expect(ids).toContain(call.contour.id);
      expect(call.zeroPoint).toBe(1);
      // Level 1's rhythms: quarters and eighths from beat 1.
      expect(call.rhythm.tier).toBe(1);
    }
  });

  it('lands on the pads, every level’s the same octave', () => {
    const pads = melodyPads(D).pads.map((p) => p.midi);
    for (const level of [1, 2, 3] as const) {
      for (let i = 0; i < 20; i++) {
        const call = roundCall('melodyEcho', level, D, echoRandom(`d${i}`), {
          easier: true,
        });
        expect(call.tonic).toBe(melodyPads(D).tonic);
        for (const note of call.notes) expect(pads).toContain(note.midi);
      }
    }
  });

  it('avoids the contours just played while others remain', () => {
    const [first, ...rest] = easiestContours().map((c) => c.id);
    const call = roundCall('melodyEcho', 1, C, echoRandom(1), {
      easier: true,
      exclude: rest,
    }) as MelodyCall;
    expect(call.contour.id).toBe(first);
  });

  it('is the level’s own call when not easier', () => {
    const call = roundCall('chordEcho', 3, C, echoRandom(4));
    expect(call.kind).toBe('chords');
    expect(call.level).toBe(3);
  });
});

describe('progress on the device', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('opens Level 1 alone, and the next level with each song finished', () => {
    const fresh = readEchoProgress();
    expect(fresh.unlocked).toBe(1);
    expect(levelOpen(fresh, 1)).toBe(true);
    expect(levelOpen(fresh, 2)).toBe(false);
    expect(recordSongFinished(1).unlocked).toBe(2);
    expect(levelOpen(readEchoProgress(), 2)).toBe(true);
    expect(levelOpen(readEchoProgress(), 3)).toBe(false);
    // An earlier level's song opens nothing new.
    expect(recordSongFinished(1).unlocked).toBe(2);
    expect(recordSongFinished(2).unlocked).toBe(3);
    expect(recordSongFinished(3).unlocked).toBe(3);
    expect(readEchoProgress().songs).toEqual({ 1: 2, 2: 1, 3: 1 });
    expect(nextLevelOf(3)).toBeNull();
  });

  it('keeps the best streak per level as its High Score', () => {
    expect(recordStreak(1, 4)).toBe(true);
    expect(recordStreak(1, 3)).toBe(false);
    expect(recordStreak(1, 4)).toBe(false);
    expect(recordStreak(2, 2)).toBe(true);
    expect(highScoreOf(readEchoProgress(), 1)).toBe(4);
    expect(highScoreOf(readEchoProgress(), 2)).toBe(2);
    expect(highScoreOf(readEchoProgress(), 3)).toBe(0);
  });

  it('remembers the game last set up', () => {
    rememberSetup(2, { tonic: 'Eb', mode: 'minor' });
    expect(readEchoProgress().last).toEqual({
      level: 2,
      key: { tonic: 'Eb', mode: 'minor' },
    });
  });

  it('reads anything odd as a fresh start, and survives storage that throws', () => {
    localStorage.setItem(ECHO_PROGRESS_KEY, '{not json');
    expect(readEchoProgress().unlocked).toBe(1);
    expect(
      parseEchoProgress({
        version: 1,
        unlocked: 7,
        highScores: { 1: -2, 2: 5 },
      }),
    ).toMatchObject({ unlocked: 1, highScores: { 2: 5 } });
    expect(parseEchoProgress({ version: 9, unlocked: 3 }).unlocked).toBe(1);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(readEchoProgress().unlocked).toBe(1);
    expect(() => recordSongFinished(1)).not.toThrow();
    expect(() => recordStreak(1, 3)).not.toThrow();
  });
});

describe('Game Settings on the device', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEchoSettingsCache();
  });
  afterEach(() => vi.restoreAllMocks());

  it('starts with the groove on, the scaffolding off, each level’s input', () => {
    const settings = getEchoSettings();
    expect(settings).toEqual(DEFAULT_ECHO_SETTINGS);
    expect(settings.groove).toBe(true);
    expect(Object.values(settings.scaffolding)).toEqual([false, false, false]);
    expect(inputFor(settings, 1)).toBe('pads');
    expect(inputFor(settings, 2)).toBe('keyboard');
    expect(inputFor(settings, 3)).toBe('keyboard');
  });

  it('remembers a change, and an input picked holds at every level', () => {
    updateEchoSettings({ input: 'pads', groove: false });
    updateEchoSettings({ scaffolding: { autoFill: true } });
    resetEchoSettingsCache();
    const settings = getEchoSettings();
    expect(settings.groove).toBe(false);
    expect(settings.scaffolding).toEqual({
      autoTune: false,
      rootsOnly: false,
      autoFill: true,
    });
    expect(inputFor(settings, 3)).toBe('pads');
    expect(JSON.parse(localStorage.getItem(ECHO_SETTINGS_KEY)!).input).toBe(
      'pads',
    );
  });

  it('reads odd values as the defaults, and survives storage that throws', () => {
    expect(parseEchoSettings({ input: 'drums', groove: 'yes' })).toEqual(
      DEFAULT_ECHO_SETTINGS,
    );
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    resetEchoSettingsCache();
    expect(getEchoSettings()).toEqual(DEFAULT_ECHO_SETTINGS);
    expect(() => updateEchoSettings({ groove: false })).not.toThrow();
    expect(getEchoSettings().groove).toBe(false);
  });
});

describe('a run’s cues', () => {
  const GROOVE: RunGroove = {
    loopTicks: 1920,
    hits: [
      { tick: 0, note: 36, velocity: 100 },
      { tick: 960, note: 38, velocity: 100 },
    ],
  };

  it('counts in, sounds and lights the call, and leaves the answer silent', () => {
    const call = melodyCall(1, C, echoRandom('cues'));
    const timeline = echoTimeline(call, { tempo: 88 });
    const cues = echoRunCues([placeCall(call, timeline)], {
      metronome: true,
    });
    // A bar each: the count-in, the call, the count-off, the answer; then
    // the final downbeat, a click with no drums.
    const beats = cues.filter((c) => c.kind === 'beat');
    expect(beats).toHaveLength(17);
    expect(
      beats.slice(0, 4).every((b) => b.phase === 'countIn' && b.click),
    ).toBe(true);
    expect(beats[4].phase).toBe('call');
    expect(
      beats.slice(8, 12).every((b) => b.phase === 'countIn' && b.click),
    ).toBe(true);
    expect(beats[12].phase).toBe('response');
    expect(beats[16]).toMatchObject({
      tick: timeline.total,
      downbeat: true,
      click: true,
    });
    const notes = cues.filter((c) => c.kind === 'note');
    const { call: callNotes, response } = melodyEchoNotes(call, timeline);
    expect(notes.filter((n) => n.segment === 'call')).toHaveLength(
      callNotes.length,
    );
    expect(
      notes
        .filter((n) => n.segment === 'call')
        .every((n) => n.sound && n.light),
    ).toBe(true);
    expect(
      notes
        .filter((n) => n.segment === 'response')
        .every((n) => !n.sound && !n.light),
    ).toBe(true);
    expect(notes.filter((n) => n.segment === 'response')).toHaveLength(
      response.length,
    );
    expect(cues.at(-1)).toEqual({ kind: 'end', tick: timeline.total + 960 });
    // In order.
    expect(cues.map((c) => c.tick)).toEqual(
      [...cues.map((c) => c.tick)].sort((a, b) => a - b),
    );
  });

  it('plays the drums from the call to a final downbeat', () => {
    const call = chordCall(1, C, echoRandom('drums'));
    const placed = placeCall(call, echoTimeline(call));
    const cues = echoRunCues([placed], { metronome: false, groove: GROOVE });
    const drums = cues.filter((c) => c.kind === 'drum');
    expect(Math.min(...drums.map((d) => d.tick))).toBe(
      placed.timeline.call.start,
    );
    const end = cues.at(-1)!;
    expect(end.kind).toBe('end');
    expect(end.tick).toBe(placed.timeline.total + 960);
    // Over the drums only the count-in and the count-off click.
    const off = echoCountOff(placed.timeline);
    const clicks = cues.filter((c) => c.kind === 'beat' && c.click);
    expect(clicks.map((c) => c.tick)).toEqual([
      0,
      480,
      960,
      1440,
      off.start,
      off.start + 480,
      off.start + 960,
      off.start + 1440,
    ]);
    expect(placed.attacks.response).toEqual(
      chordEchoNotes(call, placed.timeline).response,
    );
  });

  it('gives each of the boss’s calls its own turns', () => {
    const calls = bossCalls(1, C, echoRandom('boss'));
    const timelines = bossTimelines(calls);
    const placed = calls.map((c, i) => placeCall(c, timelines[i]));
    const cues = echoRunCues(placed, { metronome: true });
    const phaseAt = (tick: number) =>
      cues.find((c) => c.kind === 'beat' && c.tick === tick)?.kind === 'beat'
        ? (
            cues.find((c) => c.kind === 'beat' && c.tick === tick) as {
              phase: string;
            }
          ).phase
        : null;
    for (const t of timelines) {
      expect(phaseAt(t.call.start)).toBe('call');
      expect(phaseAt(t.response.start)).toBe('response');
    }
    expect(callIndexAt(placed, 0)).toBe(0);
    expect(callIndexAt(placed, timelines[2].call.start)).toBe(2);
    expect(callIndexAt(placed, 1e9)).toBe(3);
  });
});

describe('the boss’s run', () => {
  const bossFlow = () => {
    let flow = echoFlowReducer(newEchoFlow(1, C), {
      type: 'begin',
      level: 1,
      key: C,
      seed: 'boss-run',
      skipTo: 'boss',
    });
    flow = echoFlowReducer(flow, { type: 'fight' });
    return flow;
  };

  it('counts each later call in over the bar the boss reacts in', () => {
    const placed = runCallsOf(bossFlow());
    const cues = echoRunCues(placed, { metronome: true });
    const beats = cues.filter((c) => c.kind === 'beat');
    for (let i = 1; i < placed.length; i++) {
      const gap = placed[i - 1].timeline.total;
      const inGap = beats.filter(
        (b) => b.tick >= gap && b.tick < placed[i].timeline.call.start,
      );
      expect(inGap).toHaveLength(4);
      expect(inGap.every((b) => b.phase === 'countIn')).toBe(true);
      // The hub says GET READY there, and LISTEN as the call comes.
      const own = placed[i].timeline;
      expect(echoHeadline(own, gap, true, '').kind).toBe('cue');
      expect((echoHeadline(own, gap, true, '') as { cue: string }).cue).toBe(
        'getReady',
      );
      expect(
        (echoHeadline(own, own.call.start, true, '') as { cue: string }).cue,
      ).toBe('listen');
      // No note sounds in the gap.
      expect(
        cues.some(
          (c) => c.kind === 'note' && c.tick >= gap && c.tick < own.call.start,
        ),
      ).toBe(false);
    }
  });

  it('grades each call’s echo on its own bars, the gaps between', () => {
    const placed = runCallsOf(bossFlow());
    // Every call echoed note for note, on its answer's ticks.
    const played = placed.flatMap((c) =>
      c.notes.response.map((n) => ({
        midi: n.midi,
        onset: n.onset,
        duration: Math.max(60, n.duration - 30),
      })),
    );
    for (const c of placed) {
      expect(gradeRunCall(c, played).passed).toBe(true);
    }
    // Played a bar late (into the gap and the next call), it isn't.
    const late = played.map((n) => ({ ...n, onset: n.onset + 1920 }));
    expect(gradeRunCall(placed[0], late).passed).toBe(false);
  });
});

describe('what the hub says', () => {
  const call = melodyCall(1, C, echoRandom('hub'));
  const t = echoTimeline(call);
  const text = (tick: number, running = true) =>
    echoHeadline(t, tick, running, 'Melody Echo').text;

  it('says Get Ready, Listen, 1, 2, Ready, Go! and Your Turn, in an echo’s order', () => {
    expect(text(0)).toBe('Get Ready');
    expect(text(t.call.start)).toBe('Listen');
    const off = echoCountOff(t).start;
    expect([0, 1, 2, 3].map((beat) => text(off + beat * 480))).toEqual([
      '1',
      '2',
      'Ready',
      'Go!',
    ]);
    expect(text(t.response.start - 480)).toBe('Go!');
    expect(text(t.response.start)).toBe('Go!');
    expect(text(t.response.start + 480)).toBe('Your Turn');
    expect(text(0, false)).toBe('Melody Echo');
  });
});

describe('an echo described', () => {
  it('names what Atlas asked and what the student played, by degree', () => {
    const call = melodyCall(1, C, echoRandom('describe'));
    const placed = placeCall(call, echoTimeline(call));
    const exact = placed.notes.response.map((n) => ({
      midi: n.midi,
      onset: n.onset,
      duration: n.duration,
    }));
    const good = gradeRunCall(placed, exact);
    expect(good.passed).toBe(true);
    expect(good.played).toEqual(good.asked);
    expect(good.asked).toEqual(call.notes.map((n) => n.label));
    const none = gradeRunCall(placed, []);
    expect(none).toMatchObject({ passed: false, played: [] });
  });

  it('names a chord echo’s chords, each bar once', () => {
    const call = chordCall(1, C, echoRandom('describe-chords'));
    const placed = placeCall(call, echoTimeline(call));
    const exact = placed.notes.response.map((n) => ({
      midi: n.midi,
      onset: n.onset,
      duration: n.duration,
    }));
    const result = gradeRunCall(placed, exact);
    expect(result.passed).toBe(true);
    expect(result.asked).toEqual(call.labels);
    expect(result.played).toEqual(call.labels);
  });
});
