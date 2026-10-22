import { useCallback, useEffect, useMemo } from 'react';
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
import { emptyCells } from '@/curriculum/engine/grooveLab/take';
import { CheckLine, GrooveControls } from './GrooveControls';
import { GrooveGrid } from './GrooveGrid';
import type { GrooveLabAudio } from './GrooveLabAudio';
import { useGrooveRound, useGrooveTransport } from './useGrooveRound';

// ── The grid ────────────────────────────────────────────────────────────────
// The puzzle Groove Lab always was, on the owner's grooves: hear it, click
// it in on three rows (a hi-hat cell clicked twice is an open hat), hear
// yours, check. One check a groove (a pass or a miss counts once toward the
// streak), then the answer shows and the next groove is a click away.
// Listen and Play mine go round while Loop is on, once while it's off.

const OPEN_HAT = 46;

export function GridPlay({
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
  /** False while the level-cleared card is up: everything stops. */
  active: boolean;
  /** Listen and Play mine go round. */
  loop: boolean;
  onLoop: (on: boolean) => void;
  onCorrect?: () => void;
  onWrong?: () => void;
}) {
  const { groove, cells, cellsRef, setCells, grade, ready, next, check } =
    useGrooveRound({ audio, pool, onCorrect, onWrong });
  const { playing, playStep, start, stop } = useGrooveTransport({
    audio,
    groove,
    level,
    loop,
    cellsRef,
  });

  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);

  const toggle = useCallback(
    (lane: LabLane, step: number) => {
      if (grade || !groove) return;
      const was = cellsRef.current;
      const row = new Set(was[lane]);
      const open = new Set(was.open);
      const hat = lane === 'cymbal' && groove.cymbal === 'hat';
      // A hat goes closed, open, off; every other cell on, off.
      if (!row.has(step)) {
        row.add(step);
        audio.play(groove.kit, groove.pads[lane], 100);
      } else if (hat && !open.has(step)) {
        open.add(step);
        audio.play(groove.kit, OPEN_HAT, 100);
      } else {
        row.delete(step);
        open.delete(step);
      }
      setCells({ ...was, [lane]: row, open });
    },
    [audio, cellsRef, grade, groove, setCells],
  );

  // Space: hear the groove (or stop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || !active) return;
      const el = e.target;
      if (
        el instanceof Element &&
        el.closest('input, textarea, select, [contenteditable]')
      )
        return;
      e.preventDefault();
      if (playing) stop();
      else start('target');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, playing, start, stop]);

  const placed = useMemo(
    () => LAB_LANES.reduce((n, l) => n + cells[l].size, 0),
    [cells],
  );

  if (!groove)
    return (
      <p className="py-16 text-center text-sm text-white/50">
        {pool.length === 0 ? 'Loading grooves…' : 'Picking a groove…'}
      </p>
    );

  // After a check: what the player got right and added, as they had it.
  const shown = grade
    ? {
        cymbal: new Set([...grade.right.cymbal, ...grade.extra.cymbal]),
        snare: new Set([...grade.right.snare, ...grade.extra.snare]),
        kick: new Set([...grade.right.kick, ...grade.extra.kick]),
        open: cells.open,
      }
    : cells;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <GrooveHeading
        groove={groove}
        bpm={levelBpm(level, groove)}
        status={
          <p className="text-sm text-white/55">
            {grade
              ? grade.passed
                ? 'Nailed it.'
                : 'Here’s the groove: the outlined cells are the ones you missed.'
              : 'Listen, then click the groove in.'}
          </p>
        }
      />

      <GrooveGrid
        groove={groove}
        cells={shown}
        onToggle={grade ? undefined : toggle}
        playStep={playStep}
        result={grade}
        targetOpen={grade ? laneSteps(groove).open : undefined}
      />

      <GrooveControls
        ready={ready}
        playing={playing}
        placed={placed}
        checked={!!grade}
        loop={loop}
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

/** The groove's style, tempo and name. */
export function GrooveHeading({
  groove,
  bpm,
  status,
}: {
  groove: LabGroove;
  bpm: number;
  status?: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/45">
          {groove.style ? `${groove.style} · ` : ''}
          {bpm} BPM
        </p>
        <h2 className="text-2xl font-semibold text-white">{groove.name}</h2>
      </div>
      {status}
    </div>
  );
}
