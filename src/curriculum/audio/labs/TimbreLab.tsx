import { Play, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  LabText,
  PredictChoices,
  RevealVerdict,
  SoundPill,
  TapToHear,
  type LabChoice,
} from '../lab/LabControls';
import { LabDone, type LabFollowing } from '../lab/LabDone';
import type { LabTopicProps } from '../lab/LabLesson';
import { RecipeStage } from '../lab/RecipeStage';
import type { Tone } from '../lab/WaveStage';
import {
  recipeNamed,
  recipeOf,
  RECIPES,
  type NamedRecipe,
} from '../lab/physics/harmonics';
import { formatHz } from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Sound Color → Timbre & Harmonics ───────────────────────────────────────
// A real note is many standing waves at once, and how much of each is why a
// flute doesn't sound like a violin. Hear four recipes on one note; guess what
// adding harmonics does; build one; then tell them apart by ear. The recipes
// are simplified on purpose, and the page says so: no recording, no claim to be
// the instrument.

/** A3: low enough that eight harmonics stay clear of the range that stings. */
const HZ = 220;
const HARMONIC_COUNT = 8;

const CHOICES: readonly LabChoice[] = [
  { id: 'higher', text: 'The note goes higher' },
  { id: 'same', text: 'The note stays put, and its tone changes' },
  { id: 'chord', text: 'It splits into a chord of separate notes' },
];
const CORRECT = 'same';

/** The student's turn: the same note, the recipe to name by ear. */
export const MYSTERY_RECIPES: readonly NamedRecipe['id'][] = [
  'hollow',
  'pure',
  'bright',
  'mellow',
];

const SAME_NOTE =
  'The same note, A3, every time, each wave scaled to the same peak. The bars count its harmonics, the first being the note itself. Simplified recipes, not recordings.';

const recipeOptions = RECIPES.map((recipe) => ({
  id: recipe.id,
  text: recipe.name,
}));

function HearStep({
  tone,
  accent,
  next,
}: {
  tone: Tone;
  accent: string;
  next: () => void;
}) {
  const [id, setId] = useState<NamedRecipe['id']>('pure');
  const recipe = recipeNamed(id);
  const on = tone.sounding.has('mine');
  return (
    <>
      <LabText>
        <p>
          A string or a pipe doesn’t ring in one pattern at a time. It rings in
          many at once: its harmonics, at two, three, four times the note’s
          frequency. How much of each it has is its timbre, or tone color.
        </p>
        <p>Same note, four recipes. Press play and switch between them.</p>
      </LabText>
      <RecipeStage
        harmonics={recipe.harmonics}
        accent={accent}
        tone={tone}
        caption={SAME_NOTE}
      />
      <LabDock>
        <div className="flex flex-wrap items-center gap-2">
          <SoundPill
            on={on}
            onClick={() =>
              on ? tone.stop('mine') : tone.set('mine', HZ, 1, recipe.harmonics)
            }
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabPicker
            label="Recipe"
            options={recipeOptions}
            value={id}
            onPick={(next) => {
              setId(next);
              tone.glide('mine', HZ, 1, recipeNamed(next).harmonics);
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout label="Note" value="A3 · 220 Hz" accent={accent} />
        <LabReadout label="A simplified" value={recipe.like} />
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
  const pure = recipeNamed('pure').harmonics;
  const on = tone.sounding.has('pure');
  return (
    <>
      <RecipeStage
        harmonics={pure}
        accent={accent}
        tone={tone}
        caption="A pure tone: the note alone, with no other harmonics."
      />
      <div>
        <SoundPill
          on={on}
          onClick={() =>
            on ? tone.stop('pure') : tone.set('pure', HZ, 1, pure)
          }
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          Hear it
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="Add more sine waves on top, at 440, 660 and 880 Hz. All of them are higher than this note. What do you hear?"
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
  const [on, setOn] = useState<ReadonlySet<number>>(new Set([1]));
  const harmonics = useMemo(() => recipeOf(on, HARMONIC_COUNT), [on]);
  const sounding = tone.sounding.has('mine');
  const toggle = (n: number) => {
    const out = new Set(on);
    if (out.has(n)) out.delete(n);
    else out.add(n);
    setOn(out);
    tone.glide('mine', HZ, 1, recipeOf(out, HARMONIC_COUNT));
  };
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="The note stays put. Every harmonic fits a whole number of times into the note’s own cycle, so the wave changes shape but still repeats just as often."
      />
      <RecipeStage
        harmonics={harmonics}
        accent={accent}
        tone={tone}
        caption="Each harmonic you add changes the wave’s shape. Count the repeats: there are as many as before."
      />
      <LabDock>
        <div>
          <SoundPill
            on={sounding}
            onClick={() =>
              sounding ? tone.stop('mine') : tone.set('mine', HZ, 1, harmonics)
            }
          >
            {sounding ? <Square aria-hidden /> : <Play aria-hidden />}
            {sounding ? 'Stop' : 'Play'}
          </SoundPill>
        </div>
        <LabPicker
          label="Harmonics"
          options={Array.from({ length: HARMONIC_COUNT }, (_, i) => ({
            id: i + 1,
            text: `${i + 1} · ${formatHz(HZ * (i + 1))}`,
            // The note itself stays: the page is about what goes on top of it.
            disabled: i === 0,
          }))}
          value={on}
          onPick={toggle}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          Turn on only the odd ones, 3, 5 and 7, for the hollow sound of a
          clarinet’s closed pipe. Turn on all of them for something closer to a
          bowed string. Your ear hears the blend as one note with a color,
          though if you listen closely you may start to pick out a harmonic or
          two.
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
  /** What's playing: the mystery, or a recipe to compare it with. */
  const [playing, setPlaying] = useState<NamedRecipe['id'] | 'mystery'>(
    'mystery',
  );
  const finished = round >= MYSTERY_RECIPES.length;
  const answer = MYSTERY_RECIPES[Math.min(round, MYSTERY_RECIPES.length - 1)];
  const on = tone.sounding.has('sound');

  if (finished) {
    return (
      <LabDone following={following} title="All four, with no picture to help.">
        <p>
          Same note, same peak, and you could still tell them apart. What you
          were hearing is which harmonics were there.
        </p>
      </LabDone>
    );
  }

  const play = (what: NamedRecipe['id'] | 'mystery') => {
    if (on && playing === what) {
      tone.stop('sound');
      return;
    }
    setPlaying(what);
    tone.set(
      'sound',
      HZ,
      1,
      recipeNamed(what === 'mystery' ? answer : what).harmonics,
    );
  };

  const pick = (id: NamedRecipe['id']) => {
    if (id !== answer) {
      setWrong(true);
      return;
    }
    tone.stopAll();
    setWrong(false);
    const following = round + 1;
    setRound(following);
    if (following >= MYSTERY_RECIPES.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Mystery {round + 1} of {MYSTERY_RECIPES.length}.
          </span>{' '}
          No wave this time. Play the mystery, compare it with each recipe, then
          say which one it is.
        </p>
      </LabText>
      <div>
        <SoundPill
          on={on && playing === 'mystery'}
          onClick={() => play('mystery')}
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
          {RECIPES.map((recipe) => {
            const active = on && playing === recipe.id;
            return (
              <SoundPill
                key={recipe.id}
                on={active}
                onClick={() => play(recipe.id)}
              >
                {active ? <Square aria-hidden /> : <Play aria-hidden />}
                {recipe.name}
              </SoundPill>
            );
          })}
        </div>
      </div>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-col gap-2">
        <span className="text-[0.8125rem] text-white/55">It’s…</span>
        <LabPicker label="It’s…" options={recipeOptions} onPick={pick} />
      </div>
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {wrong && 'Not that one. Play the mystery again beside each recipe.'}
      </p>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          Any steady musical tone can be built from sine waves at whole-number
          multiples of its frequency. Pitch comes from how often the whole shape
          repeats, and timbre largely from the balance of harmonics.
        </p>
        <p className={INSIGHT_DIM}>
          How a note starts and ends matters too, which is the next topic.
        </p>
      </InsightCard>
      <InsightCard title="About these recipes">
        <p className={INSIGHT_TEXT}>
          They’re simplified to show the idea, so they won’t fool anyone into
          hearing a real flute or violin. Real instruments change their balance
          from moment to moment and from note to note.
        </p>
        <p className={INSIGHT_DIM}>
          Each is scaled to the same peak, which doesn’t make them equally loud
          to the ear. Richer sounds often seem louder at the same peak.
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

export default function TimbreLab({
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
