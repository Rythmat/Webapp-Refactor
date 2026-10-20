import { Check, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import GenrePianoRoll, {
  type NoteEvent,
  type RollBand,
} from '@/curriculum/components/GenrePianoRoll';
import {
  BOSS_CALLS,
  chordPads,
  echoTempoRange,
  melodyPads,
  type PlayedNote,
} from '@/curriculum/engine/echo';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { pitchClassOf } from '@/curriculum/engine/musicLiteracy/pitch';
import type { RunView } from '@/curriculum/engine/musicLiteracy/run';
import { colorKeyOf, keyName } from '@/curriculum/musicLiteracy/ChooseKeyPanel';
import { ChordBars } from '@/curriculum/musicLiteracy/ChordBars';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';
import { LiteracyCallPanel } from '@/curriculum/musicLiteracy/LiteracyCallPanel';
import { attackAt } from '@/curriculum/musicLiteracy/literacyKeys';
import { literacyClock } from '@/curriculum/musicLiteracy/literacyRun';
import { useElementSize } from '@/hooks/useElementSize';
import { BossHealthBar, EchoBossCharacter, type BossMood } from './EchoBoss';
import { SECTION_TITLE } from './EchoGate';
import { RoundPips, SpeedMeter, StreakBadge } from './EchoHud';
import { echoHeadline } from './echoCues';
import {
  SECTION_ROUNDS,
  runCallsOf,
  type EchoFlow,
  type EchoOutcome,
} from './echoFlow';
import { callIndexAt, wholeTimeline, type RunCall } from './echoRunCues';
import type { EchoInputMode } from './echoSettings';
import { EchoInputSurface, type EchoNoteOff, type EchoNoteOn } from './input';
import './echoGame.css';

// ── The stage: a round, or the boss fight ──────────────────────────────────
// Music Literacy's player, made a game. Across the top, the game's running
// numbers: the section and its round pips (or the Echo Boss and its
// hearts), the speed meter and the streak. Then, side by side:
//
//   the call   the circle in the key's color and its hub (LiteracyCallPanel)
//              saying GET READY, LISTEN, GO!, YOUR TURN, the call's scale
//              degrees lighting as Atlas plays them (a chord call: the chord,
//              and its bars under the circle)
//   the input  Pads: the melody or chord pads, lit as Atlas plays.
//              Keyboard: the roll (or staff, or falling notes) with the
//              Call band and the shining Response band, over the piano
//
// After a round its result shows briefly over the input: a good echo or a
// miss, what Atlas asked and what the student played. A miss makes the
// next call an easier one, and the strip says so.

export interface EchoStageRun {
  /** The run id its calls belong to (EchoFlow.run). */
  id: number;
  calls: RunCall[] | null;
  view: RunView;
  live: boolean;
  played: readonly PlayedNote[];
}

export interface EchoStageProps {
  flow: EchoFlow;
  input: EchoInputMode;
  run: EchoStageRun;
  keyColor: string;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onBossRetry: () => void;
  onNoteOn: (note: EchoNoteOn) => void;
  onNoteOff: (note: EchoNoteOff) => void;
}

/** The roll's timeline header (GenrePianoRoll draws it 40px tall). */
const ROLL_HEADER = 40;

const pc = (midi: number) => ((midi % 12) + 12) % 12;

export function EchoStage({
  flow,
  input,
  run,
  keyColor,
  paused,
  onPause,
  onResume,
  onBossRetry,
  onNoteOn,
  onNoteOff,
}: EchoStageProps) {
  const { screen, key, level } = flow;
  const boss = screen.kind === 'boss' ? screen : null;
  const round = screen.kind === 'round' ? screen : null;
  const fight = flow.stats.boss.outcome;

  // The run's own calls while it's this screen's; else the screen's.
  const fromScreen = useMemo(() => runCallsOf(flow), [flow]);
  const calls =
    run.id === flow.run && run.calls?.length ? run.calls : fromScreen;
  const running = run.live && run.id === flow.run;
  const tick = running ? run.view.tick : -1;
  const at = calls.length ? callIndexAt(calls, Math.max(0, tick)) : 0;
  const placed = calls[at] ?? null;

  const tonicPc = pitchClassOf(key.tonic);
  const pads = useMemo(() => melodyPads(level, key), [level, key]);
  const chords = useMemo(() => chordPads(key), [key]);

  // ── The hub ──
  const sectionTitle = boss
    ? 'Echo Boss'
    : round
      ? SECTION_TITLE[round.section]
      : '';
  const headline = placed
    ? echoHeadline(placed.timeline, tick, running, sectionTitle)
    : { kind: 'idle' as const, text: sectionTitle };
  const chordNow = useMemo(() => {
    if (!placed || placed.call.kind !== 'chords') return null;
    const inAnswer = tick >= placed.timeline.response.start;
    const attacks = inAnswer ? placed.attacks.response : placed.attacks.call;
    const now = running ? attackAt(attacks, tick) : null;
    const bar = now?.attack.bar ?? -1;
    return {
      hub: {
        kind: 'chord' as const,
        label: (now?.attack.chord ?? placed.call.chords[0]).label,
        lit:
          !!now?.sounding &&
          now.attack.chord.midis.some((m) => run.view.lit.includes(m)),
      },
      bars: placed.call.labels.map((label, b) => ({
        label,
        lit: running && b === bar,
      })),
    };
  }, [placed, tick, running, run.view.lit]);

  // ── Right or wrong, for the keys and the roll ──
  const isRight = useCallback(
    (midi: number) => {
      if (!placed) return true;
      return placed.call.kind === 'melody'
        ? placed.notes.response.some((n) => n.midi === midi)
        : placed.call.chords.some((c) => c.pitchClasses.includes(pc(midi)));
    },
    [placed],
  );

  // What the browser test reads to play along: each answer's notes, in
  // run ticks, and the pad that plays them.
  const targets = useMemo(
    () =>
      JSON.stringify(
        calls.map((c) =>
          c.call.kind === 'melody'
            ? c.notes.response.map((n) => ({
                onset: n.onset,
                duration: n.duration,
                midis: [n.midi],
                pad: pads.pads.findIndex((p) => p.midi === n.midi),
              }))
            : c.attacks.response.map((a) => ({
                onset: a.onset,
                duration: a.duration,
                midis: [...a.chord.midis],
                pad: chords.findIndex((p) => p.degree === a.chord.degree),
              })),
        ),
      ),
    [calls, pads, chords],
  );

  const kind = placed?.call.kind === 'chords' ? 'chords' : 'melody';
  const range = echoTempoRange(level);
  const tempo = boss ? boss.tempo : (round?.tempo ?? flow.tempo.bpm);

  return (
    <section
      aria-label={sectionTitle}
      data-echo-screen={screen.kind}
      data-echo-section={round?.section ?? 'boss'}
      data-echo-round={round ? round.round : boss ? boss.at : undefined}
      data-echo-easier={round?.easier || undefined}
      data-echo-run={flow.run}
      data-echo-live={running || undefined}
      data-echo-tempo={tempo}
      data-echo-play-with={input}
      data-echo-targets={targets}
      className="relative flex min-h-0 flex-1 flex-col gap-3 p-4 max-[639px]:p-3"
    >
      <div className="flex min-h-[44px] flex-wrap items-center gap-x-6 gap-y-2">
        {boss ? (
          <BossStrip flow={flow} keyColor={keyColor} />
        ) : round ? (
          <>
            <h2 className="text-xl text-[#e8e8f0]">{sectionTitle}</h2>
            <RoundPips
              results={flow.pips[round.section]}
              total={SECTION_ROUNDS[round.section]}
              keyColor={keyColor}
              label={`Round ${round.round + 1} of ${SECTION_ROUNDS[round.section]}`}
            />
            {round.easier && (
              <span
                data-echo-easier-note
                className="echo-pop inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-3 py-1 text-xs text-white/75"
              >
                <Sparkles aria-hidden className="size-3.5" />
                Here’s an easier one
              </span>
            )}
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-5">
          <SpeedMeter
            bpm={tempo}
            low={range.low}
            high={range.high}
            keyColor={keyColor}
          />
          <StreakBadge streak={flow.stats.streak} keyColor={keyColor} />
          <button
            type="button"
            onClick={paused ? onResume : onPause}
            aria-label={paused ? 'Resume' : 'Pause'}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {paused ? (
              <Play aria-hidden className="size-4" />
            ) : (
              <Pause aria-hidden className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-4 max-[899px]:grid-cols-[minmax(0,1fr)] max-[899px]:overflow-y-auto">
        <LiteracyCallPanel
          tonicPc={tonicPc}
          mode={key.mode}
          keyColor={keyColor}
          keyName={keyName(key.tonic, key.mode)}
          colorOf={key.mode === 'minor' ? colorKeyOf(key.tonic) : null}
          call={placed?.call.kind === 'melody' ? placed.notes.call : []}
          response={placed?.call.kind === 'melody' ? placed.notes.response : []}
          words={[]}
          wordsStart={placed?.timeline.call.start ?? 0}
          barTicks={placed?.timeline.barTicks ?? 1920}
          beatsPerBar={4}
          view={running ? run.view : { ...run.view, hub: null, beat: -1 }}
          running={running}
          headline={headline}
          hubContent={chordNow?.hub}
          below={
            chordNow ? (
              <ChordBars rows={[{ bars: chordNow.bars }]} keyColor={keyColor} />
            ) : (
              <p className="text-center text-[15px] leading-6 text-white/55">
                Listen to Atlas, then play it back.
              </p>
            )
          }
        />

        <div className="relative flex min-h-0 min-w-0 flex-col gap-3">
          {input === 'keyboard' && placed && (
            <EchoRoll
              runId={flow.run}
              calls={calls}
              played={run.id === flow.run ? run.played : []}
              running={running}
              tempo={tempo}
              keyColor={keyColor}
              tonic={pads.tonic}
              isRight={isRight}
            />
          )}
          <EchoInputSurface
            input={input}
            kind={kind}
            level={level}
            keyChoice={key}
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
            lit={running ? run.view.lit : []}
            targets={placed ? placed.notes.call.map((n) => n.midi) : undefined}
            isRight={isRight}
            keyboardMaxHeight={130}
            enabled={!paused}
            className={input === 'pads' ? 'min-h-[180px] pt-6' : undefined}
          />
          {round?.outcome && (
            <EchoResultCard outcome={round.outcome} keyColor={keyColor} />
          )}
        </div>
      </div>

      {boss && fight !== 'fighting' && (
        <BossOutcome
          won={fight === 'won'}
          keyColor={keyColor}
          onRetry={onBossRetry}
        />
      )}
      {paused && (
        <div
          data-echo-paused
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#101012]/85 backdrop-blur-sm"
        >
          <p className="text-3xl text-[#e8e8f0]">Paused</p>
          <button
            type="button"
            onClick={onResume}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-[#101012]"
          >
            <Play aria-hidden className="size-4" fill="currentColor" />
            Resume
          </button>
          <p className="text-sm text-white/50">
            The call starts again from the count-in.
          </p>
        </div>
      )}
    </section>
  );
}

// ── The boss's strip: the boss, its hearts, its four calls ─────────────────

function BossStrip({ flow, keyColor }: { flow: EchoFlow; keyColor: string }) {
  const screen = flow.screen.kind === 'boss' ? flow.screen : null;
  const fight = flow.stats.boss;
  const graded = screen ? screen.outcomes.filter(Boolean).length : 0;
  const last = screen?.outcomes[graded - 1] ?? null;
  // A good echo lands a hit; a miss makes it giggle.
  const [mood, setMood] = useState<BossMood>('idle');
  const seen = useRef(graded);
  useEffect(() => {
    if (graded === seen.current) return;
    seen.current = graded;
    if (!last) return;
    setMood(last.passed ? 'hit' : 'cheer');
    const timer = setTimeout(() => setMood('idle'), 900);
    return () => clearTimeout(timer);
  }, [graded, last]);
  if (!screen) return null;
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <EchoBossCharacter color={keyColor} mood={mood} size={64} />
        {last && mood !== 'idle' && (
          <span
            key={graded}
            aria-hidden
            className="echo-float-up absolute -top-2 left-full ml-1 whitespace-nowrap text-sm font-semibold"
            style={{ color: last.passed ? keyColor : '#e8e8f0' }}
          >
            {last.passed ? 'Bonk!' : 'Hee hee!'}
          </span>
        )}
      </div>
      <BossHealthBar health={fight.health} color={keyColor} />
      <RoundPips
        results={screen.outcomes
          .filter((o): o is EchoOutcome => o !== null)
          .map((o) => o.passed)}
        total={BOSS_CALLS}
        keyColor={keyColor}
        label={`Call ${Math.min(BOSS_CALLS, screen.at + 1)} of ${BOSS_CALLS}`}
      />
    </div>
  );
}

function BossOutcome({
  won,
  keyColor,
  onRetry,
}: {
  won: boolean;
  keyColor: string;
  onRetry: () => void;
}) {
  return (
    <div
      data-echo-boss-outcome={won ? 'won' : 'lost'}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#101012]/85 p-6 text-center backdrop-blur-sm"
    >
      <EchoBossCharacter
        color={keyColor}
        mood={won ? 'beaten' : 'cheer'}
        size={150}
      />
      <h2 className="echo-pop text-[clamp(26px,3vw,38px)] leading-tight text-[#e8e8f0]">
        {won ? 'Boss defeated!' : 'The Echo Boss wins this time!'}
      </h2>
      <p className="max-w-md text-[15px] leading-6 text-white/60">
        {won
          ? 'Three good echoes. Here comes the gate…'
          : 'So close! Three good echoes win. You can do it.'}
      </p>
      {!won && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-12 items-center gap-2 rounded-full px-7 text-base font-semibold transition-transform hover:scale-105"
          style={{ backgroundColor: keyColor, color: inkOn(keyColor) }}
        >
          <RotateCcw aria-hidden className="size-4" />
          Try the Boss again
        </button>
      )}
    </div>
  );
}

// ── A round's result ───────────────────────────────────────────────────────

function EchoResultCard({
  outcome,
  keyColor,
}: {
  outcome: EchoOutcome;
  keyColor: string;
}) {
  const line = (label: string, items: readonly string[], judge: boolean) => (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="w-16 shrink-0 text-right text-xs uppercase tracking-[0.12em] text-white/45">
        {label}
      </span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-lg font-semibold tabular-nums">
        {items.length === 0 ? (
          <span className="text-sm font-normal text-white/45">no notes</span>
        ) : (
          items.map((item, i) => (
            <span
              key={i}
              style={{
                color:
                  judge && outcome.asked[i] !== item ? '#9a9aa6' : '#e8e8f0',
              }}
            >
              {i > 0 && <span className="mr-1.5 text-white/25">·</span>}
              {item}
            </span>
          ))
        )}
      </span>
    </span>
  );
  return (
    <div
      role="status"
      data-echo-result={outcome.passed ? 'pass' : 'miss'}
      className="echo-pop absolute inset-x-0 top-0 z-10 mx-auto flex w-fit max-w-full flex-col gap-2 rounded-2xl border border-white/10 bg-[#151518]/95 px-5 py-4 shadow-2xl"
    >
      <span className="flex items-center gap-2 text-2xl text-[#e8e8f0]">
        {outcome.passed ? (
          <>
            <span
              className="flex size-8 items-center justify-center rounded-full text-[#101012]"
              style={{ backgroundColor: keyColor }}
            >
              <Check aria-hidden className="size-5" />
            </span>
            Great echo!
          </>
        ) : (
          <>
            <span className="flex size-8 items-center justify-center rounded-full bg-white/10">
              <RotateCcw aria-hidden className="size-4" />
            </span>
            So close! Try the next one.
          </>
        )}
      </span>
      {line('Atlas', outcome.asked, false)}
      {line('You', outcome.played, true)}
    </div>
  );
}

// ── The roll, for the keyboard ─────────────────────────────────────────────

function EchoRoll({
  runId,
  calls,
  played,
  running,
  tempo,
  keyColor,
  tonic,
  isRight,
}: {
  runId: number;
  calls: readonly RunCall[];
  played: readonly PlayedNote[];
  running: boolean;
  tempo: number;
  keyColor: string;
  tonic: number;
  isRight: (midi: number) => boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const size = useElementSize(box);
  const whole = wholeTimeline(calls);
  const bar = whole.barTicks;
  // The roll's tick 0 is the first call's downbeat.
  const zero = whole.call.start;

  const events = useMemo<NoteEvent[]>(
    () =>
      calls.flatMap((c, i) =>
        (['call', 'response'] as const).flatMap((segment) =>
          c.notes[segment].map((note) => ({
            id: `${i}-${segment}-${note.index}`,
            pitchName: midiToPitchName(note.midi, tonic),
            midi: note.midi,
            startTicks: note.onset - zero,
            durationTicks: note.duration,
            color: keyColor,
          })),
        ),
      ),
    [calls, tonic, zero, keyColor],
  );
  const bands = useMemo<RollBand[]>(
    () =>
      calls.flatMap((c) => {
        const t = c.timeline;
        const response: RollBand = {
          startTick: t.response.start - zero,
          endTick: t.response.start + t.response.length - zero,
          label: 'Response',
          color: keyColor,
          shine: true,
        };
        if (c.call.kind === 'chords') {
          return [
            ...c.call.labels.map((label, b) => ({
              startTick: t.call.start + b * bar - zero,
              endTick: t.call.start + (b + 1) * bar - zero,
              label,
              color: keyColor,
            })),
            response,
          ];
        }
        return [
          {
            startTick: t.call.start - zero,
            endTick: t.call.start + t.call.length - zero,
            label: 'Call',
            color: keyColor,
          },
          response,
        ];
      }),
    [calls, zero, bar, keyColor],
  );
  const rollRange = useMemo(() => {
    const midis = events.map((e) => e.midi!);
    if (midis.length === 0) return { min: 58, max: 66 };
    const low = Math.min(...midis);
    const high = Math.max(...midis);
    const pad = Math.max(2, Math.ceil((7 - (high - low)) / 2));
    return { min: low - pad, max: high + pad };
  }, [events]);
  const userNotes = useMemo(
    () =>
      played.map((note) => ({
        midi: note.midi,
        onset: note.onset - zero,
        duration: note.duration,
        correct: isRight(note.midi),
      })),
    [played, zero, isRight],
  );
  const playbackTicks = useCallback(() => {
    const ticks = literacyClock.playbackTicks();
    return ticks === null ? null : ticks - zero + bar;
  }, [zero, bar]);
  const targetMidis = useMemo(
    () => new Set(events.map((e) => e.midi!)),
    [events],
  );

  return (
    <div
      ref={box}
      data-echo-roll
      className={cn(
        'min-h-[150px] flex-1 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]',
      )}
    >
      {size.height > 0 && (
        <GenrePianoRoll
          key={`roll-${runId}`}
          instrument="piano"
          events={events}
          bars={(whole.total - zero) / bar}
          beatsPerBar={4}
          beatTicks={bar / 4}
          timeSignature={[4, 4]}
          staves="treble"
          subdivision={running ? 2 : 1}
          rowHeight={Math.max(100, Math.round(size.height) - ROLL_HEADER)}
          midiRangeMin={rollRange.min}
          midiRangeMax={rollRange.max}
          inTime={running}
          playSpeed={tempo}
          isPlaying={running}
          onPlayingChange={() => {}}
          playbackTicks={running ? playbackTicks : undefined}
          keyRoot={tonic}
          keyColor={keyColor}
          userNotes={userNotes}
          targetMidiSet={targetMidis}
          colorActiveLanesByTarget
          bands={bands}
        />
      )}
    </div>
  );
}
