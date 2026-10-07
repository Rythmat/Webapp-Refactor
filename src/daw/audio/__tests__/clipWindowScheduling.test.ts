import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioClip } from '@/daw/store/tracksSlice';
import type { TrackEngine } from '../TrackEngine';
import { AudioClipScheduler } from '../AudioClipScheduler';
import { splitAudioClip } from '../audioClipCuts';

// ── Split halves on the scheduler, and every call that schedules a clip ────
// A split half, a record-over remainder and a front-trimmed clip each play a
// window of their recording, from offsetSeconds on. That only holds where
// the clip's offset reaches AudioClipScheduler.scheduleClip: a call that drops
// it replays the recording from its start (audio-core-03). scheduleClip takes
// the clip itself, so every caller must hand it the clip.

const { starts, transportJobs } = vi.hoisted(() => ({
  /** Buffer read position (s) of every source started. */
  starts: [] as number[],
  /** Clips the transport will start when it gets to them. */
  transportJobs: [] as Array<(time: number) => void>,
}));

vi.mock('tone', () => {
  const param = { setValueAtTime() {}, linearRampToValueAtTime() {} };
  const node = () => ({ connect() {}, disconnect() {}, gain: param });
  const rawContext = {
    currentTime: 0,
    createGain: node,
    createBufferSource: () => ({
      ...node(),
      start: (_when: number, offset: number) => starts.push(offset),
      stop() {},
    }),
  };
  return {
    getContext: () => ({ rawContext }),
    getTransport: () => ({
      schedule: (job: (time: number) => void) => transportJobs.push(job),
      clear() {},
    }),
  };
});

const BPM = 120;
const SEC = 960; // ticks per second at 120 bpm
const buffer = { duration: 10, numberOfChannels: 1 } as AudioBuffer;
const holdSource = () => ({
  offset: { value: 0 },
  connect() {},
  disconnect() {},
  start() {},
  stop() {},
});
const engine = {
  getNativeInputNode: () => ({}),
  getInputNode: () => ({ context: { createConstantSource: holdSource } }),
} as unknown as TrackEngine;

/** A take at 2–8 s, front-trimmed by 1 s. */
const take: AudioClip = {
  id: 'take',
  startTick: 2 * SEC,
  duration: 6 * SEC,
  fadeInTicks: 0,
  fadeOutTicks: 0,
  offsetSeconds: 1,
};
const [, rightHalf] = splitAudioClip(take, 5 * SEC, BPM, 'right')!;

/**
 * Where `clip` starts reading the recording (s) when playback starts at
 * `fromTick`: the scheduleClip call usePlaybackEngine's Play makes.
 */
function readsFrom(clip: AudioClip, fromTick: number): number {
  new AudioClipScheduler().scheduleClip({
    buffer,
    clip,
    trackEngine: engine,
    fromTick,
    bpm: BPM,
  });
  for (const job of transportJobs.splice(0)) job(0);
  return starts.splice(0).pop()!;
}

beforeEach(() => {
  starts.length = 0;
  transportJobs.length = 0;
});

describe('a split half on the scheduler', () => {
  it('a loop starting inside it reads the take where the whole clip does', () => {
    // 4 s into the clip, after its 1 s trim: 5 s into the recording.
    expect(readsFrom(rightHalf, 6 * SEC)).toBeCloseTo(5);
    expect(readsFrom(rightHalf, 6 * SEC)).toBeCloseTo(readsFrom(take, 6 * SEC));
  });

  it('a loop starting before it starts it at the cut, not at the take start', () => {
    expect(readsFrom(rightHalf, 3 * SEC)).toBeCloseTo(
      readsFrom(take, rightHalf.startTick),
    );
  });
});

// ── Every scheduleClip call passes the clip ────────────────────────────────

const SRC = join(__dirname, '..', '..', '..');

/** Each scheduleClip({...}) call in `file` (under src/), as its option
 *  properties: name → value text (a shorthand `clip` maps to 'clip'). */
function scheduleClipCalls(file: string): Array<Record<string, string>> {
  const path = join(SRC, file);
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const calls: Array<Record<string, string>> = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'scheduleClip'
    ) {
      const options: Record<string, string> = {};
      const [arg] = node.arguments;
      if (arg && ts.isObjectLiteralExpression(arg)) {
        for (const prop of arg.properties) {
          if (ts.isShorthandPropertyAssignment(prop)) {
            options[prop.name.text] = prop.name.text;
          } else if (
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name)
          ) {
            options[prop.name.text] = prop.initializer.getText(source);
          }
        }
      }
      calls.push(options);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls;
}

/** The option carries the store's clip (offset, fades and gain with it). The
 *  bounce may shift its startTick to the render window, nothing else. */
const passesClip = (call: Record<string, string> | undefined) =>
  /^(clip|\{\s*\.\.\.clip,\s*startTick:[^,}]*,?\s*\})$/.test(call?.clip ?? '');

/** usePlaybackEngine's call that starts clips from `fromTick`. */
const engineCall = (fromTick: string) =>
  scheduleClipCalls('daw/hooks/usePlaybackEngine.ts').filter(
    (options) => options.fromTick === fromTick,
  );

describe('scheduleClip callers pass the clip', () => {
  it('finds the bounce, Play and loop-lap calls', () => {
    expect(scheduleClipCalls('daw/audio/renderProject.ts')).toHaveLength(1);
    expect(engineCall('currentTick')).toHaveLength(1);
    expect(engineCall('loopStart')).toHaveLength(1);
  });

  it('the bounce (renderProject)', () => {
    const [call] = scheduleClipCalls('daw/audio/renderProject.ts');
    expect(passesClip(call)).toBe(true);
  });

  it('Play, from the playhead (usePlaybackEngine)', () => {
    expect(passesClip(engineCall('currentTick')[0])).toBe(true);
  });

  it('loop laps, from the loop start (usePlaybackEngine)', () => {
    expect(passesClip(engineCall('loopStart')[0])).toBe(true);
  });
});
