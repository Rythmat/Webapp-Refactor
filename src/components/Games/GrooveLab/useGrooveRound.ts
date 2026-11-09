import { useCallback, useEffect, useRef, useState } from 'react';
import { swingOnset } from '@/curriculum/engine/genreGeneration/swing';
import { gradeGrid, type GridGrade } from '@/curriculum/engine/grooveLab/grade';
import {
  LAB_LANES,
  labHits,
  type LabGroove,
} from '@/curriculum/engine/grooveLab/labGroove';
import {
  grooveBag,
  levelBpm,
  type GrooveLabLevel,
} from '@/curriculum/engine/grooveLab/levels';
import { emptyCells, type GridCells } from '@/curriculum/engine/grooveLab/take';
import type { GrooveLabAudio } from './GrooveLabAudio';

// ── A round of Groove Lab, and its playback ────────────────────────────────
// What the grid and the pads share: the groove dealt (each once before any
// comes again; a level's first deal opens on its lead groove), the player's
// grid, one check a groove, and the playback of the groove (Listen) or the
// player's grid (Play mine), round and round with Loop on, once with it
// off, on the audio clock, scheduled a little ahead.

const OPEN_HAT = 46;
const LEAD_S = 0.12;
const LOOKAHEAD_S = 0.25;

export function useGrooveRound({
  audio,
  pool,
  onCorrect,
  onWrong,
}: {
  audio: GrooveLabAudio;
  pool: readonly LabGroove[];
  onCorrect?: () => void;
  onWrong?: () => void;
}) {
  const bagRef = useRef<LabGroove[]>([]);
  const dealtRef = useRef(false);
  const [groove, setGroove] = useState<LabGroove | null>(null);
  const [cells, setCellsState] = useState<GridCells>(emptyCells);
  const cellsRef = useRef(cells);
  const [grade, setGrade] = useState<GridGrade | null>(null);
  const [ready, setReady] = useState(false);

  const setCells = useCallback((next: GridCells) => {
    cellsRef.current = next;
    setCellsState(next);
  }, []);

  const next = useCallback(() => {
    if (bagRef.current.length === 0) {
      bagRef.current = grooveBag(
        pool,
        Math.random,
        groove?.id,
        !dealtRef.current,
      );
      dealtRef.current = pool.length > 0;
    }
    setGroove(bagRef.current.shift() ?? null);
    setCells(emptyCells());
    setGrade(null);
    setReady(false);
  }, [pool, groove?.id, setCells]);

  // A new level (or its grooves arriving) starts a fresh deal.
  useEffect(() => {
    bagRef.current = [];
    dealtRef.current = false;
    next();
    // Only when the level's grooves change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  // Its kit's samples, the open hat's too.
  useEffect(() => {
    if (!groove) return;
    let gone = false;
    const notes = [
      ...new Set([
        ...Object.values(groove.pads),
        ...(groove.cymbal === 'hat' ? [OPEN_HAT] : []),
        ...LAB_LANES.flatMap((l) => groove.lanes[l].map((h) => h.note)),
      ]),
    ];
    void audio
      .load(groove.kit, notes)
      .catch((err: unknown) => console.error('[Groove Lab] sounds', err))
      .finally(() => !gone && setReady(true));
    return () => {
      gone = true;
    };
  }, [audio, groove]);

  /** One check a groove: it counts once, pass or miss. */
  const check = useCallback(() => {
    if (!groove || grade) return null;
    const result = gradeGrid(groove, cellsRef.current);
    setGrade(result);
    if (result.passed) onCorrect?.();
    else onWrong?.();
    return result;
  }, [grade, groove, onCorrect, onWrong]);

  // In development only: the groove, for a test to read.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__grooveLabGrid = groove;
  }, [groove]);

  return { groove, cells, cellsRef, setCells, grade, ready, next, check };
}

export type Playing = 'target' | 'mine' | null;

/** Where a pass of what's playing began, and how long a pass is. */
export interface Timeline {
  t0: number;
  passS: number;
  stepS: number;
  tickS: number;
}

export function useGrooveTransport({
  audio,
  groove,
  level,
  loop,
  cellsRef,
}: {
  audio: GrooveLabAudio;
  groove: LabGroove | null;
  level: GrooveLabLevel;
  loop: boolean;
  cellsRef: React.MutableRefObject<GridCells>;
}) {
  const [playing, setPlaying] = useState<Playing>(null);
  const [playStep, setPlayStep] = useState<number | null>(null);
  const runRef = useRef(0);
  const timerRef = useRef(0);
  const frameRef = useRef(0);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  /** Passes go on until here whatever Loop says (a take played along). */
  const holdRef = useRef(0);
  const timelineRef = useRef<Timeline | null>(null);

  const stop = useCallback(() => {
    runRef.current += 1;
    window.clearInterval(timerRef.current);
    cancelAnimationFrame(frameRef.current);
    audio.cancelScheduled();
    timelineRef.current = null;
    holdRef.current = 0;
    setPlaying(null);
    setPlayStep(null);
  }, [audio]);

  useEffect(() => stop, [stop]);

  /** The player's grid as hits: the groove's own sound where it matches. */
  const mineHits = useCallback(() => {
    if (!groove) return [];
    const mine = cellsRef.current;
    return LAB_LANES.flatMap((lane) =>
      [...mine[lane]].map((step) => {
        const same = groove.lanes[lane].find((h) => h.step === step);
        const open = lane === 'cymbal' && mine.open.has(step);
        return {
          note: open
            ? OPEN_HAT
            : same && !same.open
              ? same.note
              : groove.pads[lane],
          velocity: same?.velocity ?? 96,
          playedTick:
            same?.playedTick ??
            swingOnset(step * groove.stepTicks, groove.swing),
        };
      }),
    );
  }, [cellsRef, groove]);

  const start = useCallback(
    (kind: Exclude<Playing, null>) => {
      if (!groove) return;
      stop();
      const run = runRef.current;
      const ctx = audio.ctx;
      const bpm = levelBpm(level, groove);
      const tickS = 60 / (bpm * 480);
      const stepS = groove.stepTicks * tickS;
      const passS = groove.steps * stepS;
      const t0 = ctx.currentTime + LEAD_S;
      timelineRef.current = { t0, passS, stepS, tickS };
      let pass = 0;
      const more = () =>
        loopRef.current || pass < 1 || t0 + pass * passS < holdRef.current;
      const schedule = () => {
        if (runRef.current !== run) return;
        if (!more()) {
          if (ctx.currentTime > t0 + pass * passS + 0.05) stop();
          return;
        }
        while (t0 + pass * passS < ctx.currentTime + LOOKAHEAD_S && more()) {
          const base = t0 + pass * passS;
          const hits = kind === 'target' ? labHits(groove) : mineHits();
          for (const h of hits)
            audio.play(
              groove.kit,
              h.note,
              h.velocity,
              base + h.playedTick * tickS,
            );
          pass += 1;
        }
      };
      schedule();
      timerRef.current = window.setInterval(schedule, 25);
      const frame = () => {
        if (runRef.current !== run) return;
        const into = ctx.currentTime - t0;
        setPlayStep(into < 0 ? null : Math.floor((into % passS) / stepS));
        frameRef.current = requestAnimationFrame(frame);
      };
      frameRef.current = requestAnimationFrame(frame);
      setPlaying(kind);
    },
    [audio, groove, level, mineHits, stop],
  );

  /**
   * The groove's next downbeat, if it's playing, kept playing through the
   * pass that follows it: a take played along with it.
   */
  const nextDownbeat = useCallback((): number | null => {
    const timeline = timelineRef.current;
    if (!timeline || playing !== 'target') return null;
    const now = audio.ctx.currentTime;
    const passes = Math.ceil((now + 0.15 - timeline.t0) / timeline.passS);
    const at = timeline.t0 + Math.max(0, passes) * timeline.passS;
    holdRef.current = at + timeline.passS;
    return at;
  }, [audio, playing]);

  return { playing, playStep, start, stop, nextDownbeat };
}
