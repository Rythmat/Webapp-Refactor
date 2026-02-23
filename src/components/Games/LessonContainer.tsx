import { useMemo, useState } from "react";
import { ActivityFlow } from "./ActivityFlow";
import { usePrismMode } from "@/hooks/data/prism/usePrismMode";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";
import { PrismModeSlug } from "@/hooks/data";
import { urlParamToKeyLabel } from "@/lib/musicKeyUrl";

type LessonContainerProps = {
  modeSlug: PrismModeSlug;
  rootKey?: string;
  startAtActivityKey?: string;
};

type KeyOption = { label: string; midi: number };

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const BASE_C4 = 60;
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

export const LessonContainer = ({ modeSlug, rootKey, startAtActivityKey }: LessonContainerProps) => {
  const [label, setLabel] = useState(["", ""]);
  const keyOption = useMemo(() => resolveKeyOption(rootKey), [rootKey]);

  const { data: modeDetail } = usePrismMode(modeSlug as any);
  const scaleSteps = modeDetail?.steps ?? DEFAULT_INTERVALS;
  const scaleMidis = useMemo(
    () => buildScaleMidis(keyOption.midi, scaleSteps),
    [keyOption.midi, scaleSteps],
  );

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
          labelChange={(newLabel) => setLabel(newLabel)}
          rootKey={keyOption.label}
          rootMidi={keyOption.midi}
          mode= {modeSlug}
          startAtActivityKey={startAtActivityKey}
        />
      </div>
    </div>
  );
};
