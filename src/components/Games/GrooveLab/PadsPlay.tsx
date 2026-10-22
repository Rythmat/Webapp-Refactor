import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayedHit } from '@/curriculum/engine/grooveLab/grade';
import {
  LAB_LANES,
  laneSteps,
  type LabGroove,
  type LabLane,
} from '@/curriculum/engine/grooveLab/labGroove';
import {
  levelBpm,
  type GrooveLabLevel,
} from '@/curriculum/engine/grooveLab/levels';
import {
  ALL_ARMED,
  cellsFromTake,
  emptyCells,
  withTake,
  type ArmedTracks,
} from '@/curriculum/engine/grooveLab/take';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { GrooveHeading } from './GridPlay';
import { CheckLine, GrooveControls } from './GrooveControls';
import { GrooveGrid } from './GrooveGrid';
import type { GrooveLabAudio } from './GrooveLabAudio';
import { GroovePads, laneKey, OPEN_HAT_KEY, type PadGlow } from './GroovePads';
import { laneName } from './lanes';
import { useGrooveRound, useGrooveTransport } from './useGrooveRound';

// ── The pads ────────────────────────────────────────────────────────────────
// The Studio's finger drumming on the groove's three drums (Peter,
// 2026-10-21): listen as long as you like, practice on the kit (the pads
// always sound), and when it's ready, Record a Take. A take is one time
// through, onto the grid beside the kit, each hit on its nearest cell, and
// only the armed tracks record (the red circles by the track names), so a
// shuffle can go down a drum at a time. Play mine plays the grid back;
// Check grades it, once a groove, as the grid view does.
//
// A take counts in with the metronome, a bar, and the metronome keeps
// clicking through it (only while recording: Peter, 2026-10-21). Started
// while the groove plays, it begins on the groove's next downbeat and plays
// along with it. Every hit is kept with the moment it was played, as heard,
// on the audio clock (Foli's way), so a downbeat played a hair early lands
// on the downbeat.

const OPEN_HAT = 46;
const FLASH_MS = 150;
const MAX_DEVICE_LATENCY_S = 0.2;
/** A take on its own starts this long after Record, plus its count-in bar. */
const TAKE_LEAD_S = 0.4;
/** A count-in is a bar, and never under four beats (two bars of 2/4). */
const MIN_COUNT_IN_BEATS = 4;
const CLICK_LOOKAHEAD_S = 0.15;

function heardLatency(ctx: AudioContext): number {
  const device = Math.min(
    MAX_DEVICE_LATENCY_S,
    Math.max(0, (ctx.outputLatency ?? 0) + (ctx.baseLatency ?? 0)),
  );
  return device + useSettingsStore.getState().outputLatencyMs / 1000;
}

type Take =
  | { phase: 'count'; beat: number; of: number }
  | { phase: 'recording' }
  | null;

export function PadsPlay({
  audio,
  level,
  pool,
  active,
  loop,
  onLoop,
  onCorrect,
  onWrong,
}: {
  audio: GrooveLabAudio;
  level: GrooveLabLevel;
  pool: readonly LabGroove[];
  active: boolean;
  /** Listen and Play mine go round. */
  loop: boolean;
  onLoop: (on: boolean) => void;
  onCorrect?: () => void;
  onWrong?: () => void;
}) {
  const { groove, cells, cellsRef, setCells, grade, ready, next, check } =
    useGrooveRound({ audio, pool, onCorrect, onWrong });
  const transport = useGrooveTransport({
    audio,
    groove,
    level,
    loop,
    cellsRef,
  });
  const { playing, playStep, start, stop, nextDownbeat } = transport;
  const grooveRef = useRef<LabGroove | null>(groove);
  grooveRef.current = groove;

  const [armed, setArmed] = useState<ArmedTracks>(ALL_ARMED);
  const armedRef = useRef(armed);
  armedRef.current = armed;
  const [glows, setGlows] = useState<Partial<Record<LabLane, PadGlow>>>({});
  const [take, setTake] = useState<Take>(null);
  const [takeStep, setTakeStep] = useState<number | null>(null);
  const takeRunRef = useRef(0);
  const takeFrameRef = useRef(0);
  const hitsRef = useRef<PlayedHit[]>([]);

  const cancelTake = useCallback(() => {
    takeRunRef.current += 1;
    cancelAnimationFrame(takeFrameRef.current);
    setTake(null);
    setTakeStep(null);
  }, []);

  useEffect(() => {
    if (active) return;
    stop();
    cancelTake();
  }, [active, cancelTake, stop]);
  useEffect(() => cancelTake, [cancelTake]);
  // A new groove: a fresh take, the arming kept.
  useEffect(() => cancelTake(), [groove, cancelTake]);

  const flash = useCallback((lane: LabLane) => {
    setGlows((g) => ({ ...g, [lane]: 'hit' }));
    window.setTimeout(
      () => setGlows((g) => (g[lane] === 'hit' ? { ...g, [lane]: 'idle' } : g)),
      FLASH_MS,
    );
  }, []);

  // ── A hit: always heard, always kept, a take takes what it needs ───────
  const hit = useCallback(
    (lane: LabLane, timeStamp: number, open = false) => {
      const g = grooveRef.current;
      if (!g || !active) return;
      const openHat = open && lane === 'cymbal' && g.cymbal === 'hat';
      audio.play(g.kit, openHat ? OPEN_HAT : g.pads[lane], 110);
      flash(lane);
      const ctx = audio.ctx;
      const since = Math.max(0, performance.now() - timeStamp) / 1000;
      hitsRef.current.push({
        t: ctx.currentTime - since - heardLatency(ctx),
        lane,
        open: openHat,
      });
      if (hitsRef.current.length > 256)
        hitsRef.current = hitsRef.current.slice(-128);
    },
    [active, audio, flash],
  );

  // ── Record a take ──────────────────────────────────────────────────────
  const recordTake = useCallback(() => {
    const g = grooveRef.current;
    if (!g || take || grade) return;
    if (playing === 'mine') stop();
    const run = ++takeRunRef.current;
    const live = () => takeRunRef.current === run;
    const ctx = audio.ctx;
    const bpm = levelBpm(level, g);
    const beatS = 60 / bpm;
    const tickS = beatS / 480;
    const stepS = g.stepTicks * tickS;
    const passS = g.steps * stepS;
    const beatsPerBar = Math.max(1, Math.round(g.barTicks / 480));
    const countBeats =
      beatsPerBar * Math.ceil(MIN_COUNT_IN_BEATS / beatsPerBar);
    // Along with the groove from its next downbeat, or after a count-in.
    const along = playing === 'target' ? nextDownbeat() : null;
    const startAt = along ?? ctx.currentTime + TAKE_LEAD_S + countBeats * beatS;
    const at = (t: number, fn: () => void) =>
      window.setTimeout(
        () => live() && fn(),
        Math.max(0, (t - ctx.currentTime) * 1000),
      );

    // The count-in, on the screen and the metronome, then the metronome
    // through the take (what's left of it, along with the groove).
    for (let b = 0; b < countBeats; b++) {
      const t = startAt - (countBeats - b) * beatS;
      if (t >= ctx.currentTime - 0.01)
        at(t, () => setTake({ phase: 'count', beat: b + 1, of: countBeats }));
    }
    setTake((was) => was ?? { phase: 'count', beat: 0, of: countBeats });
    at(startAt, () => setTake({ phase: 'recording' }));
    audio.readyClicks();
    let beat = -countBeats;
    const takeBeats = Math.round(passS / beatS);
    const clicks = () => {
      if (!live()) return window.clearInterval(clickTimer);
      while (
        beat < takeBeats &&
        startAt + beat * beatS < ctx.currentTime + CLICK_LOOKAHEAD_S
      ) {
        const t = startAt + beat * beatS;
        if (t >= ctx.currentTime - 0.01)
          audio.click(
            t,
            ((beat % beatsPerBar) + beatsPerBar) % beatsPerBar === 0,
          );
        beat += 1;
      }
      if (beat >= takeBeats) window.clearInterval(clickTimer);
    };
    const clickTimer = window.setInterval(clicks, 25);
    clicks();

    // The playhead, when the groove isn't playing to carry one.
    const frame = () => {
      if (!live()) return;
      const into = ctx.currentTime - startAt;
      setTakeStep(into < 0 || into >= passS ? null : Math.floor(into / stepS));
      takeFrameRef.current = requestAnimationFrame(frame);
    };
    takeFrameRef.current = requestAnimationFrame(frame);

    if (import.meta.env.DEV)
      (window as unknown as Record<string, unknown>).__grooveLabTake = {
        start: startAt,
        stepS,
        steps: g.steps,
        latency: heardLatency(ctx),
        now: () => ctx.currentTime,
      };

    // One time through, then onto the grid: the armed tracks only.
    at(startAt + passS + 0.08, () => {
      cancelAnimationFrame(takeFrameRef.current);
      const inTake = hitsRef.current.filter(
        (h) => h.t >= startAt - stepS && h.t < startAt + passS,
      );
      const recorded = cellsFromTake(
        inTake,
        startAt,
        stepS,
        g.steps,
        armedRef.current,
      );
      setCells(withTake(cellsRef.current, recorded, armedRef.current));
      setTake(null);
      setTakeStep(null);
    });
  }, [
    audio,
    cellsRef,
    grade,
    level,
    nextDownbeat,
    playing,
    setCells,
    stop,
    take,
  ]);

  // ── Keys: the Studio's ─────────────────────────────────────────────────
  // A kick, S snare, T hi-hat or P ride, U open hi-hat. Space: Listen.
  // Escape: a take called off.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (
        el instanceof Element &&
        el.closest('input, textarea, select, [contenteditable]')
      )
        return;
      const g = grooveRef.current;
      if (!g) return;
      if (e.code === 'Escape' && take) {
        e.preventDefault();
        cancelTake();
        return;
      }
      if (e.code === 'Space' && !take) {
        e.preventDefault();
        if (playing) stop();
        else start('target');
        return;
      }
      if (e.code === OPEN_HAT_KEY.code && g.cymbal === 'hat') {
        e.preventDefault();
        hit('cymbal', e.timeStamp, true);
        return;
      }
      const lane = LAB_LANES.find((l) => laneKey(g, l).code === e.code);
      if (!lane) return;
      e.preventDefault();
      hit(lane, e.timeStamp);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, cancelTake, hit, playing, start, stop, take]);

  const placed = useMemo(
    () => LAB_LANES.reduce((n, l) => n + cells[l].size, 0),
    [cells],
  );

  if (!groove)
    return (
      <p className="py-16 text-center text-sm text-white/50">
        Loading grooves…
      </p>
    );

  const keys = [
    ...LAB_LANES.map(
      (l) =>
        `${laneKey(groove, l).letter} ${laneName(groove, l).toLowerCase()}`,
    ),
    ...(groove.cymbal === 'hat' ? [`${OPEN_HAT_KEY.letter} open hi-hat`] : []),
  ].join(' · ');

  const shown = grade
    ? {
        cymbal: new Set([...grade.right.cymbal, ...grade.extra.cymbal]),
        snare: new Set([...grade.right.snare, ...grade.extra.snare]),
        kick: new Set([...grade.right.kick, ...grade.extra.kick]),
        open: cells.open,
      }
    : cells;

  const status =
    take?.phase === 'count' ? (
      <p
        className="text-sm font-semibold text-white/80"
        role="status"
        data-testid="groove-status"
      >
        Get ready…{' '}
        <span className="ml-1 inline-block w-6 text-2xl font-bold tabular-nums text-[#ef4444]">
          {take.beat > 0 ? take.beat : ''}
        </span>
      </p>
    ) : take?.phase === 'recording' ? (
      <p
        className="text-sm font-semibold text-[#ef4444]"
        role="status"
        data-testid="groove-status"
      >
        ● Recording
      </p>
    ) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
      <GrooveHeading
        groove={groove}
        bpm={levelBpm(level, groove)}
        status={status}
      />

      {/* The kit on the left, the take on the right. */}
      <div className="flex w-full flex-1 flex-col items-stretch gap-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
          <GroovePads
            groove={groove}
            glows={glows}
            onPress={hit}
            disabled={!active}
          />
          <p className="text-xs text-white/45">Keys: {keys}</p>
        </div>

        <div
          className="w-full min-w-0 lg:w-[48%] lg:max-w-[600px]"
          data-testid="groove-take"
        >
          <GrooveGrid
            groove={groove}
            compact
            cells={shown}
            playStep={playStep ?? takeStep}
            result={grade}
            targetOpen={grade ? laneSteps(groove).open : undefined}
            armed={grade ? undefined : armed}
            onArm={(lane) =>
              setArmed((was) => ({ ...was, [lane]: !was[lane] }))
            }
          />
        </div>
      </div>

      <GrooveControls
        ready={ready}
        playing={playing}
        placed={placed}
        checked={!!grade}
        loop={loop}
        busy={!!take}
        onLoop={onLoop}
        onListen={() => (playing === 'target' ? stop() : start('target'))}
        onPlayMine={() => (playing === 'mine' ? stop() : start('mine'))}
        onClear={() => setCells(emptyCells())}
        onCheck={() => {
          stop();
          check();
        }}
        onNext={() => {
          stop();
          next();
        }}
        record={{ recording: !!take, onRecord: recordTake }}
      />

      {grade && (
        <CheckLine
          passed={grade.passed}
          mistakes={grade.mistakes}
          accuracy={grade.accuracy}
        />
      )}
    </div>
  );
}
