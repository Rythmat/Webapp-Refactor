import { useEffect, useMemo, useState } from "react";
import { ActivityFlow } from "./ActivityFlow";
import { usePrismMode } from "@/hooks/data/prism/usePrismMode";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";
import { PrismModeSlug } from "@/hooks/data";
import { keyLabelToUrlParam, urlParamToKeyLabel } from "@/lib/musicKeyUrl";
import { LearnRoutes, StudioRoutes } from "@/constants/routes";
import { useNavigate } from "react-router";

type LessonContainerProps = {
  modeSlug: PrismModeSlug;
  rootKey?: string;
};

type KeyOption = { label: string; midi: number };
type LessonStage = "selection" | "lesson" | "complete";

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const BASE_C4 = 60;
const CHROMATIC_KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;
const KEY_SEMITONES: Record<string, number> = {
  C: 0,
  "C#": 1,
  DB: 1,
  D: 2,
  "D#": 3,
  EB: 3,
  E: 4,
  FB: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  GB: 6,
  G: 7,
  "G#": 8,
  AB: 8,
  A: 9,
  "A#": 10,
  BB: 10,
  B: 11,
  CB: 11,
  "B#": 0,
};

const normalizeKeyLabel = (input?: string) => {
  return urlParamToKeyLabel(input);
};

const resolveKeyOption = (input?: string): KeyOption => {
  const normalized = normalizeKeyLabel(input);
  const lookupKey = normalized.replace("b", "B");
  const semitone = KEY_SEMITONES[lookupKey] ?? 0;
  return {
    label: normalized,
    midi: BASE_C4 + semitone,
  };
};

const normalizeSteps = (steps?: number[]) => {
  if (!steps || steps.length === 0) return DEFAULT_INTERVALS;
  const unique = new Set<number>();
  steps.forEach((s) => {
    if (typeof s === "number" && Number.isFinite(s)) {
      unique.add(Math.round(s));
    }
  });
  if (!unique.has(0)) unique.add(0);
  if (!Array.from(unique).some((n) => n >= 12)) unique.add(12);
  return Array.from(unique).sort((a, b) => a - b);
};

const buildScaleMidis = (rootMidi: number, steps?: number[]) =>
  normalizeSteps(steps).map((interval) => rootMidi + interval);

export const LessonContainer = ({ modeSlug, rootKey }: LessonContainerProps) => {
  const [stage, setStage] = useState<LessonStage>("selection");
  const [label, setLabel] = useState(["", ""]);
  const navigate = useNavigate();
  const keyOption = useMemo(() => resolveKeyOption(rootKey), [rootKey]);
  const currentChromaticIndex = useMemo(
    () => CHROMATIC_KEYS.findIndex((key) => key === keyOption.label),
    [keyOption.label],
  );
  const nextCurriculumKey = useMemo(() => {
    const nextIndex = (currentChromaticIndex + 1 + CHROMATIC_KEYS.length) % CHROMATIC_KEYS.length;
    return CHROMATIC_KEYS[nextIndex];
  }, [currentChromaticIndex]);
  const [nextKeyChoice, setNextKeyChoice] = useState<string>(nextCurriculumKey);

  const { data: modeDetail } = usePrismMode(modeSlug as any);
  const scaleSteps = modeDetail?.steps ?? DEFAULT_INTERVALS;
  const scaleMidis = useMemo(
    () => buildScaleMidis(keyOption.midi, scaleSteps),
    [keyOption.midi, scaleSteps],
  );

  useEffect(() => {
    setStage("selection");
    setNextKeyChoice(nextCurriculumKey);
  }, [modeSlug, rootKey]);

  const SelectionShell = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-xl">
        <div className="flex flex-col gap-2 items-center text-center">
          <h1 className="text-2xl font-semibold">Ready to start?</h1>
          <p className="text-sm text-neutral-400">
            Practicing the <span className="font-semibold text-neutral-100">{modeSlug}</span> mode in the key of {keyOption.label}.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setStage("lesson")}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );

  const CompletionShell = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-xl">
        <div className="flex flex-col gap-2 items-center text-center">
          <h1 className="text-2xl font-semibold">Great work!</h1>
          <p className="text-sm text-neutral-300">
            You completed the {modeSlug} lesson in {keyOption.label}. How would you like to continue?
          </p>
        </div>
        <div className="mt-6 grid gap-4">
          <button
            type="button"
            onClick={() => navigate(StudioRoutes.root.definition)}
            className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-left text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-700"
          >
            Go to Studio
          </button>

          <div className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3">
            <div className="text-sm font-semibold text-neutral-100 mb-2">Pick next key center</div>
            <div className="flex flex-wrap gap-2">
              <select
                value={nextKeyChoice}
                onChange={(e) => setNextKeyChoice(e.target.value)}
                className="rounded-md border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
              >
                {CHROMATIC_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    LearnRoutes.lesson({
                      mode: modeSlug,
                      key: keyLabelToUrlParam(nextKeyChoice),
                    }),
                  )
                }
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Start selected key
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                LearnRoutes.lesson({
                  mode: modeSlug,
                  key: keyLabelToUrlParam(nextCurriculumKey),
                }),
              )
            }
            className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-left text-sm font-semibold text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-700"
          >
            Continue curriculum ({nextCurriculumKey} {modeSlug})
          </button>
        </div>
      </div>
    </div>
  );

  if (stage === "selection") {
    return (
      <div className="min-h-screen w-full bg-neutral-950 text-neutral-50 flex flex-col">
        <HeaderBar title="Lesson" className="bg-neutral-900/60"
        />
        <SelectionShell />
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="min-h-screen w-full bg-neutral-950 text-neutral-50 flex flex-col">
        <HeaderBar title="Lesson Complete" className="bg-neutral-900/60" />
        <CompletionShell />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-50 flex flex-col">
      <HeaderBar
        title="Lesson" className="bg-neutral-900/60"/>
      <div className="border-b border-neutral-800 bg-neutral-900/60 px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-neutral-300">{label[1]}</div>
        <div className="text-sm text-neutral-300">{label[0]}</div>
        <div className="text-sm text-neutral-300">
          Playing flow for <span className="font-semibold text-neutral-100">{keyOption.label}</span>{" "}
          <span className="font-semibold text-neutral-100">{modeSlug}</span>{" "}
        </div>
      </div>
      <div className="p-3 sm:p-4 flex-1">
        <ActivityFlow
          scaleMidis={scaleMidis}
          onComplete={() => setStage("complete")}
          labelChange={(newLabel) => setLabel(newLabel)}
          rootKey={keyOption.label}
          rootMidi={keyOption.midi}
          mode= {modeSlug}
        />
      </div>
    </div>
  );
};
