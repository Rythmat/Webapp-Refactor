import {
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Swords,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import { cn } from '@/components/utilities';
import GenrePianoRoll, {
  type NoteEvent,
  type RollBand,
} from '@/curriculum/components/GenrePianoRoll';
import {
  BOSS_CALLS,
  BOSS_GOOD_TO_WIN,
  awaitsTeacher,
  chordPads,
  echoBossTempo,
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
import { BossAvatar, BossCard, BossHealthBar } from './EchoBoss';
import { EchoBossArt, useBossArt } from './EchoBossArt';
import { SECTION_TITLE } from './EchoGate';
import { RoundPips, SpeedMeter, StreakBadge } from './EchoHud';
import { BOSS_VORTEX, barSeconds, reactionRate, reactionTo } from './bossArt';
import { echoHeadline } from './echoCues';
import {
  BOSS_GAP_BARS,
  SECTION_ROUNDS,
  runCallsOf,
  type EchoFlow,
  type EchoOutcome,
  type EchoVerdict,
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
//
// THE ECHO BOSS (bossArt.ts, EchoBossArt.tsx)
// From the entrance to the end of the fight the circle is the boss: the
// owner's animations, over the ring, its size and in its place, and the
// hub's cues in a bar under it so the face shows whole.
//
//   entrance  the live ring cross-fades into the video (whose first frames
//             are the plain circle), the face emerges, and the fight starts
//             when it's done, or on Fight!
//   fight     after each echo, in the bar before the next call (the groove
//             going on): a good echo makes it frown, a miss makes it nod,
//             sped up to fit; between, it rests on its face
//   loss      it spirals into a black hole; then Try the Boss again
//   victory   it goes, and the ring shines; the art fades back to the live
//             ring, and the gate opens. Continue skips either
//
// The videos are mounted (and loading) from Chord Echo on, so the entrance
// plays at once. Under reduced motion, stills stand in.

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
  /** Paused (EchoGame's Pause): the input is off, and the entrance waits. */
  paused: boolean;
  /** Presenting, the teacher says how the class did (echoFlow.ts `judge`). */
  onJudge: (verdict: EchoVerdict) => void;
  /** The entrance is over (or skipped): the fight. */
  onFight: () => void;
  onBossRetry: () => void;
  /** The beaten boss is gone: the gate. */
  onBossWon: () => void;
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
  onJudge,
  onFight,
  onBossRetry,
  onBossWon,
  onNoteOn,
  onNoteOff,
}: EchoStageProps) {
  const { screen, key, level } = flow;
  const boss = screen.kind === 'boss' ? screen : null;
  const round = screen.kind === 'round' ? screen : null;
  const entrance = screen.kind === 'bossIntro';
  const bossOn = entrance || boss !== null;
  const fight = flow.stats.boss.outcome;

  // ── The Echo Boss's art ──
  const reducedMotion = usePrefersReducedMotion();
  const art = useBossArt(reducedMotion);
  const { controls } = art;
  /** Mounted from Chord Echo on: its videos load before the boss comes. */
  const withArt = bossOn || round?.section === 'chordEcho';
  const latest = useRef({ onFight, onBossWon });
  latest.current = { onFight, onBossWon };
  /** The loss has played: Try the Boss again. */
  const [lossOver, setLossOver] = useState(false);

  // The entrance; the fight starts when it's over, or on Play if it ended
  // while paused.
  const pausedNow = useRef(paused);
  pausedNow.current = paused;
  const [fightWaiting, setFightWaiting] = useState(false);
  useEffect(() => {
    if (!entrance) return;
    setFightWaiting(false);
    controls.play('emerge', {
      onEnd: () =>
        pausedNow.current ? setFightWaiting(true) : latest.current.onFight(),
    });
  }, [entrance, controls]);
  useEffect(() => {
    if (!fightWaiting || paused) return;
    setFightWaiting(false);
    latest.current.onFight();
  }, [fightWaiting, paused]);

  // A fight begins (after the entrance, or the boss fought again): the
  // boss on its face, an entrance cut short stopped there.
  const attempts = flow.stats.boss.attempts;
  const fighting = boss !== null && fight === 'fighting';
  useEffect(() => {
    if (!fighting) return;
    controls.rest();
    setLossOver(false);
  }, [fighting, attempts, controls]);

  // Each echo graded: the boss reacts, or the fight's over.
  const graded = boss ? boss.outcomes.filter(Boolean).length : 0;
  const lastOutcome = boss?.outcomes[graded - 1] ?? null;
  const bossTempo = boss?.tempo ?? 0;
  const seen = useRef({ attempts, graded });
  useEffect(() => {
    const was = seen.current;
    seen.current = { attempts, graded };
    if (!lastOutcome || was.attempts !== attempts || graded <= was.graded) {
      return;
    }
    if (fight === 'won') {
      controls.play('victory', {
        onEnd: () => controls.hide(() => latest.current.onBossWon()),
      });
    } else if (fight === 'lost') {
      controls.play('loss', { onEnd: () => setLossOver(true) });
    } else {
      const clip = reactionTo(lastOutcome);
      controls.play(clip, {
        rate: reactionRate(clip, barSeconds(bossTempo) * BOSS_GAP_BARS),
      });
    }
  }, [graded, attempts, lastOutcome, fight, bossTempo, controls]);

  // The run's own calls while it's this screen's; else the screen's.
  const fromScreen = useMemo(() => runCallsOf(flow), [flow]);
  const calls =
    run.id === flow.run && run.calls?.length ? run.calls : fromScreen;
  const running = run.live && run.id === flow.run;
  const tick = running ? run.view.tick : -1;
  const at = calls.length ? callIndexAt(calls, Math.max(0, tick)) : 0;
  const placed = calls[at] ?? null;

  const tonicPc = pitchClassOf(key.tonic);
  const pads = useMemo(() => melodyPads(key), [key]);
  const chords = useMemo(() => chordPads(key), [key]);

  // ── The hub ──
  const sectionTitle = bossOn
    ? 'Echo Boss'
    : round
      ? SECTION_TITLE[round.section]
      : '';
  const headline = placed
    ? echoHeadline(
        placed.timeline,
        tick,
        running,
        sectionTitle,
        awaitsTeacher(placed.call),
      )
    : { kind: 'idle' as const, text: sectionTitle };
  // Presenting: the answer wasn't played here, so the teacher says.
  const judging = (round?.judging || boss?.judging) ?? false;
  const chordNow = useMemo(() => {
    if (!placed || placed.call.kind !== 'chords') return null;
    const inAnswer = tick >= placed.timeline.response.start;
    const attacks = inAnswer ? placed.attacks.response : placed.attacks.call;
    const now = running ? attackAt(attacks, tick) : null;
    const bar = now?.attack.bar ?? -1;
    return {
      hub: {
        kind: 'chord' as const,
        // A teacher's call has no chords until it's played.
        label: (now?.attack.chord ?? placed.call.chords[0])?.label ?? '?',
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
  const tempo = boss
    ? boss.tempo
    : entrance
      ? echoBossTempo(flow.tempo, level)
      : (round?.tempo ?? flow.tempo.bpm);

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
        {bossOn ? (
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
          art={
            withArt ? (
              <EchoBossArt art={art} reducedMotion={reducedMotion} />
            ) : undefined
          }
          ringFaded={bossOn && art.state.up}
          hubBelow={bossOn}
          below={
            <div
              className={cn(
                // The boss's calls change from melody to chords: one
                // height for both, so the art keeps its size.
                bossOn && 'flex min-h-[44px] items-center justify-center',
              )}
            >
              {chordNow ? (
                <ChordBars
                  rows={[{ bars: chordNow.bars }]}
                  keyColor={keyColor}
                />
              ) : (
                <p className="text-center text-[15px] leading-6 text-white/55">
                  {placed?.call.taught
                    ? 'Play your call, and the class plays it back.'
                    : flow.audience === 'class'
                      ? 'Listen to Atlas, then play it back together.'
                      : 'Listen to Atlas, then play it back.'}
                </p>
              )}
            </div>
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
            keyChoice={key}
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
            lit={running ? run.view.lit : []}
            targets={placed ? placed.notes.call.map((n) => n.midi) : undefined}
            isRight={isRight}
            keyboardMaxHeight={130}
            enabled={!paused && !judging}
            className={input === 'pads' ? 'min-h-[180px] pt-6' : undefined}
          />
          {round?.outcome && (
            <EchoResultCard outcome={round.outcome} keyColor={keyColor} />
          )}
          {judging && placed && (
            <JudgeCard
              caller={placed.call.taught ? 'Your Call' : 'Atlas'}
              asked={
                placed.call.kind === 'melody'
                  ? placed.call.notes.map((n) => n.label)
                  : placed.call.labels
              }
              keyColor={keyColor}
              paused={paused}
              onJudge={onJudge}
            />
          )}
          {round?.noCall && <NoCallCard />}
          {entrance && (
            <BossCard
              title="The Echo Boss Appears!"
              line={`It plays ${BOSS_CALLS} calls in a row, with trickier rhythms. Echo ${BOSS_GOOD_TO_WIN} of them to win!`}
              data={{ 'data-echo-boss-card': 'entrance' }}
              action={
                <BossButton keyColor={keyColor} onClick={onFight}>
                  <Swords aria-hidden className="size-5" />
                  Fight!
                </BossButton>
              }
            />
          )}
          {boss && fight === 'won' && (
            <BossCard
              title="Boss Defeated!"
              line="Three good echoes. Here comes the gate…"
              data={{
                'data-echo-boss-card': 'won',
                'data-echo-boss-outcome': 'won',
              }}
              action={
                <BossButton
                  keyColor={keyColor}
                  onClick={() => {
                    controls.stop();
                    onBossWon();
                  }}
                >
                  Continue
                  <ChevronRight aria-hidden className="size-5" />
                </BossButton>
              }
            />
          )}
          {boss && fight === 'lost' && !lossOver && (
            <BossCard
              title="The Echo Boss Wins This Time!"
              data={{
                'data-echo-boss-card': 'lost',
                'data-echo-boss-outcome': 'lost',
              }}
              action={
                <BossButton
                  keyColor={keyColor}
                  onClick={() => {
                    controls.stop();
                    setLossOver(true);
                  }}
                >
                  Continue
                  <ChevronRight aria-hidden className="size-5" />
                </BossButton>
              }
            />
          )}
        </div>
      </div>

      {boss && fight === 'lost' && lossOver && (
        <BossOutcome keyColor={keyColor} onRetry={onBossRetry} />
      )}
    </section>
  );
}

// ── The boss's strip: the boss, its hearts, its four calls ─────────────────

function BossStrip({ flow, keyColor }: { flow: EchoFlow; keyColor: string }) {
  const screen = flow.screen.kind === 'boss' ? flow.screen : null;
  const fight = flow.stats.boss;
  const outcomes = screen?.outcomes ?? [];
  const graded = outcomes.filter(Boolean).length;
  const last = outcomes[graded - 1] ?? null;
  // A good echo lands a hit; a miss makes it giggle.
  const [shown, setShown] = useState(false);
  const seen = useRef(graded);
  useEffect(() => {
    if (graded === seen.current) return;
    seen.current = graded;
    if (!last) return;
    setShown(true);
    const timer = setTimeout(() => setShown(false), 900);
    return () => clearTimeout(timer);
  }, [graded, last]);
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <BossAvatar
          // A new hit shakes it again.
          key={last?.passed && shown ? `hit-${graded}` : 'still'}
          size={56}
          className={cn(last?.passed && shown && 'echo-shake')}
        />
        {last && shown && (
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
        results={outcomes
          .filter((o): o is EchoOutcome => o !== null)
          .map((o) => o.passed)}
        total={BOSS_CALLS}
        keyColor={keyColor}
        label={`Call ${Math.min(BOSS_CALLS, (screen?.at ?? 0) + 1)} of ${BOSS_CALLS}`}
      />
    </div>
  );
}

/** A boss card's button, in the key's color. */
function BossButton({
  keyColor,
  onClick,
  children,
}: {
  keyColor: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 inline-flex h-12 items-center gap-2 rounded-full px-7 text-base font-semibold transition-transform hover:scale-105"
      style={{ backgroundColor: keyColor, color: inkOn(keyColor) }}
    >
      {children}
    </button>
  );
}

/** The fight lost, its art played out: Try the Boss again. */
function BossOutcome({
  keyColor,
  onRetry,
}: {
  keyColor: string;
  onRetry: () => void;
}) {
  return (
    <div
      data-echo-boss-outcome="lost"
      data-echo-boss-retry
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#101012]/85 p-6 text-center backdrop-blur-sm"
    >
      <img
        src={BOSS_VORTEX}
        alt=""
        width={150}
        height={150}
        draggable={false}
        className="echo-boss-blend size-[150px]"
      />
      <h2 className="echo-pop text-[clamp(26px,3vw,38px)] leading-tight text-[#e8e8f0]">
        The Echo Boss Wins This Time!
      </h2>
      <p className="max-w-md text-[15px] leading-6 text-white/60">
        So close! Three good echoes win. You can do it.
      </p>
      <BossButton keyColor={keyColor} onClick={onRetry}>
        <RotateCcw aria-hidden className="size-4" />
        Try the Boss again
      </BossButton>
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
  // A popup over the pads (or the roll and keys), the column dimmed under
  // it, so it reads whole whatever is behind it.
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[#101012]/60 p-4">
      <div
        role="status"
        data-echo-result={outcome.passed ? 'pass' : 'miss'}
        className="echo-pop flex max-w-full flex-col gap-2 rounded-2xl border border-white/10 bg-[#151518] px-5 py-4 shadow-2xl"
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
    </div>
  );
}

// ── Presenting: the teacher says how the class did ─────────────────────────

/** The keys for the verdicts: Y, N and R, clear of the pads' home row. */
const VERDICT_KEYS: Readonly<Record<string, EchoVerdict>> = {
  KeyY: 'good',
  KeyN: 'miss',
  KeyR: 'again',
};

function JudgeCard({
  caller,
  asked,
  keyColor,
  paused,
  onJudge,
}: {
  /** Whose call it was: Atlas, or the teacher's own. */
  caller: string;
  asked: readonly string[];
  keyColor: string;
  paused: boolean;
  onJudge: (verdict: EchoVerdict) => void;
}) {
  const latest = useRef(onJudge);
  latest.current = onJudge;
  useEffect(() => {
    if (paused) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey) return;
      const verdict = VERDICT_KEYS[event.code];
      if (!verdict) return;
      event.preventDefault();
      latest.current(verdict);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused]);
  const choices: {
    verdict: EchoVerdict;
    label: string;
    hint: string;
    Icon: typeof Check;
  }[] = [
    { verdict: 'good', label: 'Got It!', hint: 'Y', Icon: ThumbsUp },
    { verdict: 'miss', label: 'Missed It', hint: 'N', Icon: ThumbsDown },
    { verdict: 'again', label: 'Again', hint: 'R', Icon: RotateCcw },
  ];
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[#101012]/60 p-4">
      <div
        role="dialog"
        aria-label="How did the class do?"
        data-echo-judge
        className="echo-pop flex max-w-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#151518] px-6 py-5 text-center shadow-2xl"
      >
        <span className="text-2xl text-[#e8e8f0]">How did the class do?</span>
        <span className="flex items-baseline gap-2 text-white/60">
          <span className="text-xs uppercase tracking-[0.12em] text-white/45">
            {caller}
          </span>
          <span className="text-lg font-semibold tabular-nums text-[#e8e8f0]">
            {asked.join(' · ')}
          </span>
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          {choices.map(({ verdict, label, hint, Icon }) => (
            <button
              key={verdict}
              type="button"
              data-echo-verdict={verdict}
              onClick={() => onJudge(verdict)}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform hover:scale-105',
                verdict === 'good'
                  ? 'text-[#101012]'
                  : 'border border-white/15 bg-white/[0.06] text-[#e8e8f0]',
              )}
              style={
                verdict === 'good' ? { backgroundColor: keyColor } : undefined
              }
            >
              <Icon aria-hidden className="size-4" />
              {label}
              <kbd className="rounded border border-current px-1 font-sans text-[10px] leading-4 opacity-60">
                {hint}
              </kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The teacher led, and nothing was heard: the round runs again. */
function NoCallCard() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[#101012]/60 p-4">
      <div
        role="status"
        data-echo-no-call
        className="echo-pop flex max-w-full flex-col items-center gap-1 rounded-2xl border border-white/10 bg-[#151518] px-6 py-5 text-center shadow-2xl"
      >
        <span className="text-2xl text-[#e8e8f0]">No call heard</span>
        <span className="text-sm text-white/55">
          Play your call over the Your Call bar. Here it comes again!
        </span>
      </div>
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
  // A 1 at the bottom and a 1 at the top, as the pads have: the octave from
  // the 1 at or below the lowest note, stretched by octaves to the highest.
  const rollRange = useMemo(() => {
    const midis = events.map((e) => e.midi!);
    const low = midis.length ? Math.min(...midis) : tonic;
    const high = midis.length ? Math.max(...midis) : tonic + 12;
    const bottom = tonic + 12 * Math.floor((low - tonic) / 12);
    const top = bottom + 12 * Math.max(1, Math.ceil((high - bottom) / 12));
    return { min: bottom, max: top };
  }, [events, tonic]);
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
        // Isolated: the roll's own layers (its sticky header) stay under
        // the result and the boss's cards.
        'isolate min-h-[150px] flex-1 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]',
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
