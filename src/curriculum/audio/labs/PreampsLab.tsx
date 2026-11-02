import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { ClipStage } from '../lab/ClipStage';
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
import { SpectrumStage } from '../lab/SpectrumStage';
import type { Tone } from '../lab/WaveStage';
import {
  CLIP_VOLTS,
  dbOf,
  gainToLine,
  hardClip,
  LEVELS,
  LINE_VOLTS,
  outputVolts,
  renderTone,
} from '../lab/physics/signal';
import { useLabTone } from '../lab/useLabTone';

// ── The Signal Path → Preamps & Levels ─────────────────────────────────────
// A mic makes thousandths of a volt and gear wants about a volt. Turn a preamp's
// gain until a source reaches line level; guess what happens past it; see and
// hear clipping's new harmonics; then set the gain for three sources.

const HZ = 220;
const MAX_GAIN = 70;
/** How near line level counts, in decibels. */
export const LINE_WITHIN = 3;

const SOURCES = LEVELS.slice(0, 2);
type SourceId = (typeof SOURCES)[number]['id'];
const sourceVolts = (id: SourceId) =>
  SOURCES.find((source) => source.id === id)?.volts ?? 0.002;

const CHOICES: readonly LabChoice[] = [
  { id: 'louder', text: 'It just keeps getting louder and staying clean' },
  {
    id: 'clip',
    text: 'It hits a ceiling: the tops flatten, and it turns harsh',
  },
  { id: 'silent', text: 'The preamp cuts out, and it goes silent' },
];
const CORRECT = 'clip';

/** The student's turn: a source to bring up to line level. */
export const GAIN_ROUNDS = [
  { name: 'A microphone', volts: 0.002 },
  { name: 'A guitar', volts: 0.1 },
  { name: 'A loud singer on a microphone', volts: 0.008 },
] as const;

const millivolts = (volts: number) =>
  volts < 1
    ? `${(volts * 1000).toFixed(volts < 0.01 ? 1 : 0)} mV`
    : `${volts.toFixed(2)} V`;

/** The output, as a share of what this preamp can reach before it clips. */
const asShare = (volts: number, gain: number) =>
  outputVolts(volts, gain) / CLIP_VOLTS;

const clipped = (x: number) => hardClip(x);

function playOutput(tone: Tone, share: number) {
  tone.setLoop(
    'mine',
    (rate) => renderTone(HZ, rate, (sine) => hardClip(sine * share)),
    HZ,
  );
}

const MODEL =
  'Typical levels: real ones vary with the gear and the sound. The dashed lines mark what this preamp can reach before it clips.';

/** How far a level is from line level, on a meter from far below to the clip. */
function LevelMeter({ volts, accent }: { volts: number; accent: string }) {
  const low = -70;
  const high = dbOf(CLIP_VOLTS / LINE_VOLTS);
  const at = (db: number) => ((db - low) / (high - low)) * 100;
  const db = dbOf(volts / LINE_VOLTS);
  return (
    <div className="flex flex-col gap-1" data-lab-meter>
      <div className="relative h-3 rounded-full bg-white/[0.08]">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, at(db)))}%`,
            backgroundColor: accent,
          }}
        />
        <span
          aria-hidden
          className="absolute -inset-y-1 w-0.5 bg-white"
          style={{ left: `${at(0)}%` }}
        />
      </div>
      <span aria-hidden className="relative h-4 text-xs text-white/55">
        <span
          className="absolute -translate-x-full pr-1"
          style={{ left: `${at(0)}%` }}
        >
          Line level
        </span>
      </span>
    </div>
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
  const [source, setSource] = useState<SourceId>('mic');
  const [gain, setGain] = useState(0);
  const on = tone.sounding.has('mine');
  const volts = sourceVolts(source);
  const share = asShare(volts, gain);
  return (
    <>
      <LabText>
        <p>
          A microphone makes only a few thousandths of a volt. Mixers and
          interfaces expect about a volt, called line level. A preamp makes up
          the difference, and how much it adds is its gain, in decibels.
        </p>
        <p>
          Press play and bring the gain up until the meter reaches the line.
        </p>
      </LabText>
      <ClipStage
        amount={share}
        shape={clipped}
        accent={accent}
        caption={MODEL}
      />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() => (on ? tone.stop('mine') : playOutput(tone, share))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabSlider
            label={`Gain: ${gain.toFixed(1)} dB`}
            low="0 dB"
            high={`${MAX_GAIN} dB`}
            accent={accent}
            max={MAX_GAIN}
            step={0.5}
            value={gain}
            valueText={`${gain.toFixed(1)} decibels`}
            onChange={(value) => {
              setGain(value);
              if (on) playOutput(tone, asShare(volts, value));
            }}
          />
        </div>
        <LabPicker
          label="Source"
          options={SOURCES.map(({ id, name }) => ({ id, text: name }))}
          value={source}
          onPick={(next) => {
            setSource(next);
            if (on) playOutput(tone, asShare(sourceVolts(next), gain));
          }}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <LevelMeter volts={outputVolts(volts, gain)} accent={accent} />
      <div className="flex flex-wrap gap-3">
        <LabReadout label="Going in" value={millivolts(volts)} />
        <LabReadout
          label="Coming out"
          value={millivolts(outputVolts(volts, gain))}
          accent={accent}
        />
        <LabReadout
          label="Gain it needs"
          value={`About ${Math.round(gainToLine(volts))} dB`}
        />
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        Start with your device’s volume low: a tone at line level here is much
        louder than one with no gain.
      </p>
      <LabNext onClick={next}>Next: make a prediction</LabNext>
    </>
  );
}

function PredictStep({
  accent,
  picked,
  onPick,
  next,
}: {
  accent: string;
  picked: string | null;
  onPick: (id: string) => void;
  next: () => void;
}) {
  return (
    <>
      <ClipStage
        amount={LINE_VOLTS / CLIP_VOLTS}
        shape={clipped}
        accent={accent}
        caption="A signal at line level, with room left above it."
      />
      <PredictChoices
        question="Keep turning the gain up, well past line level. What happens to the signal?"
        choices={CHOICES}
        picked={picked}
        onPick={onPick}
      />
      {picked && <LabNext onClick={next}>Hear what really happens</LabNext>}
    </>
  );
}

const REVEAL_LEVELS = [
  { id: 'clean', text: 'Clean', share: 0.5 },
  { id: 'edge', text: 'Just clipping', share: 1.4 },
  { id: 'hot', text: 'Far too much', share: 6 },
] as const;
type RevealId = (typeof REVEAL_LEVELS)[number]['id'];

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
  const [id, setId] = useState<RevealId>('clean');
  const share = REVEAL_LEVELS.find((level) => level.id === id)?.share ?? 0.5;
  const on = tone.sounding.has('mine');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="It hits a ceiling. A preamp can’t output more than its power supply allows, so the tops of the wave flatten off. That’s clipping, and flat tops mean new harmonics that were never in the sound."
      />
      <ClipStage
        amount={share}
        shape={clipped}
        accent={accent}
        caption="The faint line is the wave it would be. The bright one is what comes out."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={on}
          onClick={() => (on ? tone.stop('mine') : playOutput(tone, share))}
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
        <LabPicker
          label="How hot"
          options={REVEAL_LEVELS}
          value={id}
          onPick={(next) => {
            setId(next);
            const level = REVEAL_LEVELS.find((item) => item.id === next);
            if (on && level) playOutput(tone, level.share);
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <SpectrumStage
        hz={HZ}
        accent={accent}
        tone={tone}
        caption="Measured live: one tone goes in. Clipped, new peaks appear above it that weren’t in the sound."
      />
      <LabText>
        <p>
          Setting each stage so the signal is strong but never clips is called
          gain staging. Too little, and the next stage’s noise starts to show.
          Too much, and it clips. Clipping can’t be undone later.
        </p>
      </LabText>
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
  const [gain, setGain] = useState(0);
  const [hint, setHint] = useState<'more' | 'less' | null>(null);
  const finished = round >= GAIN_ROUNDS.length;
  const current = GAIN_ROUNDS[Math.min(round, GAIN_ROUNDS.length - 1)];
  const on = tone.sounding.has('mine');
  const output = outputVolts(current.volts, gain);
  const share = output / CLIP_VOLTS;

  if (finished) {
    return (
      <LabDone following={following} title="All three, right at line level.">
        <p>
          A quiet source needs far more gain than a loud one. That’s why a mic
          input and an instrument input have such different preamps behind them.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    const off = dbOf(output / LINE_VOLTS);
    if (Math.abs(off) > LINE_WITHIN) {
      setHint(off < 0 ? 'more' : 'less');
      return;
    }
    tone.stopAll();
    setHint(null);
    setGain(0);
    const following = round + 1;
    setRound(following);
    if (following >= GAIN_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Source {round + 1} of {GAIN_ROUNDS.length}:
          </span>{' '}
          {current.name}, making {millivolts(current.volts)}. Bring it up to
          line level without clipping.
        </p>
      </LabText>
      <ClipStage
        amount={share}
        shape={clipped}
        accent={accent}
        caption={MODEL}
      />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() => (on ? tone.stop('mine') : playOutput(tone, share))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabSlider
            label={`Gain: ${gain.toFixed(1)} dB`}
            low="0 dB"
            high={`${MAX_GAIN} dB`}
            accent={accent}
            max={MAX_GAIN}
            step={0.5}
            value={gain}
            valueText={`${gain.toFixed(1)} decibels`}
            onChange={(value) => {
              setGain(value);
              setHint(null);
              if (on) {
                playOutput(
                  tone,
                  outputVolts(current.volts, value) / CLIP_VOLTS,
                );
              }
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <LevelMeter volts={output} accent={accent} />
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {hint === 'more' && 'Not there yet: it needs more gain.'}
          {hint === 'less' && 'Too hot: it needs less gain.'}
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
          Mics are weakest, then instruments, then line level, then speaker
          level. Each stage has its own job in getting from one to the next, and
          a preamp’s is the first and biggest jump.
        </p>
        <p className={INSIGHT_DIM}>
          These voltages are typical round figures. Pro line level is usually
          quoted as +4 dBu, about 1.23 V, while consumer gear runs lower.
        </p>
      </InsightCard>
      <InsightCard title="About the sound">
        <p className={INSIGHT_TEXT}>
          This clipping is hard and digital-looking on purpose, so that it’s
          easy to see and hear. Analog gear usually rounds off more gently,
          which the Amps topic comes back to.
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

export default function PreampsLab({
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
