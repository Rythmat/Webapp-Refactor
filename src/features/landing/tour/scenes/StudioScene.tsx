import { AnimatePresence, motion } from 'framer-motion';
import { Play, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/utilities';
import { ColorSpectrum } from '@/daw/components/Prism/ColorSpectrum';
import {
  DEMO_KEY_ROOT,
  DEMO_PROGRESSION,
  demoChord,
  keyCenterColor,
  nextOptions,
} from '../../music';
import { DemoKeys } from '../DemoKeys';
import type { SceneProps } from './sceneTypes';

const MAX_LANE = 6;
const BEAT_MS = 820;

/** Chords shown in the lane for each auto step (end state for `static`). */
const autoSequence = (stepIndex: number): string[] => {
  if (stepIndex <= 0) return DEMO_PROGRESSION.slice(0, 1);
  if (stepIndex === 1) return DEMO_PROGRESSION.slice(0, 1);
  return DEMO_PROGRESSION;
};

/** Suggestions for a sequence; restarts from the tonic when the graph ends. */
const optionsFor = (seq: string[]) => {
  const opts = nextOptions(seq);
  return opts.length > 0 ? opts : nextOptions(DEMO_PROGRESSION.slice(0, 1));
};

/**
 * Studio scene — a stylized recreation of the Studio's Prism workflow in
 * C major: key-center selector, the real Prism `ColorSpectrum` + suggestion
 * chips (from the real progression graph), a chord lane and keys. Every color
 * comes from `getChordColor` via `../../music`.
 */
export const StudioScene = ({
  stepIndex,
  mode,
  compact,
  onUserAction,
  playNotes,
}: SceneProps) => {
  const [userSeq, setUserSeq] = useState<string[] | null>(null);
  const [playIdx, setPlayIdx] = useState(0);
  const [pressed, setPressed] = useState<Map<number, string>>(new Map());

  // A new auto run discards whatever the visitor built.
  useEffect(() => {
    if (mode === 'auto') setUserSeq(null);
  }, [mode]);

  const seq = userSeq ?? autoSequence(stepIndex);
  const chords = useMemo(() => seq.map((t) => demoChord(t)), [seq]);
  const options = useMemo(
    () => optionsFor(seq).map((t) => demoChord(t)),
    [seq],
  );

  const isPlayStep = stepIndex === 3 && mode === 'auto';
  useEffect(() => {
    setPlayIdx(0);
    if (!isPlayStep) return;
    const id = window.setInterval(
      () => setPlayIdx((i) => (i + 1) % chords.length),
      BEAT_MS,
    );
    return () => window.clearInterval(id);
  }, [isPlayStep, chords.length]);

  const litChord = isPlayStep ? chords[playIdx] : undefined;
  const lit = useMemo(() => {
    const m = new Map(pressed);
    litChord?.midis.forEach((n) => m.set(n, litChord.color));
    return m;
  }, [litChord, pressed]);

  const flash = (midis: number[], color: string) => {
    setPressed(new Map(midis.map((n) => [n, color])));
    window.setTimeout(() => setPressed(new Map()), 320);
  };

  const addChord = (token: string) => {
    onUserAction();
    const base = seq.length >= MAX_LANE ? seq.slice(-1) : seq;
    const next = [...base, token];
    setUserSeq(next);
    const c = demoChord(token);
    flash(c.midis, c.color);
    playNotes(c.midis, 0.9);
  };

  const pressKey = (midi: number) => {
    onUserAction();
    flash([midi], keyCenterColor(DEMO_KEY_ROOT % 12));
    playNotes([midi], 0.5);
  };

  const pickToken = DEMO_PROGRESSION[1];
  const showSuggest = stepIndex >= 1 || mode !== 'auto';
  const keyColor = keyCenterColor(DEMO_KEY_ROOT % 12);

  return (
    <div className="flex h-full flex-col gap-3 p-4 text-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1.5 font-semibold">
          <SlidersHorizontal className="size-3.5 text-[#ffcc33]" />
          My first song
        </span>
        <span
          data-tour-target="key"
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-semibold transition-shadow duration-500',
            stepIndex === 0 && mode === 'auto'
              ? 'border-white/40 shadow-[0_0_0_4px_rgba(210,64,74,0.25)]'
              : 'border-white/10',
          )}
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: keyColor }}
          />
          Key: C major
        </span>
        {!compact && (
          <span className="rounded-md bg-white/[0.06] px-2.5 py-1.5 text-white/60">
            92 BPM · 4/4
          </span>
        )}
        <span className="ml-auto grid size-7 place-items-center rounded-full bg-[#ffcc33] text-black">
          <Play className="size-3.5 fill-current" />
        </span>
      </div>

      {/* Timeline */}
      <div
        className={cn(
          'relative flex min-h-0 gap-2',
          compact ? 'h-[300px] flex-none' : 'flex-1',
        )}
      >
        {!compact && (
          <div className="flex w-24 flex-col gap-2 text-[11px] text-white/55">
            <span className="flex h-16 items-center rounded-md bg-white/[0.04] px-2">
              Chords
            </span>
            <span className="flex flex-1 items-center rounded-md bg-white/[0.04] px-2">
              Keys
            </span>
          </div>
        )}
        <div className="relative flex min-w-0 flex-1 flex-col gap-2">
          <div
            data-tour-target="lane"
            className="relative grid h-16 gap-1.5 rounded-md bg-white/[0.03] p-1.5"
            style={{
              gridTemplateColumns: `repeat(${MAX_LANE}, minmax(0, 1fr))`,
            }}
          >
            <AnimatePresence initial={false}>
              {chords.map((c, i) => (
                <motion.div
                  key={`${c.token}-${i}`}
                  layout
                  initial={
                    mode === 'static'
                      ? false
                      : { opacity: 0, y: -18, scale: 0.9 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35, delay: userSeq ? 0 : i * 0.12 }}
                  className={cn(
                    'flex flex-col justify-between rounded-md px-2 py-1 text-[#101012]',
                    litChord === c && 'ring-2 ring-white',
                  )}
                  style={{ background: c.color }}
                >
                  <span className="text-sm font-bold leading-none">
                    {c.name}
                  </span>
                  <span className="text-[10px] font-semibold opacity-70">
                    {c.roman}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-white/[0.03]">
            {chords.flatMap((c, i) =>
              c.midis.map((m) => (
                <span
                  key={`${c.token}-${i}-${m}`}
                  className="absolute h-2 rounded-full"
                  style={{
                    left: `${(i / MAX_LANE) * 100 + 0.5}%`,
                    width: `${100 / MAX_LANE - 1}%`,
                    bottom: `${((m - 56) / 24) * 100}%`,
                    background: c.color,
                    opacity: litChord === c ? 1 : 0.7,
                  }}
                />
              )),
            )}
            {isPlayStep && (
              <span
                className="absolute inset-y-0 w-px bg-white shadow-[0_0_12px_white] transition-[left] duration-200"
                style={{ left: `${((playIdx + 0.5) / MAX_LANE) * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Prism panel + keys */}
      <div className={cn('flex gap-3', compact ? 'flex-col' : 'h-[38%]')}>
        <div
          className={cn(
            'flex min-w-0 flex-col gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 transition-opacity duration-500',
            compact ? '' : 'w-[55%]',
            showSuggest ? 'opacity-100' : 'opacity-40',
          )}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Prism · next chord
          </span>
          <div className="h-5">
            <ColorSpectrum
              chordOptions={optionsFor(seq)}
              rootMidi={DEMO_KEY_ROOT}
              mode="ionian"
              onSelectChord={addChord}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {options.slice(0, compact ? 6 : 10).map((o) => (
              <button
                key={o.token}
                type="button"
                data-tour-target={
                  o.token === pickToken && seq.length === 1 ? 'pick' : undefined
                }
                onClick={() => addChord(o.token)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs font-semibold transition-colors hover:border-white/30"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: o.color }}
                />
                {o.name}
                <span className="font-normal text-white/40">{o.roman}</span>
              </button>
            ))}
          </div>
        </div>
        <div
          data-tour-target="keys"
          className={cn('min-w-0', compact ? 'h-24 flex-none' : 'flex-1')}
        >
          <DemoKeys
            startMidi={48}
            octaves={3}
            lit={lit}
            onPress={pressKey}
            label="Studio keyboard"
          />
        </div>
      </div>
    </div>
  );
};
