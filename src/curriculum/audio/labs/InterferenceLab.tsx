import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { BeatsStage } from '../lab/BeatsStage';
import {
  LabDock,
  LabNext,
  LabPicker,
  LabReadout,
  LabSlider,
  LabText,
  PredictChoices,
  RevealVerdict,
  SoundPill,
  TapToHear,
  type LabChoice,
} from '../lab/LabControls';
import { LabDone, type LabFollowing } from '../lab/LabDone';
import type { LabTopicProps } from '../lab/LabLesson';
import { SumStage } from '../lab/SumStage';
import type { Tone } from '../lab/WaveStage';
import {
  beatRate,
  degreesFromCancelling,
  sumAmplitude,
} from '../lab/physics/combine';
import { useLabTone } from '../lab/useLabTone';

// ── Waves Together → Interference & Phase ──────────────────────────────────
// Waves meeting simply add. Slide one tone against another and hear the sum grow
// and vanish; guess what half a cycle does; hear beats when two tones are almost
// the same; then cancel a tone and tune two together, by ear. The cancelling is
// real: the second tone goes through a delay, and nothing is turned down.

const HZ = 220;
/** How far from half a cycle still counts as cancelled, in degrees. */
export const CANCEL_WITHIN = 12;
/** How near two tones must be to count as tuned: under a beat a second. */
export const TUNED_WITHIN = 1;
const TUNE_REACH = 8;

const CHOICES: readonly LabChoice[] = [
  { id: 'double', text: 'It gets twice as loud' },
  { id: 'silent', text: 'It goes silent, or very nearly' },
  { id: 'octave', text: 'It jumps up an octave' },
];
const CORRECT = 'silent';

/** Never 0: two separate tones at one pitch stay at whatever phase they met. */
const BEAT_OFFSETS = [1, 3, 8, 30] as const;

export const TRY_ROUNDS = [
  { kind: 'cancel', start: 40 },
  { kind: 'tune', hz: 220, start: 5 },
  { kind: 'tune', hz: 330, start: -6 },
] as const;

const SLOWED =
  'Three cycles, to scale with each other, slowed right down to see. Each tone is half a full level.';

function PhaseSlider({
  phase,
  accent,
  onChange,
}: {
  phase: number;
  accent: string;
  onChange: (phase: number) => void;
}) {
  return (
    <LabSlider
      label={`Tone 2 is behind by ${Math.round(phase)}°`}
      low="In step"
      high="A full cycle"
      accent={accent}
      min={0}
      max={360}
      step={1}
      value={phase}
      valueText={`${Math.round(phase)} degrees behind`}
      onChange={onChange}
    />
  );
}

function HearStep({
  tone,
  accent,
  next,
}: {
  tone: Tone;
  accent: string;
  next: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const on = tone.sounding.has('pair');
  return (
    <>
      <LabText>
        <p>
          When two waves meet, they add. Where both push, the air is pushed
          twice as hard. Where one pushes and the other pulls, they work against
          each other. How far apart they are in their cycles is their phase.
        </p>
        <p>Press play and slide the second tone along.</p>
      </LabText>
      <SumStage phase={phase} accent={accent} tone={tone} caption={SLOWED} />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() =>
              on ? tone.stop('pair') : tone.setPair('pair', HZ, phase)
            }
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <PhaseSlider
            phase={phase}
            accent={accent}
            onChange={(value) => {
              setPhase(value);
              tone.glidePair('pair', HZ, value);
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="How tall the sum is"
          value={`${Math.round(sumAmplitude(phase) * 100)}%`}
          accent={accent}
        />
      </div>
      <LabNext onClick={next}>Next: make a prediction</LabNext>
    </>
  );
}

function PredictStep({
  tone,
  accent,
  picked,
  onPick,
  next,
}: {
  tone: Tone;
  accent: string;
  picked: string | null;
  onPick: (id: string) => void;
  next: () => void;
}) {
  const on = tone.sounding.has('pair');
  return (
    <>
      <SumStage
        phase={0}
        accent={accent}
        tone={tone}
        caption="Two identical tones, exactly in step."
      />
      <div>
        <SoundPill
          on={on}
          onClick={() => (on ? tone.stop('pair') : tone.setPair('pair', HZ, 0))}
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          Hear them
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="Now delay one of them by exactly half a cycle, so one pushes while the other pulls. What do you hear?"
        choices={CHOICES}
        picked={picked}
        onPick={onPick}
      />
      {picked && <LabNext onClick={next}>Hear what really happens</LabNext>}
    </>
  );
}

function RevealStep({
  tone,
  accent,
  picked,
  next,
}: {
  tone: Tone;
  accent: string;
  picked: string | null;
  next: () => void;
}) {
  const [phase, setPhase] = useState(180);
  const [offset, setOffset] = useState<(typeof BEAT_OFFSETS)[number]>(3);
  const pairOn = tone.sounding.has('pair');
  const beatsOn = tone.sounding.has('low');
  const stopBeats = () => {
    tone.stop('low');
    tone.stop('high');
  };
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="It goes silent. Both tones are still playing, and they’re cancelling each other out. This is called destructive interference."
      />
      <SumStage
        phase={phase}
        accent={accent}
        tone={tone}
        caption="Press play at 180°, then move away from it. Nothing is turned down: the tones really are cancelling."
      />
      <div className="flex items-center gap-4">
        <SoundPill
          on={pairOn}
          onClick={() => {
            stopBeats();
            if (pairOn) tone.stop('pair');
            else tone.setPair('pair', HZ, phase);
          }}
        >
          {pairOn ? <Square aria-hidden /> : <Play aria-hidden />}
          {pairOn ? 'Stop' : 'Play'}
        </SoundPill>
        <PhaseSlider
          phase={phase}
          accent={accent}
          onChange={(value) => {
            setPhase(value);
            tone.glidePair('pair', HZ, value);
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          This is why two microphones on one source can sound thin, and why
          noise-cancelling headphones work. In a real room it’s never complete,
          because sound reaches you by many paths.
        </p>
        <p>
          Two tones that are almost the same keep drifting in and out of step,
          so the sum swells and fades. Those are beats, and there are as many a
          second as the difference between the tones.
        </p>
      </LabText>
      <BeatsStage
        a={HZ}
        b={HZ + offset}
        accent={accent}
        caption="How tall the sum is over two seconds, at real speed. The rate is true; the picture isn’t timed to your speakers."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={beatsOn}
          onClick={() => {
            tone.stop('pair');
            if (beatsOn) {
              stopBeats();
              return;
            }
            tone.set('low', HZ, 0.5);
            tone.set('high', HZ + offset, 0.5);
          }}
        >
          {beatsOn ? <Square aria-hidden /> : <Play aria-hidden />}
          {beatsOn ? 'Stop' : 'Play'}
        </SoundPill>
        <LabPicker
          label="How far apart"
          options={BEAT_OFFSETS.map((id) => ({
            id,
            text: `${id} Hz apart`,
          }))}
          value={offset}
          onPick={(next) => {
            setOffset(next);
            tone.glide('high', HZ + next, 0.5);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Beats a second"
          value={String(beatRate(HZ, HZ + offset))}
          accent={accent}
        />
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        Past about 20 a second, beats stop sounding like a pulse and start to
        sound rough. Any further apart and you’ll hear two notes.
      </p>
      <LabNext onClick={next}>Your turn</LabNext>
    </>
  );
}

function TryStep({
  tone,
  accent,
  onDone,
  following,
}: {
  tone: Tone;
  accent: string;
  onDone: () => void;
  following: LabFollowing | null;
}) {
  const [round, setRound] = useState(0);
  const first = TRY_ROUNDS[0];
  const [phase, setPhase] = useState<number>(first.start);
  const [offset, setOffset] = useState(5);
  const [wrong, setWrong] = useState(false);
  const finished = round >= TRY_ROUNDS.length;
  const current = TRY_ROUNDS[Math.min(round, TRY_ROUNDS.length - 1)];
  const on = tone.sounding.size > 0;

  if (finished) {
    return (
      <LabDone
        following={following}
        title="You cancelled a tone, then tuned two by ear."
      >
        <p>
          Tuning by beats is a real skill: it’s how many musicians tune a string
          to a reference, listening for the wobble to slow down and stop.
        </p>
      </LabDone>
    );
  }

  const advance = () => {
    tone.stopAll();
    setWrong(false);
    const following = round + 1;
    setRound(following);
    if (following >= TRY_ROUNDS.length) {
      onDone();
      return;
    }
    const upcoming = TRY_ROUNDS[following];
    if (upcoming.kind === 'tune') setOffset(upcoming.start);
  };

  const check = () => {
    const passed =
      current.kind === 'cancel'
        ? degreesFromCancelling(phase) <= CANCEL_WITHIN
        : Math.abs(offset) <= TUNED_WITHIN;
    if (passed) advance();
    else setWrong(true);
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Part {round + 1} of {TRY_ROUNDS.length}.
          </span>{' '}
          {current.kind === 'cancel'
            ? 'Press play and make the tone disappear.'
            : 'These two tones are out of tune, so they beat. No picture now: move your tone until the wobble slows right down and stops.'}
        </p>
      </LabText>
      {current.kind === 'cancel' && (
        <SumStage phase={phase} accent={accent} tone={tone} caption={SLOWED} />
      )}
      <LabDock>
        <div>
          <SoundPill
            on={on}
            onClick={() => {
              if (on) {
                tone.stopAll();
              } else if (current.kind === 'cancel') {
                tone.setPair('pair', HZ, phase);
              } else {
                tone.set('low', current.hz, 0.5);
                tone.set('high', current.hz + offset, 0.5);
              }
            }}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
        </div>
        {current.kind === 'cancel' ? (
          <PhaseSlider
            phase={phase}
            accent={accent}
            onChange={(value) => {
              setPhase(value);
              setWrong(false);
              tone.glidePair('pair', HZ, value);
            }}
          />
        ) : (
          <LabSlider
            label="Your tone"
            low="Lower"
            high="Higher"
            accent={accent}
            min={-TUNE_REACH}
            max={TUNE_REACH}
            step={0.05}
            value={offset}
            valueText="Match it by ear"
            onChange={(value) => {
              setOffset(value);
              setWrong(false);
              tone.glide('high', current.hz + value, 0.5);
            }}
          />
        )}
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {wrong &&
            (current.kind === 'cancel'
              ? 'There’s still some sound there. Keep going until it’s gone.'
              : 'Still beating. The slower the wobble, the closer you are.')}
        </p>
        <button type="button" className={WHITE_PILL} onClick={check}>
          Check
        </button>
      </div>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          Sound waves add, moment by moment. In step they build up, which is
          constructive interference. Half a cycle apart they cancel, which is
          destructive. Two tones a few hertz apart drift between the two, and
          the sum pulses at the difference in their frequencies.
        </p>
      </InsightCard>
      <InsightCard title="How the sound is made">
        <p className={INSIGHT_TEXT}>
          The second tone really is delayed, and both are really there. The
          limits of the delay mean a whisper of sound can remain at 180°.
        </p>
        <p className={INSIGHT_DIM}>
          Beats have no direction, so here they tell you how far off you are,
          not which way to go. Try a little each way.
        </p>
      </InsightCard>
    </>
  );
}

function StopOnLeaving({ step, tone }: { step: string; tone: Tone }) {
  const { stopAll } = tone;
  useEffect(() => stopAll, [step, stopAll]);
  return null;
}

export default function InterferenceLab({
  step,
  accent,
  next,
  complete,
  following,
  about,
}: LabTopicProps) {
  const tone = useLabTone();
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <StopOnLeaving step={step} tone={tone} />
      {step === 'hear' && <HearStep tone={tone} accent={accent} next={next} />}
      {step === 'predict' && (
        <PredictStep
          tone={tone}
          accent={accent}
          picked={picked}
          onPick={setPicked}
          next={next}
        />
      )}
      {step === 'reveal' && (
        <RevealStep tone={tone} accent={accent} picked={picked} next={next} />
      )}
      {step === 'try' && (
        <TryStep
          tone={tone}
          accent={accent}
          onDone={complete}
          following={following}
        />
      )}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
