/**
 * DEV only: Make Your Song on a page of its own, with the stand-in input
 * (FallbackInput), while the play screens that lead to it are built.
 *
 * Route: /dev/echo/make-your-song  (registered in src/App.tsx behind
 * import.meta.env.DEV). The query sets what the game would pass:
 *
 *   ?level=1&tonic=C&mode=major&input=pads&autoTune=0&rootsOnly=0&autoFill=0
 *
 * Play Again starts over; Next Level! goes up a level; Exit says so.
 */

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LITERACY_TONICS,
  type LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import type { EchoLevelNumber } from '@/curriculum/engine/echo';
import { LearnInputProvider } from '@/learn/context/LearnInputContext';
import { FallbackInput } from '../FallbackInput';
import { MakeYourSong } from '../MakeYourSong';

const flag = (value: string | null) => value === '1' || value === 'true';

export function MakeYourSongHarness() {
  const [params, setParams] = useSearchParams();
  const level = (
    [1, 2, 3].includes(Number(params.get('level')))
      ? Number(params.get('level'))
      : 1
  ) as EchoLevelNumber;
  const tonic = (LITERACY_TONICS as readonly string[]).includes(
    params.get('tonic') ?? '',
  )
    ? (params.get('tonic') as LiteracyTonic)
    : 'C';
  const mode = params.get('mode') === 'minor' ? 'minor' : 'major';
  const input = params.get('input') === 'keyboard' ? 'keyboard' : 'pads';
  const scaffolding = useMemo(
    () => ({
      autoTune: flag(params.get('autoTune')),
      rootsOnly: flag(params.get('rootsOnly')),
      autoFill: flag(params.get('autoFill')),
    }),
    [params],
  );
  const keyChoice = useMemo(() => ({ tonic, mode }) as const, [tonic, mode]);
  const [run, setRun] = useState(0);
  const [finished, setFinished] = useState(0);
  const [exited, setExited] = useState(false);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
    setRun((r) => r + 1);
  };

  return (
    <LearnInputProvider detectionMode="polyphonic">
      <div className="flex h-screen flex-col bg-[#101012] text-[#e8e8f0]">
        <div
          data-echo-harness
          data-finished-count={finished}
          className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/[0.08] px-4 py-1.5 text-xs text-white/55"
        >
          <span className="font-medium text-white/70">
            Dev · Make Your Song
          </span>
          <label className="flex items-center gap-1">
            Level
            <select
              value={level}
              onChange={(e) => set('level', e.target.value)}
              className="rounded bg-white/10 px-1 py-0.5 text-[#e8e8f0]"
            >
              {[1, 2, 3].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            Key
            <select
              value={tonic}
              onChange={(e) => set('tonic', e.target.value)}
              className="rounded bg-white/10 px-1 py-0.5 text-[#e8e8f0]"
            >
              {LITERACY_TONICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              value={mode}
              onChange={(e) => set('mode', e.target.value)}
              className="rounded bg-white/10 px-1 py-0.5 text-[#e8e8f0]"
            >
              <option>major</option>
              <option>minor</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            Input
            <select
              value={input}
              onChange={(e) => set('input', e.target.value)}
              className="rounded bg-white/10 px-1 py-0.5 text-[#e8e8f0]"
            >
              <option>pads</option>
              <option>keyboard</option>
            </select>
          </label>
          {(['autoTune', 'rootsOnly', 'autoFill'] as const).map((name) => (
            <label key={name} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={scaffolding[name]}
                onChange={(e) => set(name, e.target.checked ? '1' : '0')}
              />
              {name}
            </label>
          ))}
          <span className="ml-auto">Songs finished: {finished}</span>
        </div>
        <div className="min-h-0 flex-1">
          {exited ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <p>Left Make Your Song.</p>
              <button
                type="button"
                onClick={() => {
                  setExited(false);
                  setRun((r) => r + 1);
                }}
                className="rounded-full bg-white px-4 py-1.5 text-[#101012]"
              >
                Start Over
              </button>
              <Link to="/" className="text-white/55 underline">
                Home
              </Link>
            </div>
          ) : (
            <MakeYourSong
              key={run}
              level={level}
              keyChoice={keyChoice}
              input={input}
              scaffolding={scaffolding}
              renderInput={(handlers) => (
                <FallbackInput
                  {...handlers}
                  keyChoice={keyChoice}
                  input={input}
                />
              )}
              onSongFinished={() => setFinished((n) => n + 1)}
              onPlayAgain={() => setRun((r) => r + 1)}
              onNextLevel={
                level < 3 ? () => set('level', String(level + 1)) : null
              }
              onExit={() => setExited(true)}
            />
          )}
        </div>
      </div>
    </LearnInputProvider>
  );
}
