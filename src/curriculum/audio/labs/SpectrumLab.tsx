import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/components/utilities';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
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
import { MAX_HZ } from '../lab/labAudio';
import { recipeNamed } from '../lab/physics/harmonics';
import {
  bandOf,
  BROAD_BANDS,
  broadBandOf,
  hearingPosition,
  INSTRUMENT_RANGES,
  type BroadBandId,
  type InstrumentRangeId,
} from '../lab/physics/spectrum';
import {
  formatHz,
  hzToPosition,
  nearestNote,
  positionToHz,
} from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Waves Together → Frequency Spectrum ────────────────────────────────────
// Everything we can hear, low to high, with its usual names. Sweep a tone across
// it and watch what's really leaving the page; guess where an instrument's sound
// sits; see its notes and its harmonics apart, because a note's range isn't the
// same as where it sits in a mix; then name a tone's band by ear.

const LOW_HZ = 40;
const RICH = recipeNamed('bright').harmonics;

const CHOICES: readonly LabChoice[] = [
  { id: 'notes', text: 'Only within its notes, about 82 to 1,300 Hz' },
  { id: 'above', text: 'Its notes, plus harmonics reaching far above them' },
  { id: 'high', text: 'Mostly above 5 kHz, whatever note it plays' },
];
const CORRECT = 'above';

/** The student's turn: a tone to place by ear. */
export const BAND_ROUNDS = [1000, 120, 5000, 400, 3000] as const;

const SPEAKERS =
  'Laptop and phone speakers can’t move enough air for the lowest tones. If they’re faint, that’s the speaker. Headphones will bring them back.';

function HearStep({
  tone,
  accent,
  next,
}: {
  tone: Tone;
  accent: string;
  next: () => void;
}) {
  const [hz, setHz] = useState(440);
  const on = tone.sounding.has('mine');
  return (
    <>
      <LabText>
        <p>
          People can hear from about 20 Hz to about 20,000 Hz when young, and
          the top comes down with age. Each doubling is one octave, so this
          range is about ten octaves, and engineers have names for its parts.
        </p>
        <p>Press play and sweep across it.</p>
      </LabText>
      <SpectrumStage
        hz={hz}
        accent={accent}
        tone={tone}
        caption="Measured live from this page’s real output. Octaves are equally wide here."
      />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() => (on ? tone.stop('mine') : tone.set('mine', hz))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabSlider
            label={`Frequency: ${formatHz(hz)}`}
            low="Low"
            high="High"
            accent={accent}
            value={hzToPosition(hz, LOW_HZ, MAX_HZ)}
            valueText={`${Math.round(hz)} hertz, ${bandOf(hz).name}`}
            onChange={(position) => {
              const value = positionToHz(position, LOW_HZ, MAX_HZ);
              setHz(value);
              tone.glide('mine', value);
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout label="Band" value={bandOf(hz).name} accent={accent} />
        <LabReadout label="Nearest note" value={nearestNote(hz).name} />
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        {SPEAKERS} This lab stops at {MAX_HZ / 1000} kHz to look after your
        ears: tones up there are sharp, and they aren’t needed to follow the
        idea.
      </p>
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
  return (
    <>
      <SpectrumStage
        hz={82.4}
        accent={accent}
        tone={tone}
        caption="The line marks a guitar’s lowest note, about 82 Hz."
      />
      <PredictChoices
        question="A guitar’s notes run from about 82 Hz to about 1,300 Hz. Where across this range does its sound reach?"
        choices={CHOICES}
        picked={picked}
        onPick={onPick}
      />
      {picked && <LabNext onClick={next}>See what really happens</LabNext>}
    </>
  );
}

function RangeChart({
  chosen,
  onChoose,
  accent,
}: {
  chosen: InstrumentRangeId;
  onChoose: (id: InstrumentRangeId) => void;
  accent: string;
}) {
  const at = (hz: number) => `${hearingPosition(hz) * 100}%`;
  return (
    <div className="flex flex-col gap-1.5" data-lab-ranges>
      {INSTRUMENT_RANGES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.id === chosen}
          onClick={() => onChoose(item.id)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-2 py-1.5 text-left text-[0.8125rem] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40',
            item.id === chosen
              ? 'bg-white/[0.08] text-white'
              : 'text-white/70 hover:bg-white/[0.04]',
          )}
        >
          <span className="w-20 shrink-0">{item.name}</span>
          <span className="relative h-3 min-w-0 flex-1 rounded-full bg-white/[0.05]">
            {/* What's above its notes: harmonics, fading out, with no edge
              claimed because it depends on the instrument and the note. */}
            <span
              aria-hidden
              className="absolute inset-y-0 rounded-r-full"
              style={{
                left: at(item.high),
                right: 0,
                background: `linear-gradient(to right, ${accent}66, transparent)`,
              }}
            />
            <span
              aria-hidden
              className="absolute inset-y-0 rounded-full"
              style={{
                left: at(item.low),
                width: `calc(${at(item.high)} - ${at(item.low)})`,
                backgroundColor: accent,
              }}
            />
          </span>
        </button>
      ))}
      <div
        aria-hidden
        className="relative ml-[5.75rem] mr-2 h-4 text-xs text-white/55"
      >
        {[100, 1000, 10_000].map((tick) => (
          <span
            key={tick}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: at(tick) }}
          >
            {tick >= 1000 ? `${tick / 1000} kHz` : `${tick} Hz`}
          </span>
        ))}
      </div>
    </div>
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
  const [id, setId] = useState<InstrumentRangeId>('guitar');
  const [playing, setPlaying] = useState<'low' | 'high'>('low');
  const chosen = INSTRUMENT_RANGES.find((item) => item.id === id)!;
  const on = tone.sounding.has('note');
  const hz = chosen[playing];
  const play = (which: 'low' | 'high') => {
    if (on && playing === which) {
      tone.stop('note');
      return;
    }
    setPlaying(which);
    tone.set('note', chosen[which], 1, RICH);
  };
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="Its notes, plus harmonics far above them. Solid bars are the notes it can play. The fading part is the harmonics they carry."
      />
      <RangeChart
        chosen={id}
        accent={accent}
        onChoose={(next) => {
          setId(next);
          const item = INSTRUMENT_RANGES.find((r) => r.id === next)!;
          tone.glide('note', item[playing], 1, RICH);
        }}
      />
      <div className="flex flex-wrap gap-2">
        {(['low', 'high'] as const).map((which) => {
          const active = on && playing === which;
          return (
            <SoundPill key={which} on={active} onClick={() => play(which)}>
              {active ? <Square aria-hidden /> : <Play aria-hidden />}
              {which === 'low' ? 'Lowest' : 'Highest'} ·{' '}
              {nearestNote(chosen[which]).name} · {formatHz(chosen[which])}
            </SoundPill>
          );
        })}
      </div>
      <TapToHear show={tone.needsTap} />
      <SpectrumStage
        hz={hz}
        accent={accent}
        tone={tone}
        caption="The same note, measured live: its harmonics are the peaks to the right of the line. These are simplified tones, not recordings."
      />
      <LabText>
        <p>
          So a bass guitar’s lowest note is near 41 Hz, and yet you can often
          follow it on a phone that can’t play 41 Hz at all. Your ear works out
          the note from its harmonics.
        </p>
        <p>
          You may hear people say a guitar “sits” around the mids. That’s about
          where its character is loudest in a mix, not which notes it can play.
        </p>
      </LabText>
      <LabNext onClick={next}>Your turn</LabNext>
    </>
  );
}

function TryStep({
  tone,
  onDone,
  following,
}: {
  tone: Tone;
  onDone: () => void;
  following: LabFollowing | null;
}) {
  const [round, setRound] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [playing, setPlaying] = useState<BroadBandId | 'mystery'>('mystery');
  const finished = round >= BAND_ROUNDS.length;
  const answer = BAND_ROUNDS[Math.min(round, BAND_ROUNDS.length - 1)];
  const on = tone.sounding.has('sound');

  if (finished) {
    return (
      <LabDone following={following} title="All five, placed by ear.">
        <p>
          Sound engineers do this all day: hear something, and know roughly
          where it lives. It’s the first step to fixing a muddy or harsh mix.
        </p>
      </LabDone>
    );
  }

  const play = (what: BroadBandId | 'mystery', hz: number) => {
    if (on && playing === what) {
      tone.stop('sound');
      return;
    }
    setPlaying(what);
    tone.set('sound', hz);
  };

  const pick = (id: BroadBandId) => {
    if (id !== broadBandOf(answer)) {
      setWrong(true);
      return;
    }
    tone.stopAll();
    setWrong(false);
    const following = round + 1;
    setRound(following);
    if (following >= BAND_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Tone {round + 1} of {BAND_ROUNDS.length}.
          </span>{' '}
          Play the mystery tone, compare it with each example, then say where it
          lives.
        </p>
      </LabText>
      <div>
        <SoundPill
          on={on && playing === 'mystery'}
          onClick={() => play('mystery', answer)}
        >
          {on && playing === 'mystery' ? (
            <Square aria-hidden />
          ) : (
            <Play aria-hidden />
          )}
          Mystery
        </SoundPill>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[0.8125rem] text-white/55">Compare with</span>
        <div className="flex flex-wrap gap-2">
          {BROAD_BANDS.map((band) => {
            const active = on && playing === band.id;
            return (
              <SoundPill
                key={band.id}
                on={active}
                onClick={() => play(band.id, band.example)}
              >
                {active ? <Square aria-hidden /> : <Play aria-hidden />}
                {formatHz(band.example)}
              </SoundPill>
            );
          })}
        </div>
      </div>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-col gap-2">
        <span className="text-[0.8125rem] text-white/55">
          It’s in the… (lows are under 250 Hz, highs over 2 kHz)
        </span>
        <LabPicker
          label="Which band"
          options={BROAD_BANDS.map((band) => ({
            id: band.id,
            text: band.name,
          }))}
          onPick={pick}
        />
      </div>
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {wrong && 'Not there. Play it again beside each example.'}
      </p>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          The spectrum is every frequency we can hear, usually drawn so that
          each octave has equal width, because that’s how the ear takes them.
        </p>
        <p className={INSIGHT_DIM}>
          Band names and edges vary between books and engineers. These are
          common ones, not official.
        </p>
      </InsightCard>
      <InsightCard title="Reading the charts">
        <p className={INSIGHT_TEXT}>
          The spectrum is measured live from what this page sends out, after its
          limiter, so what you see is really there. A pure tone shows mostly a
          single peak, with faint traces from that limiter.
        </p>
        <p className={INSIGHT_DIM}>
          Instrument ranges are typical: a guitar’s or a violin’s top note
          depends on the instrument and the player.
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

export default function SpectrumLab({
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
        <TryStep tone={tone} onDone={complete} following={following} />
      )}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
